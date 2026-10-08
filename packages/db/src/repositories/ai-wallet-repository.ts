import type {
  AiUsageEvent,
  Prisma,
  PrismaClient,
} from "../generated/prisma/client";

export interface ReserveWalletCreditsParams {
  walletId: string;
  expectedBalanceCredits: bigint;
  reservedCredits: bigint;
}

export type ReserveWalletCreditsResult =
  | {
      reserved: true;
      rowsUpdated: 1;
      walletId: string;
      reservedCredits: bigint;
      remainingBalanceCredits: bigint;
    }
  | {
      reserved: false;
      rowsUpdated: 0;
      walletId: string;
      reason: "INSUFFICIENT_CREDITS" | "CAS_CONFLICT";
    };

export interface SettleWalletReservationParams {
  walletId: string;
  expectedBalanceCredits: bigint;
  reservedCredits: bigint;
  actualCreditsUsed: bigint;
  idempotencyKey: string;
  feature: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  artifactId?: string;
}

export type SettleWalletReservationResult =
  | {
      settled: true;
      rowsUpdated: 1;
      walletId: string;
      actualCreditsDebited: bigint;
      netDeltaCredits: bigint;
      finalBalanceCredits: bigint;
      usageEvent: AiUsageEvent;
    }
  | {
      settled: false;
      rowsUpdated: 0;
      walletId: string;
      reason: "INSUFFICIENT_CREDITS_FOR_OVERAGE" | "CAS_CONFLICT";
    };

export class PrismaAiWalletRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Atomically reserves credits from an `AiWallet` using optimistic CAS (`balanceCredits === expectedBalanceCredits`)
   * so concurrent AI evaluations cannot overdraw the user/tenant wallet balance.
   */
  async reserveWalletCreditsCas(
    params: ReserveWalletCreditsParams,
  ): Promise<ReserveWalletCreditsResult> {
    const { walletId, expectedBalanceCredits, reservedCredits } = params;

    if (reservedCredits <= 0n) {
      throw new Error("reservedCredits must be strictly positive (> 0n)");
    }

    if (expectedBalanceCredits < reservedCredits) {
      return {
        reserved: false,
        rowsUpdated: 0,
        walletId,
        reason: "INSUFFICIENT_CREDITS",
      };
    }

    return this.prisma.$transaction(
      async (
        tx: Prisma.TransactionClient,
      ): Promise<ReserveWalletCreditsResult> => {
        const updated = await tx.aiWallet.updateMany({
          where: {
            id: walletId,
            balanceCredits: expectedBalanceCredits,
          },
          data: {
            balanceCredits: { decrement: reservedCredits },
            lifetimeConsumed: { increment: reservedCredits },
          },
        });

        if (updated.count === 1) {
          return {
            reserved: true,
            rowsUpdated: 1,
            walletId,
            reservedCredits,
            remainingBalanceCredits: expectedBalanceCredits - reservedCredits,
          };
        }

        return {
          reserved: false,
          rowsUpdated: 0,
          walletId,
          reason: "CAS_CONFLICT",
        };
      },
    );
  }

  /**
   * Atomically settles an in-flight AI credit reservation against actual token usage via delta CAS,
   * refunding unspent credits (or debiting overage) and persisting the immutable `AiUsageEvent`.
   */
  async settleWalletReservationCas(
    params: SettleWalletReservationParams,
  ): Promise<SettleWalletReservationResult> {
    const {
      walletId,
      expectedBalanceCredits,
      reservedCredits,
      actualCreditsUsed,
      idempotencyKey,
      feature,
      modelId,
      inputTokens,
      outputTokens,
      artifactId,
    } = params;

    if (actualCreditsUsed < 0n || reservedCredits < 0n) {
      throw new Error("Credit amounts must be non-negative (>= 0n)");
    }

    const deltaCredits = actualCreditsUsed - reservedCredits;

    if (deltaCredits > 0n && expectedBalanceCredits < deltaCredits) {
      return {
        settled: false,
        rowsUpdated: 0,
        walletId,
        reason: "INSUFFICIENT_CREDITS_FOR_OVERAGE",
      };
    }

    return this.prisma.$transaction(
      async (
        tx: Prisma.TransactionClient,
      ): Promise<SettleWalletReservationResult> => {
        const walletUpdateData: Prisma.AiWalletUpdateManyMutationInput =
          deltaCredits >= 0n
            ? {
                balanceCredits: { decrement: deltaCredits },
                lifetimeConsumed: { increment: deltaCredits },
              }
            : {
                balanceCredits: { increment: -deltaCredits },
                lifetimeConsumed: { decrement: -deltaCredits },
              };

        const updated = await tx.aiWallet.updateMany({
          where: {
            id: walletId,
            balanceCredits: expectedBalanceCredits,
          },
          data: walletUpdateData,
        });

        if (updated.count !== 1) {
          return {
            settled: false,
            rowsUpdated: 0,
            walletId,
            reason: "CAS_CONFLICT",
          };
        }

        const usageEvent = await tx.aiUsageEvent.create({
          data: {
            walletId,
            idempotencyKey,
            feature,
            modelId,
            inputTokens,
            outputTokens,
            creditsDebited: actualCreditsUsed,
            artifactId: artifactId ?? null,
          },
        });

        return {
          settled: true,
          rowsUpdated: 1,
          walletId,
          actualCreditsDebited: actualCreditsUsed,
          netDeltaCredits: deltaCredits,
          finalBalanceCredits: expectedBalanceCredits - deltaCredits,
          usageEvent,
        };
      },
    );
  }
}

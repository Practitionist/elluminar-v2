import type {
  LedgerEntry,
  LedgerJournal,
  OrderStatus,
  Prisma,
  PrismaClient,
} from "../generated/prisma/client";

export class DoubleEntryImbalanceError extends Error {
  public readonly netSumMinor: bigint;

  constructor(netSumMinor: bigint, idempotencyKey: string) {
    super(
      `Double-entry journal '${idempotencyKey}' failed balance invariant: SUM(amountMinor) === ${netSumMinor}n (expected 0n).`,
    );
    this.name = "DoubleEntryImbalanceError";
    this.netSumMinor = netSumMinor;
  }
}

export interface OrderCasPatchData {
  buyerGstin?: string | null;
  couponId?: string | null;
}

export type OrderStatusCasResult =
  | {
      transitioned: true;
      rowsUpdated: 1;
      orderId: string;
      previousStatus: OrderStatus;
      status: OrderStatus;
      previousVersion: number;
      nextVersion: number;
    }
  | {
      transitioned: false;
      rowsUpdated: 0;
      orderId: string;
      expectedStatus: OrderStatus;
      expectedVersion: number;
      targetStatus: OrderStatus;
    };

export type CohortSeatCasResult =
  | {
      reserved: true;
      rowsUpdated: 1;
      cohortId: string;
      enrolledCount: number;
      remainingSeats: number;
    }
  | {
      reserved: false;
      rowsUpdated: 0;
      cohortId: string;
      enrolledCount: number;
      maxSeats: number;
      reason: "SEAT_CEILING_EXCEEDED" | "CAS_CONFLICT_OR_CAPACITY_MISMATCH";
    };

export interface JournalEntrySpec {
  accountId: string;
  amountMinor: bigint;
}

export interface PostBalancedJournalSpec {
  idempotencyKey: string;
  referenceType: string;
  referenceId: string;
  description: string;
  entries: readonly JournalEntrySpec[];
}

export interface PostedJournalResult {
  journal: LedgerJournal;
  entries: LedgerEntry[];
}

export class PrismaCommerceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Atomically transitions an `Order` state using optimistic Compare-And-Swap (`version` + `status`).
   */
  async transitionOrderStatusCas(
    orderId: string,
    expectedStatus: OrderStatus,
    expectedVersion: number,
    nextStatus: OrderStatus,
    patchData: OrderCasPatchData = {},
  ): Promise<OrderStatusCasResult> {
    return this.prisma.$transaction(
      async (tx: Prisma.TransactionClient): Promise<OrderStatusCasResult> => {
        const updated = await tx.order.updateMany({
          where: {
            id: orderId,
            status: expectedStatus,
            version: expectedVersion,
          },
          data: {
            status: nextStatus,
            version: { increment: 1 },
            ...patchData,
          },
        });

        if (updated.count === 1) {
          return {
            transitioned: true,
            rowsUpdated: 1,
            orderId,
            previousStatus: expectedStatus,
            status: nextStatus,
            previousVersion: expectedVersion,
            nextVersion: expectedVersion + 1,
          };
        }

        return {
          transitioned: false,
          rowsUpdated: 0,
          orderId,
          expectedStatus,
          expectedVersion,
          targetStatus: nextStatus,
        };
      },
    );
  }

  /**
   * Atomically reserves a seat in a live `Cohort` via CAS (`enrolledCount === expectedVersion`),
   * strictly enforcing `expectedVersion < maxSeats` and database capacity constraints.
   */
  async reserveCohortSeatCas(
    cohortId: string,
    expectedVersion: number,
    maxSeats: number,
  ): Promise<CohortSeatCasResult> {
    if (expectedVersion < 0 || expectedVersion >= maxSeats) {
      return {
        reserved: false,
        rowsUpdated: 0,
        cohortId,
        enrolledCount: expectedVersion,
        maxSeats,
        reason: "SEAT_CEILING_EXCEEDED",
      };
    }

    return this.prisma.$transaction(
      async (tx: Prisma.TransactionClient): Promise<CohortSeatCasResult> => {
        const updated = await tx.cohort.updateMany({
          where: {
            id: cohortId,
            enrolledCount: expectedVersion,
            capacity: { gte: maxSeats },
          },
          data: {
            enrolledCount: { increment: 1 },
          },
        });

        if (updated.count === 1) {
          return {
            reserved: true,
            rowsUpdated: 1,
            cohortId,
            enrolledCount: expectedVersion + 1,
            remainingSeats: maxSeats - (expectedVersion + 1),
          };
        }

        return {
          reserved: false,
          rowsUpdated: 0,
          cohortId,
          enrolledCount: expectedVersion,
          maxSeats,
          reason: "CAS_CONFLICT_OR_CAPACITY_MISMATCH",
        };
      },
    );
  }

  /**
   * Posts a true double-entry journal (`LedgerJournal` + `LedgerEntry[]`) inside an
   * atomic database transaction after strictly verifying `SUM(entries.amountMinor) === 0n`.
   */
  async postBalancedDoubleEntryJournal(
    journalSpec: PostBalancedJournalSpec,
  ): Promise<PostedJournalResult> {
    if (journalSpec.entries.length < 2) {
      throw new DoubleEntryImbalanceError(0n, journalSpec.idempotencyKey);
    }

    const netSum = journalSpec.entries.reduce(
      (sum, entry) => sum + entry.amountMinor,
      0n,
    );

    if (netSum !== 0n) {
      throw new DoubleEntryImbalanceError(netSum, journalSpec.idempotencyKey);
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const journal = await tx.ledgerJournal.create({
        data: {
          idempotencyKey: journalSpec.idempotencyKey,
          referenceType: journalSpec.referenceType,
          referenceId: journalSpec.referenceId,
          description: journalSpec.description,
        },
      });

      const createdEntries: LedgerEntry[] = [];
      for (const spec of journalSpec.entries) {
        const entry = await tx.ledgerEntry.create({
          data: {
            journalId: journal.id,
            accountId: spec.accountId,
            amountMinor: spec.amountMinor,
          },
        });
        createdEntries.push(entry);

        await tx.ledgerAccount.update({
          where: { id: spec.accountId },
          data: {
            balanceMinor: { increment: spec.amountMinor },
          },
        });
      }

      return {
        journal,
        entries: createdEntries,
      };
    });
  }
}

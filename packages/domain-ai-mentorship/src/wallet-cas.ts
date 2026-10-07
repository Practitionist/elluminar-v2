/**
 * Pre-Call Optimistic CAS `AiWallet` Credit Reservation & Unused Delta Settlement
 * Enforces `<= 8%` gross SKU COGS ceiling, rejects insufficient balances before LLM invocation,
 * and atomically refunds unused reserved credits (`reservedCredits - actualConsumedCredits`)
 * or full reserved credits on Gemini failure.
 */

export const MAX_GROSS_SKU_AI_COGS_BPS = 800; // 8.00% maximum gross SKU COGS ceiling

export interface AiWalletSnapshot {
  walletId: string;
  userId: string;
  enrollmentId?: string;
  balanceCredits: bigint;
  lockedCredits: bigint;
  version: number;
  cumulativeConsumedCredits?: bigint;
}

export interface ReserveAiCreditsCasInput {
  wallet: AiWalletSnapshot;
  expectedBalanceCredits: bigint;
  expectedVersion: number;
  estimatedMaxCredits: bigint;
  idempotencyKey: string;
  maxSkuCogsCeilingCredits?: bigint;
}

export type ReserveAiCreditsCasResult =
  | {
      status: "RESERVED";
      reservationId: string;
      reservedCredits: bigint;
      nextWalletState: AiWalletSnapshot;
    }
  | {
      status: "CAS_CONFLICT";
      code: "CAS_VERSION_OR_BALANCE_MISMATCH";
      currentBalanceCredits: bigint;
      currentVersion: number;
    }
  | {
      status: "REJECTED";
      code: "SKU_COGS_CEILING_EXCEEDED";
      availableBalanceCredits: bigint;
      maxSkuCogsCeilingCredits: bigint;
    }
  | {
      status: "REJECTED";
      code: "INSUFFICIENT_AI_CREDITS";
      availableBalanceCredits: bigint;
      requiredCredits: bigint;
    };

export interface SettleAiCreditReservationInput {
  wallet: AiWalletSnapshot;
  expectedVersion: number;
  reservedCredits: bigint;
  outcome:
    | {
        status: "COMPLETED";
        actualConsumedCredits: bigint;
      }
    | {
        status: "FAILED";
        errorReason?: string;
      };
}

export type SettleAiCreditReservationResult =
  | {
      status: "SETTLED";
      settlementKind: "PARTIAL_OR_EXACT_DEBIT" | "FULL_FAILURE_REFUND";
      reservedCredits: bigint;
      consumedCredits: bigint;
      refundedCredits: bigint;
      nextWalletState: AiWalletSnapshot;
    }
  | {
      status: "CAS_CONFLICT";
      code: "CAS_VERSION_MISMATCH";
      currentVersion: number;
    };

/**
 * Computes the deterministic ceiling of AI token credits allowed for an enrollment SKU
 * so LLM compute never exceeds `8%` (`800 bps`) of gross SKU price.
 */
export function computeMaxSkuAiCreditCeiling(params: {
  grossSkuPriceMinor: bigint;
  maxCogsShareBps?: number;
  paisePerCredit?: bigint;
}): bigint {
  if (params.grossSkuPriceMinor < 0n) {
    throw new RangeError("grossSkuPriceMinor cannot be negative");
  }
  const cogsShareBps = BigInt(params.maxCogsShareBps ?? MAX_GROSS_SKU_AI_COGS_BPS);
  const paisePerCredit = params.paisePerCredit ?? 10n; // Default 1 credit = 10 paisa (₹0.10)

  if (paisePerCredit <= 0n) {
    throw new RangeError("paisePerCredit must be positive");
  }

  const maxAllowedCogsMinor = (params.grossSkuPriceMinor * cogsShareBps) / 10000n;
  return maxAllowedCogsMinor / paisePerCredit;
}

/**
 * Reserves the maximum estimated AI token credits prior to invoking Gemini using optimistic
 * Compare-And-Swap (`expectedBalanceCredits`, `expectedVersion`).
 */
export function reserveAiCreditsCas(
  input: ReserveAiCreditsCasInput
): ReserveAiCreditsCasResult {
  const {
    wallet,
    expectedBalanceCredits,
    expectedVersion,
    estimatedMaxCredits,
    idempotencyKey,
    maxSkuCogsCeilingCredits,
  } = input;

  if (estimatedMaxCredits <= 0n) {
    throw new RangeError(
      `estimatedMaxCredits must be positive (> 0n), got ${estimatedMaxCredits}`
    );
  }

  // 1. Optimistic CAS guard on version and expected balance
  if (
    wallet.version !== expectedVersion ||
    wallet.balanceCredits !== expectedBalanceCredits
  ) {
    return {
      status: "CAS_CONFLICT",
      code: "CAS_VERSION_OR_BALANCE_MISMATCH",
      currentBalanceCredits: wallet.balanceCredits,
      currentVersion: wallet.version,
    };
  }

  // 2. Enforce <= 8% gross SKU COGS ceiling if configured on the wallet/SKU
  const cumulativeConsumed = wallet.cumulativeConsumedCredits ?? 0n;
  if (
    maxSkuCogsCeilingCredits !== undefined &&
    cumulativeConsumed + estimatedMaxCredits > maxSkuCogsCeilingCredits
  ) {
    return {
      status: "REJECTED",
      code: "SKU_COGS_CEILING_EXCEEDED",
      availableBalanceCredits: wallet.balanceCredits,
      maxSkuCogsCeilingCredits,
    };
  }

  // 3. Reject insufficient available balance cleanly prior to LLM invocation
  if (wallet.balanceCredits < estimatedMaxCredits) {
    return {
      status: "REJECTED",
      code: "INSUFFICIENT_AI_CREDITS",
      availableBalanceCredits: wallet.balanceCredits,
      requiredCredits: estimatedMaxCredits,
    };
  }

  // 4. Atomically move credits from `balanceCredits` to `lockedCredits` and bump CAS version
  return {
    status: "RESERVED",
    reservationId: `resv:${idempotencyKey}`,
    reservedCredits: estimatedMaxCredits,
    nextWalletState: {
      ...wallet,
      balanceCredits: wallet.balanceCredits - estimatedMaxCredits,
      lockedCredits: wallet.lockedCredits + estimatedMaxCredits,
      cumulativeConsumedCredits: cumulativeConsumed,
      version: wallet.version + 1,
    },
  };
}

/**
 * Settles a pre-call reservation atomically upon Gemini completion or failure:
 * - On LLM completion: refunds unused delta (`reservedCredits - actualConsumedCredits`) back to `balanceCredits`.
 * - On LLM failure: refunds 100% of `reservedCredits` back to `balanceCredits`.
 */
export function settleAiCreditReservation(
  input: SettleAiCreditReservationInput
): SettleAiCreditReservationResult {
  const { wallet, expectedVersion, reservedCredits, outcome } = input;

  if (reservedCredits <= 0n) {
    throw new RangeError(
      `reservedCredits must be positive (> 0n), got ${reservedCredits}`
    );
  }

  if (wallet.version !== expectedVersion) {
    return {
      status: "CAS_CONFLICT",
      code: "CAS_VERSION_MISMATCH",
      currentVersion: wallet.version,
    };
  }

  if (wallet.lockedCredits < reservedCredits) {
    throw new RangeError(
      `Wallet lockedCredits (${wallet.lockedCredits}) is less than reservedCredits (${reservedCredits})`
    );
  }

  const cumulativeConsumed = wallet.cumulativeConsumedCredits ?? 0n;

  if (outcome.status === "FAILED") {
    return {
      status: "SETTLED",
      settlementKind: "FULL_FAILURE_REFUND",
      reservedCredits,
      consumedCredits: 0n,
      refundedCredits: reservedCredits,
      nextWalletState: {
        ...wallet,
        balanceCredits: wallet.balanceCredits + reservedCredits,
        lockedCredits: wallet.lockedCredits - reservedCredits,
        cumulativeConsumedCredits: cumulativeConsumed,
        version: wallet.version + 1,
      },
    };
  }

  const { actualConsumedCredits } = outcome;
  if (actualConsumedCredits < 0n) {
    throw new RangeError(
      `actualConsumedCredits cannot be negative, got ${actualConsumedCredits}`
    );
  }
  if (actualConsumedCredits > reservedCredits) {
    throw new RangeError(
      `actualConsumedCredits (${actualConsumedCredits}) exceeds reservedCredits (${reservedCredits})`
    );
  }

  const refundedCredits = reservedCredits - actualConsumedCredits;

  return {
    status: "SETTLED",
    settlementKind: "PARTIAL_OR_EXACT_DEBIT",
    reservedCredits,
    consumedCredits: actualConsumedCredits,
    refundedCredits,
    nextWalletState: {
      ...wallet,
      balanceCredits: wallet.balanceCredits + refundedCredits,
      lockedCredits: wallet.lockedCredits - reservedCredits,
      cumulativeConsumedCredits: cumulativeConsumed + actualConsumedCredits,
      version: wallet.version + 1,
    },
  };
}

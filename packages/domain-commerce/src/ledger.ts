/**
 * True Double-Entry Ledger, Deterministic Integer-Paisa Split Engine,
 * Tenant-Scoped Coupon Validator, ₹0 Free Checkout & Compensating Refund Reversal
 */

export type LedgerOwnerType = "PLATFORM" | "TENANT" | "MENTOR" | "USER";
export type LedgerBucket = "ESCROW_LOCKED" | "AVAILABLE";

export interface LedgerEntrySpec {
  accountId: string;
  ownerType: LedgerOwnerType;
  ownerId: string;
  bucket: LedgerBucket;
  /** Signed integer minor units (paisa). Debits < 0n, Credits > 0n. */
  amountMinor: bigint;
}

export interface BalancedJournal {
  idempotencyKey: string;
  referenceType: string;
  referenceId: string;
  description: string;
  entries: readonly LedgerEntrySpec[];
}

export class DoubleEntryInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DoubleEntryInvariantError";
  }
}

/**
 * Enforces the fundamental Double-Entry accounting law:
 * Every journal MUST have >= 2 non-zero entries whose signed sum equals 0n.
 */
export function createBalancedJournal(input: {
  idempotencyKey: string;
  referenceType: string;
  referenceId: string;
  description: string;
  entries: LedgerEntrySpec[];
}): BalancedJournal {
  if (!input.idempotencyKey.trim()) {
    throw new DoubleEntryInvariantError("Journal idempotencyKey cannot be empty");
  }
  if (input.entries.length < 2) {
    throw new DoubleEntryInvariantError(
      `Double-entry journal requires at least 2 entries, got ${input.entries.length}`
    );
  }

  let sum = 0n;
  for (const entry of input.entries) {
    if (entry.amountMinor === 0n) {
      throw new DoubleEntryInvariantError(
        `Zero-amount ledger entry is prohibited on account ${entry.accountId}`
      );
    }
    sum += entry.amountMinor;
  }

  if (sum !== 0n) {
    throw new DoubleEntryInvariantError(
      `Unbalanced double-entry journal (${input.idempotencyKey}): sum of entries is ${sum.toString()} minor units, expected 0n`
    );
  }

  return Object.freeze({
    idempotencyKey: input.idempotencyKey,
    referenceType: input.referenceType,
    referenceId: input.referenceId,
    description: input.description,
    entries: Object.freeze([...input.entries]),
  });
}

// ============================================================================
// COURSE REVENUE SPLIT ENGINE (80/20 Marketplace vs 90/10 Creator-Referred)
// ============================================================================

export type CourseSplitTier = "STANDARD_80_20" | "CREATOR_DIRECT_90_10";

export interface CourseSplitResult {
  netAmountMinor: bigint;
  creatorShareMinor: bigint;
  platformShareMinor: bigint;
  creatorBps: number;
  platformBps: number;
}

export function computeCourseRevenueSplit(
  netAmountMinor: bigint,
  tier: CourseSplitTier = "STANDARD_80_20"
): CourseSplitResult {
  if (netAmountMinor < 0n) {
    throw new RangeError("netAmountMinor must be non-negative");
  }

  const creatorBps = tier === "CREATOR_DIRECT_90_10" ? 9000 : 8000;
  const platformBps = 10000 - creatorBps;

  const creatorShareMinor = (netAmountMinor * BigInt(creatorBps)) / 10000n;
  const platformShareMinor = netAmountMinor - creatorShareMinor;

  return {
    netAmountMinor,
    creatorShareMinor,
    platformShareMinor,
    creatorBps,
    platformBps,
  };
}

// ============================================================================
// PROJECT 3-WAY ESCROW SPLIT ENGINE (50% Mentor + 15% Author Royalty + 35% Platform)
// ============================================================================

export interface ProjectSplitResult {
  netAmountMinor: bigint;
  mentorEscrowMinor: bigint;
  authorRoyaltyEscrowMinor: bigint;
  platformShareMinor: bigint;
  mentorShareBps: number;
  authorRoyaltyBps: number;
  platformShareBps: number;
}

export const DEFAULT_PROJECT_MENTOR_BPS = 5000; // 50.00%
export const DEFAULT_PROJECT_AUTHOR_ROYALTY_BPS = 1500; // 15.00%

export function computeProjectEscrowSplit(
  netAmountMinor: bigint,
  options?: {
    mentorShareBps?: number;
    authorRoyaltyBps?: number;
  }
): ProjectSplitResult {
  if (netAmountMinor < 0n) {
    throw new RangeError("netAmountMinor must be non-negative");
  }

  const mentorShareBps = options?.mentorShareBps ?? DEFAULT_PROJECT_MENTOR_BPS;
  const authorRoyaltyBps =
    options?.authorRoyaltyBps ?? DEFAULT_PROJECT_AUTHOR_ROYALTY_BPS;

  if (mentorShareBps < 0 || authorRoyaltyBps < 0 || mentorShareBps + authorRoyaltyBps > 10000) {
    throw new RangeError(
      `Invalid basis points configuration: mentor=${mentorShareBps}, author=${authorRoyaltyBps}`
    );
  }

  const platformShareBps = 10000 - mentorShareBps - authorRoyaltyBps;

  const mentorEscrowMinor = (netAmountMinor * BigInt(mentorShareBps)) / 10000n;
  const authorRoyaltyEscrowMinor =
    (netAmountMinor * BigInt(authorRoyaltyBps)) / 10000n;
  const platformShareMinor =
    netAmountMinor - mentorEscrowMinor - authorRoyaltyEscrowMinor;

  return {
    netAmountMinor,
    mentorEscrowMinor,
    authorRoyaltyEscrowMinor,
    platformShareMinor,
    mentorShareBps,
    authorRoyaltyBps,
    platformShareBps,
  };
}

/**
 * Generates the balanced 4-leg Double-Entry Capture Journal locking Mentor & Author shares in ESCROW_LOCKED.
 */
export function createProjectCaptureEscrowJournal(params: {
  orderId: string;
  buyerUserId: string;
  buyerClearingAccountId: string;
  mentorUserId: string;
  mentorEscrowAccountId: string;
  tenantOrganizationId: string;
  tenantEscrowAccountId: string;
  platformAvailableAccountId: string;
  netAmountMinor: bigint;
  mentorShareBps?: number;
  authorRoyaltyBps?: number;
}): { journal: BalancedJournal; split: ProjectSplitResult } {
  const split = computeProjectEscrowSplit(params.netAmountMinor, {
    mentorShareBps: params.mentorShareBps,
    authorRoyaltyBps: params.authorRoyaltyBps,
  });

  const entries: LedgerEntrySpec[] = [
    {
      accountId: params.buyerClearingAccountId,
      ownerType: "USER",
      ownerId: params.buyerUserId,
      bucket: "AVAILABLE",
      amountMinor: -split.netAmountMinor,
    },
    {
      accountId: params.mentorEscrowAccountId,
      ownerType: "MENTOR",
      ownerId: params.mentorUserId,
      bucket: "ESCROW_LOCKED",
      amountMinor: split.mentorEscrowMinor,
    },
    {
      accountId: params.tenantEscrowAccountId,
      ownerType: "TENANT",
      ownerId: params.tenantOrganizationId,
      bucket: "ESCROW_LOCKED",
      amountMinor: split.authorRoyaltyEscrowMinor,
    },
    {
      accountId: params.platformAvailableAccountId,
      ownerType: "PLATFORM",
      ownerId: "ELLUMINAR_PLATFORM",
      bucket: "AVAILABLE",
      amountMinor: split.platformShareMinor,
    },
  ];

  const journal = createBalancedJournal({
    idempotencyKey: `project-capture-escrow:${params.orderId}`,
    referenceType: "ORDER",
    referenceId: params.orderId,
    description: `3-Way Project Escrow Split Capture for Order ${params.orderId}`,
    entries,
  });

  return { journal, split };
}

/**
 * Releases ESCROW_LOCKED funds into AVAILABLE buckets for Mentor (50%) and Author Tenant (15%)
 * exclusively upon final `PASS` verdict of the learner's ProjectInstance.
 */
export function createEscrowReleaseJournal(params: {
  projectInstanceId: string;
  verdict: "PASS" | "CHANGES_REQUESTED";
  mentorUserId: string;
  mentorEscrowAccountId: string;
  mentorAvailableAccountId: string;
  mentorEscrowMinor: bigint;
  tenantOrganizationId: string;
  tenantEscrowAccountId: string;
  tenantAvailableAccountId: string;
  authorRoyaltyEscrowMinor: bigint;
}): BalancedJournal {
  if (params.verdict !== "PASS") {
    throw new DoubleEntryInvariantError(
      `Cannot release project escrow when review verdict is ${params.verdict}; verdict must be PASS`
    );
  }

  return createBalancedJournal({
    idempotencyKey: `project-escrow-release:${params.projectInstanceId}`,
    referenceType: "PROJECT_INSTANCE",
    referenceId: params.projectInstanceId,
    description: `Escrow-to-Available Release on final PASS for ProjectInstance ${params.projectInstanceId}`,
    entries: [
      {
        accountId: params.mentorEscrowAccountId,
        ownerType: "MENTOR",
        ownerId: params.mentorUserId,
        bucket: "ESCROW_LOCKED",
        amountMinor: -params.mentorEscrowMinor,
      },
      {
        accountId: params.mentorAvailableAccountId,
        ownerType: "MENTOR",
        ownerId: params.mentorUserId,
        bucket: "AVAILABLE",
        amountMinor: params.mentorEscrowMinor,
      },
      {
        accountId: params.tenantEscrowAccountId,
        ownerType: "TENANT",
        ownerId: params.tenantOrganizationId,
        bucket: "ESCROW_LOCKED",
        amountMinor: -params.authorRoyaltyEscrowMinor,
      },
      {
        accountId: params.tenantAvailableAccountId,
        ownerType: "TENANT",
        ownerId: params.tenantOrganizationId,
        bucket: "AVAILABLE",
        amountMinor: params.authorRoyaltyEscrowMinor,
      },
    ],
  });
}

// ============================================================================
// TENANT-SCOPED COUPON VALIDATION ENGINE
// ============================================================================

export interface TenantCouponRecord {
  id: string;
  organizationId: string;
  code: string;
  discountType: "PERCENTAGE_BPS" | "FIXED_MINOR";
  discountValue: bigint;
  maxRedemptions: number | null;
  redeemedCount: number;
  expiresAt: Date | null;
  isActive: boolean;
}

export type CouponValidationResult =
  | {
      valid: true;
      couponId: string;
      discountMinor: bigint;
      netSubtotalMinor: bigint;
    }
  | {
      valid: false;
      reason:
        | "TENANT_MISMATCH"
        | "INACTIVE"
        | "EXPIRED"
        | "MAX_REDEMPTIONS_EXCEEDED";
    };

export function validateTenantCoupon(params: {
  coupon: TenantCouponRecord;
  orderOrganizationId: string;
  subtotalMinor: bigint;
  now?: Date;
}): CouponValidationResult {
  const { coupon, orderOrganizationId, subtotalMinor } = params;
  const now = params.now ?? new Date();

  if (coupon.organizationId !== orderOrganizationId) {
    return { valid: false, reason: "TENANT_MISMATCH" };
  }
  if (!coupon.isActive) {
    return { valid: false, reason: "INACTIVE" };
  }
  if (coupon.expiresAt && coupon.expiresAt.getTime() <= now.getTime()) {
    return { valid: false, reason: "EXPIRED" };
  }
  if (
    coupon.maxRedemptions !== null &&
    coupon.redeemedCount >= coupon.maxRedemptions
  ) {
    return { valid: false, reason: "MAX_REDEMPTIONS_EXCEEDED" };
  }

  let rawDiscount = 0n;
  if (coupon.discountType === "PERCENTAGE_BPS") {
    rawDiscount = (subtotalMinor * coupon.discountValue) / 10000n;
  } else {
    rawDiscount = coupon.discountValue;
  }

  const discountMinor = rawDiscount > subtotalMinor ? subtotalMinor : rawDiscount;
  const netSubtotalMinor = subtotalMinor - discountMinor;

  return {
    valid: true,
    couponId: coupon.id,
    discountMinor,
    netSubtotalMinor,
  };
}

// ============================================================================
// ₹0 FREE CHECKOUT HANDLER
// ============================================================================

export interface ZeroRupeeCheckoutResult {
  orderId: string;
  status: "FREE_COMPLETED";
  gateway: "FREE_CHECKOUT";
  totalMinor: 0n;
  taxMinor: 0n;
  requiresExternalGateway: false;
}

export function processZeroRupeeCheckout(params: {
  orderId: string;
  subtotalMinor: bigint;
  discountMinor: bigint;
}): ZeroRupeeCheckoutResult {
  const net = params.subtotalMinor - params.discountMinor;
  if (net !== 0n) {
    throw new Error(
      `Order ${params.orderId} is not eligible for ₹0 checkout; net amount is ${net.toString()} minor units`
    );
  }

  return {
    orderId: params.orderId,
    status: "FREE_COMPLETED",
    gateway: "FREE_CHECKOUT",
    totalMinor: 0n,
    taxMinor: 0n,
    requiresExternalGateway: false,
  };
}

// ============================================================================
// FAILED-REFUND COMPENSATING JOURNAL REVERSAL
// ============================================================================

/**
 * Generates an immutable compensating journal reversing every leg of a pre-refund debit lock
 * when the downstream payment gateway rejects/fails the refund.
 */
export function createFailedRefundCompensatingJournal(params: {
  refundId: string;
  originalPreRefundJournal: BalancedJournal;
  failureReason: string;
}): BalancedJournal {
  const reversedEntries: LedgerEntrySpec[] =
    params.originalPreRefundJournal.entries.map((entry) => ({
      ...entry,
      amountMinor: -entry.amountMinor,
    }));

  return createBalancedJournal({
    idempotencyKey: `refund-compensating-reversal:${params.refundId}`,
    referenceType: "REFUND",
    referenceId: params.refundId,
    description: `Compensating reversal for failed refund ${params.refundId}: ${params.failureReason}`,
    entries: reversedEntries,
  });
}

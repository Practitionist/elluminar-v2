/**
 * Optimistic Compare-And-Swap (CAS) State-Machine Transition Engine
 * for Order Fulfillment, Double-Admin Refund Protection & Cohort Seat Reservation
 */

export type CasOrderStatus =
  | "PENDING"
  | "PAID"
  | "FREE_COMPLETED"
  | "EXPIRED"
  | "CANCELLED"
  | "REFUNDED";

export type CasRefundStatus =
  | "REQUESTED"
  | "PENDING"
  | "PROCESSING"
  | "PROCESSED"
  | "FAILED_REVERSED"
  | "REJECTED";

export interface CasOrderSnapshot {
  id: string;
  status: CasOrderStatus;
  version: number;
}

export interface CasRefundSnapshot {
  id: string;
  orderId: string;
  status: CasRefundStatus;
  version: number;
}

export interface CasCohortSnapshot {
  id: string;
  courseId: string;
  capacity: number;
  enrolledCount: number;
  status: "UPCOMING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  version: number;
}

const VALID_ORDER_TRANSITIONS: Record<
  CasOrderStatus,
  readonly CasOrderStatus[]
> = {
  PENDING: ["PAID", "FREE_COMPLETED", "EXPIRED", "CANCELLED"],
  PAID: ["REFUNDED"],
  FREE_COMPLETED: ["CANCELLED"],
  EXPIRED: [],
  CANCELLED: [],
  REFUNDED: [],
};

const VALID_REFUND_TRANSITIONS: Record<
  CasRefundStatus,
  readonly CasRefundStatus[]
> = {
  REQUESTED: ["PROCESSING", "REJECTED"],
  PENDING: ["PROCESSING", "PROCESSED", "FAILED_REVERSED"],
  PROCESSING: ["PROCESSED", "FAILED_REVERSED"],
  PROCESSED: [],
  FAILED_REVERSED: [],
  REJECTED: [],
};

export type CasTransitionResult<TStatus extends string> =
  | {
      outcome: "APPLIED";
      rowsUpdated: 1;
      entityId: string;
      previousStatus: TStatus;
      status: TStatus;
      previousVersion: number;
      nextVersion: number;
    }
  | {
      outcome: "IDEMPOTENT_ALREADY_IN_TARGET_STATE";
      rowsUpdated: 0;
      entityId: string;
      status: TStatus;
      currentVersion: number;
    }
  | {
      outcome: "REJECTED_ILLEGAL_TRANSITION" | "REJECTED_CAS_CONFLICT";
      rowsUpdated: 0;
      entityId: string;
      currentStatus: TStatus;
      currentVersion: number;
      expectedStatus: TStatus;
      expectedVersion: number;
      requestedTargetStatus: TStatus;
      reason: string;
    };

/**
 * Optimistic CAS Order State Transition (`executeCasOrderTransition`):
 * Enforces `expectedStatus` + `expectedVersion` (`nextVersion = expectedVersion + 1`),
 * rejecting illegal transitions (`EXPIRED -> PAID`, `REFUNDED -> PAID`, `CANCELLED -> PAID`)
 * with `rowsUpdated: 0` and returning deterministic idempotency outcomes when concurrent
 * workers race to fulfill the same `Order`.
 */
export function executeCasOrderTransition(params: {
  current: CasOrderSnapshot;
  expectedStatus: CasOrderStatus;
  expectedVersion: number;
  targetStatus: CasOrderStatus;
}): CasTransitionResult<CasOrderStatus> {
  const { current, expectedStatus, expectedVersion, targetStatus } = params;

  // 1. Validate state-machine legality of `expectedStatus -> targetStatus` AND `current.status -> targetStatus`
  const allowedFromExpected = VALID_ORDER_TRANSITIONS[expectedStatus] ?? [];
  if (!allowedFromExpected.includes(targetStatus)) {
    return {
      outcome: "REJECTED_ILLEGAL_TRANSITION",
      rowsUpdated: 0,
      entityId: current.id,
      currentStatus: current.status,
      currentVersion: current.version,
      expectedStatus,
      expectedVersion,
      requestedTargetStatus: targetStatus,
      reason: `Illegal Order state transition: ${expectedStatus} -> ${targetStatus} is prohibited.`,
    };
  }

  // 2. Idempotent fast-path: another worker already transitioned the Order to `targetStatus`
  if (current.status === targetStatus) {
    return {
      outcome: "IDEMPOTENT_ALREADY_IN_TARGET_STATE",
      rowsUpdated: 0,
      entityId: current.id,
      status: current.status,
      currentVersion: current.version,
    };
  }

  // 3. Check if current persisted status legally permits transition to `targetStatus`
  const allowedFromCurrent = VALID_ORDER_TRANSITIONS[current.status] ?? [];
  if (!allowedFromCurrent.includes(targetStatus)) {
    return {
      outcome: "REJECTED_ILLEGAL_TRANSITION",
      rowsUpdated: 0,
      entityId: current.id,
      currentStatus: current.status,
      currentVersion: current.version,
      expectedStatus,
      expectedVersion,
      requestedTargetStatus: targetStatus,
      reason: `Cannot transition Order ${current.id} from terminal/incompatible status ${current.status} to ${targetStatus}.`,
    };
  }

  // 4. Optimistic CAS check (`WHERE id = $1 AND status = $2 AND version = $3`)
  if (
    current.status !== expectedStatus ||
    current.version !== expectedVersion
  ) {
    return {
      outcome: "REJECTED_CAS_CONFLICT",
      rowsUpdated: 0,
      entityId: current.id,
      currentStatus: current.status,
      currentVersion: current.version,
      expectedStatus,
      expectedVersion,
      requestedTargetStatus: targetStatus,
      reason: `CAS version/status conflict on Order ${current.id}: expected (${expectedStatus}, v${expectedVersion}), found (${current.status}, v${current.version}).`,
    };
  }

  const nextVersion = expectedVersion + 1;
  current.status = targetStatus;
  current.version = nextVersion;

  return {
    outcome: "APPLIED",
    rowsUpdated: 1,
    entityId: current.id,
    previousStatus: expectedStatus,
    status: targetStatus,
    previousVersion: expectedVersion,
    nextVersion,
  };
}

/**
 * Optimistic CAS Refund State Transition (`executeCasRefundTransition`):
 * Prevents double-admin refund approvals (`REQUESTED -> PROCESSING`) so only the first
 * CAS holder acquires the gateway execution lock (`rowsUpdated: 1`, `nextVersion = expectedVersion + 1`)
 * while concurrent approvals fail safely with `rowsUpdated: 0`.
 */
export function executeCasRefundTransition(params: {
  current: CasRefundSnapshot;
  expectedStatus: CasRefundStatus;
  expectedVersion: number;
  targetStatus: CasRefundStatus;
}): CasTransitionResult<CasRefundStatus> {
  const { current, expectedStatus, expectedVersion, targetStatus } = params;

  const allowedFromExpected = VALID_REFUND_TRANSITIONS[expectedStatus] ?? [];
  if (!allowedFromExpected.includes(targetStatus)) {
    return {
      outcome: "REJECTED_ILLEGAL_TRANSITION",
      rowsUpdated: 0,
      entityId: current.id,
      currentStatus: current.status,
      currentVersion: current.version,
      expectedStatus,
      expectedVersion,
      requestedTargetStatus: targetStatus,
      reason: `Illegal Refund state transition: ${expectedStatus} -> ${targetStatus} is prohibited.`,
    };
  }

  if (
    current.status !== expectedStatus ||
    current.version !== expectedVersion
  ) {
    return {
      outcome: "REJECTED_CAS_CONFLICT",
      rowsUpdated: 0,
      entityId: current.id,
      currentStatus: current.status,
      currentVersion: current.version,
      expectedStatus,
      expectedVersion,
      requestedTargetStatus: targetStatus,
      reason: `CAS conflict on Refund ${current.id}: expected (${expectedStatus}, v${expectedVersion}), found (${current.status}, v${current.version}).`,
    };
  }

  const nextVersion = expectedVersion + 1;
  current.status = targetStatus;
  current.version = nextVersion;

  return {
    outcome: "APPLIED",
    rowsUpdated: 1,
    entityId: current.id,
    previousStatus: expectedStatus,
    status: targetStatus,
    previousVersion: expectedVersion,
    nextVersion,
  };
}

export type CohortSeatReservationResult =
  | {
      outcome: "RESERVED";
      rowsUpdated: 1;
      cohortId: string;
      enrolledCount: number;
      remainingSeats: number;
      nextVersion: number;
    }
  | {
      outcome:
        | "REJECTED_COHORT_FULL"
        | "REJECTED_COHORT_CLOSED"
        | "REJECTED_CAS_CONFLICT";
      rowsUpdated: 0;
      cohortId: string;
      enrolledCount: number;
      capacity: number;
      reason: string;
    };

/**
 * Optimistic CAS Cohort Capacity Guard (`reserveCohortSeatCas`):
 * Atomically enforces `enrolledCount + quantity <= capacity` and `version === expectedVersion`
 * so live cohort caps can never oversell under concurrent checkout spikes.
 */
export function reserveCohortSeatCas(params: {
  cohort: CasCohortSnapshot;
  expectedVersion: number;
  quantity?: number;
}): CohortSeatReservationResult {
  const { cohort, expectedVersion } = params;
  const quantity = params.quantity ?? 1;

  if (cohort.status !== "UPCOMING" && cohort.status !== "ACTIVE") {
    return {
      outcome: "REJECTED_COHORT_CLOSED",
      rowsUpdated: 0,
      cohortId: cohort.id,
      enrolledCount: cohort.enrolledCount,
      capacity: cohort.capacity,
      reason: `Cohort ${cohort.id} has closed status ${cohort.status}.`,
    };
  }

  if (cohort.enrolledCount + quantity > cohort.capacity) {
    return {
      outcome: "REJECTED_COHORT_FULL",
      rowsUpdated: 0,
      cohortId: cohort.id,
      enrolledCount: cohort.enrolledCount,
      capacity: cohort.capacity,
      reason: `Cohort ${cohort.id} capacity (${cohort.capacity}) exceeded: ${cohort.enrolledCount} + ${quantity}.`,
    };
  }

  if (cohort.version !== expectedVersion) {
    return {
      outcome: "REJECTED_CAS_CONFLICT",
      rowsUpdated: 0,
      cohortId: cohort.id,
      enrolledCount: cohort.enrolledCount,
      capacity: cohort.capacity,
      reason: `CAS version conflict on Cohort ${cohort.id}: expected v${expectedVersion}, found v${cohort.version}.`,
    };
  }

  const nextEnrolled = cohort.enrolledCount + quantity;
  const nextVersion = expectedVersion + 1;
  cohort.enrolledCount = nextEnrolled;
  cohort.version = nextVersion;

  return {
    outcome: "RESERVED",
    rowsUpdated: 1,
    cohortId: cohort.id,
    enrolledCount: nextEnrolled,
    remainingSeats: cohort.capacity - nextEnrolled,
    nextVersion,
  };
}

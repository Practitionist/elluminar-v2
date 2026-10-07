/**
 * Default-Deny `OrgLicense` & Deep Course Sub-Route Entitlement Resolver
 */

export type LicenseScopeMode = "ALLOWLIST" | "ALL";

export type EnrollmentStatus = "ACTIVE" | "COMPLETED" | "REVOKED";

export interface DirectEnrollmentRecord {
  id: string;
  userId: string;
  courseId: string;
  status: EnrollmentStatus;
}

export interface OrgLicenseEntitlementRecord {
  licenseId: string;
  organizationId: string;
  scopeMode: LicenseScopeMode;
  courseIds: readonly string[];
  projectIds?: readonly string[];
  validFrom: Date;
  validUntil: Date;
  seatRevokedAt?: Date | null;
}

export type DeepCourseSubRoute =
  | { kind: "COURSE_OVERVIEW" }
  | { kind: "LESSON"; lessonId: string; isPreview?: boolean }
  | { kind: "COHORT_DISCUSSION"; cohortId: string }
  | { kind: "ASSIGNMENT"; milestoneId: string };

export type DeepCourseEntitlementDecision =
  | {
      entitled: true;
      grantSource:
        | "DIRECT_ENROLLMENT"
        | "ORG_LICENSE_ALLOWLIST"
        | "ORG_LICENSE_ALL"
        | "PREVIEW_LESSON";
      licenseId?: string;
      enrollmentId?: string;
    }
  | {
      entitled: false;
      reason:
        | "NO_ENTITLEMENT_OR_EMPTY_ALLOWLIST"
        | "ENROLLMENT_REVOKED"
        | "LICENSE_EXPIRED_OR_NOT_YET_VALID"
        | "LICENSE_SEAT_REVOKED";
    };

/**
 * Resolves deep course sub-route entitlements (`resolveDeepCourseEntitlement`):
 * - Checks active direct `Enrollment` first (`status in ("ACTIVE", "COMPLETED")`).
 * - Evaluates B2B `OrgLicense` seats with strict default-deny `ALLOWLIST` semantics:
 *   - Under `scopeMode: "ALLOWLIST"`, an empty `courseIds` array grants access to **0** items.
 *   - Enforces active seat (`seatRevokedAt == null`) and license window (`validFrom <= now <= validUntil`).
 * - Allows unentitled access ONLY when `subRoute.kind === "LESSON"` and `subRoute.isPreview === true`.
 */
export function resolveDeepCourseEntitlement(params: {
  userId: string;
  courseId: string;
  subRoute?: DeepCourseSubRoute;
  enrollments: readonly DirectEnrollmentRecord[];
  orgLicenses: readonly OrgLicenseEntitlementRecord[];
  now?: Date;
}): DeepCourseEntitlementDecision {
  const now = params.now ?? new Date();
  const subRoute = params.subRoute ?? { kind: "COURSE_OVERVIEW" };

  // 1. Direct learner enrollment check
  const matchingEnrollment = params.enrollments.find(
    (e) => e.userId === params.userId && e.courseId === params.courseId
  );

  if (matchingEnrollment) {
    if (
      matchingEnrollment.status === "ACTIVE" ||
      matchingEnrollment.status === "COMPLETED"
    ) {
      return {
        entitled: true,
        grantSource: "DIRECT_ENROLLMENT",
        enrollmentId: matchingEnrollment.id,
      };
    }
  }

  // 2. B2B OrgLicense seat evaluation (Default-Deny on ALLOWLIST)
  let sawRevokedSeat = false;
  let sawExpiredLicense = false;

  for (const license of params.orgLicenses) {
    const coversCourse =
      license.scopeMode === "ALL"
        ? true
        : license.scopeMode === "ALLOWLIST" &&
          license.courseIds.length > 0 &&
          license.courseIds.includes(params.courseId);

    if (!coversCourse) {
      continue;
    }

    if (license.seatRevokedAt != null) {
      sawRevokedSeat = true;
      continue;
    }

    if (
      now.getTime() < license.validFrom.getTime() ||
      now.getTime() > license.validUntil.getTime()
    ) {
      sawExpiredLicense = true;
      continue;
    }

    return {
      entitled: true,
      grantSource:
        license.scopeMode === "ALL"
          ? "ORG_LICENSE_ALL"
          : "ORG_LICENSE_ALLOWLIST",
      licenseId: license.licenseId,
    };
  }

  // 3. Free preview lesson fallback on `/learn/courses/[slug]/lessons/[lessonId]`
  if (subRoute.kind === "LESSON" && subRoute.isPreview === true) {
    return {
      entitled: true,
      grantSource: "PREVIEW_LESSON",
    };
  }

  if (matchingEnrollment?.status === "REVOKED") {
    return { entitled: false, reason: "ENROLLMENT_REVOKED" };
  }
  if (sawRevokedSeat) {
    return { entitled: false, reason: "LICENSE_SEAT_REVOKED" };
  }
  if (sawExpiredLicense) {
    return { entitled: false, reason: "LICENSE_EXPIRED_OR_NOT_YET_VALID" };
  }

  return {
    entitled: false,
    reason: "NO_ENTITLEMENT_OR_EMPTY_ALLOWLIST",
  };
}

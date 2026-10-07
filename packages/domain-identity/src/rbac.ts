/**
 * Strict Multi-Tenant Portal RBAC Guards & Immediate Session Ban Purge Engine
 */

export type OrganizationType =
  | "CREATOR"
  | "ENTERPRISE"
  | "UNIVERSITY"
  | "HIRING_PARTNER";

export type TenantMemberRole =
  | "OWNER"
  | "ADMIN"
  | "BILLING_MANAGER"
  | "INSTRUCTOR"
  | "TA"
  | "MENTOR"
  | "LEARNER"
  | "MEMBER";

export type MentorProfileStatus =
  | "PENDING_REVIEW"
  | "ACTIVE"
  | "SUSPENDED"
  | "INACTIVE";

export type PortalKind = "STUDIO" | "ORG" | "MENTOR";

export type PortalOperationScope =
  | "READ"
  | "CURRICULUM_MUTATION"
  | "BILLING_MUTATION"
  | "PAYOUT_MUTATION"
  | "COUPON_MUTATION"
  | "SEAT_ADMIN_MUTATION";

export interface TenantPortalAccessInput {
  portal: PortalKind;
  operation?: PortalOperationScope;
  organization?: {
    id: string;
    slug: string;
    type: OrganizationType;
  } | null;
  membershipRole?: TenantMemberRole | null;
  mentorProfile?: {
    id: string;
    status: MentorProfileStatus;
  } | null;
  isUserBanned?: boolean;
}

export type TenantPortalAccessDecision =
  | {
      action: "ALLOW";
      portal: PortalKind;
      operation: PortalOperationScope;
    }
  | {
      action: "REDIRECT";
      to: "/learn/org";
      reason: "LEARNER_MEMBER_REDIRECT_TO_LEARN_PORTAL";
    }
  | {
      action: "DENY";
      code:
        | "USER_BANNED"
        | "MISSING_ORGANIZATION"
        | "INVALID_ORGANIZATION_TYPE_FOR_PORTAL"
        | "NOT_A_TENANT_MEMBER"
        | "INSUFFICIENT_STUDIO_ROLE_FOR_FINANCIAL_MUTATION"
        | "INSUFFICIENT_STUDIO_ROLE"
        | "INSUFFICIENT_ORG_ROLE"
        | "MENTOR_PROFILE_NOT_ACTIVE";
      message: string;
    };

const STUDIO_FINANCIAL_OPERATIONS = new Set<PortalOperationScope>([
  "BILLING_MUTATION",
  "PAYOUT_MUTATION",
  "COUPON_MUTATION",
]);

/**
 * Strict Multi-Tenant RBAC Guard (`assertTenantPortalAccess`):
 * - `/studio/[slug]/*` strictly requires `Organization.type === "CREATOR"`;
 *   blocks `TA` and `INSTRUCTOR` roles from billing, payout, and coupon mutations.
 * - `/org/[slug]/*` strictly requires `Organization.type in ("ENTERPRISE", "UNIVERSITY")`;
 *   plain learner `MEMBER` / `LEARNER` roles automatically return `{ action: "REDIRECT", to: "/learn/org" }`.
 * - `/mentor/*` strictly requires `MentorProfile.status === "ACTIVE"`.
 */
export function assertTenantPortalAccess(
  input: TenantPortalAccessInput
): TenantPortalAccessDecision {
  const operation: PortalOperationScope = input.operation ?? "READ";

  if (input.isUserBanned === true) {
    return {
      action: "DENY",
      code: "USER_BANNED",
      message: "Banned users are strictly blocked from accessing any tenant or mentor portal.",
    };
  }

  // 1. Mentor Portal (`/mentor/*`)
  if (input.portal === "MENTOR") {
    if (!input.mentorProfile || input.mentorProfile.status !== "ACTIVE") {
      return {
        action: "DENY",
        code: "MENTOR_PROFILE_NOT_ACTIVE",
        message: `Access to /mentor/* strictly requires MentorProfile.status === "ACTIVE" (got: ${input.mentorProfile?.status ?? "NONE"}).`,
      };
    }

    return {
      action: "ALLOW",
      portal: "MENTOR",
      operation,
    };
  }

  // Both STUDIO and ORG portals require a resolved tenant Organization
  if (!input.organization) {
    return {
      action: "DENY",
      code: "MISSING_ORGANIZATION",
      message: `Organization context is required for ${input.portal} portal access.`,
    };
  }

  // 2. Creator Studio Portal (`/studio/[slug]/*`)
  if (input.portal === "STUDIO") {
    if (input.organization.type !== "CREATOR") {
      return {
        action: "DENY",
        code: "INVALID_ORGANIZATION_TYPE_FOR_PORTAL",
        message: `/studio/${input.organization.slug} strictly requires Organization.type === "CREATOR" (got: ${input.organization.type}).`,
      };
    }

    if (!input.membershipRole) {
      return {
        action: "DENY",
        code: "NOT_A_TENANT_MEMBER",
        message: "Active studio membership is required to access /studio/[slug].",
      };
    }

    // Plain learners/members cannot access Creator Studio at all
    if (
      input.membershipRole === "LEARNER" ||
      input.membershipRole === "MEMBER"
    ) {
      return {
        action: "DENY",
        code: "INSUFFICIENT_STUDIO_ROLE",
        message: `Role ${input.membershipRole} is not permitted in Creator Studio.`,
      };
    }

    // Block TA, INSTRUCTOR, and MENTOR roles from billing, payout, and coupon mutations
    if (STUDIO_FINANCIAL_OPERATIONS.has(operation)) {
      if (
        input.membershipRole === "TA" ||
        input.membershipRole === "INSTRUCTOR" ||
        input.membershipRole === "MENTOR"
      ) {
        return {
          action: "DENY",
          code: "INSUFFICIENT_STUDIO_ROLE_FOR_FINANCIAL_MUTATION",
          message: `Role ${input.membershipRole} is strictly prohibited from executing ${operation} in Creator Studio.`,
        };
      }
    }

    return {
      action: "ALLOW",
      portal: "STUDIO",
      operation,
    };
  }

  // 3. B2B Enterprise / University Portal (`/org/[slug]/*`)
  if (
    input.organization.type !== "ENTERPRISE" &&
    input.organization.type !== "UNIVERSITY"
  ) {
    return {
      action: "DENY",
      code: "INVALID_ORGANIZATION_TYPE_FOR_PORTAL",
      message: `/org/${input.organization.slug} strictly requires Organization.type in ("ENTERPRISE", "UNIVERSITY") (got: ${input.organization.type}).`,
    };
  }

  if (!input.membershipRole) {
    return {
      action: "DENY",
      code: "NOT_A_TENANT_MEMBER",
      message: "Organization membership is required to access /org/[slug].",
    };
  }

  // Plain learner MEMBER / LEARNER roles automatically redirect to `/learn/org`
  if (
    input.membershipRole === "MEMBER" ||
    input.membershipRole === "LEARNER"
  ) {
    return {
      action: "REDIRECT",
      to: "/learn/org",
      reason: "LEARNER_MEMBER_REDIRECT_TO_LEARN_PORTAL",
    };
  }

  if (
    input.membershipRole !== "OWNER" &&
    input.membershipRole !== "ADMIN" &&
    input.membershipRole !== "BILLING_MANAGER" &&
    input.membershipRole !== "INSTRUCTOR"
  ) {
    return {
      action: "DENY",
      code: "INSUFFICIENT_ORG_ROLE",
      message: `Role ${input.membershipRole} cannot access B2B organization console /org/${input.organization.slug}.`,
    };
  }

  return {
    action: "ALLOW",
    portal: "ORG",
    operation,
  };
}

// ============================================================================
// IMMEDIATE SESSION BAN PURGE PLAN (`buildSessionBanPurgePlan`)
// ============================================================================

export interface ActiveSessionRecord {
  id: string;
  token: string;
}

export interface SessionBanPurgePlan {
  shouldPurge: boolean;
  userId: string;
  postgresDeleteWhere: { userId: string } | null;
  sessionIds: string[];
  redisKeysToDelete: string[];
}

export const BETTER_AUTH_REDIS_SESSION_PREFIX = "better-auth:session:";
export const USER_SESSION_INDEX_REDIS_PREFIX = "elluminar:user-sessions:";

/**
 * Generates an atomic dual-store purge plan targeting both PostgreSQL `Session` rows
 * and Upstash Redis cached session tokens whenever `user.banned === true`.
 */
export function buildSessionBanPurgePlan(params: {
  user: {
    id: string;
    banned?: boolean | null;
  };
  activeSessions: readonly ActiveSessionRecord[];
  redisKeyPrefix?: string;
}): SessionBanPurgePlan {
  const { user, activeSessions } = params;
  const sessionPrefix =
    params.redisKeyPrefix ?? BETTER_AUTH_REDIS_SESSION_PREFIX;

  if (user.banned !== true) {
    return {
      shouldPurge: false,
      userId: user.id,
      postgresDeleteWhere: null,
      sessionIds: [],
      redisKeysToDelete: [],
    };
  }

  const sessionIds = activeSessions.map((s) => s.id);
  const redisKeysToDelete: string[] = [
    `${USER_SESSION_INDEX_REDIS_PREFIX}${user.id}`,
    ...activeSessions.map((s) => `${sessionPrefix}${s.token}`),
  ];

  return {
    shouldPurge: true,
    userId: user.id,
    postgresDeleteWhere: { userId: user.id },
    sessionIds,
    redisKeysToDelete,
  };
}

import { describe, expect, it } from "vitest";
import {
  assertTenantPortalAccess,
  buildSessionBanPurgePlan,
  resolveDeepCourseEntitlement,
  resolveSignInStrategy,
  type EnterpriseSsoProviderRecord,
} from "../index";

describe("domain-identity Phase 2A — B2B SSO Discovery, RBAC, Default-Deny Entitlements & Session Ban Purge", () => {
  const sampleProviders: EnterpriseSsoProviderRecord[] = [
    {
      id: "sso_infosys",
      providerId: "oidc-infosys",
      organizationId: "org_infosys",
      organizationSlug: "infosys-academy",
      organizationType: "ENTERPRISE",
      domain: "infosys.com",
      issuer: "https://login.microsoftonline.com/infosys/v2.0",
      isVerified: true,
    },
    {
      id: "sso_iitb",
      providerId: "oidc-iitb",
      organizationId: "org_iitb",
      organizationSlug: "iit-bombay",
      organizationType: "UNIVERSITY",
      domain: "iitb.ac.in",
      issuer: "https://sso.iitb.ac.in/realms/main",
      isVerified: true,
    },
    {
      id: "sso_rogue_gmail",
      providerId: "oidc-rogue",
      organizationId: "org_rogue",
      organizationSlug: "rogue-corp",
      organizationType: "ENTERPRISE",
      domain: "gmail.com",
      issuer: "https://evil.example.com",
      isVerified: true,
    },
    {
      id: "sso_creator",
      providerId: "oidc-creator",
      organizationId: "org_creator",
      organizationSlug: "design-school",
      organizationType: "CREATOR",
      domain: "designschool.io",
      issuer: "https://sso.designschool.io",
      isVerified: true,
    },
  ];

  describe("resolveSignInStrategy (Dynamic B2B Domain Discovery)", () => {
    it("blocks personal email domains (gmail, outlook, yahoo, icloud) from claiming enterprise SSO", () => {
      for (const email of [
        "learner@gmail.com",
        "dev@outlook.com",
        "founder@yahoo.com",
        "student@icloud.com",
      ]) {
        const res = resolveSignInStrategy({
          email,
          providers: sampleProviders,
        });
        expect(res).toEqual({
          mode: "STANDARD_OAUTH_OR_PASSWORD",
          domain: email.split("@")[1],
          reason: "PERSONAL_EMAIL_DOMAIN",
        });
      }
    });

    it("resolves verified ENTERPRISE and UNIVERSITY domains to ENTERPRISE_OIDC with /org/<slug>/sso", () => {
      const enterpriseRes = resolveSignInStrategy({
        email: "Engineering.Lead@Infosys.com",
        providers: sampleProviders,
      });
      expect(enterpriseRes).toEqual({
        mode: "ENTERPRISE_OIDC",
        redirectUrl: "/org/infosys-academy/sso",
        providerId: "oidc-infosys",
        organizationSlug: "infosys-academy",
        domain: "infosys.com",
      });

      const universityRes = resolveSignInStrategy({
        email: "researcher@iitb.ac.in",
        providers: sampleProviders,
      });
      expect(universityRes).toEqual({
        mode: "ENTERPRISE_OIDC",
        redirectUrl: "/org/iit-bombay/sso",
        providerId: "oidc-iitb",
        organizationSlug: "iit-bombay",
        domain: "iitb.ac.in",
      });
    });

    it("rejects non-B2B tenant types (e.g. CREATOR) and unmatched corporate domains back to standard auth", () => {
      const creatorRes = resolveSignInStrategy({
        email: "instructor@designschool.io",
        providers: sampleProviders,
      });
      expect(creatorRes).toEqual({
        mode: "STANDARD_OAUTH_OR_PASSWORD",
        domain: "designschool.io",
        reason: "NON_B2B_ORGANIZATION_TYPE",
      });

      const unknownRes = resolveSignInStrategy({
        email: "cto@startup.dev",
        providers: sampleProviders,
      });
      expect(unknownRes).toEqual({
        mode: "STANDARD_OAUTH_OR_PASSWORD",
        domain: "startup.dev",
        reason: "NO_MATCHING_SSO_PROVIDER",
      });
    });
  });

  describe("assertTenantPortalAccess (Strict Multi-Tenant RBAC Guards)", () => {
    const creatorOrg = {
      id: "org_studio_1",
      slug: "system-design-hq",
      type: "CREATOR" as const,
    };
    const enterpriseOrg = {
      id: "org_ent_1",
      slug: "infosys-academy",
      type: "ENTERPRISE" as const,
    };

    it("strictly requires Organization.type === CREATOR on /studio/[slug]/* and blocks TA/INSTRUCTOR from billing/payout/coupon mutations", () => {
      // Wrong organization type denied
      expect(
        assertTenantPortalAccess({
          portal: "STUDIO",
          organization: enterpriseOrg,
          membershipRole: "OWNER",
        }).action
      ).toBe("DENY");

      // TA & INSTRUCTOR blocked from BILLING_MUTATION, PAYOUT_MUTATION, COUPON_MUTATION
      for (const role of ["TA", "INSTRUCTOR"] as const) {
        for (const operation of [
          "BILLING_MUTATION",
          "PAYOUT_MUTATION",
          "COUPON_MUTATION",
        ] as const) {
          const decision = assertTenantPortalAccess({
            portal: "STUDIO",
            operation,
            organization: creatorOrg,
            membershipRole: role,
          });
          expect(decision).toEqual({
            action: "DENY",
            code: "INSUFFICIENT_STUDIO_ROLE_FOR_FINANCIAL_MUTATION",
            message: expect.stringContaining(role),
          });
        }
      }

      // INSTRUCTOR allowed on CURRICULUM_MUTATION; OWNER allowed on PAYOUT_MUTATION
      expect(
        assertTenantPortalAccess({
          portal: "STUDIO",
          operation: "CURRICULUM_MUTATION",
          organization: creatorOrg,
          membershipRole: "INSTRUCTOR",
        }).action
      ).toBe("ALLOW");

      expect(
        assertTenantPortalAccess({
          portal: "STUDIO",
          operation: "PAYOUT_MUTATION",
          organization: creatorOrg,
          membershipRole: "OWNER",
        }).action
      ).toBe("ALLOW");
    });

    it("redirects plain learner MEMBER / LEARNER roles on /org/[slug]/* to /learn/org", () => {
      for (const learnerRole of ["MEMBER", "LEARNER"] as const) {
        const res = assertTenantPortalAccess({
          portal: "ORG",
          organization: enterpriseOrg,
          membershipRole: learnerRole,
        });
        expect(res).toEqual({
          action: "REDIRECT",
          to: "/learn/org",
          reason: "LEARNER_MEMBER_REDIRECT_TO_LEARN_PORTAL",
        });
      }

      // Enterprise ADMIN is allowed
      expect(
        assertTenantPortalAccess({
          portal: "ORG",
          organization: enterpriseOrg,
          membershipRole: "ADMIN",
        }).action
      ).toBe("ALLOW");
    });

    it("strictly requires MentorProfile.status === ACTIVE for /mentor/*", () => {
      expect(
        assertTenantPortalAccess({
          portal: "MENTOR",
          mentorProfile: { id: "mp_1", status: "SUSPENDED" },
        }).action
      ).toBe("DENY");

      expect(
        assertTenantPortalAccess({
          portal: "MENTOR",
          mentorProfile: null,
        }).action
      ).toBe("DENY");

      expect(
        assertTenantPortalAccess({
          portal: "MENTOR",
          mentorProfile: { id: "mp_1", status: "ACTIVE" },
        }).action
      ).toBe("ALLOW");
    });
  });

  describe("resolveDeepCourseEntitlement (Default-Deny OrgLicense & Sub-Route Guard)", () => {
    const now = new Date("2026-10-07T12:00:00Z");

    it("enforces default-deny: empty courseIds under ALLOWLIST grants access to 0 items", () => {
      const decision = resolveDeepCourseEntitlement({
        userId: "user_b2b_1",
        courseId: "course_rust_sys",
        subRoute: { kind: "LESSON", lessonId: "les_1", isPreview: false },
        enrollments: [],
        orgLicenses: [
          {
            licenseId: "lic_empty",
            organizationId: "org_ent_1",
            scopeMode: "ALLOWLIST",
            courseIds: [],
            validFrom: new Date("2026-01-01T00:00:00Z"),
            validUntil: new Date("2027-01-01T00:00:00Z"),
            seatRevokedAt: null,
          },
        ],
        now,
      });

      expect(decision).toEqual({
        entitled: false,
        reason: "NO_ENTITLEMENT_OR_EMPTY_ALLOWLIST",
      });
    });

    it("grants access when courseId is explicitly allowlisted and seat is active within validity window", () => {
      const decision = resolveDeepCourseEntitlement({
        userId: "user_b2b_1",
        courseId: "course_distributed_db",
        subRoute: { kind: "LESSON", lessonId: "les_wal", isPreview: false },
        enrollments: [],
        orgLicenses: [
          {
            licenseId: "lic_valid",
            organizationId: "org_ent_1",
            scopeMode: "ALLOWLIST",
            courseIds: ["course_distributed_db", "course_k8s_net"],
            validFrom: new Date("2026-01-01T00:00:00Z"),
            validUntil: new Date("2027-01-01T00:00:00Z"),
            seatRevokedAt: null,
          },
        ],
        now,
      });

      expect(decision).toEqual({
        entitled: true,
        grantSource: "ORG_LICENSE_ALLOWLIST",
        licenseId: "lic_valid",
      });
    });
  });

  describe("buildSessionBanPurgePlan (Immediate Dual-Store Session Purge)", () => {
    it("purges both PostgreSQL Session rows and Upstash Redis session keys when user.banned === true", () => {
      const plan = buildSessionBanPurgePlan({
        user: { id: "usr_bad_actor", banned: true },
        activeSessions: [
          { id: "sess_1", token: "tok_alpha_99" },
          { id: "sess_2", token: "tok_beta_42" },
        ],
      });

      expect(plan).toEqual({
        shouldPurge: true,
        userId: "usr_bad_actor",
        postgresDeleteWhere: { userId: "usr_bad_actor" },
        sessionIds: ["sess_1", "sess_2"],
        redisKeysToDelete: [
          "elluminar:user-sessions:usr_bad_actor",
          "better-auth:session:tok_alpha_99",
          "better-auth:session:tok_beta_42",
        ],
      });
    });
  });
});

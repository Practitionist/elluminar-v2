import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@elluminar/db";
import {
  DoubleEntryImbalanceError,
  PrismaCommerceRepository,
} from "@elluminar/db";
import {
  extractEmailDomain,
  isPersonalEmailDomain,
  resolveSignInStrategy,
} from "@elluminar/domain-identity";
import {
  DoubleEntryInvariantError,
  calculateIndiaGstBreakdown,
  computeCourseRevenueSplit,
  computeProjectEscrowSplit,
  createEscrowReleaseJournal,
  createProjectCaptureEscrowJournal,
  processZeroRupeeCheckout,
  validateTenantCoupon,
  verifyRazorpayWebhookSignature,
} from "@elluminar/domain-commerce";
import {
  computeAiTokenCreditDebit,
  reserveAiCreditsCas,
  settleAiCreditReservation,
} from "@elluminar/domain-ai-mentorship";
import { assertEnterpriseSsoDomainAllowed } from "../lib/auth";
import { apiApp } from "../server/app";
import {
  generateR2PresignedReplayUrl,
  generateR2PresignedUploadUrl,
  validateR2ObjectKey,
} from "../server/storage/r2-presigner";

describe("Phase 7A Deep Code Review, Security & Concurrency Audit Suite", () => {
  describe("1. Timing-Safe HMAC Webhook Verification & Mismatched Buffer Lengths", () => {
    const secret = "whsec_phase7a_audit_secret_999";
    const body = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_audit_001",
            order_id: "ord_audit_001",
          },
        },
      },
    });
    const validHex = createHmac("sha256", secret).update(body, "utf8").digest("hex");

    it("never throws RangeError on truncated, oversized, odd-length, or non-hex signatures", () => {
      for (const malformedSig of [
        "",
        "   ",
        "abc", // odd length & < 64 chars
        "deadbeef", // short even hex (4 bytes vs 32 bytes)
        validHex.slice(0, 62), // 31 bytes vs 32 bytes
        validHex + "00", // 33 bytes vs 32 bytes
        "z".repeat(64), // 64 non-hex chars
        "x".repeat(10_000), // oversized header
      ]) {
        expect(() =>
          verifyRazorpayWebhookSignature({
            rawBody: body,
            signature: malformedSig,
            webhookSecret: secret,
          })
        ).not.toThrow();

        expect(
          verifyRazorpayWebhookSignature({
            rawBody: body,
            signature: malformedSig,
            webhookSecret: secret,
          })
        ).toBe(false);
      }
    });

    it("accepts uppercase / whitespace-padded valid hex signatures and rejects 401 over HTTP on malformed headers", async () => {
      expect(
        verifyRazorpayWebhookSignature({
          rawBody: body,
          signature: `  ${validHex.toUpperCase()}  `,
          webhookSecret: secret,
        })
      ).toBe(true);

      const res = await apiApp.request("/api/v2/webhooks/razorpay", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-razorpay-signature": "short_non_hex_sig",
        },
        body,
      });

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.code).toBe("INVALID_RAZORPAY_HMAC_SIGNATURE");
    });
  });

  describe("2. Email & SSO Domain Normalization (Case, Trailing Dots, Subdomains, Punycode/IDN)", () => {
    it("normalizes uppercase, trailing DNS root dots, googlemail.com, and subdomains as personal domains", () => {
      expect(extractEmailDomain("  USER@GMAIL.COM  ")).toBe("gmail.com");
      expect(extractEmailDomain("user@googlemail.com.")).toBe("googlemail.com");
      expect(extractEmailDomain("ALICE@ACME.COM...")).toBe("acme.com");
      // Unicode IDN punycode canonicalization
      expect(extractEmailDomain("learner@bücher.example.com.")).toBe(
        "xn--bcher-kva.example.com"
      );

      for (const personalVariant of [
        "GMAIL.COM",
        "gmail.com.",
        "googlemail.com",
        "GOOGLEMAIL.COM.",
        "mail.gmail.com",
        "sub.googlemail.com",
        "dept.outlook.com.",
        "team.proton.me",
      ]) {
        expect(isPersonalEmailDomain(personalVariant)).toBe(true);
        expect(() => assertEnterpriseSsoDomainAllowed(personalVariant)).toThrow(
          /prohibited from Enterprise OIDC\/SAML SSO/
        );
      }
    });

    it("rejects multiple @ injection, leading/double dots, and blocks corrupted personal provider rows in resolveSignInStrategy", () => {
      expect(() => extractEmailDomain("evil@acme.com@gmail.com")).toThrow();
      expect(() => extractEmailDomain("user@.acme.com")).toThrow();
      expect(() => extractEmailDomain("user@acme..com")).toThrow();
      expect(() => extractEmailDomain("user@.")).toThrow();

      // Even if a provider list contains trailing dot or uppercase mismatch, valid enterprise matches cleanly
      const enterpriseStrategy = resolveSignInStrategy({
        email: "DEV@TECH-GCC.EXAMPLE.COM.",
        providers: [
          {
            id: "sso_1",
            providerId: "oidc-tech-gcc",
            organizationId: "org_1",
            organizationSlug: "tech-gcc-india",
            organizationType: "ENTERPRISE",
            domain: "tech-gcc.example.com.",
            issuer: "https://idp.tech-gcc.example.com",
            isVerified: true,
          },
        ],
      });
      expect(enterpriseStrategy).toEqual({
        mode: "ENTERPRISE_OIDC",
        redirectUrl: "/org/tech-gcc-india/sso",
        providerId: "oidc-tech-gcc",
        organizationSlug: "tech-gcc-india",
        domain: "tech-gcc.example.com",
      });
    });
  });

  describe("3. Cloudflare R2 Presigner Path Traversal & Unsafe Key Defense", () => {
    const maliciousKeys = [
      "../secret.json",
      "submissions/../../etc/passwd",
      "submissions/%2e%2e/secret.json",
      "submissions/%2f/bypass.png",
      "submissions/%5c/bypass.png",
      "/leading-slash/scene.json",
      "trailing-slash/scene.json/",
      "submissions//empty-segment.png",
      "submissions\\backslash.png",
      "submissions/null\x00byte.png",
    ];

    it("rejects path traversal and unsafe characters directly in validateR2ObjectKey, generateR2PresignedUploadUrl, and generateR2PresignedReplayUrl", async () => {
      for (const badKey of maliciousKeys) {
        expect(validateR2ObjectKey(badKey).valid).toBe(false);

        const uploadResult = await generateR2PresignedUploadUrl({
          objectKey: badKey,
          contentType: "application/json",
          contentLengthBytes: 256,
        });
        expect(uploadResult).toMatchObject({
          status: "REJECTED",
          code: "INVALID_OBJECT_KEY",
        });

        await expect(
          generateR2PresignedReplayUrl({
            objectKey: badKey,
          })
        ).rejects.toThrow(/INVALID_OBJECT_KEY/);
      }
    });

    it("rejects encoded path traversal and leading/double slashes at the /api/v2/storage HTTP routes", async () => {
      for (const badKey of [
        "submissions/../escape.json",
        "/leading/slash.json",
        "submissions//double.json",
        "submissions/%2e%2e/escape.json",
      ]) {
        const res = await apiApp.request("/api/v2/storage/presign-upload", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            objectKey: badKey,
            contentType: "application/json",
            contentLengthBytes: 512,
          }),
        });
        expect(res.status).toBe(400);
      }
    });
  });

  describe("4. Double-Entry Ledger Splits, Escrow Release, GST Rounding & Negative Amount Guards", () => {
    it("handles 1-paisa (1n) floor rounding in 3-way Project capture without zero-leg journal violation while preserving SUM === 0n", () => {
      const { journal, split } = createProjectCaptureEscrowJournal({
        orderId: "ord_1_paisa",
        buyerUserId: "usr_1",
        buyerClearingAccountId: "acc_buyer",
        mentorUserId: "usr_mentor",
        mentorEscrowAccountId: "acc_mentor_escrow",
        tenantOrganizationId: "org_tenant",
        tenantEscrowAccountId: "acc_tenant_escrow",
        platformAvailableAccountId: "acc_platform",
        netAmountMinor: 1n,
      });

      expect(split.mentorEscrowMinor).toBe(0n);
      expect(split.authorRoyaltyEscrowMinor).toBe(0n);
      expect(split.platformShareMinor).toBe(1n);
      expect(journal.entries).toHaveLength(2);
      expect(
        journal.entries.reduce((acc, e) => acc + e.amountMinor, 0n)
      ).toBe(0n);
    });

    it("supports mentor-only escrow release when authorRoyaltyEscrowMinor is 0n and rejects negative escrow amounts", () => {
      const journal = createEscrowReleaseJournal({
        projectInstanceId: "proj_inst_zero_royalty",
        verdict: "PASS",
        mentorUserId: "usr_mentor",
        mentorEscrowAccountId: "acc_mentor_escrow",
        mentorAvailableAccountId: "acc_mentor_avail",
        mentorEscrowMinor: 50_000n,
        tenantOrganizationId: "org_tenant",
        tenantEscrowAccountId: "acc_tenant_escrow",
        tenantAvailableAccountId: "acc_tenant_avail",
        authorRoyaltyEscrowMinor: 0n,
      });

      expect(journal.entries).toHaveLength(2);
      expect(
        journal.entries.reduce((acc, e) => acc + e.amountMinor, 0n)
      ).toBe(0n);

      expect(() =>
        createEscrowReleaseJournal({
          projectInstanceId: "proj_inst_neg",
          verdict: "PASS",
          mentorUserId: "usr_mentor",
          mentorEscrowAccountId: "acc_mentor_escrow",
          mentorAvailableAccountId: "acc_mentor_avail",
          mentorEscrowMinor: -100n,
          tenantOrganizationId: "org_tenant",
          tenantEscrowAccountId: "acc_tenant_escrow",
          tenantAvailableAccountId: "acc_tenant_avail",
          authorRoyaltyEscrowMinor: 100n,
        })
      ).toThrow(RangeError);
    });

    it("rejects negative coupon values, negative ₹0 checkouts, zero-amount DB journal entries, and empty GST state codes", async () => {
      expect(() =>
        validateTenantCoupon({
          coupon: {
            id: "cpn_neg",
            organizationId: "org_1",
            code: "SURCHARGE",
            discountType: "FIXED_MINOR",
            discountValue: -500n,
            maxRedemptions: null,
            redeemedCount: 0,
            expiresAt: null,
            isActive: true,
          },
          orderOrganizationId: "org_1",
          subtotalMinor: 10_000n,
        })
      ).toThrow(RangeError);

      expect(() =>
        processZeroRupeeCheckout({
          orderId: "ord_neg",
          subtotalMinor: -100n,
          discountMinor: -100n,
        })
      ).toThrow(RangeError);

      expect(() =>
        createProjectCaptureEscrowJournal({
          orderId: "ord_zero",
          buyerUserId: "usr_1",
          buyerClearingAccountId: "acc_buyer",
          mentorUserId: "usr_mentor",
          mentorEscrowAccountId: "acc_mentor_escrow",
          tenantOrganizationId: "org_tenant",
          tenantEscrowAccountId: "acc_tenant_escrow",
          platformAvailableAccountId: "acc_platform",
          netAmountMinor: 0n,
        })
      ).toThrow(DoubleEntryInvariantError);

      expect(() =>
        calculateIndiaGstBreakdown({
          taxableAmountMinor: 10_000n,
          supplierStateCode: "   ",
        })
      ).toThrow(/supplierStateCode/);

      // Verify exact integer floor invariants across course splits & GST
      const courseSplit = computeCourseRevenueSplit(999n, "STANDARD_80_20");
      expect(courseSplit.creatorShareMinor + courseSplit.platformShareMinor).toBe(999n);

      const projectSplit = computeProjectEscrowSplit(999n);
      expect(
        projectSplit.mentorEscrowMinor +
          projectSplit.authorRoyaltyEscrowMinor +
          projectSplit.platformShareMinor
      ).toBe(999n);

      const repo = new PrismaCommerceRepository({
        $transaction: vi.fn(),
      } as unknown as PrismaClient);

      await expect(
        repo.postBalancedDoubleEntryJournal({
          idempotencyKey: "zero_leg_attack",
          referenceType: "ORDER",
          referenceId: "ord_1",
          description: "Zero leg test",
          entries: [
            { accountId: "acc_1", amountMinor: 0n },
            { accountId: "acc_2", amountMinor: 0n },
          ],
        })
      ).rejects.toThrow(DoubleEntryImbalanceError);
    });
  });

  describe("5. AI Wallet Credit CAS Reservation & Over-Reservation Clamping", () => {
    it("clamps actualConsumedCredits > reservedCredits to reservedCredits without BigInt underflow", () => {
      const reserved = reserveAiCreditsCas({
        wallet: {
          walletId: "wlt_audit",
          userId: "usr_audit",
          balanceCredits: 100n,
          lockedCredits: 0n,
          version: 1,
          cumulativeConsumedCredits: 10n,
        },
        expectedBalanceCredits: 100n,
        expectedVersion: 1,
        estimatedMaxCredits: 40n,
        idempotencyKey: "req_clamp_test",
      });

      expect(reserved.status).toBe("RESERVED");
      if (reserved.status !== "RESERVED") throw new Error("Expected RESERVED");
      expect(reserved.nextWalletState.balanceCredits).toBe(60n);
      expect(reserved.nextWalletState.lockedCredits).toBe(40n);

      // Actual LLM usage (75n) exceeds reserved (40n): clamps debit to 40n, refunds 0n, never underflows balanceCredits
      const settled = settleAiCreditReservation({
        wallet: reserved.nextWalletState,
        expectedVersion: 2,
        reservedCredits: 40n,
        outcome: {
          status: "COMPLETED",
          actualConsumedCredits: 75n,
        },
      });

      expect(settled.status).toBe("SETTLED");
      if (settled.status !== "SETTLED") throw new Error("Expected SETTLED");
      expect(settled.consumedCredits).toBe(40n);
      expect(settled.refundedCredits).toBe(0n);
      expect(settled.nextWalletState.balanceCredits).toBe(60n);
      expect(settled.nextWalletState.lockedCredits).toBe(0n);
      expect(settled.nextWalletState.cumulativeConsumedCredits).toBe(50n);
      expect(settled.nextWalletState.version).toBe(3);
    });

    it("rejects negative token counts and negative rates in computeAiTokenCreditDebit", () => {
      expect(() =>
        computeAiTokenCreditDebit({
          inputTokens: -10,
          outputTokens: 100,
        })
      ).toThrow(RangeError);

      expect(() =>
        computeAiTokenCreditDebit({
          inputTokens: 100,
          outputTokens: 100,
          creditsPerThousandInputTokens: -2n,
        })
      ).toThrow(RangeError);
    });
  });
});

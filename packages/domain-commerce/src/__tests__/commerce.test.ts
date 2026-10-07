import { describe, expect, it } from "vitest";
import {
  calculateIndiaGstBreakdown,
  computeCourseRevenueSplit,
  computeProjectEscrowSplit,
  createBalancedJournal,
  createEscrowReleaseJournal,
  createFailedRefundCompensatingJournal,
  createProjectCaptureEscrowJournal,
  DoubleEntryInvariantError,
  EDTECH_SAC_CODE,
  extractStateCodeFromGstin,
  formatGaplessInvoiceNumber,
  processZeroRupeeCheckout,
  validateTenantCoupon,
} from "../index.js";

describe("@elluminar/domain-commerce — Double-Entry Ledger & GST Suite", () => {
  it("rejects unbalanced double-entry journals where SUM(entries) !== 0n", () => {
    expect(() =>
      createBalancedJournal({
        idempotencyKey: "bad-journal-1",
        referenceType: "ORDER",
        referenceId: "ord_1",
        description: "Unbalanced test",
        entries: [
          {
            accountId: "acc_1",
            ownerType: "USER",
            ownerId: "u_1",
            bucket: "AVAILABLE",
            amountMinor: -100000n,
          },
          {
            accountId: "acc_2",
            ownerType: "PLATFORM",
            ownerId: "ELLUMINAR",
            bucket: "AVAILABLE",
            amountMinor: 99999n,
          },
        ],
      })
    ).toThrow(DoubleEntryInvariantError);
  });

  it("computes deterministic 80/20 and 90/10 Course revenue splits with exact paisa conservation", () => {
    const standard = computeCourseRevenueSplit(499900n, "STANDARD_80_20");
    expect(standard.creatorShareMinor).toBe(399920n);
    expect(standard.platformShareMinor).toBe(99980n);
    expect(standard.creatorShareMinor + standard.platformShareMinor).toBe(499900n);

    const direct = computeCourseRevenueSplit(499900n, "CREATOR_DIRECT_90_10");
    expect(direct.creatorShareMinor).toBe(449910n);
    expect(direct.platformShareMinor).toBe(49990n);
    expect(direct.creatorShareMinor + direct.platformShareMinor).toBe(499900n);
  });

  it("enforces 3-way Project Escrow Split (50% Mentor Escrow + 15% Author IP Royalty Escrow + 35% Platform)", () => {
    const { journal, split } = createProjectCaptureEscrowJournal({
      orderId: "ord_proj_101",
      buyerUserId: "usr_learner_1",
      buyerClearingAccountId: "acc_buyer_clear",
      mentorUserId: "usr_mentor_1",
      mentorEscrowAccountId: "acc_mentor_escrow",
      tenantOrganizationId: "org_creator_1",
      tenantEscrowAccountId: "acc_author_escrow",
      platformAvailableAccountId: "acc_platform_avail",
      netAmountMinor: 1000000n, // ₹10,000.00 in paisa
    });

    expect(split.mentorEscrowMinor).toBe(500000n); // 50%
    expect(split.authorRoyaltyEscrowMinor).toBe(150000n); // 15%
    expect(split.platformShareMinor).toBe(350000n); // 35%
    expect(
      split.mentorEscrowMinor +
        split.authorRoyaltyEscrowMinor +
        split.platformShareMinor
    ).toBe(1000000n);

    const totalJournalSum = journal.entries.reduce(
      (acc, e) => acc + e.amountMinor,
      0n
    );
    expect(totalJournalSum).toBe(0n);
  });

  it("releases ESCROW_LOCKED to AVAILABLE on final PASS and blocks premature release on CHANGES_REQUESTED", () => {
    expect(() =>
      createEscrowReleaseJournal({
        projectInstanceId: "pi_1",
        verdict: "CHANGES_REQUESTED",
        mentorUserId: "usr_mentor_1",
        mentorEscrowAccountId: "acc_m_esc",
        mentorAvailableAccountId: "acc_m_avail",
        mentorEscrowMinor: 500000n,
        tenantOrganizationId: "org_1",
        tenantEscrowAccountId: "acc_t_esc",
        tenantAvailableAccountId: "acc_t_avail",
        authorRoyaltyEscrowMinor: 150000n,
      })
    ).toThrow(DoubleEntryInvariantError);

    const passRelease = createEscrowReleaseJournal({
      projectInstanceId: "pi_1",
      verdict: "PASS",
      mentorUserId: "usr_mentor_1",
      mentorEscrowAccountId: "acc_m_esc",
      mentorAvailableAccountId: "acc_m_avail",
      mentorEscrowMinor: 500000n,
      tenantOrganizationId: "org_1",
      tenantEscrowAccountId: "acc_t_esc",
      tenantAvailableAccountId: "acc_t_avail",
      authorRoyaltyEscrowMinor: 150000n,
    });

    const sum = passRelease.entries.reduce((acc, e) => acc + e.amountMinor, 0n);
    expect(sum).toBe(0n);
    expect(passRelease.entries).toHaveLength(4);
  });

  it("blocks cross-tenant coupon attacks, handles ₹0 free checkout, and generates failed-refund compensating reversals", () => {
    const crossTenantAttempt = validateTenantCoupon({
      coupon: {
        id: "cpn_1",
        organizationId: "org_alpha",
        code: "FREE100",
        discountType: "PERCENTAGE_BPS",
        discountValue: 10000n,
        maxRedemptions: 100,
        redeemedCount: 5,
        expiresAt: null,
        isActive: true,
      },
      orderOrganizationId: "org_beta",
      subtotalMinor: 250000n,
    });
    expect(crossTenantAttempt).toEqual({
      valid: false,
      reason: "TENANT_MISMATCH",
    });

    const validFullDiscount = validateTenantCoupon({
      coupon: {
        id: "cpn_1",
        organizationId: "org_alpha",
        code: "FREE100",
        discountType: "PERCENTAGE_BPS",
        discountValue: 10000n,
        maxRedemptions: 100,
        redeemedCount: 5,
        expiresAt: null,
        isActive: true,
      },
      orderOrganizationId: "org_alpha",
      subtotalMinor: 250000n,
    });
    expect(validFullDiscount).toEqual({
      valid: true,
      couponId: "cpn_1",
      discountMinor: 250000n,
      netSubtotalMinor: 0n,
    });

    const freeCheckout = processZeroRupeeCheckout({
      orderId: "ord_free_1",
      subtotalMinor: 250000n,
      discountMinor: 250000n,
    });
    expect(freeCheckout.status).toBe("FREE_COMPLETED");
    expect(freeCheckout.gateway).toBe("FREE_CHECKOUT");
    expect(freeCheckout.totalMinor).toBe(0n);

    // Failed refund compensating journal test
    const preRefundJournal = createBalancedJournal({
      idempotencyKey: "refund-lock:rf_1",
      referenceType: "REFUND",
      referenceId: "rf_1",
      description: "Lock creator balance prior to gateway refund",
      entries: [
        {
          accountId: "acc_creator_avail",
          ownerType: "TENANT",
          ownerId: "org_alpha",
          bucket: "AVAILABLE",
          amountMinor: -80000n,
        },
        {
          accountId: "acc_platform_avail",
          ownerType: "PLATFORM",
          ownerId: "ELLUMINAR",
          bucket: "AVAILABLE",
          amountMinor: -20000n,
        },
        {
          accountId: "acc_refund_clearing",
          ownerType: "USER",
          ownerId: "usr_1",
          bucket: "ESCROW_LOCKED",
          amountMinor: 100000n,
        },
      ],
    });

    const compensating = createFailedRefundCompensatingJournal({
      refundId: "rf_1",
      originalPreRefundJournal: preRefundJournal,
      failureReason: "GATEWAY_BANK_ACCOUNT_CLOSED",
    });

    expect(
      compensating.entries.reduce((acc, e) => acc + e.amountMinor, 0n)
    ).toBe(0n);
    expect(compensating.entries[0]?.amountMinor).toBe(80000n);
    expect(compensating.entries[2]?.amountMinor).toBe(-100000n);
  });

  it("computes India B2B GST (SAC 999293) Intra-State CGST 9% + SGST 9% vs Inter-State IGST 18%", () => {
    expect(extractStateCodeFromGstin("29AABCE1234F1Z5")).toBe("29");

    // Intra-State: Karnataka (29) -> Karnataka (29)
    const intraState = calculateIndiaGstBreakdown({
      taxableAmountMinor: 1000000n, // ₹10,000.00
      supplierStateCode: "29",
      buyerGstin: "29AABCE1234F1Z5",
    });
    expect(intraState.sacCode).toBe(EDTECH_SAC_CODE);
    expect(intraState.isInterState).toBe(false);
    expect(intraState.cgstAmountMinor).toBe(90000n); // ₹900
    expect(intraState.sgstAmountMinor).toBe(90000n); // ₹900
    expect(intraState.igstAmountMinor).toBe(0n);
    expect(intraState.totalInvoiceAmountMinor).toBe(1180000n); // ₹11,800

    // Inter-State: Karnataka (29) -> Maharashtra (27)
    const interState = calculateIndiaGstBreakdown({
      taxableAmountMinor: 1000000n,
      supplierStateCode: "29",
      buyerGstin: "27AABCM9876K1Z2",
    });
    expect(interState.isInterState).toBe(true);
    expect(interState.cgstAmountMinor).toBe(0n);
    expect(interState.sgstAmountMinor).toBe(0n);
    expect(interState.igstAmountMinor).toBe(180000n); // ₹1,800
    expect(interState.totalInvoiceAmountMinor).toBe(1180000n);

    expect(
      formatGaplessInvoiceNumber({
        prefix: "INV",
        financialYear: "2026-27",
        sequenceNumber: 42,
      })
    ).toBe("ELM/INV/2026-27/000042");
  });
});

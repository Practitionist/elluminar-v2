import { describe, expect, it } from "vitest";
import {
  resolveDeepCourseEntitlement,
  resolveSignInStrategy,
  type EnterpriseSsoProviderRecord,
} from "@elluminar/domain-identity";
import {
  calculateIndiaGstBreakdown,
  createEscrowReleaseJournal,
  createInMemoryWebhookOutboxStore,
  createProjectCaptureEscrowJournal,
  evaluateWebhookOutboxIdempotency,
  executeCasOrderTransition,
  formatGaplessInvoiceNumber,
  reserveCohortSeatCas,
  type CasCohortSnapshot,
  type CasOrderSnapshot,
} from "@elluminar/domain-commerce";
import { extractExcalidrawTopology } from "@elluminar/domain-artifacts";
import {
  computeMaxSkuAiCreditCeiling,
  orchestrateMilestoneReviewPipeline,
  reserveAiCreditsCas,
  settleAiCreditReservation,
  type AiWalletSnapshot,
  type DurableMilestoneStepId,
  type RubricCriterionDefinition,
} from "@elluminar/domain-ai-mentorship";

describe("@elluminar/web — End-to-End Hexagonal Lifecycle Verification Suite", () => {
  it("executes the full 6-stage enterprise B2B -> checkout CAS -> GST double-entry -> AI wallet CAS -> 4-step SLA -> escrow release invariant chain", async () => {
    const fixedNow = new Date("2026-10-08T01:00:00.000Z");

    // =========================================================================
    // STAGE 1: Dynamic B2B SSO Discovery & Default-Deny OrgLicense Entitlements
    // =========================================================================
    const ssoProviders: EnterpriseSsoProviderRecord[] = [
      {
        id: "sso_prov_razorpay_eng",
        providerId: "oidc-razorpay-corp",
        organizationId: "org_enterprise_fin",
        organizationSlug: "fin-enterprise",
        organizationType: "ENTERPRISE",
        domain: "fin-enterprise.io",
        issuer: "https://idp.fin-enterprise.io/oauth2/default",
        isVerified: true,
      },
    ];

    const personalDomainStrategy = resolveSignInStrategy({
      email: "learner@gmail.com",
      providers: ssoProviders,
    });
    expect(personalDomainStrategy).toEqual({
      mode: "STANDARD_OAUTH_OR_PASSWORD",
      domain: "gmail.com",
      reason: "PERSONAL_EMAIL_DOMAIN",
    });

    const enterpriseSsoStrategy = resolveSignInStrategy({
      email: "staff.eng@fin-enterprise.io",
      providers: ssoProviders,
    });
    expect(enterpriseSsoStrategy).toEqual({
      mode: "ENTERPRISE_OIDC",
      redirectUrl: "/org/fin-enterprise/sso",
      providerId: "oidc-razorpay-corp",
      organizationSlug: "fin-enterprise",
      domain: "fin-enterprise.io",
    });

    // Verify strict Default-Deny on ALLOWLIST when courseIds is empty
    const deniedEmptyAllowlist = resolveDeepCourseEntitlement({
      userId: "usr_staff_learner_1",
      courseId: "crs_distributed_ledger_v2",
      enrollments: [],
      orgLicenses: [
        {
          licenseId: "lic_default_deny_empty",
          organizationId: "org_enterprise_fin",
          scopeMode: "ALLOWLIST",
          courseIds: [],
          validFrom: new Date("2026-01-01T00:00:00.000Z"),
          validUntil: new Date("2027-01-01T00:00:00.000Z"),
        },
      ],
      now: fixedNow,
    });
    expect(deniedEmptyAllowlist).toEqual({
      entitled: false,
      reason: "NO_ENTITLEMENT_OR_EMPTY_ALLOWLIST",
    });

    // Verify explicit ALLOWLIST grant when courseId is explicitly provisioned
    const grantedAllowlist = resolveDeepCourseEntitlement({
      userId: "usr_staff_learner_1",
      courseId: "crs_distributed_ledger_v2",
      enrollments: [],
      orgLicenses: [
        {
          licenseId: "lic_explicit_allow",
          organizationId: "org_enterprise_fin",
          scopeMode: "ALLOWLIST",
          courseIds: ["crs_distributed_ledger_v2"],
          validFrom: new Date("2026-01-01T00:00:00.000Z"),
          validUntil: new Date("2027-01-01T00:00:00.000Z"),
        },
      ],
      now: fixedNow,
    });
    expect(grantedAllowlist).toEqual({
      entitled: true,
      grantSource: "ORG_LICENSE_ALLOWLIST",
      licenseId: "lic_explicit_allow",
    });

    // =========================================================================
    // STAGE 2: Optimistic CAS Cohort Seat Reservation + Idempotent Webhook Outbox
    // =========================================================================
    const cohortSnapshot: CasCohortSnapshot = {
      id: "coh_oct_2026_intensive",
      courseId: "crs_distributed_ledger_v2",
      capacity: 25,
      enrolledCount: 24,
      status: "ACTIVE",
      version: 4,
    };

    const seatReservation = reserveCohortSeatCas({
      cohort: cohortSnapshot,
      expectedVersion: 4,
      quantity: 1,
    });
    expect(seatReservation).toEqual({
      outcome: "RESERVED",
      rowsUpdated: 1,
      cohortId: "coh_oct_2026_intensive",
      enrolledCount: 25,
      remainingSeats: 0,
      nextVersion: 5,
    });

    // Next concurrent checkout attempt on full cohort is deterministically rejected
    const overflowSeatAttempt = reserveCohortSeatCas({
      cohort: cohortSnapshot,
      expectedVersion: 5,
      quantity: 1,
    });
    expect(overflowSeatAttempt.outcome).toBe("REJECTED_COHORT_FULL");

    const orderSnapshot: CasOrderSnapshot = {
      id: "ord_e2e_lifecycle_001",
      status: "PENDING",
      version: 1,
    };
    const outboxStore = createInMemoryWebhookOutboxStore();

    // First webhook delivery wins optimistic CAS (`PENDING -> PAID`, v1 -> v2)
    const firstFulfillment = evaluateWebhookOutboxIdempotency({
      source: "RAZORPAY_WEBHOOK",
      order: orderSnapshot,
      expectedVersion: 1,
      gatewayPaymentId: "pay_rzp_live_999111",
      outboxStore,
    });
    expect(firstFulfillment.decision).toBe("EXECUTE_FULFILLMENT_ONCE");
    if (firstFulfillment.decision !== "EXECUTE_FULFILLMENT_ONCE") {
      throw new Error("Expected EXECUTE_FULFILLMENT_ONCE");
    }
    expect(firstFulfillment.nextOrderVersion).toBe(2);
    expect(firstFulfillment.shouldPostLedgerJournal).toBe(true);
    expect(firstFulfillment.shouldGenerateTaxInvoice).toBe(true);

    // Concurrent browser callback with same payment skips duplicate ledger & invoice writes
    const duplicateBrowserConfirm = evaluateWebhookOutboxIdempotency({
      source: "BROWSER_CONFIRM_CHECKOUT",
      order: orderSnapshot,
      expectedVersion: 1,
      gatewayPaymentId: "pay_rzp_live_999111",
      outboxStore,
    });
    expect(duplicateBrowserConfirm).toEqual({
      decision: "SKIP_DUPLICATE_IDEMPOTENT",
      rowsUpdated: 0,
      orderId: "ord_e2e_lifecycle_001",
      gatewayPaymentId: "pay_rzp_live_999111",
      source: "BROWSER_CONFIRM_CHECKOUT",
      winningSource: "RAZORPAY_WEBHOOK",
      shouldPostLedgerJournal: false,
      shouldGenerateTaxInvoice: false,
      journalIdempotencyKey: "capture-journal:ord_e2e_lifecycle_001",
      invoiceIdempotencyKey: "tax-invoice:ord_e2e_lifecycle_001",
    });

    // Verify direct CAS transition rejects illegal terminal transition (`PAID -> PENDING`)
    const illegalRegression = executeCasOrderTransition({
      current: orderSnapshot,
      expectedStatus: "PAID",
      expectedVersion: 2,
      targetStatus: "PENDING",
    });
    expect(illegalRegression.outcome).toBe("REJECTED_ILLEGAL_TRANSITION");

    // =========================================================================
    // STAGE 3: True Double-Entry Capture Journal (SUM === 0n) & India B2B GST
    // =========================================================================
    const netAmountMinor = 2_000_000n; // ₹20,000.00 net cohort project fee

    const gstInvoiceBreakdown = calculateIndiaGstBreakdown({
      taxableAmountMinor: netAmountMinor,
      supplierStateCode: "29", // Karnataka
      buyerGstin: "27AABCF9876K1Z4", // Maharashtra (Inter-State B2B)
    });
    expect(gstInvoiceBreakdown.sacCode).toBe("999293");
    expect(gstInvoiceBreakdown.isInterState).toBe(true);
    expect(gstInvoiceBreakdown.igstRateBps).toBe(1800);
    expect(gstInvoiceBreakdown.igstAmountMinor).toBe(360_000n); // ₹3,600.00 IGST
    expect(gstInvoiceBreakdown.totalInvoiceAmountMinor).toBe(2_360_000n);

    const invoiceNumber = formatGaplessInvoiceNumber({
      prefix: "INV",
      financialYear: "2026-27",
      sequenceNumber: 108,
    });
    expect(invoiceNumber).toBe("ELM/INV/2026-27/000108");

    const { journal: captureJournal, split: projectSplit } =
      createProjectCaptureEscrowJournal({
        orderId: orderSnapshot.id,
        buyerUserId: "usr_staff_learner_1",
        buyerClearingAccountId: "acct_buyer_clearing",
        mentorUserId: "usr_principal_mentor_9",
        mentorEscrowAccountId: "acct_mentor_escrow_locked",
        tenantOrganizationId: "org_creator_studio_alpha",
        tenantEscrowAccountId: "acct_tenant_escrow_locked",
        platformAvailableAccountId: "acct_platform_available",
        netAmountMinor,
      });

    expect(projectSplit.mentorEscrowMinor).toBe(1_000_000n); // 50%
    expect(projectSplit.authorRoyaltyEscrowMinor).toBe(300_000n); // 15%
    expect(projectSplit.platformShareMinor).toBe(700_000n); // 35%

    const captureSum = captureJournal.entries.reduce(
      (sum, entry) => sum + entry.amountMinor,
      0n
    );
    expect(captureSum).toBe(0n);

    // =========================================================================
    // STAGE 4: Excalidraw Topology Extraction + Pre-Call CAS AiWallet Reservation
    // =========================================================================
    const extractedTopology = extractExcalidrawTopology({
      type: "excalidraw",
      elements: [
        {
          id: "node_api_gw",
          type: "rectangle",
          x: 50,
          y: 100,
          text: "Edge API Gateway",
        },
        {
          id: "node_ledger_pg",
          type: "rectangle",
          x: 320,
          y: 100,
          text: "Serializable Postgres Ledger",
        },
        {
          id: "edge_rpc_1",
          type: "arrow",
          x: 180,
          y: 120,
          startBinding: { elementId: "node_api_gw" },
          endBinding: { elementId: "node_ledger_pg" },
          text: "CAS Write",
        },
      ],
    });
    expect(extractedTopology.nodeCount).toBe(2);
    expect(extractedTopology.edgeCount).toBe(1);
    expect(extractedTopology.danglingArrowCount).toBe(0);

    // 8% SKU COGS Ceiling on ₹20,000.00 (2,000,000 paisa) at 10 paisa/credit = 16,000 credits max
    const maxSkuCredits = computeMaxSkuAiCreditCeiling({
      grossSkuPriceMinor: netAmountMinor,
    });
    expect(maxSkuCredits).toBe(16_000n);

    const initialWallet: AiWalletSnapshot = {
      walletId: "wal_learner_e2e_1",
      userId: "usr_staff_learner_1",
      enrollmentId: "enr_e2e_1",
      balanceCredits: 5_000n,
      lockedCredits: 0n,
      version: 1,
      cumulativeConsumedCredits: 0n,
    };

    const creditReservation = reserveAiCreditsCas({
      wallet: initialWallet,
      expectedBalanceCredits: 5_000n,
      expectedVersion: 1,
      estimatedMaxCredits: 400n,
      idempotencyKey: "ai-pregrade-sub-001",
      maxSkuCogsCeilingCredits: maxSkuCredits,
    });
    expect(creditReservation.status).toBe("RESERVED");
    if (creditReservation.status !== "RESERVED") {
      throw new Error("Expected AI credits RESERVED");
    }
    expect(creditReservation.nextWalletState.balanceCredits).toBe(4_600n);
    expect(creditReservation.nextWalletState.lockedCredits).toBe(400n);
    expect(creditReservation.nextWalletState.version).toBe(2);

    // =========================================================================
    // STAGE 5: Upstash 4-Step Durable Milestone SLA Pipeline & Unused Credit Delta Settlement
    // =========================================================================
    const rubricCriteria: RubricCriterionDefinition[] = [
      {
        id: "crit_cas_safety",
        title: "Optimistic CAS Safety & Zero Oversell",
        weightBps: 5000,
        maxScore: 10,
      },
      {
        id: "crit_double_entry",
        title: "Balanced Zero-Sum Journal Integrity",
        weightBps: 5000,
        maxScore: 10,
      },
    ];

    const recordedSteps: DurableMilestoneStepId[] = [];
    let primaryMentorNotified = false;

    const workflowOutcome = await orchestrateMilestoneReviewPipeline({
      submissionId: "sub_e2e_milestone_1",
      mentorshipTier: "TIER_2", // Intensive Cohort -> 24h SLA (86,400s)
      submittedAtIso: "2026-10-08T01:00:00.000Z",
      primaryMentorId: "usr_principal_mentor_9",
      preGraderInput: {
        rubricId: "rub_e2e_ledger",
        passingScoreBps: 7500,
        rubricCriteria,
        excalidrawTopology: extractedTopology,
        draftCriterionEvaluations: [
          {
            criterionId: "crit_cas_safety",
            awardedScore: 9,
            rationale: "Clean CAS version predicates verified.",
          },
          {
            criterionId: "crit_double_entry",
            awardedScore: 9,
            rationale: "Strict zero-sum BigInt ledger verified.",
          },
        ],
      },
      resolveReviewStatusAfterSlaSleep: "COMPLETED",
      onNotifyPrimaryMentor: () => {
        primaryMentorNotified = true;
      },
      stepRunner: {
        async runStep(stepId, fn) {
          recordedSteps.push(stepId);
          return await fn();
        },
        async sleepForSeconds() {
          // Deterministic fast-forward in test runner
        },
      },
    });

    expect(primaryMentorNotified).toBe(true);
    expect(workflowOutcome.status).toBe("COMPLETED_WITHIN_SLA");
    expect(workflowOutcome.executedSteps).toEqual([
      "STEP_1_COMPLETENESS_GATE",
      "STEP_2_AI_FIRST_PASS_BRIEF",
      "STEP_3_NOTIFY_PRIMARY_MENTOR",
      "STEP_4_SLA_SLEEP_AND_ESCALATE",
    ]);
    expect(recordedSteps).toEqual([
      "STEP_1_COMPLETENESS_GATE",
      "STEP_2_AI_FIRST_PASS_BRIEF",
      "STEP_3_NOTIFY_PRIMARY_MENTOR",
      "STEP_4_SLA_SLEEP_AND_ESCALATE",
    ]);
    expect(workflowOutcome.slaDeadline?.slaHours).toBe(24);
    expect(workflowOutcome.rubricOutcome?.verdict).toBe("PASS");
    expect(workflowOutcome.rubricOutcome?.scoreBps).toBe(9000);

    // Settle unused AI credit reservation delta (`400n reserved - 140n actual = +260n refunded`)
    const walletSettlement = settleAiCreditReservation({
      wallet: creditReservation.nextWalletState,
      expectedVersion: 2,
      reservedCredits: 400n,
      outcome: {
        status: "COMPLETED",
        actualConsumedCredits: 140n,
      },
    });
    expect(walletSettlement.status).toBe("SETTLED");
    if (walletSettlement.status !== "SETTLED") {
      throw new Error("Expected AI wallet reservation SETTLED");
    }
    expect(walletSettlement.refundedCredits).toBe(260n);
    expect(walletSettlement.nextWalletState.balanceCredits).toBe(4_860n);
    expect(walletSettlement.nextWalletState.lockedCredits).toBe(0n);
    expect(walletSettlement.nextWalletState.cumulativeConsumedCredits).toBe(
      140n
    );
    expect(walletSettlement.nextWalletState.version).toBe(3);

    // =========================================================================
    // STAGE 6: Final Escrow-to-Available Release on Mentor PASS Sign-Off
    // =========================================================================
    const escrowReleaseJournal = createEscrowReleaseJournal({
      projectInstanceId: "proj_inst_e2e_001",
      verdict: "PASS",
      mentorUserId: "usr_principal_mentor_9",
      mentorEscrowAccountId: "acct_mentor_escrow_locked",
      mentorAvailableAccountId: "acct_mentor_available",
      mentorEscrowMinor: projectSplit.mentorEscrowMinor,
      tenantOrganizationId: "org_creator_studio_alpha",
      tenantEscrowAccountId: "acct_tenant_escrow_locked",
      tenantAvailableAccountId: "acct_tenant_available",
      authorRoyaltyEscrowMinor: projectSplit.authorRoyaltyEscrowMinor,
    });

    expect(escrowReleaseJournal.entries).toHaveLength(4);
    const releaseSum = escrowReleaseJournal.entries.reduce(
      (sum, entry) => sum + entry.amountMinor,
      0n
    );
    expect(releaseSum).toBe(0n);

    const mentorAvailableCredit = escrowReleaseJournal.entries.find(
      (e) =>
        e.ownerType === "MENTOR" &&
        e.bucket === "AVAILABLE" &&
        e.accountId === "acct_mentor_available"
    );
    const authorAvailableCredit = escrowReleaseJournal.entries.find(
      (e) =>
        e.ownerType === "TENANT" &&
        e.bucket === "AVAILABLE" &&
        e.accountId === "acct_tenant_available"
    );
    expect(mentorAvailableCredit?.amountMinor).toBe(1_000_000n);
    expect(authorAvailableCredit?.amountMinor).toBe(300_000n);
  });
});

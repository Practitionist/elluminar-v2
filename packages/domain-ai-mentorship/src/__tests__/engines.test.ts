import { describe, expect, it, vi } from "vitest";
import {
  buildEngine1MultimodalCritiqueSpec,
  buildEngine2PreGraderAndMentorBrief,
  buildEngine3AdversarialDefensePlan,
  computeMaxSkuAiCreditCeiling,
  computeMilestoneSlaDeadline,
  orchestrateMilestoneReviewPipeline,
  reserveAiCreditsCas,
  selectGeminiModelForEngine,
  settleAiCreditReservation,
  type AiWalletSnapshot,
  type DurableMilestoneStepId,
  type RubricCriterionDefinition,
} from "../index";

const SAMPLE_RUBRIC: readonly RubricCriterionDefinition[] = [
  {
    id: "crit_topology",
    title: "Fault-Tolerant Service Topology",
    weightBps: 6000,
    maxScore: 10,
  },
  {
    id: "crit_economics",
    title: "Dynamic Unit Economics & Backpressure",
    weightBps: 4000,
    maxScore: 10,
  },
];

describe("Pre-Call Optimistic CAS AiWallet Reservation & Settlement", () => {
  const baseWallet: AiWalletSnapshot = {
    walletId: "wal_101",
    userId: "usr_learner_1",
    enrollmentId: "enr_cohort_1",
    balanceCredits: 500n,
    lockedCredits: 0n,
    cumulativeConsumedCredits: 100n,
    version: 3,
  };

  it("computes exact 8% gross SKU COGS ceiling in integer credits", () => {
    // ₹10,000 SKU = 1,000,000 paisa -> 8% COGS = 80,000 paisa -> at 10 paisa/credit = 8,000 credits
    const maxCredits = computeMaxSkuAiCreditCeiling({
      grossSkuPriceMinor: 1_000_000n,
    });
    expect(maxCredits).toBe(8000n);
  });

  it("reserves max estimated credits with optimistic CAS and settles unused delta atomically on completion", () => {
    const reservation = reserveAiCreditsCas({
      wallet: baseWallet,
      expectedBalanceCredits: 500n,
      expectedVersion: 3,
      estimatedMaxCredits: 120n,
      idempotencyKey: "req_critique_1",
      maxSkuCogsCeilingCredits: 8000n,
    });

    expect(reservation.status).toBe("RESERVED");
    if (reservation.status !== "RESERVED") return;

    expect(reservation.reservedCredits).toBe(120n);
    expect(reservation.nextWalletState.balanceCredits).toBe(380n);
    expect(reservation.nextWalletState.lockedCredits).toBe(120n);
    expect(reservation.nextWalletState.version).toBe(4);

    // Settle after Gemini consumes only 75 credits out of 120 reserved (refunds 45 credits)
    const settlement = settleAiCreditReservation({
      wallet: reservation.nextWalletState,
      expectedVersion: 4,
      reservedCredits: 120n,
      outcome: {
        status: "COMPLETED",
        actualConsumedCredits: 75n,
      },
    });

    expect(settlement.status).toBe("SETTLED");
    if (settlement.status !== "SETTLED") return;

    expect(settlement.settlementKind).toBe("PARTIAL_OR_EXACT_DEBIT");
    expect(settlement.consumedCredits).toBe(75n);
    expect(settlement.refundedCredits).toBe(45n);
    expect(settlement.nextWalletState.balanceCredits).toBe(425n); // 380 + 45 unused refund
    expect(settlement.nextWalletState.lockedCredits).toBe(0n);
    expect(settlement.nextWalletState.cumulativeConsumedCredits).toBe(175n);
    expect(settlement.nextWalletState.version).toBe(5);
  });

  it("refunds 100% of reserved credits atomically when Gemini call fails", () => {
    const lockedWallet: AiWalletSnapshot = {
      ...baseWallet,
      balanceCredits: 380n,
      lockedCredits: 120n,
      version: 4,
    };

    const settlement = settleAiCreditReservation({
      wallet: lockedWallet,
      expectedVersion: 4,
      reservedCredits: 120n,
      outcome: {
        status: "FAILED",
        errorReason: "UPSTREAM_GEMINI_503_TIMEOUT",
      },
    });

    expect(settlement.status).toBe("SETTLED");
    if (settlement.status !== "SETTLED") return;

    expect(settlement.settlementKind).toBe("FULL_FAILURE_REFUND");
    expect(settlement.consumedCredits).toBe(0n);
    expect(settlement.refundedCredits).toBe(120n);
    expect(settlement.nextWalletState.balanceCredits).toBe(500n);
    expect(settlement.nextWalletState.lockedCredits).toBe(0n);
    expect(settlement.nextWalletState.version).toBe(5);
  });

  it("rejects CAS version/balance mismatches, insufficient balances, and 8% COGS ceiling breaches", () => {
    const casConflict = reserveAiCreditsCas({
      wallet: baseWallet,
      expectedBalanceCredits: 500n,
      expectedVersion: 2, // stale version
      estimatedMaxCredits: 50n,
      idempotencyKey: "req_stale",
    });
    expect(casConflict.status).toBe("CAS_CONFLICT");

    const insufficient = reserveAiCreditsCas({
      wallet: baseWallet,
      expectedBalanceCredits: 500n,
      expectedVersion: 3,
      estimatedMaxCredits: 600n,
      idempotencyKey: "req_too_large",
    });
    expect(insufficient).toEqual({
      status: "REJECTED",
      code: "INSUFFICIENT_AI_CREDITS",
      availableBalanceCredits: 500n,
      requiredCredits: 600n,
    });

    const cogsExceeded = reserveAiCreditsCas({
      wallet: baseWallet, // cumulativeConsumedCredits = 100n
      expectedBalanceCredits: 500n,
      expectedVersion: 3,
      estimatedMaxCredits: 80n,
      idempotencyKey: "req_cogs_cap",
      maxSkuCogsCeilingCredits: 150n, // 100 + 80 = 180 > 150 ceiling
    });
    expect(cogsExceeded).toEqual({
      status: "REJECTED",
      code: "SKU_COGS_CEILING_EXCEEDED",
      availableBalanceCredits: 500n,
      maxSkuCogsCeilingCredits: 150n,
    });
  });
});

describe("Tiered Gemini Model Router & 3 Outcome AI Engines", () => {
  it("routes Engine 1 & Engine 2 to gemini-2.5-flash with prefix caching and reserves gemini-2.5-pro for Engine 3", () => {
    const e1 = selectGeminiModelForEngine("ENGINE_1_ARTIFACT_CRITIC");
    const e2 = selectGeminiModelForEngine("ENGINE_2_MILESTONE_PREGRADER");
    const e3 = selectGeminiModelForEngine("ENGINE_3_DEFENSE_GENERATOR");

    expect(e1.modelId).toBe("gemini-2.5-flash");
    expect(e1.enableImplicitRubricPrefixCaching).toBe(true);

    expect(e2.modelId).toBe("gemini-2.5-flash");
    expect(e2.enableImplicitRubricPrefixCaching).toBe(true);

    expect(e3.modelId).toBe("gemini-2.5-pro");
  });

  it("constructs Engine 1 Socratic multimodal critique spec with Excalidraw topology + Spreadsheet AST", () => {
    const spec = buildEngine1MultimodalCritiqueSpec({
      rubricId: "rub_sysdesign_01",
      rubricCriteria: SAMPLE_RUBRIC,
      excalidrawTopology: {
        nodeCount: 2,
        edgeCount: 1,
        danglingArrowCount: 0,
        nodes: [
          { id: "n1", shape: "rectangle", label: "API Gateway", x: 10, y: 10 },
          { id: "n2", shape: "ellipse", label: "Primary DB", x: 200, y: 10 },
        ],
        edges: [
          {
            arrowId: "a1",
            fromNodeId: "n1",
            toNodeId: "n2",
            label: "SQL TCP",
            isDangling: false,
          },
        ],
      },
      spreadsheetAst: {
        totalPopulatedCells: 4,
        dynamicFormulaCells: 3,
        hardcodedNumericCells: 1,
        dynamicFormulaRatioBps: 7500,
        cells: [],
      },
    });

    expect(spec.route.modelId).toBe("gemini-2.5-flash");
    expect(spec.rubricCachePrefix).toContain("STATIC RUBRIC CACHE PREFIX [RUBRIC_ID: rub_sysdesign_01]");
    expect(spec.dynamicArtifactPrompt).toContain("API Gateway");
    expect(spec.dynamicArtifactPrompt).toContain("DynamicFormulas=3 (75.00%)");
  });

  it("blocks broken submissions immediately in Engine 2 and produces a 3-bullet Mentor Brief when valid", () => {
    const blocked = buildEngine2PreGraderAndMentorBrief({
      rubricId: "rub_sysdesign_01",
      passingScoreBps: 7500,
      rubricCriteria: SAMPLE_RUBRIC,
      excalidrawTopology: {
        nodeCount: 2,
        edgeCount: 1,
        danglingArrowCount: 1, // Dangling arrow violates completeness gate
        nodes: [
          { id: "n1", shape: "rectangle", label: "Ingress", x: 0, y: 0 },
          { id: "n2", shape: "rectangle", label: "Worker", x: 100, y: 0 },
        ],
        edges: [
          {
            arrowId: "bad_arrow",
            fromNodeId: "n1",
            toNodeId: null,
            label: null,
            isDangling: true,
          },
        ],
      },
    });

    expect(blocked.gateStatus).toBe("BLOCKED");
    expect(blocked.mentorBrief).toBeNull();
    expect(blocked.blockingReasons[0]).toContain("dangling connector arrows");

    const valid = buildEngine2PreGraderAndMentorBrief({
      rubricId: "rub_sysdesign_01",
      passingScoreBps: 7500,
      rubricCriteria: SAMPLE_RUBRIC,
      excalidrawTopology: {
        nodeCount: 2,
        edgeCount: 1,
        danglingArrowCount: 0,
        nodes: [
          { id: "n1", shape: "rectangle", label: "Order Service", x: 0, y: 0 },
          { id: "n2", shape: "rectangle", label: "Outbox Worker", x: 100, y: 0 },
        ],
        edges: [
          {
            arrowId: "e1",
            fromNodeId: "n1",
            toNodeId: "n2",
            label: "CDC Event",
            isDangling: false,
          },
        ],
      },
    });

    expect(valid.gateStatus).toBe("READY_FOR_MENTOR");
    if (valid.gateStatus !== "READY_FOR_MENTOR") return;

    expect(valid.estimatedMentorReviewMinutes).toBeGreaterThanOrEqual(5);
    expect(valid.estimatedMentorReviewMinutes).toBeLessThanOrEqual(8);
    expect(valid.mentorBrief.architecturalStrength).toContain("Order Service");
    expect(valid.mentorBrief.primaryBottleneckOrRisk.length).toBeGreaterThan(10);
    expect(valid.mentorBrief.suggestedLiveProbeQuestion.length).toBeGreaterThan(10);
  });

  it("generates 5 adversarial anti-AI-cheating oral defense questions in Engine 3", () => {
    const plan = buildEngine3AdversarialDefensePlan({
      gitDiffFiles: [
        {
          filePath: "packages/ledger/src/post-journal.ts",
          startLine: 42,
          snippet: "UPDATE ledger_accounts SET version = version + 1 WHERE version = $1",
          architecturalDecisionSummary: "optimistic CAS lock over SERIALIZABLE transactions",
        },
      ],
      excalidrawTopology: {
        nodeCount: 2,
        edgeCount: 1,
        danglingArrowCount: 0,
        nodes: [
          { id: "node_ledger", shape: "rectangle", label: "Double-Entry Ledger", x: 0, y: 0 },
          { id: "node_razorpay", shape: "rectangle", label: "Webhook Ingress", x: 50, y: 0 },
        ],
        edges: [],
      },
      rubricGaps: [
        {
          criterionId: "crit_idempotency",
          title: "Webhook Replay Safety",
          gapSummary: "idempotency key retention window",
        },
      ],
    });

    expect(plan.route.modelId).toBe("gemini-2.5-pro");
    expect(plan.questions).toHaveLength(5);
    expect(plan.questions[0].lineOrNodeRef).toBe(
      "packages/ledger/src/post-journal.ts:L42"
    );
    expect(plan.questions[0].whyXOverYQuestion).toContain("optimistic CAS lock");
    expect(plan.questions[0].redFlagAnswerPattern.length).toBeGreaterThan(10);
    expect(plan.questions[0].strongPassSignal.length).toBeGreaterThan(10);
  });
});

describe("Upstash 4-Step Durable Milestone Review & SLA Escalation Workflow", () => {
  it("computes deterministic 24h SLA for TIER_2 and 48h SLA for TIER_1", () => {
    const t2 = computeMilestoneSlaDeadline({
      submittedAtIso: "2026-10-08T10:00:00.000Z",
      mentorshipTier: "TIER_2",
    });
    expect(t2.slaHours).toBe(24);
    expect(t2.deadlineIso).toBe("2026-10-09T10:00:00.000Z");

    const t1 = computeMilestoneSlaDeadline({
      submittedAtIso: "2026-10-08T10:00:00.000Z",
      mentorshipTier: "TIER_1",
    });
    expect(t1.slaHours).toBe(48);
    expect(t1.deadlineIso).toBe("2026-10-10T10:00:00.000Z");
  });

  it("executes all 4 durable workflow steps and escalates to BACKUP_MENTOR_POOL when PENDING after 24h sleep", async () => {
    const recordedSteps: DurableMilestoneStepId[] = [];
    let sleptSeconds = 0;
    const notifySpy = vi.fn();

    const result = await orchestrateMilestoneReviewPipeline({
      submissionId: "sub_milestone_99",
      mentorshipTier: "TIER_2",
      submittedAtIso: "2026-10-08T12:00:00.000Z",
      primaryMentorId: "mentor_primary_01",
      preGraderInput: {
        rubricId: "rub_sysdesign_01",
        passingScoreBps: 7500,
        rubricCriteria: SAMPLE_RUBRIC,
        excalidrawTopology: {
          nodeCount: 2,
          edgeCount: 1,
          danglingArrowCount: 0,
          nodes: [
            { id: "n1", shape: "rectangle", label: "Gateway", x: 0, y: 0 },
            { id: "n2", shape: "rectangle", label: "Service", x: 100, y: 0 },
          ],
          edges: [
            {
              arrowId: "e1",
              fromNodeId: "n1",
              toNodeId: "n2",
              label: "gRPC",
              isDangling: false,
            },
          ],
        },
      },
      resolveReviewStatusAfterSlaSleep: () => "PENDING",
      onNotifyPrimaryMentor: notifySpy,
      stepRunner: {
        async runStep(stepId, fn) {
          recordedSteps.push(stepId);
          return await fn();
        },
        async sleepForSeconds(_stepId, seconds) {
          sleptSeconds = seconds;
        },
      },
    });

    expect(recordedSteps).toEqual([
      "STEP_1_COMPLETENESS_GATE",
      "STEP_2_AI_FIRST_PASS_BRIEF",
      "STEP_3_NOTIFY_PRIMARY_MENTOR",
      "STEP_4_SLA_SLEEP_AND_ESCALATE",
    ]);
    expect(sleptSeconds).toBe(24 * 3600);
    expect(notifySpy).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("ESCALATED_TO_BACKUP_MENTOR_POOL");
    expect(result.escalatedToBackupPool).toBe(true);
    expect(result.assignedQueueOrMentor).toBe("BACKUP_MENTOR_POOL");
  });
});

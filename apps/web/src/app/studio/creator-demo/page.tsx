"use client";

import React, { useMemo, useState } from "react";
import {
  computeCourseRevenueSplit,
  computeProjectEscrowSplit,
  createProjectCaptureEscrowJournal,
} from "@elluminar/domain-commerce";
import {
  assertTenantPortalAccess,
  type PortalOperationScope,
  type TenantMemberRole,
} from "@elluminar/domain-identity";
import {
  buildEngine1MultimodalCritiqueSpec,
  selectGeminiModelForEngine,
  type RubricCriterionDefinition,
} from "@elluminar/domain-ai-mentorship";
import type { ArtifactKind } from "@elluminar/domain-artifacts";

type SupportedStudioArtifactKind = Extract<
  ArtifactKind,
  "SYSTEM_CANVAS" | "CODE_SANDBOX" | "SPREADSHEET_GRID"
>;

type StudioSimulatedRole = Extract<
  TenantMemberRole,
  "OWNER" | "ADMIN" | "INSTRUCTOR" | "TA"
>;

const STUDIO_ROLES: StudioSimulatedRole[] = [
  "OWNER",
  "ADMIN",
  "INSTRUCTOR",
  "TA",
];

const STUDIO_OPERATIONS: Array<{
  scope: PortalOperationScope;
  label: string;
  description: string;
}> = [
  {
    scope: "READ",
    label: "Read Studio Telemetry",
    description: "Inspect cohort progression, enrollments & artifact submissions",
  },
  {
    scope: "CURRICULUM_MUTATION",
    label: "Author Curriculum & Rubrics",
    description: "Edit course lessons, rubric weights & Excalidraw/Univer specs",
  },
  {
    scope: "BILLING_MUTATION",
    label: "Modify Tenant Billing & GSTIN",
    description: "Update supplier GST state code, tax profile & commercial terms",
  },
  {
    scope: "PAYOUT_MUTATION",
    label: "Trigger Escrow Payout Sweep",
    description: "Initiate AVAILABLE ledger settlement to linked bank account",
  },
  {
    scope: "COUPON_MUTATION",
    label: "Issue Tenant Discount Coupons",
    description: "Create/revoke tenant-scoped percentage or fixed-paisa coupons",
  },
];

const INITIAL_RUBRIC_CRITERIA: RubricCriterionDefinition[] = [
  {
    id: "crit_idempotency_cas",
    title: "Optimistic CAS & Idempotency Outbox Guarantees",
    weightBps: 4000,
    maxScore: 10,
  },
  {
    id: "crit_double_entry_zero_sum",
    title: "Double-Entry Zero-Sum Ledger Invariant (SUM === 0n)",
    weightBps: 3500,
    maxScore: 10,
  },
  {
    id: "crit_tail_latency_backpressure",
    title: "Hot-Shard Partitioning & p99 Backpressure Isolation",
    weightBps: 2500,
    maxScore: 10,
  },
];

function formatInrFromMinor(amountMinor: bigint): string {
  const rupees = Number(amountMinor) / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(rupees);
}

export default function CreatorAuthoringStudioDemoPage() {
  // ---------------------------------------------------------------------------
  // 1. Revenue Split & Project IP Royalty Simulator State
  // ---------------------------------------------------------------------------
  const [skuPriceRupees, setSkuPriceRupees] = useState<number>(15000);
  const [projectedEnrollments, setProjectedEnrollments] = useState<number>(100);

  const unitNetMinor = useMemo(
    () => BigInt(Math.max(0, Math.round(skuPriceRupees * 100))),
    [skuPriceRupees]
  );

  const cohortTotalMinor = useMemo(
    () => unitNetMinor * BigInt(Math.max(1, projectedEnrollments)),
    [unitNetMinor, projectedEnrollments]
  );

  const marketplaceSplit = useMemo(
    () => computeCourseRevenueSplit(cohortTotalMinor, "STANDARD_80_20"),
    [cohortTotalMinor]
  );

  const directLinkSplit = useMemo(
    () => computeCourseRevenueSplit(cohortTotalMinor, "CREATOR_DIRECT_90_10"),
    [cohortTotalMinor]
  );

  const projectEscrowSplit = useMemo(
    () => computeProjectEscrowSplit(cohortTotalMinor),
    [cohortTotalMinor]
  );

  const sampleProjectJournal = useMemo(() => {
    if (unitNetMinor <= 0n) {
      return null;
    }
    return createProjectCaptureEscrowJournal({
      orderId: "ord_demo_creator_preview",
      buyerUserId: "usr_learner_demo",
      buyerClearingAccountId: "acct_buyer_clearing",
      mentorUserId: "usr_principal_mentor",
      mentorEscrowAccountId: "acct_mentor_escrow_locked",
      tenantOrganizationId: "org_staff_eng_studio",
      tenantEscrowAccountId: "acct_author_ip_escrow_locked",
      platformAvailableAccountId: "acct_elluminar_platform_available",
      netAmountMinor: unitNetMinor,
    });
  }, [unitNetMinor]);

  // ---------------------------------------------------------------------------
  // 2. Rubric & Pluggable Artifact Spec Builder State
  // ---------------------------------------------------------------------------
  const [selectedArtifactKind, setSelectedArtifactKind] =
    useState<SupportedStudioArtifactKind>("SYSTEM_CANVAS");
  const [rubricId, setRubricId] = useState<string>(
    "rubric_principal_ledger_v2"
  );
  const [criteria, setCriteria] = useState<RubricCriterionDefinition[]>(
    INITIAL_RUBRIC_CRITERIA
  );
  const [newCriterionTitle, setNewCriterionTitle] = useState<string>("");
  const [newCriterionWeightBps, setNewCriterionWeightBps] =
    useState<number>(1000);

  const totalWeightBps = useMemo(
    () => criteria.reduce((sum, item) => sum + item.weightBps, 0),
    [criteria]
  );
  const isWeightValid = totalWeightBps === 10000;

  const engine1ModelRoute = useMemo(
    () => selectGeminiModelForEngine("ENGINE_1_ARTIFACT_CRITIC"),
    []
  );

  const engine1SpecPreview = useMemo(() => {
    return buildEngine1MultimodalCritiqueSpec({
      rubricId,
      rubricCriteria: criteria,
      excalidrawTopology:
        selectedArtifactKind === "SYSTEM_CANVAS"
          ? {
              nodeCount: 4,
              edgeCount: 3,
              danglingArrowCount: 0,
              nodes: [
                {
                  id: "el_edge_gw",
                  shape: "rectangle",
                  label: "Idempotent API Gateway",
                  x: 80,
                  y: 120,
                },
                {
                  id: "el_kafka_partition",
                  shape: "rectangle",
                  label: "Partitioned Command Bus",
                  x: 340,
                  y: 120,
                },
              ],
              edges: [
                {
                  arrowId: "arr_gw_to_bus",
                  fromNodeId: "el_edge_gw",
                  toNodeId: "el_kafka_partition",
                  label: "CAS Keyed Event",
                  isDangling: false,
                },
              ],
            }
          : undefined,
      spreadsheetAst:
        selectedArtifactKind === "SPREADSHEET_GRID"
          ? {
              totalPopulatedCells: 24,
              dynamicFormulaCells: 18,
              hardcodedNumericCells: 6,
              dynamicFormulaRatioBps: 7500,
              cells: [],
            }
          : undefined,
      learnerNotes:
        selectedArtifactKind === "CODE_SANDBOX"
          ? "Artifact Mode: CODE_SANDBOX (Tier-1 Pyodide / DuckDB WASM Worker + Tier-2 Judge0 Isolated Container)"
          : `Artifact Mode: ${selectedArtifactKind} multimodal telemetry bound to rubric ${rubricId}`,
    });
  }, [rubricId, criteria, selectedArtifactKind]);

  const handleUpdateCriterionWeight = (id: string, nextBps: number) => {
    const clamped = Math.max(0, Math.min(10000, Math.round(nextBps)));
    setCriteria((prev) =>
      prev.map((c) => (c.id === id ? { ...c, weightBps: clamped } : c))
    );
  };

  const handleAddCriterion = () => {
    const trimmed = newCriterionTitle.trim();
    if (!trimmed) return;
    const id = `crit_${trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .slice(0, 24)}_${Date.now().toString(36)}`;
    setCriteria((prev) => [
      ...prev,
      {
        id,
        title: trimmed,
        weightBps: Math.max(100, Math.min(10000, newCriterionWeightBps)),
        maxScore: 10,
      },
    ]);
    setNewCriterionTitle("");
  };

  const handleRemoveCriterion = (id: string) => {
    if (criteria.length <= 1) return;
    setCriteria((prev) => prev.filter((c) => c.id !== id));
  };

  const handleNormalizeWeightsTo10000 = () => {
    if (criteria.length === 0) return;
    const currentSum = criteria.reduce((acc, c) => acc + c.weightBps, 0);
    if (currentSum === 0) {
      const equalShare = Math.floor(10000 / criteria.length);
      setCriteria((prev) =>
        prev.map((c, idx) => ({
          ...c,
          weightBps:
            idx === prev.length - 1
              ? 10000 - equalShare * (prev.length - 1)
              : equalShare,
        }))
      );
      return;
    }

    let running = 0;
    setCriteria((prev) =>
      prev.map((c, idx) => {
        if (idx === prev.length - 1) {
          return { ...c, weightBps: 10000 - running };
        }
        const scaled = Math.round((c.weightBps * 10000) / currentSum);
        running += scaled;
        return { ...c, weightBps: scaled };
      })
    );
  };

  // ---------------------------------------------------------------------------
  // 3. Multi-Tenant RBAC Role Guard Simulator State
  // ---------------------------------------------------------------------------
  const [selectedRole, setSelectedRole] =
    useState<StudioSimulatedRole>("INSTRUCTOR");

  const rbacMatrix = useMemo(() => {
    return STUDIO_OPERATIONS.map((op) => {
      const decision = assertTenantPortalAccess({
        portal: "STUDIO",
        operation: op.scope,
        organization: {
          id: "org_staff_eng_studio",
          slug: "creator-demo",
          type: "CREATOR",
        },
        membershipRole: selectedRole,
        isUserBanned: false,
      });

      return {
        ...op,
        decision,
      };
    });
  }, [selectedRole]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top Studio Header Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wider text-indigo-400">
              <span className="rounded-full border border-indigo-500/40 bg-indigo-500/10 px-2.5 py-0.5">
                Multi-Tenant Creator Authoring Studio
              </span>
              <span className="text-slate-500">•</span>
              <span className="font-mono text-emerald-400">
                /studio/creator-demo
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white md:text-3xl">
              Principal Engineer Curriculum &amp; IP Licensing Studio
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Author multimodal Socratic rubrics, configure pluggable artifact
              workspaces, simulate integer-paisa splits &amp; audit tenant RBAC
              guards.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs">
            <div>
              <div className="text-slate-400">Tenant Organization</div>
              <div className="font-mono font-semibold text-white">
                org_staff_eng_studio (CREATOR)
              </div>
            </div>
            <span className="rounded-md bg-emerald-500/15 px-2.5 py-1 font-mono text-emerald-300 border border-emerald-500/30">
              SAC 999293
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-10 px-6 py-8">
        {/* ===================================================================
            SECTION 1: INTERACTIVE REVENUE SPLIT & IP ROYALTY SIMULATOR
        =================================================================== */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
          <div className="flex flex-col gap-2 border-b border-slate-800 pb-5 md:flex-row md:items-center md:justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                @elluminar/domain-commerce
              </span>
              <h2 className="mt-1 text-xl font-bold text-white">
                1. Interactive Revenue Split &amp; Project IP Royalty Simulator
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Compare organic Marketplace (`80/20`), Creator Direct Link
                (`90/10`), and 3-Way Project IP Licensing (`50% Mentor Escrow` +{" "}
                `15% Author IP Royalty Escrow` + `35% Platform`).
              </p>
            </div>
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 font-mono text-xs text-emerald-300">
              Zero-Sum Ledger Invariant: SUM(amountMinor) === 0n
            </div>
          </div>

          {/* Interactive Sliders */}
          <div className="mt-6 grid grid-cols-1 gap-6 rounded-xl border border-slate-800 bg-slate-950/70 p-5 md:grid-cols-2">
            <div>
              <div className="flex items-center justify-between text-sm">
                <label
                  htmlFor="sku-price-input"
                  className="font-medium text-slate-200"
                >
                  Net Cohort / Project SKU Price (INR)
                </label>
                <span className="font-mono font-bold text-indigo-400">
                  {formatInrFromMinor(unitNetMinor)}
                </span>
              </div>
              <input
                id="sku-price-input"
                type="range"
                min={1000}
                max={50000}
                step={500}
                value={skuPriceRupees}
                onChange={(e) => setSkuPriceRupees(Number(e.target.value))}
                className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-indigo-500"
              />
              <div className="mt-2 flex justify-between text-xs text-slate-500">
                <span>₹1,000</span>
                <span>₹15,000 (Default)</span>
                <span>₹50,000</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm">
                <label
                  htmlFor="enrollment-count-input"
                  className="font-medium text-slate-200"
                >
                  Projected Learner Enrollments
                </label>
                <span className="font-mono font-bold text-emerald-400">
                  {projectedEnrollments} Learners (Gross:{" "}
                  {formatInrFromMinor(cohortTotalMinor)})
                </span>
              </div>
              <input
                id="enrollment-count-input"
                type="range"
                min={1}
                max={500}
                step={1}
                value={projectedEnrollments}
                onChange={(e) =>
                  setProjectedEnrollments(Number(e.target.value))
                }
                className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-emerald-500"
              />
              <div className="mt-2 flex justify-between text-xs text-slate-500">
                <span>1 Learner</span>
                <span>100 Learners</span>
                <span>500 Learners</span>
              </div>
            </div>
          </div>

          {/* 3-Column Economics Comparison Grid */}
          <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Card A: Marketplace 80/20 */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Marketplace Organic Course
                </span>
                <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-xs text-slate-300">
                  80% / 20%
                </span>
              </div>
              <div className="mt-4">
                <div className="text-xs text-slate-400">
                  Creator Payout ({marketplaceSplit.creatorBps / 100}%)
                </div>
                <div className="mt-1 font-mono text-2xl font-bold text-white">
                  {formatInrFromMinor(marketplaceSplit.creatorShareMinor)}
                </div>
              </div>
              <div className="mt-4 space-y-1.5 border-t border-slate-800 pt-3 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Platform Discovery Fee (20%):</span>
                  <span className="font-mono text-slate-300">
                    {formatInrFromMinor(marketplaceSplit.platformShareMinor)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Minor Units (Paisa):</span>
                  <span className="font-mono text-slate-300">
                    {marketplaceSplit.creatorShareMinor.toString()}n
                  </span>
                </div>
              </div>
            </div>

            {/* Card B: Creator Direct Link 90/10 */}
            <div className="rounded-xl border border-indigo-500/40 bg-indigo-950/20 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                  Creator Direct Link Course
                </span>
                <span className="rounded bg-indigo-500/20 px-2 py-0.5 font-mono text-xs text-indigo-300 border border-indigo-500/30">
                  90% / 10%
                </span>
              </div>
              <div className="mt-4">
                <div className="text-xs text-indigo-200/80">
                  Creator Payout ({directLinkSplit.creatorBps / 100}%)
                </div>
                <div className="mt-1 font-mono text-2xl font-bold text-indigo-300">
                  {formatInrFromMinor(directLinkSplit.creatorShareMinor)}
                </div>
              </div>
              <div className="mt-4 space-y-1.5 border-t border-indigo-500/20 pt-3 text-xs">
                <div className="flex justify-between text-indigo-200/70">
                  <span>Creator Direct Advantage:</span>
                  <span className="font-mono font-semibold text-emerald-400">
                    +
                    {formatInrFromMinor(
                      directLinkSplit.creatorShareMinor -
                        marketplaceSplit.creatorShareMinor
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-indigo-200/70">
                  <span>Platform Infrastructure Fee (10%):</span>
                  <span className="font-mono text-indigo-200">
                    {formatInrFromMinor(directLinkSplit.platformShareMinor)}
                  </span>
                </div>
              </div>
            </div>

            {/* Card C: 3-Way Project IP Licensing (50% Mentor / 15% Author IP Royalty / 35% Platform) */}
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                  Project IP Licensing Split
                </span>
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-xs text-emerald-300 border border-emerald-500/30">
                  50% / 15% / 35%
                </span>
              </div>
              <div className="mt-4">
                <div className="text-xs text-emerald-200/80">
                  Passive Author IP Royalty ({projectEscrowSplit.authorRoyaltyBps / 100}% Escrow)
                </div>
                <div className="mt-1 font-mono text-2xl font-bold text-emerald-300">
                  {formatInrFromMinor(
                    projectEscrowSplit.authorRoyaltyEscrowMinor
                  )}
                </div>
              </div>
              <div className="mt-4 space-y-1.5 border-t border-emerald-500/20 pt-3 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Mentor Review Escrow (50%):</span>
                  <span className="font-mono text-amber-300">
                    {formatInrFromMinor(projectEscrowSplit.mentorEscrowMinor)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Platform AI &amp; Ops Share (35%):</span>
                  <span className="font-mono text-slate-300">
                    {formatInrFromMinor(projectEscrowSplit.platformShareMinor)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Live Double-Entry 4-Leg Capture Journal Preview */}
          {sampleProjectJournal && (
            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold uppercase tracking-wider text-slate-400">
                  Single-Enrollment Double-Entry Capture Journal Preview (
                  <code className="text-indigo-400">
                    {sampleProjectJournal.journal.idempotencyKey}
                  </code>
                  )
                </span>
                <span className="font-mono text-emerald-400">
                  4 Legs Balanced • Net Sum = 0n
                </span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {sampleProjectJournal.journal.entries.map((entry) => (
                  <div
                    key={entry.accountId}
                    className="rounded-lg border border-slate-800/90 bg-slate-900/70 p-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] text-slate-400">
                        {entry.ownerType}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${
                          entry.bucket === "ESCROW_LOCKED"
                            ? "bg-amber-500/15 text-amber-300"
                            : "bg-emerald-500/15 text-emerald-300"
                        }`}
                      >
                        {entry.bucket}
                      </span>
                    </div>
                    <div className="mt-1 truncate font-mono text-slate-300">
                      {entry.accountId}
                    </div>
                    <div
                      className={`mt-1.5 font-mono text-sm font-bold ${
                        entry.amountMinor < 0n
                          ? "text-rose-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {entry.amountMinor > 0n
                        ? `+${entry.amountMinor.toString()}n`
                        : `${entry.amountMinor.toString()}n`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ===================================================================
            SECTION 2: INTERACTIVE RUBRIC & PLUGGABLE ARTIFACT SPEC BUILDER
        =================================================================== */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
          <div className="flex flex-col gap-2 border-b border-slate-800 pb-5 md:flex-row md:items-center md:justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                @elluminar/domain-ai-mentorship + @elluminar/domain-artifacts
              </span>
              <h2 className="mt-1 text-xl font-bold text-white">
                2. Rubric &amp; Pluggable Artifact Spec Builder
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Configure `RubricCriterion` basis-point weights (`10,000 bps` =
                `100.00%`), bind target `ArtifactPlugin`, and inspect the live{" "}
                `ENGINE_1_ARTIFACT_CRITIC` Gemini Implicit Prefix Cache payload.
              </p>
            </div>

            <div
              className={`rounded-lg border px-3.5 py-2 font-mono text-xs font-semibold ${
                isWeightValid
                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                  : "border-rose-500/40 bg-rose-500/15 text-rose-300"
              }`}
            >
              Total Weight: {totalWeightBps} / 10000 bps (
              {(totalWeightBps / 100).toFixed(2)}%)
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left Column: Artifact Kind & Rubric Criteria Builder */}
            <div className="space-y-5 lg:col-span-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Target Pluggable Artifact Kind
                </label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(
                    [
                      "SYSTEM_CANVAS",
                      "CODE_SANDBOX",
                      "SPREADSHEET_GRID",
                    ] as SupportedStudioArtifactKind[]
                  ).map((kind) => {
                    const active = selectedArtifactKind === kind;
                    return (
                      <button
                        key={kind}
                        type="button"
                        onClick={() => setSelectedArtifactKind(kind)}
                        className={`rounded-lg border px-3 py-2.5 text-center font-mono text-xs font-medium transition ${
                          active
                            ? "border-indigo-500 bg-indigo-500/20 text-indigo-200"
                            : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                        }`}
                      >
                        {kind}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="rubric-id-input"
                    className="text-xs font-semibold uppercase tracking-wider text-slate-400"
                  >
                    Static Prefix Cache Rubric ID
                  </label>
                  {!isWeightValid && (
                    <button
                      type="button"
                      onClick={handleNormalizeWeightsTo10000}
                      className="rounded bg-amber-500/20 px-2.5 py-1 text-xs font-medium text-amber-300 hover:bg-amber-500/30"
                    >
                      Auto-Balance to 10,000 bps
                    </button>
                  )}
                </div>
                <input
                  id="rubric-id-input"
                  type="text"
                  value={rubricId}
                  onChange={(e) => setRubricId(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Criterion List */}
              <div className="space-y-3">
                {criteria.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-800 bg-slate-950 p-3.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-mono text-[11px] text-indigo-400">
                          {item.id}
                        </div>
                        <div className="text-sm font-medium text-white">
                          {item.title}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCriterion(item.id)}
                        disabled={criteria.length <= 1}
                        className="rounded border border-slate-800 px-2 py-0.5 text-xs text-slate-400 hover:border-rose-500/50 hover:text-rose-300 disabled:opacity-40"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <input
                        type="range"
                        min={500}
                        max={8000}
                        step={250}
                        value={item.weightBps}
                        onChange={(e) =>
                          handleUpdateCriterionWeight(
                            item.id,
                            Number(e.target.value)
                          )
                        }
                        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-800 accent-indigo-500"
                      />
                      <span className="w-24 text-right font-mono text-xs font-semibold text-emerald-300">
                        {item.weightBps} bps
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Criterion Form */}
              <div className="flex flex-col gap-2 rounded-xl border border-dashed border-slate-800 bg-slate-950/60 p-3.5 sm:flex-row">
                <input
                  type="text"
                  placeholder="New rubric criterion title..."
                  value={newCriterionTitle}
                  onChange={(e) => setNewCriterionTitle(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
                <input
                  type="number"
                  min={100}
                  max={10000}
                  step={100}
                  value={newCriterionWeightBps}
                  onChange={(e) =>
                    setNewCriterionWeightBps(Number(e.target.value))
                  }
                  className="w-28 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 font-mono text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddCriterion}
                  className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  + Add Criterion
                </button>
              </div>
            </div>

            {/* Right Column: Live Gemini Prefix Cache Payload Inspector */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-950 p-5 lg:col-span-6">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <span className="font-mono text-xs font-semibold text-emerald-400">
                    selectGeminiModelForEngine(&quot;ENGINE_1_ARTIFACT_CRITIC&quot;)
                  </span>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-indigo-300">
                      {engine1ModelRoute.modelId}
                    </span>
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-300">
                      temp={engine1ModelRoute.temperature}
                    </span>
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-emerald-300">
                      PrefixCache=
                      {String(engine1ModelRoute.enableImplicitRubricPrefixCaching)}
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Static Implicit Prefix Cache Block (Cached Across Cohort)
                  </div>
                  <pre className="mt-1.5 max-h-52 overflow-auto rounded-lg border border-slate-800 bg-slate-900/90 p-3 font-mono text-xs leading-relaxed text-emerald-300">
                    {engine1SpecPreview.rubricCachePrefix}
                  </pre>
                </div>

                <div className="mt-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Dynamic Artifact Telemetry Suffix ({selectedArtifactKind})
                  </div>
                  <pre className="mt-1.5 max-h-40 overflow-auto rounded-lg border border-slate-800 bg-slate-900/90 p-3 font-mono text-xs leading-relaxed text-slate-300">
                    {engine1SpecPreview.dynamicArtifactPrompt}
                  </pre>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3 font-mono text-xs text-slate-400">
                <span>
                  Input Credit Rate:{" "}
                  {engine1ModelRoute.creditsPerThousandInputTokens.toString()}{" "}
                  cr/1k tok
                </span>
                <span>
                  Output Credit Rate:{" "}
                  {engine1ModelRoute.creditsPerThousandOutputTokens.toString()}{" "}
                  cr/1k tok
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            SECTION 3: INTERACTIVE RBAC ROLE GUARD SIMULATOR
        =================================================================== */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
          <div className="flex flex-col gap-2 border-b border-slate-800 pb-5 md:flex-row md:items-center md:justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                @elluminar/domain-identity
              </span>
              <h2 className="mt-1 text-xl font-bold text-white">
                3. Multi-Tenant Studio RBAC Guard Simulator (
                <code className="text-amber-300">assertTenantPortalAccess</code>
                )
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Switch active studio member roles (`OWNER`, `ADMIN`,{" "}
                `INSTRUCTOR`, `TA`) to verify zero-trust blocking of billing,
                payout &amp; coupon mutations for non-fiduciary roles.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {STUDIO_ROLES.map((role) => {
                const isSelected = selectedRole === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setSelectedRole(role)}
                    className={`rounded-lg border px-3.5 py-2 font-mono text-xs font-semibold transition ${
                      isSelected
                        ? "border-amber-400 bg-amber-400/20 text-amber-200"
                        : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-white"
                    }`}
                  >
                    {role}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rbacMatrix.map(({ scope, label, description, decision }) => {
              const isAllowed = decision.action === "ALLOW";
              return (
                <div
                  key={scope}
                  className={`rounded-xl border p-4 transition ${
                    isAllowed
                      ? "border-emerald-500/30 bg-emerald-950/15"
                      : "border-rose-500/30 bg-rose-950/15"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-300">
                      {scope}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 font-mono text-[11px] font-bold ${
                        isAllowed
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-rose-500/20 text-rose-300"
                      }`}
                    >
                      {decision.action}
                    </span>
                  </div>
                  <div className="mt-2 font-semibold text-white">{label}</div>
                  <p className="mt-1 text-xs text-slate-400">{description}</p>
                  {decision.action === "DENY" && (
                    <div className="mt-3 rounded border border-rose-500/20 bg-slate-950/80 p-2 font-mono text-[11px] text-rose-300">
                      {decision.code}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

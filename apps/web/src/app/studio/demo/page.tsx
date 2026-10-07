import React from "react";
import { instantiateStencilElement } from "@elluminar/domain-artifacts";
import {
  ArtifactWorkspaceShell,
  type StudioProblemScenario,
} from "@/components/studio/ArtifactWorkspaceShell";

const DEMO_STUDIO_SCENARIOS: StudioProblemScenario[] = [
  {
    id: "sc_distributed_ledger",
    slug: "distributed-upi-ledger-switch",
    domainBadge: "Distributed Backend System Design",
    title: "High-Throughput UPI Switch & Double-Entry Escrow Ledger",
    summary:
      "Design a zero-data-loss clearing pipeline handling 25,000 TPS peak bursts across edge gateways, partitioned event brokers, and sharded PostgreSQL ledgers while guaranteeing SUM(amountMinor) === 0n per journal.",
    defaultTab: "SYSTEM_CANVAS",
    rubric: [
      {
        id: "rub_idempotency",
        title: "End-to-End Idempotency & Deduplication",
        weightPercent: 40,
        socraticCheckQuestion:
          "How does your gateway prevent duplicate journal postings when mobile clients retry timed-out HTTP requests?",
      },
      {
        id: "rub_partition_ordering",
        title: "Partition Ordering & Hot-Shard Mitigation",
        weightPercent: 35,
        socraticCheckQuestion:
          "Which Kafka partition key preserves strict per-wallet ordering without bottlenecking high-volume merchant escrow accounts?",
      },
      {
        id: "rub_reconciliation",
        title: "Cross-Shard Ledger Reconciliation",
        weightPercent: 25,
        socraticCheckQuestion:
          "How do you recover deterministically if a consumer crashes after PostgreSQL commit but before committing its Kafka offset?",
      },
    ],
    initialCanvasElements: [
      instantiateStencilElement("cdn_edge", 60, 100, "el_cdn_1"),
      instantiateStencilElement("api_gateway", 280, 100, "el_gw_1"),
      instantiateStencilElement("kafka_cluster", 520, 100, "el_kafka_1"),
      instantiateStencilElement("sharded_postgres", 760, 100, "el_pg_1"),
      {
        id: "arrow_1",
        type: "arrow",
        x: 225,
        y: 138,
        startBinding: { elementId: "el_cdn_1" },
        endBinding: { elementId: "el_gw_1" },
        text: "TLS 1.3 + Idempotency-Key",
      },
      {
        id: "arrow_2",
        type: "arrow",
        x: 470,
        y: 138,
        startBinding: { elementId: "el_gw_1" },
        endBinding: { elementId: "el_kafka_1" },
        text: "Partitioned Command",
      },
      {
        id: "arrow_3",
        type: "arrow",
        x: 720,
        y: 138,
        startBinding: { elementId: "el_kafka_1" },
        endBinding: { elementId: "el_pg_1" },
        text: "Serializable Journal Tx",
      },
    ],
    socraticFeedback: [
      {
        targetElementId: "el_kafka_1",
        severity: "CRITICAL_GAP",
        socraticQuestion:
          "If a celebrity creator course launch drives 80% of traffic to one merchant walletId, how do sub-wallets prevent single-partition saturation?",
      },
      {
        targetElementId: "el_gw_1",
        severity: "VALIDATED_STRENGTH",
        socraticQuestion:
          "Why does validating HMAC webhook signatures at the gateway edge shield your Kafka brokers from replay storms?",
      },
    ],
    defaultRunner: "PYODIDE_PYTHON",
    defaultCodeSnippet: `# Verify Double-Entry Zero-Sum Split in Python WASM ($0 Tier-1 Worker)
gross_paisa = 1_000_000  # ₹10,000.00
mentor_share = (gross_paisa * 50) // 100
author_royalty = (gross_paisa * 15) // 100
platform_fee = gross_paisa - mentor_share - author_royalty

assert mentor_share + author_royalty + platform_fee == gross_paisa
print(f"Verified 50/15/35 Split: Mentor={mentor_share}, Author={author_royalty}, Platform={platform_fee}")`,
    workbookPayload: {
      id: "wb_ledger_capacity",
      sheets: {
        sheet1: {
          name: "Capacity & Split Model",
          cellData: {
            "0": {
              "0": { v: 1000000 },
              "1": { f: "=ROUND(A1*0.50,0)", v: 500000 },
              "2": { f: "=ROUND(A1*0.15,0)", v: 150000 },
              "3": { f: "=A1-B1-C1", v: 350000 },
            },
          },
        },
      },
    },
    mentorVoiceKeyframes: [
      {
        timestampMs: 0,
        scrollX: 0,
        scrollY: 0,
        zoom: 1.0,
        pointerX: 120,
        pointerY: 130,
      },
      {
        timestampMs: 4000,
        scrollX: 140,
        scrollY: 20,
        zoom: 1.15,
        pointerX: 540,
        pointerY: 140,
      },
      {
        timestampMs: 8000,
        scrollX: 280,
        scrollY: 0,
        zoom: 1.0,
        pointerX: 780,
        pointerY: 140,
      },
    ],
    mentorVoiceDurationMs: 8000,
    mentorTranscriptCue:
      "Notice how partitioning purely by merchantId creates a hot partition on flash launches — trace the laser to your Kafka broker.",
  },
  {
    id: "sc_agentic_rag",
    slug: "multi-tenant-agentic-rag-pipeline",
    domainBadge: "Agentic RAG Pipeline",
    title: "Multi-Tenant Hybrid Retrieval & Socratic Guardrail Router",
    summary:
      "Architect a low-latency retrieval pipeline combining semantic chunking, HNSW vector filtering by organizationId, cross-encoder reranking, and prompt-injection guardrails under a 450ms p99 TTFT budget.",
    defaultTab: "SYSTEM_CANVAS",
    rubric: [
      {
        id: "rub_tenant_isolation",
        title: "Zero Cross-Tenant Vector Leakage",
        weightPercent: 50,
        socraticCheckQuestion:
          "How does your HNSW index enforce strict organizationId pre-filtering when a small enterprise tenant owns <0.05% of total chunks?",
      },
      {
        id: "rub_guardrail_latency",
        title: "Guardrail & Reranker Latency Budget",
        weightPercent: 50,
        socraticCheckQuestion:
          "Which candidate top-K cutoff keeps cross-encoder reranking within your 120ms latency budget?",
      },
    ],
    initialCanvasElements: [
      instantiateStencilElement("chunking_worker", 70, 110, "el_chunk_1"),
      instantiateStencilElement("embedding_model", 310, 110, "el_embed_1"),
      instantiateStencilElement("vector_db_hnsw", 550, 110, "el_hnsw_1"),
      instantiateStencilElement("guardrail_router", 790, 110, "el_guard_1"),
    ],
    socraticFeedback: [
      {
        targetElementId: "el_hnsw_1",
        severity: "BOTTLENECK_WARNING",
        socraticQuestion:
          "What happens to HNSW graph traversal recall if post-filtering discards 99% of nearest neighbors for a niche tenant?",
      },
    ],
    defaultRunner: "DUCKDB_SQL",
    defaultCodeSnippet: `-- Evaluate Retrieval Recall & Latency Quantiles in DuckDB-WASM
SELECT tenant_tier,
       APPROX_QUANTILE(rerank_ms, 0.99) AS p99_rerank_ms,
       AVG(recall_at_5) AS mean_recall
FROM rag_eval_traces
GROUP BY 1;`,
    workbookPayload: {
      id: "wb_rag_unit_cost",
      sheets: {
        sheet1: {
          name: "Token & Rerank Unit Economics",
          cellData: {
            "0": {
              "0": { v: 50000 },
              "1": { v: 0.0004 },
              "2": { f: "=A1*B1", v: 20 },
            },
          },
        },
      },
    },
    mentorVoiceKeyframes: [
      {
        timestampMs: 0,
        scrollX: 0,
        scrollY: 0,
        zoom: 1.0,
        pointerX: 310,
        pointerY: 120,
      },
      {
        timestampMs: 6000,
        scrollX: 200,
        scrollY: 0,
        zoom: 1.2,
        pointerX: 790,
        pointerY: 120,
      },
    ],
    mentorVoiceDurationMs: 6000,
    mentorTranscriptCue:
      "Compare metadata pre-filtering against partitioned per-tenant HNSW namespaces when evaluating tail latency.",
  },
  {
    id: "sc_vc_dcf_model",
    slug: "venture-capital-series-b-dcf",
    domainBadge: "Venture Capital DCF Model",
    title: "Series B SaaS Unit Economics & 5-Year Discounted Cash Flow",
    summary:
      "Audit a 5-year SaaS cash flow workbook to ensure dynamic formula integrity (`=NPV`, `=SUM`, cohort retention links) with zero hardcoded terminal value overrides.",
    defaultTab: "DCF_SHEET",
    rubric: [
      {
        id: "rub_formula_integrity",
        title: "Dynamic Formula Ratio (>65% Formulas)",
        weightPercent: 60,
        socraticCheckQuestion:
          "Which summary rows accidentally hardcode projected EBITDA instead of referencing dynamic cohort ARR drivers?",
      },
      {
        id: "rub_wacc_sensitivity",
        title: "WACC & Terminal Multiple Sensitivity",
        weightPercent: 40,
        socraticCheckQuestion:
          "How sensitive is implied enterprise value when WACC shifts by +150 bps?",
      },
    ],
    initialCanvasElements: [
      instantiateStencilElement("redis_cache", 120, 120, "el_fin_cache"),
      instantiateStencilElement("sharded_postgres", 420, 120, "el_fin_warehouse"),
    ],
    socraticFeedback: [],
    defaultRunner: "PYODIDE_PYTHON",
    defaultCodeSnippet: `# Compute 5-Year Discounted Cash Flow NPV at 12% WACC
cash_flows = [-250.0, 80.0, 145.0, 230.0, 340.0]
wacc = 0.12
npv = sum(cf / ((1 + wacc) ** t) for t, cf in enumerate(cash_flows))
print(f"Implied Series B NPV ($M): {npv:.2f}")`,
    workbookPayload: {
      id: "wb_series_b_dcf",
      sheets: {
        dcf: {
          name: "5Y DCF Valuation",
          cellData: {
            "0": {
              "0": { v: 1200000 },
              "1": { v: 1850000 },
              "2": { f: "=SUM(A1:B1)", v: 3050000 },
            },
            "1": {
              "0": { v: 0.12 },
              "1": { f: "=NPV(A2, A1:B1)", v: 2684821 },
              "2": { f: "=ROUND(B2*1.15, 0)", v: 3087544 },
            },
          },
        },
      },
    },
    mentorVoiceKeyframes: [
      {
        timestampMs: 0,
        scrollX: 0,
        scrollY: 0,
        zoom: 1.0,
        pointerX: 100,
        pointerY: 100,
      },
      {
        timestampMs: 5000,
        scrollX: 60,
        scrollY: 40,
        zoom: 1.1,
        pointerX: 420,
        pointerY: 180,
      },
    ],
    mentorVoiceDurationMs: 5000,
    mentorTranscriptCue:
      "Inspect cells C1, B2, and C2 in the Formula AST Inspector — dynamic formulas preserve sensitivity analysis under WACC shocks.",
  },
];

export default function StudioDemoPage() {
  return <ArtifactWorkspaceShell scenarios={DEMO_STUDIO_SCENARIOS} />;
}

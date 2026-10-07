import { describe, expect, it } from "vitest";
import {
  AGENTIC_RAG_STENCILS,
  DISTRIBUTED_BACKEND_STENCILS,
  extractExcalidrawTopology,
  injectSocraticHighlightsOntoScene,
  instantiateStencilElement,
  routeAndValidateSandboxExecution,
} from "../index";

describe("Domain Stencil Packs & Socratic Highlight Injector", () => {
  it("exposes all 6 Distributed Backend and 6 Agentic RAG pre-configured stencils", () => {
    expect(Object.keys(DISTRIBUTED_BACKEND_STENCILS)).toEqual([
      "api_gateway",
      "load_balancer",
      "kafka_cluster",
      "redis_cache",
      "sharded_postgres",
      "cdn_edge",
    ]);

    expect(Object.keys(AGENTIC_RAG_STENCILS)).toEqual([
      "chunking_worker",
      "embedding_model",
      "vector_db_hnsw",
      "hybrid_reranker",
      "semantic_cache",
      "guardrail_router",
    ]);
  });

  it("instantiates stencil elements compatible with Excalidraw topology extraction and injects non-spoiler Socratic highlights", () => {
    const gatewayEl = instantiateStencilElement(
      "api_gateway",
      100,
      120,
      "node_gateway_1"
    );
    const kafkaEl = instantiateStencilElement(
      "kafka_cluster",
      420,
      120,
      "node_kafka_1"
    );
    const postgresEl = instantiateStencilElement(
      "sharded_postgres",
      740,
      120,
      "node_pg_1"
    );

    const rawScene = {
      type: "excalidraw" as const,
      elements: [
        gatewayEl,
        kafkaEl,
        postgresEl,
        {
          id: "arrow_gw_kafka",
          type: "arrow" as const,
          x: 290,
          y: 158,
          startBinding: { elementId: "node_gateway_1" },
          endBinding: { elementId: "node_kafka_1" },
          text: "Async Ledger Command",
        },
        {
          id: "arrow_kafka_pg",
          type: "arrow" as const,
          x: 620,
          y: 158,
          startBinding: { elementId: "node_kafka_1" },
          endBinding: { elementId: "node_pg_1" },
          text: "Idempotent Consumer",
        },
      ],
    };

    const topology = extractExcalidrawTopology(rawScene);
    expect(topology.nodeCount).toBe(3);
    expect(topology.edgeCount).toBe(2);
    expect(topology.danglingArrowCount).toBe(0);

    const highlighted = injectSocraticHighlightsOntoScene(rawScene, [
      {
        targetElementId: "node_kafka_1",
        severity: "CRITICAL_GAP",
        socraticQuestion:
          "How do you prevent duplicate double-entry postings if the consumer crashes after DB commit but before offset commit",
      },
      {
        targetElementId: "node_gateway_1",
        severity: "VALIDATED_STRENGTH",
        socraticQuestion:
          "Why does rejecting malformed idempotency keys at the edge protect downstream Kafka partitions?",
      },
    ]);

    const annotatedKafka = highlighted.elements.find(
      (el) => el.id === "node_kafka_1"
    );
    expect(annotatedKafka?.strokeColor).toBe("#e03131");
    expect(annotatedKafka?.backgroundColor).toBe("#ffe3e3");
    expect(annotatedKafka?.socraticAnnotation).toEqual({
      severity: "CRITICAL_GAP",
      socraticQuestion:
        "How do you prevent duplicate double-entry postings if the consumer crashes after DB commit but before offset commit?",
    });

    const annotatedGateway = highlighted.elements.find(
      (el) => el.id === "node_gateway_1"
    );
    expect(annotatedGateway?.strokeColor).toBe("#2f9e44");
    expect(annotatedGateway?.socraticAnnotation?.severity).toBe(
      "VALIDATED_STRENGTH"
    );
  });
});

describe("3-Tier Code Sandbox Execution Protocol & Guard Policy", () => {
  it("routes PYODIDE_PYTHON, DUCKDB_SQL, and SANDPACK_TS to $0 client Web Workers without decrementing Judge0 quota", () => {
    const quota = {
      userId: "usr_learner_1",
      utcDateKey: "2026-10-07",
      judge0ExecutionsUsedToday: 12,
    };

    const pyodideRoute = routeAndValidateSandboxExecution(
      {
        requestId: "req_py_1",
        userId: "usr_learner_1",
        runner: "PYODIDE_PYTHON",
        sourceCode: "import numpy as np\nprint(np.mean([10, 20, 30]))",
        timeoutMs: 5_000,
      },
      quota
    );
    expect(pyodideRoute.allowed).toBe(true);
    if (pyodideRoute.allowed) {
      expect(pyodideRoute.tier).toBe("TIER_1_BROWSER_WASM");
      expect(pyodideRoute.estimatedMarginalCostMinorInr).toBe(0n);
      expect(pyodideRoute.remainingDailyRemoteQuota).toBe(38);
    }

    const sandpackRoute = routeAndValidateSandboxExecution(
      {
        requestId: "req_ts_1",
        userId: "usr_learner_1",
        runner: "SANDPACK_TS",
        sourceCode: "export const sum = (a: number, b: number) => a + b;",
        timeoutMs: 5_000,
      },
      quota
    );
    expect(sandpackRoute.allowed).toBe(true);
    if (sandpackRoute.allowed) {
      expect(sandpackRoute.tier).toBe("TIER_2_BROWSER_BUNDLER");
      expect(sandpackRoute.remainingDailyRemoteQuota).toBe(38);
    }

    const duckdbRoute = routeAndValidateSandboxExecution(
      {
        requestId: "req_sql_1",
        userId: "usr_learner_1",
        runner: "DUCKDB_SQL",
        sourceCode: "SELECT cohort, COUNT(*) FROM retention GROUP BY 1;",
        timeoutMs: 5_000,
      },
      quota
    );
    expect(duckdbRoute.allowed).toBe(true);
    if (duckdbRoute.allowed) {
      expect(duckdbRoute.tier).toBe("TIER_1_BROWSER_WASM");
    }
  });

  it("enforces compiledLanguage, payload size guard, and daily rate limits for JUDGE0_COMPILED", () => {
    const validGoDecision = routeAndValidateSandboxExecution(
      {
        requestId: "req_go_1",
        userId: "usr_learner_1",
        runner: "JUDGE0_COMPILED",
        compiledLanguage: "go",
        sourceCode: 'package main\nfunc main() {}',
        timeoutMs: 5_000,
      },
      {
        userId: "usr_learner_1",
        utcDateKey: "2026-10-07",
        judge0ExecutionsUsedToday: 49,
      }
    );

    expect(validGoDecision.allowed).toBe(true);
    if (validGoDecision.allowed) {
      expect(validGoDecision.tier).toBe("TIER_3_REMOTE_STATELESS");
      expect(validGoDecision.remainingDailyRemoteQuota).toBe(0);
    }

    const rateLimitedDecision = routeAndValidateSandboxExecution(
      {
        requestId: "req_rust_51",
        userId: "usr_learner_1",
        runner: "JUDGE0_COMPILED",
        compiledLanguage: "rust",
        sourceCode: "fn main() {}",
        timeoutMs: 5_000,
      },
      {
        userId: "usr_learner_1",
        utcDateKey: "2026-10-07",
        judge0ExecutionsUsedToday: 50,
      }
    );

    expect(rateLimitedDecision.allowed).toBe(false);
    if (!rateLimitedDecision.allowed) {
      expect(rateLimitedDecision.rejectionCode).toBe(
        "DAILY_RATE_LIMIT_EXCEEDED"
      );
      expect(rateLimitedDecision.remainingDailyRemoteQuota).toBe(0);
    }

    const oversizedPayloadDecision = routeAndValidateSandboxExecution(
      {
        requestId: "req_cpp_big",
        userId: "usr_learner_1",
        runner: "JUDGE0_COMPILED",
        compiledLanguage: "cpp",
        sourceCode: "x".repeat(70_000),
        timeoutMs: 5_000,
      },
      {
        userId: "usr_learner_1",
        utcDateKey: "2026-10-07",
        judge0ExecutionsUsedToday: 0,
      }
    );

    expect(oversizedPayloadDecision.allowed).toBe(false);
    if (!oversizedPayloadDecision.allowed) {
      expect(oversizedPayloadDecision.rejectionCode).toBe("PAYLOAD_TOO_LARGE");
    }
  });
});

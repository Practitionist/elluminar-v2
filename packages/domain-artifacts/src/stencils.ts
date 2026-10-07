import type { ExcalidrawScenePayload } from "./excalidraw";

export type StencilPackCategory = "DISTRIBUTED_BACKEND" | "AGENTIC_RAG";

export type DistributedBackendStencilId =
  | "api_gateway"
  | "load_balancer"
  | "kafka_cluster"
  | "redis_cache"
  | "sharded_postgres"
  | "cdn_edge";

export type AgenticRagStencilId =
  | "chunking_worker"
  | "embedding_model"
  | "vector_db_hnsw"
  | "hybrid_reranker"
  | "semantic_cache"
  | "guardrail_router";

export type DomainStencilId = DistributedBackendStencilId | AgenticRagStencilId;

export interface DomainStencilTemplate {
  stencilId: DomainStencilId;
  pack: StencilPackCategory;
  label: string;
  shape: "rectangle" | "diamond" | "ellipse";
  defaultWidth: number;
  defaultHeight: number;
  strokeColor: string;
  backgroundColor: string;
  defaultSocraticQuestion: string;
}

export const DISTRIBUTED_BACKEND_STENCILS: Record<
  DistributedBackendStencilId,
  DomainStencilTemplate
> = {
  api_gateway: {
    stencilId: "api_gateway",
    pack: "DISTRIBUTED_BACKEND",
    label: "API Gateway (Rate Limit + Auth)",
    shape: "rectangle",
    defaultWidth: 190,
    defaultHeight: 76,
    strokeColor: "#1971c2",
    backgroundColor: "#e7f5ff",
    defaultSocraticQuestion:
      "How does your gateway enforce token-bucket rate limiting during regional brownouts without failing open?",
  },
  load_balancer: {
    stencilId: "load_balancer",
    pack: "DISTRIBUTED_BACKEND",
    label: "L7 Load Balancer",
    shape: "diamond",
    defaultWidth: 170,
    defaultHeight: 90,
    strokeColor: "#0c8599",
    backgroundColor: "#e3fafc",
    defaultSocraticQuestion:
      "What health-check interval and connection draining timeout prevent in-flight 502s during rolling deploys?",
  },
  kafka_cluster: {
    stencilId: "kafka_cluster",
    pack: "DISTRIBUTED_BACKEND",
    label: "Kafka Event Cluster",
    shape: "rectangle",
    defaultWidth: 200,
    defaultHeight: 80,
    strokeColor: "#e8590c",
    backgroundColor: "#fff4e6",
    defaultSocraticQuestion:
      "Which partition key guarantees per-account ordering without creating a hot partition under flash-sale skew?",
  },
  redis_cache: {
    stencilId: "redis_cache",
    pack: "DISTRIBUTED_BACKEND",
    label: "Redis Cluster Cache",
    shape: "ellipse",
    defaultWidth: 175,
    defaultHeight: 76,
    strokeColor: "#c92a2a",
    backgroundColor: "#fff5f5",
    defaultSocraticQuestion:
      "How do you prevent a cache stampede (thundering herd) when a high-QPS key expires simultaneously across workers?",
  },
  sharded_postgres: {
    stencilId: "sharded_postgres",
    pack: "DISTRIBUTED_BACKEND",
    label: "Sharded PostgreSQL Primary",
    shape: "rectangle",
    defaultWidth: 205,
    defaultHeight: 84,
    strokeColor: "#2f9e44",
    backgroundColor: "#ebfbee",
    defaultSocraticQuestion:
      "How are cross-shard ledger transfers reconciled atomically when two accounts live on different physical shards?",
  },
  cdn_edge: {
    stencilId: "cdn_edge",
    pack: "DISTRIBUTED_BACKEND",
    label: "CDN Edge PoP",
    shape: "ellipse",
    defaultWidth: 165,
    defaultHeight: 74,
    strokeColor: "#5f3dc4",
    backgroundColor: "#f3f0ff",
    defaultSocraticQuestion:
      "Which cache-control headers and surrogate keys let you purge stale tenant assets within 200ms globally?",
  },
};

export const AGENTIC_RAG_STENCILS: Record<
  AgenticRagStencilId,
  DomainStencilTemplate
> = {
  chunking_worker: {
    stencilId: "chunking_worker",
    pack: "AGENTIC_RAG",
    label: "Semantic Chunking Worker",
    shape: "rectangle",
    defaultWidth: 195,
    defaultHeight: 78,
    strokeColor: "#364fc7",
    backgroundColor: "#edf2ff",
    defaultSocraticQuestion:
      "What overlap ratio preserves cross-paragraph tables and code blocks without inflating embedding token costs?",
  },
  embedding_model: {
    stencilId: "embedding_model",
    pack: "AGENTIC_RAG",
    label: "Dense + Sparse Embedder",
    shape: "diamond",
    defaultWidth: 185,
    defaultHeight: 92,
    strokeColor: "#7048e8",
    backgroundColor: "#f3f0ff",
    defaultSocraticQuestion:
      "How do you version index embeddings when upgrading the embedding model dimension without downtime?",
  },
  vector_db_hnsw: {
    stencilId: "vector_db_hnsw",
    pack: "AGENTIC_RAG",
    label: "Vector DB (HNSW Index)",
    shape: "rectangle",
    defaultWidth: 195,
    defaultHeight: 82,
    strokeColor: "#0b7285",
    backgroundColor: "#e3fafc",
    defaultSocraticQuestion:
      "How does pre-filtering by `organizationId` affect HNSW graph recall when a tenant owns <0.1% of vectors?",
  },
  hybrid_reranker: {
    stencilId: "hybrid_reranker",
    pack: "AGENTIC_RAG",
    label: "Cross-Encoder Reranker",
    shape: "diamond",
    defaultWidth: 185,
    defaultHeight: 90,
    strokeColor: "#d9480f",
    backgroundColor: "#fff4e6",
    defaultSocraticQuestion:
      "What top-K candidate budget keeps cross-encoder reranking latency under your p99 TTFT budget?",
  },
  semantic_cache: {
    stencilId: "semantic_cache",
    pack: "AGENTIC_RAG",
    label: "Semantic Prompt Cache",
    shape: "ellipse",
    defaultWidth: 180,
    defaultHeight: 76,
    strokeColor: "#2b8a3e",
    backgroundColor: "#ebfbee",
    defaultSocraticQuestion:
      "How high must cosine similarity be to serve a cached answer without leaking context across distinct user roles?",
  },
  guardrail_router: {
    stencilId: "guardrail_router",
    pack: "AGENTIC_RAG",
    label: "Socratic Guardrail Router",
    shape: "diamond",
    defaultWidth: 195,
    defaultHeight: 94,
    strokeColor: "#c92a2a",
    backgroundColor: "#fff5f5",
    defaultSocraticQuestion:
      "How does your guardrail detect indirect prompt injection inside retrieved external documents before generation?",
  },
};

export const ALL_DOMAIN_STENCILS: Record<DomainStencilId, DomainStencilTemplate> = {
  ...DISTRIBUTED_BACKEND_STENCILS,
  ...AGENTIC_RAG_STENCILS,
};

export type SocraticHighlightSeverity =
  | "CRITICAL_GAP"
  | "BOTTLENECK_WARNING"
  | "VALIDATED_STRENGTH";

export interface SocraticNodeFeedback {
  targetElementId: string;
  severity: SocraticHighlightSeverity;
  socraticQuestion: string;
}

export interface StyledExcalidrawElement {
  id: string;
  type: "rectangle" | "diamond" | "ellipse" | "text" | "arrow" | "line";
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  containerId?: string | null;
  startBinding?: { elementId: string } | null;
  endBinding?: { elementId: string } | null;
  isDeleted?: boolean;
  strokeColor?: string;
  backgroundColor?: string;
  socraticAnnotation?: {
    severity: SocraticHighlightSeverity;
    socraticQuestion: string;
  };
}

export interface AnnotatedExcalidrawScenePayload {
  type: "excalidraw";
  elements: StyledExcalidrawElement[];
}

const SEVERITY_PALETTE: Record<
  SocraticHighlightSeverity,
  { strokeColor: string; backgroundColor: string }
> = {
  CRITICAL_GAP: {
    strokeColor: "#e03131",
    backgroundColor: "#ffe3e3",
  },
  BOTTLENECK_WARNING: {
    strokeColor: "#f08c00",
    backgroundColor: "#fff3bf",
  },
  VALIDATED_STRENGTH: {
    strokeColor: "#2f9e44",
    backgroundColor: "#d3f9d8",
  },
};

/**
 * Instantiates a domain-specific Excalidraw element at canvas coordinates `(x, y)`
 * pre-configured with shape, dimensions, semantic colors, and bound label.
 */
export function instantiateStencilElement(
  stencilId: DomainStencilId,
  x: number,
  y: number,
  customId?: string
): StyledExcalidrawElement {
  const stencil = ALL_DOMAIN_STENCILS[stencilId];
  return {
    id: customId ?? `${stencil.stencilId}_${Math.round(x)}_${Math.round(y)}`,
    type: stencil.shape,
    x,
    y,
    width: stencil.defaultWidth,
    height: stencil.defaultHeight,
    text: stencil.label,
    strokeColor: stencil.strokeColor,
    backgroundColor: stencil.backgroundColor,
  };
}

/**
 * Color-codes and annotates nodes on an Excalidraw scene with Socratic AI / Mentor feedback
 * without giving away direct answers (normalizes feedback prompts as Socratic inquiries).
 */
export function injectSocraticHighlightsOntoScene(
  scene: ExcalidrawScenePayload,
  feedbackList: readonly SocraticNodeFeedback[]
): AnnotatedExcalidrawScenePayload {
  const feedbackByElementId = new Map<string, SocraticNodeFeedback>();
  for (const item of feedbackList) {
    feedbackByElementId.set(item.targetElementId, item);
  }

  const annotatedElements: StyledExcalidrawElement[] = scene.elements.map(
    (el) => {
      const feedback = feedbackByElementId.get(el.id);
      if (!feedback) {
        return { ...el };
      }

      const palette = SEVERITY_PALETTE[feedback.severity];
      const trimmedPrompt = feedback.socraticQuestion.trim();
      const socraticQuestion = trimmedPrompt.endsWith("?")
        ? trimmedPrompt
        : `${trimmedPrompt}?`;

      return {
        ...el,
        strokeColor: palette.strokeColor,
        backgroundColor: palette.backgroundColor,
        socraticAnnotation: {
          severity: feedback.severity,
          socraticQuestion,
        },
      };
    }
  );

  return {
    type: "excalidraw",
    elements: annotatedElements,
  };
}

import { z } from "zod";
import type { ArtifactPlugin } from "./contracts";

export const ExcalidrawElementSchema = z.object({
  id: z.string(),
  type: z.enum(["rectangle", "diamond", "ellipse", "text", "arrow", "line"]),
  x: z.number(),
  y: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
  text: z.string().optional(),
  containerId: z.string().nullable().optional(),
  startBinding: z
    .object({
      elementId: z.string(),
    })
    .nullable()
    .optional(),
  endBinding: z
    .object({
      elementId: z.string(),
    })
    .nullable()
    .optional(),
  isDeleted: z.boolean().optional(),
});

export const ExcalidrawSceneSchema = z.object({
  type: z.literal("excalidraw").optional(),
  elements: z.array(ExcalidrawElementSchema),
});

export type ExcalidrawScenePayload = z.infer<typeof ExcalidrawSceneSchema>;

export interface TopologyNode {
  id: string;
  shape: "rectangle" | "diamond" | "ellipse";
  label: string;
  x: number;
  y: number;
}

export interface TopologyEdge {
  arrowId: string;
  fromNodeId: string | null;
  toNodeId: string | null;
  label: string | null;
  isDangling: boolean;
}

export interface ExcalidrawTopologyGraph {
  nodeCount: number;
  edgeCount: number;
  danglingArrowCount: number;
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

/**
 * Extracts a typed architectural graph (nodes + bound labels + directed edges)
 * from raw Excalidraw JSON elements for deterministic Gemini multimodal critique.
 */
export function extractExcalidrawTopology(
  scene: ExcalidrawScenePayload
): ExcalidrawTopologyGraph {
  const activeElements = scene.elements.filter((el) => !el.isDeleted);

  // Map containerId -> bound text element content
  const boundTextByContainerId = new Map<string, string>();
  for (const el of activeElements) {
    if (el.type === "text" && el.containerId && el.text) {
      boundTextByContainerId.set(el.containerId, el.text.trim());
    }
  }

  const nodes: TopologyNode[] = [];
  const edges: TopologyEdge[] = [];

  for (const el of activeElements) {
    if (
      el.type === "rectangle" ||
      el.type === "diamond" ||
      el.type === "ellipse"
    ) {
      const boundLabel = boundTextByContainerId.get(el.id) ?? el.text ?? "";
      nodes.push({
        id: el.id,
        shape: el.type,
        label: boundLabel.trim(),
        x: el.x,
        y: el.y,
      });
    } else if (el.type === "arrow") {
      const fromNodeId = el.startBinding?.elementId ?? null;
      const toNodeId = el.endBinding?.elementId ?? null;
      const label = boundTextByContainerId.get(el.id) ?? el.text ?? null;
      const isDangling = fromNodeId === null || toNodeId === null;

      edges.push({
        arrowId: el.id,
        fromNodeId,
        toNodeId,
        label: label ? label.trim() : null,
        isDangling,
      });
    }
  }

  const danglingArrowCount = edges.filter((e) => e.isDangling).length;

  return {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    danglingArrowCount,
    nodes,
    edges,
  };
}

export const ExcalidrawSystemCanvasPlugin: ArtifactPlugin<
  ExcalidrawScenePayload,
  ExcalidrawTopologyGraph
> = {
  kind: "SYSTEM_CANVAS",
  validateRawPayload(raw: unknown): ExcalidrawScenePayload {
    return ExcalidrawSceneSchema.parse(raw);
  },
  extractTopology(payload: ExcalidrawScenePayload): ExcalidrawTopologyGraph {
    return extractExcalidrawTopology(payload);
  },
  summarizeForMultimodalPrompt(topology: ExcalidrawTopologyGraph): string {
    const nodeSummary = topology.nodes
      .map((n) => `[${n.id}: ${n.shape} "${n.label || "unlabeled"}"]`)
      .join(", ");
    const edgeSummary = topology.edges
      .map(
        (e) =>
          `${e.fromNodeId ?? "UNBOUND"} -> ${e.toNodeId ?? "UNBOUND"}${
            e.label ? ` (${e.label})` : ""
          }`
      )
      .join("; ");
    return `System Canvas Graph (${topology.nodeCount} nodes, ${topology.edgeCount} arrows, ${topology.danglingArrowCount} dangling): Nodes=[${nodeSummary}] | Flows=[${edgeSummary}]`;
  },
};

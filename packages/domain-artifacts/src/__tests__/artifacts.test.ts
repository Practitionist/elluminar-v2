import { describe, expect, it } from "vitest";
import {
  ExcalidrawSystemCanvasPlugin,
  extractExcalidrawTopology,
  extractSpreadsheetFormulaAst,
  interpolateCanvasVoiceViewport,
} from "../index.js";

describe("@elluminar/domain-artifacts — Topology, Formula AST & Voice Interpolation Suite", () => {
  it("extracts Excalidraw Scene Graph nodes, bound text labels, and arrow bindings accurately", () => {
    const topology = extractExcalidrawTopology({
      type: "excalidraw",
      elements: [
        { id: "node_api", type: "rectangle", x: 100, y: 100, width: 180, height: 80 },
        {
          id: "txt_api",
          type: "text",
          x: 120,
          y: 130,
          text: "API Gateway",
          containerId: "node_api",
        },
        { id: "node_db", type: "ellipse", x: 420, y: 100, width: 160, height: 80 },
        {
          id: "txt_db",
          type: "text",
          x: 440,
          y: 130,
          text: "Supabase Postgres",
          containerId: "node_db",
        },
        {
          id: "arrow_1",
          type: "arrow",
          x: 280,
          y: 140,
          startBinding: { elementId: "node_api" },
          endBinding: { elementId: "node_db" },
        },
        {
          id: "txt_arrow_1",
          type: "text",
          x: 320,
          y: 120,
          text: "PrismaPg Pool",
          containerId: "arrow_1",
        },
      ],
    });

    expect(topology.nodeCount).toBe(2);
    expect(topology.edgeCount).toBe(1);
    expect(topology.danglingArrowCount).toBe(0);
    expect(topology.nodes[0]?.label).toBe("API Gateway");
    expect(topology.nodes[1]?.label).toBe("Supabase Postgres");
    expect(topology.edges[0]).toEqual({
      arrowId: "arrow_1",
      fromNodeId: "node_api",
      toNodeId: "node_db",
      label: "PrismaPg Pool",
      isDangling: false,
    });
    expect(
      ExcalidrawSystemCanvasPlugin.summarizeForMultimodalPrompt(topology)
    ).toContain("API Gateway");
  });

  it("extracts Univer Spreadsheet Formula AST vs hardcoded constants", () => {
    const ast = extractSpreadsheetFormulaAst({
      id: "wb_financial_model_1",
      sheets: {
        sheet1: {
          name: "UnitEconomics",
          cellData: {
            "0": {
              "0": { v: 12000 }, // A1 hardcoded
              "1": { v: 8500 }, // B1 hardcoded
              "2": { f: "=SUM(A1:B1)", v: 20500 }, // C1 dynamic formula
            },
          },
        },
      },
    });

    expect(ast.totalPopulatedCells).toBe(3);
    expect(ast.dynamicFormulaCells).toBe(1);
    expect(ast.hardcodedNumericCells).toBe(2);
    expect(ast.dynamicFormulaRatioBps).toBe(3333);

    const formulaCell = ast.cells.find((c) => c.cellRef === "C1");
    expect(formulaCell?.classification).toBe("DYNAMIC_FORMULA");
    expect(formulaCell?.functionsUsed).toEqual(["SUM"]);
    expect(formulaCell?.referencedRanges).toEqual(["A1:B1"]);
  });

  it("smoothly interpolates Tier-2 Voice-over-Canvas viewport frames at arbitrary playback timestamps", () => {
    const keyframes = [
      {
        timestampMs: 0,
        scrollX: 0,
        scrollY: 0,
        zoom: 1.0,
        pointerX: 100,
        pointerY: 200,
      },
      {
        timestampMs: 1000,
        scrollX: 200,
        scrollY: 400,
        zoom: 2.0,
        pointerX: 500,
        pointerY: 600,
      },
    ];

    const mid = interpolateCanvasVoiceViewport(keyframes, 500);
    expect(mid).toEqual({
      timestampMs: 500,
      scrollX: 100,
      scrollY: 200,
      zoom: 1.5,
      pointerX: 300,
      pointerY: 400,
    });
  });
});

import { describe, expect, it } from "vitest";
import { apiApp } from "../server/app.js";

describe("@elluminar/web — Hono RPC API v2 Routes", () => {
  it("GET /api/v2/health returns clean hexagonal health telemetry", async () => {
    const res = await apiApp.request("/api/v2/health");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; gstSacCode: string };
    expect(body.status).toBe("ok");
    expect(body.gstSacCode).toBe("999293");
  });

  it("POST /api/v2/commerce/quote returns exact 3-way project split + Intra-State CGST/SGST breakdown", async () => {
    const res = await apiApp.request("/api/v2/commerce/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemType: "PROJECT",
        amountMinor: "1000000",
        supplierStateCode: "29",
        buyerGstin: "29AABCE1234F1Z5",
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      isInterState: boolean;
      cgstAmountMinor: string;
      sgstAmountMinor: string;
      split: { mentorEscrowMinor: string; authorRoyaltyEscrowMinor: string };
    };
    expect(body.isInterState).toBe(false);
    expect(body.cgstAmountMinor).toBe("90000");
    expect(body.sgstAmountMinor).toBe("90000");
    expect(body.split.mentorEscrowMinor).toBe("500000");
    expect(body.split.authorRoyaltyEscrowMinor).toBe("150000");
  });

  it("POST /api/v2/artifacts/extract-topology extracts Excalidraw scene graph via RPC", async () => {
    const res = await apiApp.request("/api/v2/artifacts/extract-topology", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "excalidraw",
        elements: [
          { id: "n1", type: "rectangle", x: 10, y: 20, text: "Load Balancer" },
          { id: "n2", type: "rectangle", x: 200, y: 20, text: "Worker Pool" },
          {
            id: "a1",
            type: "arrow",
            x: 110,
            y: 40,
            startBinding: { elementId: "n1" },
            endBinding: { elementId: "n2" },
          },
        ],
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      topology: { nodeCount: number; edgeCount: number };
    };
    expect(body.topology.nodeCount).toBe(2);
    expect(body.topology.edgeCount).toBe(1);
  });
});

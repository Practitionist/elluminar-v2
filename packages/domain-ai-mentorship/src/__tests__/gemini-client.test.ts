import { describe, expect, it, vi } from "vitest";
import {
  executeGuardedGeminiEngineCall,
  type AiWalletSnapshot,
} from "../index";

describe("executeGuardedGeminiEngineCall", () => {
  const baseWallet: AiWalletSnapshot = {
    walletId: "wlt_001",
    userId: "usr_001",
    enrollmentId: "enr_001",
    balanceCredits: 500n,
    lockedCredits: 0n,
    version: 1,
    cumulativeConsumedCredits: 20n,
  };

  it("reserves credits before calling Gemini (gemini-2.5-flash) and refunds unused delta in finally", async () => {
    const persistedPhases: Array<{
      phase: "RESERVED" | "SETTLED";
      balance: bigint;
      locked: bigint;
      version: number;
    }> = [];

    const mockGenerateContent = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        socraticHeadline: "Check downstream retry queue",
        topologicalObservations: [],
        nextActionableHint: "Inspect bounded queue depth",
      }),
      usageMetadata: {
        promptTokenCount: 1000, // 1000 * 2 / 1000 = 2 credits
        candidatesTokenCount: 500, // 500 * 8 / 1000 = 4 credits -> total 6 credits
      },
    });

    const result = await executeGuardedGeminiEngineCall({
      engineKind: "ENGINE_1_ARTIFACT_CRITIC",
      wallet: baseWallet,
      idempotencyKey: "req_live_001",
      prompt: "Analyze Excalidraw topology graph",
      systemInstruction: "=== STATIC RUBRIC CACHE PREFIX ===",
      estimatedMaxCredits: 50n,
      geminiClient: {
        models: {
          generateContent: mockGenerateContent,
        },
      },
      onPersistWallet: (state, phase) => {
        persistedPhases.push({
          phase,
          balance: state.balanceCredits,
          locked: state.lockedCredits,
          version: state.version,
        });
      },
    });

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-2.5-flash",
      })
    );

    expect(result.status).toBe("COMPLETED");
    if (result.status !== "COMPLETED") throw new Error("Expected COMPLETED");

    expect(result.executionMode).toBe("LIVE_GEMINI");
    expect(result.usage.consumedCredits).toBe(6n);
    expect(result.usage.refundedCredits).toBe(44n);
    expect(result.finalWalletState.balanceCredits).toBe(494n); // 500 - 6 = 494
    expect(result.finalWalletState.lockedCredits).toBe(0n);
    expect(result.finalWalletState.cumulativeConsumedCredits).toBe(26n); // 20 + 6 = 26
    expect(result.finalWalletState.version).toBe(3);

    expect(persistedPhases).toEqual([
      { phase: "RESERVED", balance: 450n, locked: 50n, version: 2 },
      { phase: "SETTLED", balance: 494n, locked: 0n, version: 3 },
    ]);
  });

  it("routes ENGINE_3_DEFENSE_GENERATOR to gemini-2.5-pro and guarantees 100% full refund on upstream failure", async () => {
    const mockGenerateContent = vi
      .fn()
      .mockRejectedValue(new Error("Gemini 503 Service Unavailable"));

    const result = await executeGuardedGeminiEngineCall({
      engineKind: "ENGINE_3_DEFENSE_GENERATOR",
      wallet: baseWallet,
      idempotencyKey: "req_fail_002",
      prompt: "Generate adversarial oral defense plan",
      estimatedMaxCredits: 120n,
      geminiClient: {
        models: {
          generateContent: mockGenerateContent,
        },
      },
    });

    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-2.5-pro",
      })
    );

    expect(result.status).toBe("UPSTREAM_FAILED");
    if (result.status !== "UPSTREAM_FAILED") {
      throw new Error("Expected UPSTREAM_FAILED");
    }

    expect(result.errorMessage).toContain("503 Service Unavailable");
    expect(result.settlement.settlementKind).toBe("FULL_FAILURE_REFUND");
    expect(result.settlement.consumedCredits).toBe(0n);
    expect(result.settlement.refundedCredits).toBe(120n);
    expect(result.finalWalletState.balanceCredits).toBe(500n);
    expect(result.finalWalletState.lockedCredits).toBe(0n);
    expect(result.finalWalletState.cumulativeConsumedCredits).toBe(20n);
    expect(result.finalWalletState.version).toBe(3);
  });

  it("blocks before calling Gemini when available credits or SKU COGS ceiling are insufficient", async () => {
    const mockGenerateContent = vi.fn();

    const blockedResult = await executeGuardedGeminiEngineCall({
      engineKind: "ENGINE_2_MILESTONE_PREGRADER",
      wallet: {
        ...baseWallet,
        balanceCredits: 10n,
      },
      idempotencyKey: "req_blocked_003",
      prompt: "Pre-grade milestone submission",
      estimatedMaxCredits: 25n,
      geminiClient: {
        models: {
          generateContent: mockGenerateContent,
        },
      },
    });

    expect(mockGenerateContent).not.toHaveBeenCalled();
    expect(blockedResult.status).toBe("RESERVATION_BLOCKED");
    if (blockedResult.status !== "RESERVATION_BLOCKED") {
      throw new Error("Expected RESERVATION_BLOCKED");
    }
    expect(blockedResult.reservation.status).toBe("REJECTED");
  });

  it("executes deterministic offline fallback mode when no API key or live client is configured", async () => {
    const previousKey = process.env["GEMINI_API_KEY"];
    delete process.env["GEMINI_API_KEY"];

    try {
      const result = await executeGuardedGeminiEngineCall({
        engineKind: "ENGINE_1_ARTIFACT_CRITIC",
        wallet: baseWallet,
        idempotencyKey: "req_offline_004",
        prompt: "Offline critique test",
        estimatedMaxCredits: 40n,
      });

      expect(result.status).toBe("COMPLETED");
      if (result.status !== "COMPLETED") throw new Error("Expected COMPLETED");
      expect(result.executionMode).toBe("OFFLINE_FALLBACK");
      expect(result.finalWalletState.lockedCredits).toBe(0n);
      expect(result.usage.consumedCredits).toBeGreaterThan(0n);
    } finally {
      if (previousKey !== undefined) {
        process.env["GEMINI_API_KEY"] = previousKey;
      }
    }
  });
});

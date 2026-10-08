import { GoogleGenAI } from "@google/genai";
import {
  computeAiTokenCreditDebit,
  type OutcomeEngineKind,
  type GeminiModelRouteConfig,
  selectGeminiModelForEngine,
} from "./index";
import {
  reserveAiCreditsCas,
  settleAiCreditReservation,
  type AiWalletSnapshot,
  type ReserveAiCreditsCasResult,
  type SettleAiCreditReservationInput,
  type SettleAiCreditReservationResult,
} from "./wallet-cas";

export interface GeminiGenerativeModelPort {
  generateContent(params: {
    model: string;
    contents: string;
    config?: {
      temperature?: number;
      maxOutputTokens?: number;
      systemInstruction?: string;
    };
  }): Promise<{
    text?: string;
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
    };
  }>;
}

export interface GeminiClientLike {
  models: GeminiGenerativeModelPort;
}

export interface GuardedGeminiEngineCallInput {
  engineKind: OutcomeEngineKind;
  wallet: AiWalletSnapshot;
  idempotencyKey: string;
  prompt: string;
  systemInstruction?: string;
  /**
   * Optional explicit credit reservation ceiling. When omitted, a safe upper bound
   * is computed from prompt length + route `maxOutputTokens`.
   */
  estimatedMaxCredits?: bigint;
  /**
   * Optional `<= 8%` gross SKU COGS credit ceiling guard.
   */
  maxSkuCogsCeilingCredits?: bigint;
  /**
   * Optional Gemini API key. Falls back to `process.env["GEMINI_API_KEY"]`.
   * When neither `apiKey` nor `geminiClient` is provided, executes in deterministic
   * offline fallback mode so local dev & test suites never fail without network credentials.
   */
  apiKey?: string;
  /**
   * Optional injected `@google/genai` client or test double.
   */
  geminiClient?: GeminiClientLike;
  /**
   * Optional repository persistence callback invoked after `RESERVED` and `SETTLED` transitions.
   */
  onPersistWallet?: (
    nextState: AiWalletSnapshot,
    phase: "RESERVED" | "SETTLED"
  ) => Promise<void> | void;
}

export type GuardedGeminiEngineCallResult =
  | {
      status: "RESERVATION_BLOCKED";
      route: GeminiModelRouteConfig;
      reservation: Exclude<ReserveAiCreditsCasResult, { status: "RESERVED" }>;
      finalWalletState: AiWalletSnapshot;
    }
  | {
      status: "COMPLETED";
      executionMode: "LIVE_GEMINI" | "OFFLINE_FALLBACK";
      route: GeminiModelRouteConfig;
      reservationId: string;
      text: string;
      usage: {
        inputTokens: number;
        outputTokens: number;
        consumedCredits: bigint;
        refundedCredits: bigint;
      };
      settlement: Extract<SettleAiCreditReservationResult, { status: "SETTLED" }>;
      finalWalletState: AiWalletSnapshot;
    }
  | {
      status: "UPSTREAM_FAILED";
      route: GeminiModelRouteConfig;
      reservationId: string;
      errorMessage: string;
      settlement: Extract<SettleAiCreditReservationResult, { status: "SETTLED" }>;
      finalWalletState: AiWalletSnapshot;
    };

function estimateApproxTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function buildDeterministicOfflineResponse(
  engineKind: OutcomeEngineKind,
  route: GeminiModelRouteConfig
): string {
  switch (engineKind) {
    case "ENGINE_1_ARTIFACT_CRITIC":
      return JSON.stringify({
        socraticHeadline:
          "How does your primary service boundary isolate downstream latency spikes?",
        topologicalObservations: [
          {
            targetElementIdOrCellRef: "node:primary",
            severity: "OPTIMIZATION_OPPORTUNITY",
            socraticQuestion:
              "What backpressure invariant protects this synchronous edge under retry storms?",
            rubricCriterionId: "crit-architecture",
          },
        ],
        nextActionableHint:
          "Trace the failure recovery path across your critical synchronous edge.",
      });
    case "ENGINE_2_MILESTONE_PREGRADER":
      return JSON.stringify({
        gateStatus: "READY_FOR_MENTOR",
        modelId: route.modelId,
        summary: "Offline deterministic pre-grader synthesis completed.",
      });
    case "ENGINE_3_DEFENSE_GENERATOR":
      return JSON.stringify({
        questions: Array.from({ length: 5 }, (_, idx) => ({
          questionIndex: idx + 1,
          lineOrNodeRef: `architecture:invariant-${idx + 1}`,
          whyXOverYQuestion: `Walk through invariant #${idx + 1} trade-offs under concurrent load.`,
          redFlagAnswerPattern: "Cannot explain state-transition atomicity.",
          strongPassSignal: "Articulates exact CAS lock invariants and failure recovery.",
        })),
      });
  }
}

/**
 * Executes a guarded `@google/genai` outcome engine invocation with strict double-entry
 * `AiWallet` CAS protection:
 * 1. Reserves `estimatedMaxCredits` atomically via `reserveAiCreditsCas` BEFORE touching Gemini.
 * 2. Invokes `ai.models.generateContent` (`gemini-2.5-flash` or `gemini-2.5-pro` via `selectGeminiModelForEngine`)
 *    when `GEMINI_API_KEY` or `geminiClient` is present, or deterministic offline fallback otherwise.
 * 3. Computes integer credit debit and guarantees `settleAiCreditReservation` inside `finally`
 *    (full 100% refund on upstream LLM failure, unused delta refund on success).
 */
export async function executeGuardedGeminiEngineCall(
  input: GuardedGeminiEngineCallInput
): Promise<GuardedGeminiEngineCallResult> {
  const route = selectGeminiModelForEngine(input.engineKind);

  const combinedPromptLength =
    input.prompt.length + (input.systemInstruction?.length ?? 0);
  const defaultEstimatedMaxCredits = computeAiTokenCreditDebit({
    inputTokens: Math.max(250, Math.ceil(combinedPromptLength / 3)),
    outputTokens: route.maxOutputTokens,
    creditsPerThousandInputTokens: route.creditsPerThousandInputTokens,
    creditsPerThousandOutputTokens: route.creditsPerThousandOutputTokens,
  });

  const estimatedMaxCredits =
    input.estimatedMaxCredits ?? defaultEstimatedMaxCredits;

  // Step 1: Pre-call Optimistic CAS credit lock
  const reservation = reserveAiCreditsCas({
    wallet: input.wallet,
    expectedBalanceCredits: input.wallet.balanceCredits,
    expectedVersion: input.wallet.version,
    estimatedMaxCredits,
    idempotencyKey: input.idempotencyKey,
    maxSkuCogsCeilingCredits: input.maxSkuCogsCeilingCredits,
  });

  if (reservation.status !== "RESERVED") {
    return {
      status: "RESERVATION_BLOCKED",
      route,
      reservation,
      finalWalletState: input.wallet,
    };
  }

  let currentWallet: AiWalletSnapshot = reservation.nextWalletState;
  await input.onPersistWallet?.(currentWallet, "RESERVED");

  let settlementOutcome: SettleAiCreditReservationInput["outcome"] = {
    status: "FAILED",
    errorReason: "UNSETTLED_EXECUTION_ERROR",
  };
  let executionMode: "LIVE_GEMINI" | "OFFLINE_FALLBACK" = "OFFLINE_FALLBACK";
  let responseText = "";
  let inputTokens = 0;
  let outputTokens = 0;
  let upstreamErrorMessage: string | null = null;
  let finalSettlement: Extract<
    SettleAiCreditReservationResult,
    { status: "SETTLED" }
  > | null = null;

  try {
    const resolvedApiKey = input.apiKey ?? process.env["GEMINI_API_KEY"];

    if (input.geminiClient || resolvedApiKey) {
      executionMode = "LIVE_GEMINI";
      const ai: GeminiClientLike =
        input.geminiClient ?? new GoogleGenAI({ apiKey: resolvedApiKey });

      const response = await ai.models.generateContent({
        model: route.modelId,
        contents: input.prompt,
        config: {
          temperature: route.temperature,
          maxOutputTokens: route.maxOutputTokens,
          ...(input.systemInstruction
            ? { systemInstruction: input.systemInstruction }
            : {}),
        },
      });

      responseText = response.text ?? "";
      inputTokens =
        response.usageMetadata?.promptTokenCount ??
        estimateApproxTokens(
          `${input.systemInstruction ?? ""}\n${input.prompt}`
        );
      outputTokens =
        response.usageMetadata?.candidatesTokenCount ??
        estimateApproxTokens(responseText);
    } else {
      executionMode = "OFFLINE_FALLBACK";
      responseText = buildDeterministicOfflineResponse(input.engineKind, route);
      inputTokens = estimateApproxTokens(
        `${input.systemInstruction ?? ""}\n${input.prompt}`
      );
      outputTokens = estimateApproxTokens(responseText);
    }

    const rawConsumedCredits = computeAiTokenCreditDebit({
      inputTokens,
      outputTokens,
      creditsPerThousandInputTokens: route.creditsPerThousandInputTokens,
      creditsPerThousandOutputTokens: route.creditsPerThousandOutputTokens,
    });

    const boundedConsumedCredits =
      rawConsumedCredits > reservation.reservedCredits
        ? reservation.reservedCredits
        : rawConsumedCredits;

    settlementOutcome = {
      status: "COMPLETED",
      actualConsumedCredits: boundedConsumedCredits,
    };
  } catch (err) {
    upstreamErrorMessage =
      err instanceof Error ? err.message : "Unknown upstream Gemini failure";
    settlementOutcome = {
      status: "FAILED",
      errorReason: upstreamErrorMessage,
    };
  } finally {
    const settlementResult = settleAiCreditReservation({
      wallet: currentWallet,
      expectedVersion: currentWallet.version,
      reservedCredits: reservation.reservedCredits,
      outcome: settlementOutcome,
    });

    if (settlementResult.status !== "SETTLED") {
      throw new Error(
        `Invariant violation: CAS version conflict during finally settlement (${settlementResult.code})`
      );
    }

    finalSettlement = settlementResult;
    currentWallet = settlementResult.nextWalletState;
    await input.onPersistWallet?.(currentWallet, "SETTLED");
  }

  if (upstreamErrorMessage !== null) {
    return {
      status: "UPSTREAM_FAILED",
      route,
      reservationId: reservation.reservationId,
      errorMessage: upstreamErrorMessage,
      settlement: finalSettlement,
      finalWalletState: currentWallet,
    };
  }

  return {
    status: "COMPLETED",
    executionMode,
    route,
    reservationId: reservation.reservationId,
    text: responseText,
    usage: {
      inputTokens,
      outputTokens,
      consumedCredits: finalSettlement.consumedCredits,
      refundedCredits: finalSettlement.refundedCredits,
    },
    settlement: finalSettlement,
    finalWalletState: currentWallet,
  };
}

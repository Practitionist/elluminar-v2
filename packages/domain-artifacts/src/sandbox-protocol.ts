import { z } from "zod";

/**
 * 3-Tier Code Sandbox Execution Protocol (`sandbox-protocol.ts`)
 *
 * Tier 1 ($0 Browser WASM Worker): `PYODIDE_PYTHON`, `DUCKDB_SQL`
 * Tier 2 ($0 Browser Bundler): `SANDPACK_TS`
 * Tier 3 (Stateless Remote Worker with Rate Limit + Payload Guards): `JUDGE0_COMPILED` (`Go/Rust/C++/Java`)
 */

export const SandboxRunnerKindSchema = z.enum([
  "PYODIDE_PYTHON",
  "SANDPACK_TS",
  "DUCKDB_SQL",
  "JUDGE0_COMPILED",
]);

export type SandboxRunnerKind = z.infer<typeof SandboxRunnerKindSchema>;

export const CompiledLanguageSchema = z.enum(["go", "rust", "cpp", "java"]);
export type CompiledLanguage = z.infer<typeof CompiledLanguageSchema>;

export type SandboxExecutionTier =
  | "TIER_1_BROWSER_WASM"
  | "TIER_2_BROWSER_BUNDLER"
  | "TIER_3_REMOTE_STATELESS";

export const SandboxExecutionRequestSchema = z.object({
  requestId: z.string().min(1),
  userId: z.string().min(1),
  runner: SandboxRunnerKindSchema,
  compiledLanguage: CompiledLanguageSchema.optional(),
  sourceCode: z.string(),
  stdin: z.string().optional(),
  timeoutMs: z.number().int().positive().max(15_000).default(5_000),
});

export type SandboxExecutionRequest = z.infer<
  typeof SandboxExecutionRequestSchema
>;

export interface UserSandboxQuotaUsage {
  userId: string;
  utcDateKey: string; // e.g. "2026-10-07"
  judge0ExecutionsUsedToday: number;
}

export interface SandboxGuardPolicy {
  maxRemotePayloadBytes: number;
  maxDailyJudge0RunsPerUser: number;
  maxWasmPayloadBytes: number;
}

export const DEFAULT_SANDBOX_GUARD_POLICY: SandboxGuardPolicy = {
  maxRemotePayloadBytes: 65_536, // 64 KiB strict limit for remote Judge0 stateless worker
  maxDailyJudge0RunsPerUser: 50, // Daily per-user compiled code execution cap
  maxWasmPayloadBytes: 524_288, // 512 KiB in-browser Web Worker source limit
};

export interface SandboxWorkerDispatchMessage {
  protocolVersion: "1.0";
  requestId: string;
  runner: SandboxRunnerKind;
  tier: SandboxExecutionTier;
  compiledLanguage?: CompiledLanguage;
  sourceCode: string;
  stdin?: string;
  timeoutMs: number;
}

export type SandboxRoutingDecision =
  | {
      allowed: true;
      tier: SandboxExecutionTier;
      estimatedMarginalCostMinorInr: 0n;
      remainingDailyRemoteQuota: number;
      dispatchMessage: SandboxWorkerDispatchMessage;
    }
  | {
      allowed: false;
      rejectionCode:
        | "PAYLOAD_TOO_LARGE"
        | "DAILY_RATE_LIMIT_EXCEEDED"
        | "MISSING_COMPILED_LANGUAGE";
      reason: string;
      remainingDailyRemoteQuota: number;
    };

/**
 * Deterministically validates payload sizes, daily per-user Judge0 rate limits,
 * and routes execution to either $0 client Web Workers (`PYODIDE_PYTHON`, `DUCKDB_SQL`, `SANDPACK_TS`)
 * or the guarded stateless `JUDGE0_COMPILED` worker (`Go/Rust/C++/Java`).
 */
export function routeAndValidateSandboxExecution(
  rawRequest: SandboxExecutionRequest,
  quotaUsage: UserSandboxQuotaUsage,
  policy: SandboxGuardPolicy = DEFAULT_SANDBOX_GUARD_POLICY
): SandboxRoutingDecision {
  const request = SandboxExecutionRequestSchema.parse(rawRequest);
  const payloadBytes = new TextEncoder().encode(
    request.sourceCode + (request.stdin ?? "")
  ).byteLength;

  const remainingRemoteBefore = Math.max(
    0,
    policy.maxDailyJudge0RunsPerUser - quotaUsage.judge0ExecutionsUsedToday
  );

  // Client-side $0 Browser WASM & Bundler tiers (`PYODIDE_PYTHON`, `DUCKDB_SQL`, `SANDPACK_TS`)
  if (
    request.runner === "PYODIDE_PYTHON" ||
    request.runner === "DUCKDB_SQL" ||
    request.runner === "SANDPACK_TS"
  ) {
    if (payloadBytes > policy.maxWasmPayloadBytes) {
      return {
        allowed: false,
        rejectionCode: "PAYLOAD_TOO_LARGE",
        reason: `Browser sandbox payload (${payloadBytes} bytes) exceeds maximum allowed ${policy.maxWasmPayloadBytes} bytes.`,
        remainingDailyRemoteQuota: remainingRemoteBefore,
      };
    }

    const tier: SandboxExecutionTier =
      request.runner === "SANDPACK_TS"
        ? "TIER_2_BROWSER_BUNDLER"
        : "TIER_1_BROWSER_WASM";

    return {
      allowed: true,
      tier,
      estimatedMarginalCostMinorInr: 0n,
      remainingDailyRemoteQuota: remainingRemoteBefore,
      dispatchMessage: {
        protocolVersion: "1.0",
        requestId: request.requestId,
        runner: request.runner,
        tier,
        sourceCode: request.sourceCode,
        stdin: request.stdin,
        timeoutMs: request.timeoutMs,
      },
    };
  }

  // Tier 3: Stateless Remote Worker (`JUDGE0_COMPILED` for Go/Rust/C++/Java)
  if (!request.compiledLanguage) {
    return {
      allowed: false,
      rejectionCode: "MISSING_COMPILED_LANGUAGE",
      reason:
        "JUDGE0_COMPILED requires an explicit compiledLanguage ('go' | 'rust' | 'cpp' | 'java').",
      remainingDailyRemoteQuota: remainingRemoteBefore,
    };
  }

  if (payloadBytes > policy.maxRemotePayloadBytes) {
    return {
      allowed: false,
      rejectionCode: "PAYLOAD_TOO_LARGE",
      reason: `Remote Judge0 payload (${payloadBytes} bytes) exceeds strict ${policy.maxRemotePayloadBytes}-byte guard.`,
      remainingDailyRemoteQuota: remainingRemoteBefore,
    };
  }

  if (quotaUsage.judge0ExecutionsUsedToday >= policy.maxDailyJudge0RunsPerUser) {
    return {
      allowed: false,
      rejectionCode: "DAILY_RATE_LIMIT_EXCEEDED",
      reason: `Daily Judge0 compiled execution quota (${policy.maxDailyJudge0RunsPerUser} runs/day) reached for user ${request.userId}.`,
      remainingDailyRemoteQuota: 0,
    };
  }

  return {
    allowed: true,
    tier: "TIER_3_REMOTE_STATELESS",
    estimatedMarginalCostMinorInr: 0n,
    remainingDailyRemoteQuota: remainingRemoteBefore - 1,
    dispatchMessage: {
      protocolVersion: "1.0",
      requestId: request.requestId,
      runner: "JUDGE0_COMPILED",
      tier: "TIER_3_REMOTE_STATELESS",
      compiledLanguage: request.compiledLanguage,
      sourceCode: request.sourceCode,
      stdin: request.stdin,
      timeoutMs: request.timeoutMs,
    },
  };
}

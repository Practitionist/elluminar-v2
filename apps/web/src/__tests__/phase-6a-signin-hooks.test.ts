import { describe, expect, it } from "vitest";
import {
  evaluateEmailSignInRoute,
  TEST_EMAIL_PRESETS,
  VERIFIED_B2B_SSO_PROVIDERS,
} from "../app/sign-in/page";
import {
  buildSandboxWorkerScript,
  DEFAULT_WORKER_TIMEOUT_MS,
  executeSandboxRequestWithTimeout,
  PYODIDE_CDN_SCRIPT_URL,
} from "../hooks/useBrowserSandboxWorker";
import {
  computeOpusByteBudgetMetrics,
  createPointerKeyframe,
  MAX_OPUS_R2_BYTES,
  OPUS_FALLBACK_MIME_TYPE,
  OPUS_PRIMARY_MIME_TYPE,
  OPUS_TARGET_BITRATE_BPS,
  selectSupportedOpusMimeType,
} from "../hooks/useOpusVoiceRecorder";

describe("Phase 6A: Interactive B2B SSO Sign-In, Pyodide Web Worker & 24kbps Opus Recorder", () => {
  it("routes verified Enterprise & University emails to OIDC and blocks personal email domains", () => {
    expect(TEST_EMAIL_PRESETS).toHaveLength(3);

    const enterpriseRoute = evaluateEmailSignInRoute(
      "engineer@tech-gcc.example.com",
      VERIFIED_B2B_SSO_PROVIDERS
    );
    expect(enterpriseRoute.securityCode).toBe("ENTERPRISE_OIDC_VERIFIED");
    expect(enterpriseRoute.strategy).toEqual({
      mode: "ENTERPRISE_OIDC",
      redirectUrl: "/org/tech-gcc-india/sso",
      providerId: "oidc-tech-gcc-india",
      organizationSlug: "tech-gcc-india",
      domain: "tech-gcc.example.com",
    });

    const universityRoute = evaluateEmailSignInRoute(
      "dean@iit-capstone.edu.in",
      VERIFIED_B2B_SSO_PROVIDERS
    );
    expect(universityRoute.securityCode).toBe("ENTERPRISE_OIDC_VERIFIED");
    expect(universityRoute.strategy).toEqual({
      mode: "ENTERPRISE_OIDC",
      redirectUrl: "/org/iit-capstone-hub/sso",
      providerId: "oidc-iit-capstone-hub",
      organizationSlug: "iit-capstone-hub",
      domain: "iit-capstone.edu.in",
    });

    for (const consumerEmail of [
      "learner@gmail.com",
      "founder@outlook.com",
      "student@yahoo.com",
      "mentor@icloud.com",
    ]) {
      const blocked = evaluateEmailSignInRoute(consumerEmail, VERIFIED_B2B_SSO_PROVIDERS);
      expect(blocked.isPersonalDomainBlocked).toBe(true);
      expect(blocked.securityCode).toBe("PERSONAL_EMAIL_DOMAIN_BLOCKED_FROM_SSO");
      expect(blocked.strategy?.mode).toBe("STANDARD_OAUTH_OR_PASSWORD");
    }
  });

  it("generates isolated Pyodide WASM worker script and executes clean SSR/offline fallback", async () => {
    expect(PYODIDE_CDN_SCRIPT_URL).toBe(
      "https://cdn.jsdelivr.net/pyodide/v0.27.5/full/pyodide.js"
    );
    expect(DEFAULT_WORKER_TIMEOUT_MS).toBe(5000);

    const workerScript = buildSandboxWorkerScript();
    expect(workerScript).toContain("importScripts(scriptUrl)");
    expect(workerScript).toContain("self.loadPyodide");

    const telemetry = await executeSandboxRequestWithTimeout({
      runtime: "python",
      code: "print(21 * 2)",
      assertions: "assert 21 * 2 == 42",
    });

    expect(telemetry.status).toBe("SUCCESS");
    expect(telemetry.executionEnvironment).toBe("SSR_OR_OFFLINE_FALLBACK");
    expect(telemetry.timedOut).toBe(false);
  });

  it("selects 24kbps Opus MIME types, tracks 2MB R2 ceiling, and timestamps canvas keyframes", () => {
    expect(OPUS_TARGET_BITRATE_BPS).toBe(24000);
    expect(MAX_OPUS_R2_BYTES).toBe(2 * 1024 * 1024);

    expect(
      selectSupportedOpusMimeType((mime) => mime === OPUS_PRIMARY_MIME_TYPE)
    ).toBe("audio/ogg; codecs=opus");

    expect(
      selectSupportedOpusMimeType((mime) => mime === OPUS_FALLBACK_MIME_TYPE)
    ).toBe("audio/webm; codecs=opus");

    const budget = computeOpusByteBudgetMetrics(1024 * 1024);
    expect(budget.budgetUtilizationPct).toBe(50);
    expect(budget.exceedsCeiling).toBe(false);

    const keyframe = createPointerKeyframe({
      recordingStartedAtMs: 1000,
      nowMs: 2450,
      x: 320.48,
      y: 180.12,
      viewportZoom: 1.25,
      tool: "laser",
      elementId: "node-redis-shard-01",
    });

    expect(keyframe).toEqual({
      timestampOffsetMs: 1450,
      x: 320.5,
      y: 180.1,
      viewportZoom: 1.25,
      tool: "laser",
      elementId: "node-redis-shard-01",
    });
  });
});

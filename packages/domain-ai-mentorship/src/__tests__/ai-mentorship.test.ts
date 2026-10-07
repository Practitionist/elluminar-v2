import { describe, expect, it } from "vitest";
import {
  computeAiTokenCreditDebit,
  evaluateRubricSubmission,
} from "../index.js";

describe("@elluminar/domain-ai-mentorship — Rubric Evaluation & Credit Metering", () => {
  it("computes exact weighted basis-point rubric score and determines PASS vs CHANGES_REQUESTED", () => {
    const result = evaluateRubricSubmission({
      passingScoreBps: 7500,
      criteria: [
        { id: "c1", title: "Double-Entry Invariants", weightBps: 6000, maxScore: 100 },
        { id: "c2", title: "Failure Mode Resilience", weightBps: 4000, maxScore: 100 },
      ],
      evaluations: [
        { criterionId: "c1", awardedScore: 90, rationale: "Balanced sum enforced" },
        { criterionId: "c2", awardedScore: 80, rationale: "Compensating journals present" },
      ],
    });

    // 90% of 6000 = 5400; 80% of 4000 = 3200 => 8600 bps (86.00%) >= 7500 => PASS
    expect(result.scoreBps).toBe(8600);
    expect(result.verdict).toBe("PASS");
  });

  it("computes deterministic ceil-rounded bigint credits for AI token consumption", () => {
    const debit = computeAiTokenCreditDebit({
      inputTokens: 1500,
      outputTokens: 500,
    });
    // ceil(1500 * 2 / 1000) = 3n; ceil(500 * 8 / 1000) = 4n => 7n
    expect(debit).toBe(7n);
  });
});

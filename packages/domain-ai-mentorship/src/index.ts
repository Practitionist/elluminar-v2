/**
 * @elluminar/domain-ai-mentorship
 * Deterministic Rubric Weighted Evaluation Engine & AI Wallet Token Credit Metering
 */

export interface RubricCriterionDefinition {
  id: string;
  title: string;
  weightBps: number; // Must sum to 10000 across rubric
  maxScore: number;
}

export interface CriterionEvaluationInput {
  criterionId: string;
  awardedScore: number;
  rationale: string;
}

export interface RubricEvaluationOutcome {
  scoreBps: number;
  passingScoreBps: number;
  verdict: "PASS" | "CHANGES_REQUESTED";
  criterionBreakdown: Array<{
    criterionId: string;
    title: string;
    weightBps: number;
    awardedScore: number;
    maxScore: number;
    weightedContributionBps: number;
    rationale: string;
  }>;
}

/**
 * Computes exact weighted rubric score in basis points (`0..10000`) and evaluates PASS threshold.
 */
export function evaluateRubricSubmission(params: {
  passingScoreBps: number;
  criteria: readonly RubricCriterionDefinition[];
  evaluations: readonly CriterionEvaluationInput[];
}): RubricEvaluationOutcome {
  const totalWeight = params.criteria.reduce((sum, c) => sum + c.weightBps, 0);
  if (totalWeight !== 10000) {
    throw new Error(
      `Rubric criteria weights must sum to 10000 bps (100.00%), got ${totalWeight} bps`
    );
  }

  const evalMap = new Map(params.evaluations.map((e) => [e.criterionId, e]));
  let totalScoreBps = 0;

  const criterionBreakdown = params.criteria.map((criterion) => {
    const ev = evalMap.get(criterion.id);
    if (!ev) {
      throw new Error(`Missing evaluation score for criterion ${criterion.id}`);
    }
    if (ev.awardedScore < 0 || ev.awardedScore > criterion.maxScore) {
      throw new RangeError(
        `Score ${ev.awardedScore} out of bounds [0, ${criterion.maxScore}] for criterion ${criterion.id}`
      );
    }

    const weightedContributionBps = Math.round(
      (ev.awardedScore * criterion.weightBps) / criterion.maxScore
    );
    totalScoreBps += weightedContributionBps;

    return {
      criterionId: criterion.id,
      title: criterion.title,
      weightBps: criterion.weightBps,
      awardedScore: ev.awardedScore,
      maxScore: criterion.maxScore,
      weightedContributionBps,
      rationale: ev.rationale,
    };
  });

  const verdict: "PASS" | "CHANGES_REQUESTED" =
    totalScoreBps >= params.passingScoreBps ? "PASS" : "CHANGES_REQUESTED";

  return {
    scoreBps: totalScoreBps,
    passingScoreBps: params.passingScoreBps,
    verdict,
    criterionBreakdown,
  };
}

/**
 * Computes deterministic AI Credit debit in integer credits for multimodal artifact critique.
 */
export function computeAiTokenCreditDebit(params: {
  inputTokens: number;
  outputTokens: number;
  creditsPerThousandInputTokens?: bigint;
  creditsPerThousandOutputTokens?: bigint;
}): bigint {
  const inRate = params.creditsPerThousandInputTokens ?? 2n;
  const outRate = params.creditsPerThousandOutputTokens ?? 8n;

  const inCost = (BigInt(params.inputTokens) * inRate + 999n) / 1000n;
  const outCost = (BigInt(params.outputTokens) * outRate + 999n) / 1000n;
  return inCost + outCost;
}

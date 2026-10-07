import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import {
  buildEngine2PreGraderAndMentorBrief,
  buildEngine3AdversarialDefensePlan,
  orchestrateMilestoneReviewPipeline,
  reserveAiCreditsCas,
  settleAiCreditReservation,
  type AiWalletSnapshot,
} from "@elluminar/domain-ai-mentorship";

const WalletSnapshotSchema = z.object({
  walletId: z.string().min(1),
  userId: z.string().min(1),
  enrollmentId: z.string().optional(),
  balanceCredits: z.coerce.bigint(),
  lockedCredits: z.coerce.bigint(),
  version: z.number().int().nonnegative(),
  cumulativeConsumedCredits: z.coerce.bigint().optional(),
});

const ReserveCreditsSchema = z.object({
  wallet: WalletSnapshotSchema,
  expectedBalanceCredits: z.coerce.bigint(),
  expectedVersion: z.number().int().nonnegative(),
  estimatedMaxCredits: z.coerce.bigint(),
  idempotencyKey: z.string().min(1),
  maxSkuCogsCeilingCredits: z.coerce.bigint().optional(),
});

const SettleCreditsSchema = z.object({
  wallet: WalletSnapshotSchema,
  expectedVersion: z.number().int().nonnegative(),
  reservedCredits: z.coerce.bigint(),
  outcome: z.discriminatedUnion("status", [
    z.object({
      status: z.literal("COMPLETED"),
      actualConsumedCredits: z.coerce.bigint(),
    }),
    z.object({
      status: z.literal("FAILED"),
      errorReason: z.string().optional(),
    }),
  ]),
});

const RubricCriterionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  weightBps: z.number().int().positive(),
  maxScore: z.number().positive(),
});

const ExcalidrawTopologySchema = z.object({
  nodeCount: z.number().int().nonnegative(),
  edgeCount: z.number().int().nonnegative(),
  danglingArrowCount: z.number().int().nonnegative(),
  nodes: z.array(
    z.object({
      id: z.string(),
      shape: z.enum(["rectangle", "diamond", "ellipse"]),
      label: z.string(),
      x: z.number(),
      y: z.number(),
    })
  ),
  edges: z.array(
    z.object({
      arrowId: z.string(),
      fromNodeId: z.string().nullable(),
      toNodeId: z.string().nullable(),
      label: z.string().nullable(),
      isDangling: z.boolean(),
    })
  ),
});

const PreGradeRequestSchema = z.object({
  rubricId: z.string().min(1),
  passingScoreBps: z.number().int().min(0).max(10000),
  rubricCriteria: z.array(RubricCriterionSchema).min(1),
  excalidrawTopology: ExcalidrawTopologySchema.optional(),
});

const DefensePlanRequestSchema = z.object({
  gitDiffFiles: z.array(
    z.object({
      filePath: z.string().min(1),
      startLine: z.number().int().positive(),
      snippet: z.string(),
      architecturalDecisionSummary: z.string().optional(),
    })
  ),
  excalidrawTopology: ExcalidrawTopologySchema.optional(),
  rubricGaps: z
    .array(
      z.object({
        criterionId: z.string(),
        title: z.string(),
        gapSummary: z.string(),
      })
    )
    .optional(),
});

const MilestoneWorkflowRequestSchema = z.object({
  submissionId: z.string().min(1),
  mentorshipTier: z.enum(["TIER_1", "TIER_2"]),
  submittedAtIso: z.string().min(1),
  primaryMentorId: z.string().min(1),
  reviewStatusAfterSleep: z.enum(["PENDING", "COMPLETED"]).default("PENDING"),
  preGraderInput: PreGradeRequestSchema,
});

function serializeWalletSnapshot(wallet: AiWalletSnapshot) {
  return {
    walletId: wallet.walletId,
    userId: wallet.userId,
    enrollmentId: wallet.enrollmentId,
    balanceCredits: wallet.balanceCredits.toString(),
    lockedCredits: wallet.lockedCredits.toString(),
    version: wallet.version,
    cumulativeConsumedCredits: (wallet.cumulativeConsumedCredits ?? 0n).toString(),
  };
}

export const aiMentorshipRouter = new Hono()
  .post("/wallet/reserve", zValidator("json", ReserveCreditsSchema), (c) => {
    const body = c.req.valid("json");
    const result = reserveAiCreditsCas(body);

    if (result.status === "RESERVED") {
      return c.json({
        status: result.status,
        reservationId: result.reservationId,
        reservedCredits: result.reservedCredits.toString(),
        nextWalletState: serializeWalletSnapshot(result.nextWalletState),
      });
    }

    if (result.status === "CAS_CONFLICT") {
      return c.json(
        {
          status: result.status,
          code: result.code,
          currentBalanceCredits: result.currentBalanceCredits.toString(),
          currentVersion: result.currentVersion,
        },
        409
      );
    }

    if (result.code === "SKU_COGS_CEILING_EXCEEDED") {
      return c.json(
        {
          status: result.status,
          code: result.code,
          availableBalanceCredits: result.availableBalanceCredits.toString(),
          maxSkuCogsCeilingCredits: result.maxSkuCogsCeilingCredits.toString(),
        },
        402
      );
    }

    return c.json(
      {
        status: result.status,
        code: result.code,
        availableBalanceCredits: result.availableBalanceCredits.toString(),
        requiredCredits: result.requiredCredits.toString(),
      },
      402
    );
  })
  .post("/wallet/settle", zValidator("json", SettleCreditsSchema), (c) => {
    const body = c.req.valid("json");
    const result = settleAiCreditReservation(body);

    if (result.status === "CAS_CONFLICT") {
      return c.json(result, 409);
    }

    return c.json({
      status: result.status,
      settlementKind: result.settlementKind,
      reservedCredits: result.reservedCredits.toString(),
      consumedCredits: result.consumedCredits.toString(),
      refundedCredits: result.refundedCredits.toString(),
      nextWalletState: serializeWalletSnapshot(result.nextWalletState),
    });
  })
  .post("/engines/pregrade", zValidator("json", PreGradeRequestSchema), (c) => {
    const body = c.req.valid("json");
    const result = buildEngine2PreGraderAndMentorBrief(body);
    return c.json({
      ...result,
      route: {
        ...result.route,
        creditsPerThousandInputTokens:
          result.route.creditsPerThousandInputTokens.toString(),
        creditsPerThousandOutputTokens:
          result.route.creditsPerThousandOutputTokens.toString(),
      },
    });
  })
  .post(
    "/engines/defense-plan",
    zValidator("json", DefensePlanRequestSchema),
    (c) => {
      const body = c.req.valid("json");
      const result = buildEngine3AdversarialDefensePlan(body);
      return c.json({
        route: {
          ...result.route,
          creditsPerThousandInputTokens:
            result.route.creditsPerThousandInputTokens.toString(),
          creditsPerThousandOutputTokens:
            result.route.creditsPerThousandOutputTokens.toString(),
        },
        questions: result.questions,
      });
    }
  )
  .post(
    "/workflow/milestone-sla",
    zValidator("json", MilestoneWorkflowRequestSchema),
    async (c) => {
      const body = c.req.valid("json");
      const result = await orchestrateMilestoneReviewPipeline({
        submissionId: body.submissionId,
        mentorshipTier: body.mentorshipTier,
        submittedAtIso: body.submittedAtIso,
        primaryMentorId: body.primaryMentorId,
        preGraderInput: body.preGraderInput,
        resolveReviewStatusAfterSlaSleep: body.reviewStatusAfterSleep,
      });
      return c.json(result);
    }
  );

import {
  buildEngine2PreGraderAndMentorBrief,
  type Engine2PreGraderInput,
  type MentorBriefThreeBulletSummary,
} from "./engines";
import type { RubricEvaluationOutcome } from "./index";

export type MentorshipTier = "TIER_1" | "TIER_2";

export type DurableMilestoneStepId =
  | "STEP_1_COMPLETENESS_GATE"
  | "STEP_2_AI_FIRST_PASS_BRIEF"
  | "STEP_3_NOTIFY_PRIMARY_MENTOR"
  | "STEP_4_SLA_SLEEP_AND_ESCALATE";

export type MilestoneReviewStatus = "PENDING" | "COMPLETED";

export interface SlaDeadlineComputation {
  mentorshipTier: MentorshipTier;
  slaHours: 24 | 48;
  slaDurationSeconds: number;
  submittedAtIso: string;
  deadlineIso: string;
}

/**
 * Deterministic SLA window computation:
 * - `TIER_2` (Project Cohort / Intensive Mentorship): 24h SLA (`86,400` seconds)
 * - `TIER_1` (Guided Course / Foundation Mentorship): 48h SLA (`172,800` seconds)
 */
export function computeMilestoneSlaDeadline(params: {
  submittedAtIso: string;
  mentorshipTier: MentorshipTier;
}): SlaDeadlineComputation {
  const submittedMs = Date.parse(params.submittedAtIso);
  if (Number.isNaN(submittedMs)) {
    throw new Error(`Invalid submittedAtIso timestamp: ${params.submittedAtIso}`);
  }

  const slaHours: 24 | 48 = params.mentorshipTier === "TIER_2" ? 24 : 48;
  const slaDurationSeconds = slaHours * 3600;
  const deadlineIso = new Date(
    submittedMs + slaDurationSeconds * 1000
  ).toISOString();

  return {
    mentorshipTier: params.mentorshipTier,
    slaHours,
    slaDurationSeconds,
    submittedAtIso: new Date(submittedMs).toISOString(),
    deadlineIso,
  };
}

export interface DurableWorkflowStepRunner {
  runStep<T>(stepId: DurableMilestoneStepId, fn: () => Promise<T> | T): Promise<T>;
  sleepForSeconds(stepId: "STEP_4_SLA_SLEEP_AND_ESCALATE", seconds: number): Promise<void>;
}

const defaultImmediateStepRunner: DurableWorkflowStepRunner = {
  async runStep<T>(_stepId: DurableMilestoneStepId, fn: () => Promise<T> | T): Promise<T> {
    return await fn();
  },
  async sleepForSeconds(): Promise<void> {
    // Immediate resolution in pure domain/unit test mode; bound to `context.sleep` in Upstash runtime
  },
};

export interface OrchestrateMilestoneReviewInput {
  submissionId: string;
  mentorshipTier: MentorshipTier;
  submittedAtIso: string;
  primaryMentorId: string;
  preGraderInput: Engine2PreGraderInput;
  /**
   * Callback or snapshot resolving the review status after the durable SLA sleep window expires.
   */
  resolveReviewStatusAfterSlaSleep:
    | MilestoneReviewStatus
    | (() => Promise<MilestoneReviewStatus> | MilestoneReviewStatus);
  onNotifyPrimaryMentor?: (payload: {
    submissionId: string;
    primaryMentorId: string;
    deadlineIso: string;
    mentorBrief: MentorBriefThreeBulletSummary;
  }) => Promise<void> | void;
  stepRunner?: DurableWorkflowStepRunner;
}

export type OrchestrateMilestoneReviewResult =
  | {
      status: "REJECTED_AT_COMPLETENESS_GATE";
      submissionId: string;
      executedSteps: ["STEP_1_COMPLETENESS_GATE"];
      blockingReasons: string[];
      slaDeadline: null;
      mentorBrief: null;
      rubricOutcome: null;
      escalatedToBackupPool: false;
      assignedQueueOrMentor: null;
    }
  | {
      status: "COMPLETED_WITHIN_SLA" | "ESCALATED_TO_BACKUP_MENTOR_POOL";
      submissionId: string;
      executedSteps: [
        "STEP_1_COMPLETENESS_GATE",
        "STEP_2_AI_FIRST_PASS_BRIEF",
        "STEP_3_NOTIFY_PRIMARY_MENTOR",
        "STEP_4_SLA_SLEEP_AND_ESCALATE",
      ];
      blockingReasons: [];
      slaDeadline: SlaDeadlineComputation;
      mentorBrief: MentorBriefThreeBulletSummary;
      rubricOutcome: RubricEvaluationOutcome;
      escalatedToBackupPool: boolean;
      assignedQueueOrMentor: "BACKUP_MENTOR_POOL" | string;
    };

/**
 * 4-Step Upstash Durable Milestone Review & SLA Escalation Pipeline:
 * `STEP_1_COMPLETENESS_GATE` -> `STEP_2_AI_FIRST_PASS_BRIEF` -> `STEP_3_NOTIFY_PRIMARY_MENTOR` -> `STEP_4_SLA_SLEEP_AND_ESCALATE`
 */
export async function orchestrateMilestoneReviewPipeline(
  input: OrchestrateMilestoneReviewInput
): Promise<OrchestrateMilestoneReviewResult> {
  const runner = input.stepRunner ?? defaultImmediateStepRunner;

  // STEP 1: Completeness Gate check (immediately block broken/empty submissions)
  const preGraderResult = await runner.runStep("STEP_1_COMPLETENESS_GATE", () =>
    buildEngine2PreGraderAndMentorBrief(input.preGraderInput)
  );

  if (preGraderResult.gateStatus === "BLOCKED") {
    return {
      status: "REJECTED_AT_COMPLETENESS_GATE",
      submissionId: input.submissionId,
      executedSteps: ["STEP_1_COMPLETENESS_GATE"],
      blockingReasons: preGraderResult.blockingReasons,
      slaDeadline: null,
      mentorBrief: null,
      rubricOutcome: null,
      escalatedToBackupPool: false,
      assignedQueueOrMentor: null,
    };
  }

  // STEP 2: AI First-Pass 3-Bullet Mentor Brief & SLA Deadline Computation
  const step2Artifact = await runner.runStep("STEP_2_AI_FIRST_PASS_BRIEF", () => {
    const slaDeadline = computeMilestoneSlaDeadline({
      submittedAtIso: input.submittedAtIso,
      mentorshipTier: input.mentorshipTier,
    });
    return {
      slaDeadline,
      mentorBrief: preGraderResult.mentorBrief,
      rubricOutcome: preGraderResult.rubricOutcome,
    };
  });

  // STEP 3: Dispatch notification + 3-bullet Mentor Brief to Primary Mentor
  await runner.runStep("STEP_3_NOTIFY_PRIMARY_MENTOR", async () => {
    if (input.onNotifyPrimaryMentor) {
      await input.onNotifyPrimaryMentor({
        submissionId: input.submissionId,
        primaryMentorId: input.primaryMentorId,
        deadlineIso: step2Artifact.slaDeadline.deadlineIso,
        mentorBrief: step2Artifact.mentorBrief,
      });
    }
    return {
      notifiedMentorId: input.primaryMentorId,
      deadlineIso: step2Artifact.slaDeadline.deadlineIso,
    };
  });

  // STEP 4: Durable SLA Sleep (24h for Tier 2, 48h for Tier 1) & Escalate to BACKUP_MENTOR_POOL if still PENDING
  await runner.sleepForSeconds(
    "STEP_4_SLA_SLEEP_AND_ESCALATE",
    step2Artifact.slaDeadline.slaDurationSeconds
  );

  const escalationOutcome = await runner.runStep(
    "STEP_4_SLA_SLEEP_AND_ESCALATE",
    async () => {
      const reviewStatus =
        typeof input.resolveReviewStatusAfterSlaSleep === "function"
          ? await input.resolveReviewStatusAfterSlaSleep()
          : input.resolveReviewStatusAfterSlaSleep;

      if (reviewStatus === "PENDING") {
        return {
          escalatedToBackupPool: true as const,
          assignedQueueOrMentor: "BACKUP_MENTOR_POOL" as const,
          workflowTerminalStatus: "ESCALATED_TO_BACKUP_MENTOR_POOL" as const,
        };
      }

      return {
        escalatedToBackupPool: false as const,
        assignedQueueOrMentor: input.primaryMentorId,
        workflowTerminalStatus: "COMPLETED_WITHIN_SLA" as const,
      };
    }
  );

  return {
    status: escalationOutcome.workflowTerminalStatus,
    submissionId: input.submissionId,
    executedSteps: [
      "STEP_1_COMPLETENESS_GATE",
      "STEP_2_AI_FIRST_PASS_BRIEF",
      "STEP_3_NOTIFY_PRIMARY_MENTOR",
      "STEP_4_SLA_SLEEP_AND_ESCALATE",
    ],
    blockingReasons: [],
    slaDeadline: step2Artifact.slaDeadline,
    mentorBrief: step2Artifact.mentorBrief,
    rubricOutcome: step2Artifact.rubricOutcome,
    escalatedToBackupPool: escalationOutcome.escalatedToBackupPool,
    assignedQueueOrMentor: escalationOutcome.assignedQueueOrMentor,
  };
}

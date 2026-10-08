import type {
  ArtifactKind,
  CanvasVoiceReplay,
  MilestoneSubmission,
  Prisma,
  PrismaClient,
  WorkArtifact,
} from "../generated/prisma/client";

/** Hard 2 MB (2,097,152 bytes) R2 payload ceiling per voice-over canvas replay. */
export const MAX_VOICE_REPLAY_BYTES = 2_097_152;

/** Standard 24 kbps Opus encoding bitrate for voice-over canvas critiques. */
export const TARGET_VOICE_REPLAY_BITRATE_BPS = 24_000;

export class VoiceReplayByteLimitExceededError extends Error {
  public readonly totalBytes: number;
  public readonly maxAllowedBytes: number = MAX_VOICE_REPLAY_BYTES;

  constructor(totalBytes: number) {
    super(
      `CanvasVoiceReplay payload of ${totalBytes} bytes exceeds the maximum R2 ceiling of ${MAX_VOICE_REPLAY_BYTES} bytes (2 MB).`,
    );
    this.name = "VoiceReplayByteLimitExceededError";
    this.totalBytes = totalBytes;
  }
}

export class EmptySubmissionArtifactsError extends Error {
  constructor(projectInstanceId: string, milestoneId: string) {
    super(
      `MilestoneSubmission for instance '${projectInstanceId}' / milestone '${milestoneId}' must include at least one WorkArtifact.`,
    );
    this.name = "EmptySubmissionArtifactsError";
  }
}

export interface SubmissionArtifactInput {
  kind: ArtifactKind;
  r2ObjectKey: string;
  pngSnapshotR2Key?: string | null;
  sha256Digest: string;
  extractedTopologyJson: Prisma.InputJsonValue;
  mimeType: string;
  byteSize: bigint;
}

export interface CreateMilestoneSubmissionWithArtifactsInput {
  projectInstanceId: string;
  milestoneId: string;
  attemptNumber?: number;
  learnerNotes?: string | null;
  artifacts: readonly SubmissionArtifactInput[];
}

export interface CreatedMilestoneSubmissionBundle {
  submission: MilestoneSubmission;
  submissionLifecycleState: "SUBMITTED";
  artifacts: WorkArtifact[];
}

export type CanvasViewportKeyframe = {
  timestampMs: number;
  panX: number;
  panY: number;
  zoom: number;
  highlightedNodeId?: string;
};

export interface AttachVoiceOverCanvasReplayInput {
  reviewId: string;
  audioR2Key: string;
  durationMs: number;
  bitrateBps?: 24000;
  keyframesJson: readonly CanvasViewportKeyframe[] | Prisma.InputJsonValue;
  totalBytes: number;
}

export interface AttachedVoiceReplayResult {
  replay: CanvasVoiceReplay;
  bitrateBps: 24000;
  totalBytes: number;
}

export class PrismaArtifactRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Atomically creates a `MilestoneSubmission` along with its typed `WorkArtifact` rows
   * (`SYSTEM_CANVAS | CODE_SANDBOX | DOCUMENT_REDLINE | SPREADSHEET_GRID | MEDIA_CRITIQUE`)
   * inside a single database transaction (`prisma.$transaction`).
   */
  async createMilestoneSubmissionWithArtifacts(
    input: CreateMilestoneSubmissionWithArtifactsInput,
  ): Promise<CreatedMilestoneSubmissionBundle> {
    const {
      projectInstanceId,
      milestoneId,
      attemptNumber = 1,
      learnerNotes = null,
      artifacts,
    } = input;

    if (artifacts.length === 0) {
      throw new EmptySubmissionArtifactsError(projectInstanceId, milestoneId);
    }

    for (const artifact of artifacts) {
      if (artifact.byteSize < 0n) {
        throw new Error(
          `WorkArtifact '${artifact.r2ObjectKey}' byteSize must be non-negative (>= 0n).`,
        );
      }
      if (!artifact.sha256Digest || artifact.sha256Digest.trim().length === 0) {
        throw new Error(
          `WorkArtifact '${artifact.r2ObjectKey}' requires a non-empty SHA-256 content digest.`,
        );
      }
    }

    return this.prisma.$transaction(
      async (
        tx: Prisma.TransactionClient,
      ): Promise<CreatedMilestoneSubmissionBundle> => {
        const submission = await tx.milestoneSubmission.create({
          data: {
            projectInstanceId,
            milestoneId,
            attemptNumber,
            status: "PENDING_REVIEW",
            learnerNotes,
          },
        });

        const createdArtifacts: WorkArtifact[] = [];
        for (const item of artifacts) {
          const envelopeJson: Prisma.InputJsonObject = {
            sha256Digest: item.sha256Digest,
            topology: item.extractedTopologyJson,
          };

          const created = await tx.workArtifact.create({
            data: {
              submissionId: submission.id,
              kind: item.kind,
              r2ObjectKey: item.r2ObjectKey,
              pngSnapshotR2Key: item.pngSnapshotR2Key ?? null,
              extractedTopologyJson: envelopeJson,
              mimeType: item.mimeType,
              byteSize: item.byteSize,
            },
          });
          createdArtifacts.push(created);
        }

        return {
          submission,
          submissionLifecycleState: "SUBMITTED",
          artifacts: createdArtifacts,
        };
      },
    );
  }

  /**
   * Atomically persists a `CanvasVoiceReplay` (`opusAudioR2Key`, `durationMs`,
   * `bitrateBps: 24000`, `keyframesJson`, `totalBytes`) while strictly enforcing
   * `totalBytes <= 2_097_152` (2 MB Cloudflare R2 ceiling).
   */
  async attachVoiceOverCanvasReplay(
    input: AttachVoiceOverCanvasReplayInput,
  ): Promise<AttachedVoiceReplayResult> {
    const {
      reviewId,
      audioR2Key,
      durationMs,
      bitrateBps = TARGET_VOICE_REPLAY_BITRATE_BPS,
      keyframesJson,
      totalBytes,
    } = input;

    if (totalBytes <= 0) {
      throw new Error(
        `CanvasVoiceReplay totalBytes must be strictly positive (> 0), received ${totalBytes}.`,
      );
    }

    if (totalBytes > MAX_VOICE_REPLAY_BYTES) {
      throw new VoiceReplayByteLimitExceededError(totalBytes);
    }

    if (durationMs <= 0) {
      throw new Error(
        `CanvasVoiceReplay durationMs must be strictly positive (> 0), received ${durationMs}.`,
      );
    }

    return this.prisma.$transaction(
      async (
        tx: Prisma.TransactionClient,
      ): Promise<AttachedVoiceReplayResult> => {
        const viewportTimelinePayload: Prisma.InputJsonObject = {
          bitrateBps,
          totalBytes,
          keyframes: keyframesJson,
        };

        const replay = await tx.canvasVoiceReplay.create({
          data: {
            reviewId,
            opusAudioR2Key: audioR2Key,
            durationMs,
            viewportTimelineJson: viewportTimelinePayload,
          },
        });

        return {
          replay,
          bitrateBps,
          totalBytes,
        };
      },
    );
  }
}

import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../generated/prisma/client";
import {
  EmptySubmissionArtifactsError,
  MAX_VOICE_REPLAY_BYTES,
  PrismaArtifactRepository,
  TARGET_VOICE_REPLAY_BITRATE_BPS,
  VoiceReplayByteLimitExceededError,
} from "../index";

describe("PrismaArtifactRepository", () => {
  it("atomically creates MilestoneSubmission and typed WorkArtifact rows inside a single transaction", async () => {
    const milestoneSubmissionCreate = vi.fn(async ({ data }) => ({
      id: "sub_9001",
      ...data,
      submittedAt: new Date("2026-10-08T07:00:00Z"),
      reviewedAt: null,
    }));

    let artifactSeq = 0;
    const workArtifactCreate = vi.fn(async ({ data }) => {
      artifactSeq += 1;
      return {
        id: `art_${artifactSeq}`,
        ...data,
        createdAt: new Date("2026-10-08T07:00:01Z"),
      };
    });

    const mockPrisma = {
      $transaction: vi.fn(async (cb) =>
        cb({
          milestoneSubmission: { create: milestoneSubmissionCreate },
          workArtifact: { create: workArtifactCreate },
        }),
      ),
    } as unknown as PrismaClient;

    const repo = new PrismaArtifactRepository(mockPrisma);

    const result = await repo.createMilestoneSubmissionWithArtifacts({
      projectInstanceId: "inst_ledger_01",
      milestoneId: "mile_arch_01",
      attemptNumber: 1,
      learnerNotes: "Implemented double-entry ledger outbox + partitioned queue.",
      artifacts: [
        {
          kind: "SYSTEM_CANVAS",
          r2ObjectKey: "artifacts/inst_ledger_01/mile_arch_01/canvas.json",
          pngSnapshotR2Key: "artifacts/inst_ledger_01/mile_arch_01/canvas.png",
          sha256Digest:
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          extractedTopologyJson: {
            nodes: ["api_gateway", "ledger_service", "postgres_primary"],
            edges: [
              { from: "api_gateway", to: "ledger_service", protocol: "http2" },
              { from: "ledger_service", to: "postgres_primary", protocol: "tcp" },
            ],
          },
          mimeType: "application/json",
          byteSize: 48_200n,
        },
        {
          kind: "CODE_SANDBOX",
          r2ObjectKey: "artifacts/inst_ledger_01/mile_arch_01/sandbox.tar.gz",
          sha256Digest:
            "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
          extractedTopologyJson: {
            astSymbols: ["postBalancedDoubleEntryJournal", "reserveCohortSeatCas"],
            testPassCount: 14,
          },
          mimeType: "application/gzip",
          byteSize: 182_400n,
        },
      ],
    });

    expect(result.submission.id).toBe("sub_9001");
    expect(result.submission.status).toBe("PENDING_REVIEW");
    expect(result.submissionLifecycleState).toBe("SUBMITTED");
    expect(result.artifacts).toHaveLength(2);
    expect(result.artifacts[0]?.kind).toBe("SYSTEM_CANVAS");
    expect(result.artifacts[1]?.kind).toBe("CODE_SANDBOX");
    expect(milestoneSubmissionCreate).toHaveBeenCalledTimes(1);
    expect(workArtifactCreate).toHaveBeenCalledTimes(2);
  });

  it("rejects empty artifact lists up front and rolls back atomically on mid-transaction failure", async () => {
    const repoWithEmptyCheck = new PrismaArtifactRepository({
      $transaction: vi.fn(),
    } as unknown as PrismaClient);

    await expect(
      repoWithEmptyCheck.createMilestoneSubmissionWithArtifacts({
        projectInstanceId: "inst_empty",
        milestoneId: "mile_empty",
        artifacts: [],
      }),
    ).rejects.toThrow(EmptySubmissionArtifactsError);

    // Simulate transactional rollback when second WorkArtifact fails
    let committedSubmissionIds: string[] = [];
    let committedArtifactIds: string[] = [];

    const mockTransactionalPrisma = {
      $transaction: vi.fn(async (cb) => {
        const stagedSubmissions: string[] = [];
        const stagedArtifacts: string[] = [];

        const txResult = await cb({
          milestoneSubmission: {
            create: vi.fn(async () => {
              stagedSubmissions.push("sub_rollback_1");
              return {
                id: "sub_rollback_1",
                projectInstanceId: "inst_rb",
                milestoneId: "mile_rb",
                attemptNumber: 1,
                status: "PENDING_REVIEW",
                learnerNotes: null,
                submittedAt: new Date("2026-10-08T07:05:00Z"),
                reviewedAt: null,
              };
            }),
          },
          workArtifact: {
            create: vi
              .fn()
              .mockImplementationOnce(async ({ data }) => {
                stagedArtifacts.push("art_ok_1");
                return {
                  id: "art_ok_1",
                  ...data,
                  createdAt: new Date("2026-10-08T07:05:00Z"),
                };
              })
              .mockImplementationOnce(async () => {
                throw new Error("Simulated PostgreSQL unique constraint violation");
              }),
          },
        });

        committedSubmissionIds = stagedSubmissions;
        committedArtifactIds = stagedArtifacts;
        return txResult;
      }),
    } as unknown as PrismaClient;

    const repoWithRollback = new PrismaArtifactRepository(mockTransactionalPrisma);

    await expect(
      repoWithRollback.createMilestoneSubmissionWithArtifacts({
        projectInstanceId: "inst_rb",
        milestoneId: "mile_rb",
        artifacts: [
          {
            kind: "DOCUMENT_REDLINE",
            r2ObjectKey: "artifacts/inst_rb/doc_v1.json",
            sha256Digest: "digest_ok_1",
            extractedTopologyJson: { clausesRedlined: 4 },
            mimeType: "application/json",
            byteSize: 12_000n,
          },
          {
            kind: "SPREADSHEET_GRID",
            r2ObjectKey: "artifacts/inst_rb/sheet_v1.json",
            sha256Digest: "digest_fail_2",
            extractedTopologyJson: { formulasCount: 28 },
            mimeType: "application/json",
            byteSize: 19_500n,
          },
        ],
      }),
    ).rejects.toThrow("Simulated PostgreSQL unique constraint violation");

    expect(committedSubmissionIds).toHaveLength(0);
    expect(committedArtifactIds).toHaveLength(0);
  });

  it("enforces the 2 MB (2,097,152 bytes) R2 ceiling on attachVoiceOverCanvasReplay and persists valid replays", async () => {
    const canvasVoiceReplayCreate = vi.fn(async ({ data }) => ({
      id: "vrep_001",
      ...data,
      createdAt: new Date("2026-10-08T07:10:00Z"),
    }));

    const transactionSpy = vi.fn(async (cb) =>
      cb({
        canvasVoiceReplay: { create: canvasVoiceReplayCreate },
      }),
    );

    const mockPrisma = {
      $transaction: transactionSpy,
    } as unknown as PrismaClient;

    const repo = new PrismaArtifactRepository(mockPrisma);

    // 1. Reject payload exceeding 2,097,152 bytes before touching database
    await expect(
      repo.attachVoiceOverCanvasReplay({
        reviewId: "rev_oversize",
        audioR2Key: "voice-replays/rev_oversize/critique.opus",
        durationMs: 185_000,
        bitrateBps: TARGET_VOICE_REPLAY_BITRATE_BPS,
        keyframesJson: [{ timestampMs: 0, panX: 0, panY: 0, zoom: 1 }],
        totalBytes: MAX_VOICE_REPLAY_BYTES + 1,
      }),
    ).rejects.toThrow(VoiceReplayByteLimitExceededError);

    expect(transactionSpy).not.toHaveBeenCalled();

    // 2. Accept exact boundary payload (2,097,152 bytes) with 24 kbps Opus stream
    const attached = await repo.attachVoiceOverCanvasReplay({
      reviewId: "rev_valid_2mb",
      audioR2Key: "voice-replays/rev_valid_2mb/critique.opus",
      durationMs: 142_500,
      bitrateBps: 24000,
      keyframesJson: [
        {
          timestampMs: 0,
          panX: 120,
          panY: 80,
          zoom: 1.0,
          highlightedNodeId: "node_api_gw",
        },
        {
          timestampMs: 42_300,
          panX: 460,
          panY: 290,
          zoom: 1.45,
          highlightedNodeId: "node_ledger_db",
        },
      ],
      totalBytes: MAX_VOICE_REPLAY_BYTES,
    });

    expect(attached.replay.id).toBe("vrep_001");
    expect(attached.replay.reviewId).toBe("rev_valid_2mb");
    expect(attached.replay.opusAudioR2Key).toBe(
      "voice-replays/rev_valid_2mb/critique.opus",
    );
    expect(attached.bitrateBps).toBe(24000);
    expect(attached.totalBytes).toBe(MAX_VOICE_REPLAY_BYTES);
    expect(transactionSpy).toHaveBeenCalledTimes(1);
  });
});

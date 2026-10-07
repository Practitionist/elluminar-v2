"use client";

import React, { useState, useEffect, useRef } from "react";
import { computeProjectEscrowSplit } from "@elluminar/domain-commerce";
import {
  interpolateCanvasVoiceViewport,
  type CanvasViewportKeyframe,
} from "@elluminar/domain-artifacts";

interface RubricCriterion {
  id: string;
  label: string;
  weightPct: number;
  score: number;
  aiSuggestedScore: number;
  notes: string;
}

const INITIAL_RUBRIC: RubricCriterion[] = [
  {
    id: "arch_fault_tolerance",
    label: "Distributed Systems & Fault Tolerance",
    weightPct: 30,
    score: 88,
    aiSuggestedScore: 88,
    notes: "Strong outbox pattern; single Redis lock SPOF noted by AI First-Pass.",
  },
  {
    id: "ledger_invariants",
    label: "Double-Entry Ledger & Idempotency",
    weightPct: 30,
    score: 94,
    aiSuggestedScore: 94,
    notes: "Strict SUM(amountMinor) === 0n enforced inside serializable PG transaction.",
  },
  {
    id: "dcf_unit_economics",
    label: "Cloud & Unit Economics (DCF / Infra Cost)",
    weightPct: 20,
    score: 85,
    aiSuggestedScore: 85,
    notes: "Accurate R2 zero-egress math; WACC sensitivity table well structured.",
  },
  {
    id: "tradeoff_clarity",
    label: "Oral Defense & Trade-off Articulation",
    weightPct: 20,
    score: 90,
    aiSuggestedScore: 90,
    notes: "Clear justification of PostgreSQL advisory locks over Redlock.",
  },
];

const DEFAULT_DEMO_KEYFRAMES: CanvasViewportKeyframe[] = [
  { timestampMs: 0, scrollX: 0, scrollY: 0, zoom: 1.0, pointerX: 140, pointerY: 110 },
  { timestampMs: 1200, scrollX: 10, scrollY: 5, zoom: 1.05, pointerX: 310, pointerY: 145 },
  { timestampMs: 2400, scrollX: 25, scrollY: 15, zoom: 1.1, pointerX: 520, pointerY: 130 },
  { timestampMs: 3600, scrollX: 20, scrollY: 20, zoom: 1.08, pointerX: 520, pointerY: 285 },
  { timestampMs: 4800, scrollX: 0, scrollY: 0, zoom: 1.0, pointerX: 290, pointerY: 295 },
  { timestampMs: 6000, scrollX: 0, scrollY: 0, zoom: 1.0, pointerX: 140, pointerY: 110 },
];

export function MentorReviewCockpit() {
  const [rubric, setRubric] = useState<RubricCriterion[]>(INITIAL_RUBRIC);
  const [activeArtifactTab, setActiveArtifactTab] = useState<
    "architecture" | "code_ledger" | "dcf_sheet"
  >("architecture");

  // 24kbps Opus + Pointer Keyframe Studio State
  const [isRecording, setIsRecording] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);
  const [recordedDurationSec, setRecordedDurationSec] = useState<number>(180); // 3m 00s default sample
  const [keyframes, setKeyframes] =
    useState<CanvasViewportKeyframe[]>(DEFAULT_DEMO_KEYFRAMES);
  const [replayClockMs, setReplayClockMs] = useState<number>(0);

  // Mentor Decision & CAS State Transition
  const [reviewDecision, setReviewDecision] = useState<
    "PENDING_REVIEW" | "APPROVED" | "CHANGES_REQUESTED"
  >("PENDING_REVIEW");
  const [mentorSummaryNote, setMentorSummaryNote] = useState(
    "Solid transactional outbox & double-entry ledger schema. Replace single-node Redis lock with PG xact advisory lock before production traffic spike."
  );

  const recordStartRef = useRef<number>(0);
  const canvasBoxRef = useRef<HTMLDivElement | null>(null);

  // Compute live weighted rubric score
  const weightedScore = Math.round(
    rubric.reduce((acc, item) => acc + (item.score * item.weightPct) / 100, 0)
  );

  // Project fee: ₹12,000.00 = 1,200,000 paisa
  const projectFeeMinor = 1200000n;
  const escrowSplit = computeProjectEscrowSplit(projectFeeMinor);

  // Payload size estimation:
  // 24 kbps Opus = 3 KB/sec audio stream
  // Keyframe JSON = ~48 bytes/keyframe (compressed / structured timeline)
  const estimatedAudioKb = Math.max(12, Math.round(recordedDurationSec * 3));
  const estimatedKeyframesKb = Math.max(
    4,
    Math.round((keyframes.length * 95) / 1024 + 26)
  );
  const totalPayloadKb = estimatedAudioKb + estimatedKeyframesKb;

  // Recording timer effect
  useEffect(() => {
    if (!isRecording) return;
    recordStartRef.current = performance.now();
    const interval = setInterval(() => {
      const elapsedSec = Math.max(
        1,
        Math.round((performance.now() - recordStartRef.current) / 1000)
      );
      setRecordedDurationSec(elapsedSec);
    }, 250);
    return () => clearInterval(interval);
  }, [isRecording]);

  // Synchronized Replay animation loop using @elluminar/domain-artifacts interpolator
  useEffect(() => {
    if (!isReplaying || keyframes.length === 0) return;
    const totalMs = keyframes[keyframes.length - 1]!.timestampMs || 6000;
    const startWall = performance.now();

    let rafId = 0;
    const tick = (now: number) => {
      const elapsed = now - startWall;
      if (elapsed >= totalMs) {
        setReplayClockMs(totalMs);
        setIsReplaying(false);
        return;
      }
      setReplayClockMs(elapsed);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isReplaying, keyframes]);

  const handleToggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
    } else {
      setIsReplaying(false);
      setKeyframes([
        {
          timestampMs: 0,
          scrollX: 0,
          scrollY: 0,
          zoom: 1.0,
          pointerX: 120,
          pointerY: 100,
        },
      ]);
      setRecordedDurationSec(1);
      setIsRecording(true);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isRecording || !canvasBoxRef.current) return;
    const rect = canvasBoxRef.current.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    const timestampMs = Math.round(performance.now() - recordStartRef.current);

    setKeyframes((prev) => [
      ...prev,
      {
        timestampMs,
        scrollX: 0,
        scrollY: 0,
        zoom: 1.0,
        pointerX: x,
        pointerY: y,
      },
    ]);
  };

  const currentInterpolatedFrame =
    keyframes.length > 0
      ? interpolateCanvasVoiceViewport(keyframes, replayClockMs)
      : {
          timestampMs: 0,
          scrollX: 0,
          scrollY: 0,
          zoom: 1,
          pointerX: 180,
          pointerY: 130,
        };

  const handleUpdateScore = (id: string, nextScore: number) => {
    setRubric((prev) =>
      prev.map((r) => (r.id === id ? { ...r, score: nextScore } : r))
    );
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(340px, 440px) 1fr",
        gap: "20px",
        alignItems: "start",
      }}
    >
      {/* LEFT PANE: AI ENGINE 2 BRIEF + RUBRIC + ESCROW PAYOUT PREVIEW */}
      <aside
        style={{
          background: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: "14px",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        {/* AI First-Pass Header & 3-Bullet Mentor Brief */}
        <section
          style={{
            background: "#090d16",
            border: "1px solid #1e3a8a",
            borderRadius: "10px",
            padding: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "10px",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#38bdf8",
              }}
            >
              AI Engine 2 • AI_FIRST_PASS Brief
            </span>
            <span
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "999px",
                background: "#064e3b",
                color: "#6ee7b7",
                fontWeight: 600,
              }}
            >
              5-Min Review Target
            </span>
          </div>

          <ul
            style={{
              margin: 0,
              paddingLeft: "18px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              fontSize: "13px",
              lineHeight: 1.5,
              color: "#cbd5e1",
            }}
          >
            <li>
              <strong style={{ color: "#4ade80" }}>Architectural Strength:</strong>{" "}
              Idempotent Razorpay webhook ingestion paired with serializable PostgreSQL{" "}
              <code>LedgerEntry</code> double-entry check constraints (
              <code>SUM(amountMinor) === 0n</code>).
            </li>
            <li>
              <strong style={{ color: "#fbbf24" }}>
                Primary Bottleneck / SPOF Risk:
              </strong>{" "}
              Single-node Redis lock on payout release (`SET NX EX 30`) introduces split-brain
              risk under GC pause before CAS commit.
            </li>
            <li>
              <strong style={{ color: "#38bdf8" }}>Suggested Probe:</strong>{" "}
              Ask why <code>UPDATE ... WHERE status = &apos;ESCROW_LOCKED&apos;</code> row-level
              CAS locking eliminates the external Redis lock entirely.
            </li>
          </ul>
        </section>

        {/* Interactive Pre-Filled Rubric Sliders (0-100) */}
        <section>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: "12px",
            }}
          >
            <h2 style={{ fontSize: "15px", margin: 0, color: "#f8fafc" }}>
              Domain Rubric Assessment
            </h2>
            <span
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: weightedScore >= 80 ? "#4ade80" : "#fbbf24",
              }}
            >
              {weightedScore} / 100
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {rubric.map((criterion) => (
              <div
                key={criterion.id}
                style={{
                  background: "#1e293b40",
                  border: "1px solid #1e293b",
                  borderRadius: "8px",
                  padding: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "13px",
                    marginBottom: "6px",
                  }}
                >
                  <label
                    htmlFor={`slider-${criterion.id}`}
                    style={{ fontWeight: 600, color: "#e2e8f0" }}
                  >
                    {criterion.label}{" "}
                    <span style={{ color: "#64748b", fontWeight: 400 }}>
                      ({criterion.weightPct}%)
                    </span>
                  </label>
                  <span style={{ fontWeight: 700, color: "#38bdf8" }}>
                    {criterion.score}
                  </span>
                </div>

                <input
                  id={`slider-${criterion.id}`}
                  type="range"
                  min={0}
                  max={100}
                  value={criterion.score}
                  onChange={(e) =>
                    handleUpdateScore(criterion.id, Number(e.target.value))
                  }
                  style={{
                    width: "100%",
                    accentColor: "#38bdf8",
                    cursor: "pointer",
                  }}
                />
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                  AI Pre-fill: {criterion.aiSuggestedScore}/100 — {criterion.notes}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Live 3-Way Payout Escrow Split Preview */}
        <section
          style={{
            background: "#090d16",
            border: "1px solid #1e293b",
            borderRadius: "10px",
            padding: "14px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#f8fafc" }}>
              50% Mentor Escrow Release Preview
            </span>
            <span
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "6px",
                background:
                  reviewDecision === "APPROVED" ? "#065f46" : "#1e293b",
                color: reviewDecision === "APPROVED" ? "#6ee7b7" : "#94a3b8",
                fontWeight: 600,
              }}
            >
              {reviewDecision === "APPROVED" ? "RELEASED TO AVAILABLE" : "ESCROW_LOCKED"}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              rowGap: "6px",
              fontSize: "12px",
              color: "#cbd5e1",
            }}
          >
            <span>Mentor Payout (50% • Instant on Sign-Off):</span>
            <strong style={{ color: "#4ade80", fontSize: "14px" }}>
              ₹{(Number(escrowSplit.mentorEscrowMinor) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </strong>

            <span>Author IP Royalty (15% • Curriculum Creator):</span>
            <span>
              ₹{(Number(escrowSplit.authorRoyaltyEscrowMinor) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>

            <span>Platform Engine Share (35% • Infra &amp; GST):</span>
            <span>
              ₹{(Number(escrowSplit.platformShareMinor) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </section>
      </aside>

      {/* RIGHT PANE: SUBMITTED ARTIFACT CANVAS + 24KBPS OPUS & LASER POINTER STUDIO */}
      <section
        style={{
          background: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: "14px",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {/* Top Studio Toolbar: Record 24kbps Opus + Pointer Replay */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            background: "#090d16",
            border: "1px solid #1e293b",
            borderRadius: "10px",
            padding: "12px 16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              onClick={handleToggleRecording}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "none",
                background: isRecording ? "#dc2626" : "#2563eb",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              {isRecording
                ? `● Stop Recording (${recordedDurationSec}s)`
                : "🎙 Record 24kbps Opus + Pointer Replay"}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsRecording(false);
                setReplayClockMs(0);
                setIsReplaying(true);
              }}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid #334155",
                background: isReplaying ? "#0f766e" : "#1e293b",
                color: "#f8fafc",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              {isReplaying
                ? `▶ Replaying (${(replayClockMs / 1000).toFixed(1)}s)`
                : "▶ Preview Synchronized Replay"}
            </button>
          </div>

          {/* Cloudflare R2 Zero-Egress Telemetry Readout */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              fontSize: "12px",
              color: "#94a3b8",
            }}
          >
            <span>
              Opus Stream: <strong style={{ color: "#e2e8f0" }}>~{estimatedAudioKb} KB</strong>
            </span>
            <span>
              Pointer JSON ({keyframes.length} pts):{" "}
              <strong style={{ color: "#e2e8f0" }}>~{estimatedKeyframesKb} KB</strong>
            </span>
            <span
              style={{
                padding: "3px 8px",
                borderRadius: "6px",
                background: "#064e3b",
                color: "#6ee7b7",
                fontWeight: 600,
              }}
            >
              Total ~{totalPayloadKb} KB • Cloudflare R2 Egress: ₹0.00
            </span>
          </div>
        </div>

        {/* Artifact Switcher Tabs */}
        <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid #1e293b", paddingBottom: "10px" }}>
          {(
            [
              { id: "architecture", label: "Excalidraw System Topology (14 Nodes)" },
              { id: "code_ledger", label: "Double-Entry CAS Ledger (TypeScript)" },
              { id: "dcf_sheet", label: "Cloud Unit Economics & DCF Model" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveArtifactTab(tab.id)}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "none",
                background: activeArtifactTab === tab.id ? "#1e293b" : "transparent",
                color: activeArtifactTab === tab.id ? "#38bdf8" : "#94a3b8",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Interactive Canvas / Artifact Stage with Real-Time Pointer Capture */}
        <div
          ref={canvasBoxRef}
          onMouseMove={handleCanvasMouseMove}
          style={{
            position: "relative",
            minHeight: "360px",
            background: "#090d16",
            border: isRecording ? "2px solid #ef4444" : "1px solid #1e293b",
            borderRadius: "10px",
            padding: "24px",
            overflow: "hidden",
            cursor: isRecording ? "crosshair" : "default",
          }}
        >
          {/* Animated Laser Pointer Overlay during Replay or Active Recording */}
          {(isReplaying || isRecording) && (
            <div
              style={{
                position: "absolute",
                left: `${currentInterpolatedFrame.pointerX}px`,
                top: `${currentInterpolatedFrame.pointerY}px`,
                width: "22px",
                height: "22px",
                borderRadius: "999px",
                background: "rgba(239, 68, 68, 0.35)",
                border: "2px solid #ef4444",
                transform: "translate(-50%, -50%)",
                pointerEvents: "none",
                zIndex: 20,
                boxShadow: "0 0 16px rgba(239, 68, 68, 0.9)",
              }}
            />
          )}

          {activeArtifactTab === "architecture" && (
            <div>
              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "16px" }}>
                Learner Submission SHA-256: <code>9f4e2a7c8b1d...3c91a4</code> • Move cursor while recording to bind laser keyframes
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "20px",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    padding: "16px",
                    borderRadius: "10px",
                    background: "#0f172a",
                    border: "1px solid #38bdf8",
                  }}
                >
                  <div style={{ fontSize: "11px", color: "#38bdf8", fontWeight: 700 }}>
                    INGESTION EDGE
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: 700, margin: "4px 0" }}>
                    Hono Webhook Gateway
                  </div>
                  <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                    HMAC-SHA256 verification + Idempotency Key header guard
                  </div>
                </div>

                <div
                  style={{
                    padding: "16px",
                    borderRadius: "10px",
                    background: "#0f172a",
                    border: "1px solid #4ade80",
                  }}
                >
                  <div style={{ fontSize: "11px", color: "#4ade80", fontWeight: 700 }}>
                    CORE ACID LEDGER (ap-south-1)
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: 700, margin: "4px 0" }}>
                    Supabase PG Double-Entry
                  </div>
                  <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                    <code>LedgerJournal</code> + <code>LedgerEntry</code> zero-sum split (50 / 15 / 35)
                  </div>
                </div>

                <div
                  style={{
                    padding: "16px",
                    borderRadius: "10px",
                    background: "#0f172a",
                    border: "2px dashed #fbbf24",
                  }}
                >
                  <div style={{ fontSize: "11px", color: "#fbbf24", fontWeight: 700 }}>
                    ⚠️ AI FLAGGED SPOF NODE
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: 700, margin: "4px 0" }}>
                    Single Redis Lock Instance
                  </div>
                  <div style={{ fontSize: "12px", color: "#cbd5e1" }}>
                    Recommend replacing with PG CAS query:{" "}
                    <code>WHERE status = &apos;ESCROW_LOCKED&apos;</code>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeArtifactTab === "code_ledger" && (
            <pre
              style={{
                margin: 0,
                fontSize: "12px",
                lineHeight: 1.6,
                color: "#e2e8f0",
                overflowX: "auto",
              }}
            >
              {`// Learner Submitted Double-Entry Escrow Release (CAS Protected)
export async function approveSubmissionAndReleaseMentorEscrow(
  tx: PrismaTransactionClient,
  submissionId: string
) {
  const updated = await tx.submission.updateMany({
    where: { id: submissionId, status: "SUBMITTED" },
    data: { status: "APPROVED", reviewedAt: new Date() },
  });
  if (updated.count !== 1) {
    throw new Error("CAS_CONFLICT: Submission already reviewed");
  }
  // 50% Mentor Escrow moves deterministically from ESCROW_LOCKED -> AVAILABLE
}`}
            </pre>
          )}

          {activeArtifactTab === "dcf_sheet" && (
            <div style={{ fontSize: "13px", color: "#cbd5e1" }}>
              <h3 style={{ margin: "0 0 10px 0", color: "#f8fafc" }}>
                Infrastructure Unit Economics Comparison (10,000 Reviews / Month)
              </h3>
              <ul style={{ lineHeight: 1.7 }}>
                <li>
                  Legacy MP4 Video Recording (1080p @ 45 MB/review):{" "}
                  <strong>450 GB storage + ₹38,400/mo egress</strong>
                </li>
                <li>
                  Elluminar 24kbps Opus + Keyframe JSON (~568 KB/review):{" "}
                  <strong style={{ color: "#4ade80" }}>
                    5.68 GB storage + ₹0.00/mo Cloudflare R2 egress (98.7% reduction)
                  </strong>
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Mentor Final Note & Sign-Off Controls */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            background: "#090d16",
            border: "1px solid #1e293b",
            borderRadius: "10px",
            padding: "16px",
          }}
        >
          <label
            htmlFor="mentor-summary-note"
            style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0" }}
          >
            Written Sign-Off Summary (Attached to Learner Proof-of-Work Credential &amp; University Dossier)
          </label>
          <textarea
            id="mentor-summary-note"
            rows={2}
            value={mentorSummaryNote}
            onChange={(e) => setMentorSummaryNote(e.target.value)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "#0f172a",
              color: "#f8fafc",
              border: "1px solid #334155",
              borderRadius: "8px",
              padding: "10px",
              fontSize: "13px",
            }}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ fontSize: "12px", color: "#94a3b8" }}>
              CAS Status:{" "}
              <strong style={{ color: "#38bdf8" }}>{reviewDecision}</strong>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setReviewDecision("CHANGES_REQUESTED")}
                style={{
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "1px solid #fbbf24",
                  background: "transparent",
                  color: "#fbbf24",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Request Iteration (Hold Escrow)
              </button>

              <button
                type="button"
                onClick={() => setReviewDecision("APPROVED")}
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#16a34a",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                ✓ Approve &amp; Release ₹6,000.00 Mentor Escrow
              </button>
            </div>
          </div>

          {reviewDecision === "APPROVED" && (
            <div
              style={{
                marginTop: "6px",
                padding: "12px",
                borderRadius: "8px",
                background: "#064e3b",
                border: "1px solid #10b981",
                color: "#ecfdf5",
                fontSize: "12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>
                ✓ CAS Sign-Off Committed (`SUM(amountMinor) === 0n`). Credential issued at{" "}
                <a
                  href="/verify/ELM-2026-ARJUN-99"
                  style={{ color: "#6ee7b7", textDecoration: "underline", fontWeight: 700 }}
                >
                  /verify/ELM-2026-ARJUN-99
                </a>
              </span>
              <a
                href="/org/dossier-demo"
                style={{ color: "#ffffff", textDecoration: "underline", fontWeight: 600 }}
              >
                View University Dossier &amp; GST Invoice →
              </a>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

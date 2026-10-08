"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { reserveCohortSeatCas } from "@elluminar/domain-commerce";
import {
  STOREFRONT_CATALOG_SKUS,
  type DeliveryMode,
} from "../../../../components/storefront/CheckoutQuoteDrawer";

interface CurriculumLesson {
  id: string;
  sectionTitle: string;
  title: string;
  durationMinutes: number;
  artifactMilestoneType: "SYSTEM_TOPOLOGY" | "PYTHON_WASM_AST" | "VOICE_CANVAS_DEFENSE";
  summary: string;
  invariantSpec: string;
}

const CURRICULUM_LESSONS: CurriculumLesson[] = [
  {
    id: "mod-1-quorum-topology",
    sectionTitle: "Section 1 • Foundations & Invariant Specification",
    title: "1.1 Designing Linearizable Read/Write Quorums & Split-Brain Guards",
    durationMinutes: 42,
    artifactMilestoneType: "SYSTEM_TOPOLOGY",
    summary:
      "Construct multi-region leader election topologies in the Excalidraw System Stencil Canvas and validate quorum intersection (`R + W > N`).",
    invariantSpec:
      "Topology Extractor verifies zero single-point-of-failure edges across ≥ 3 availability zones.",
  },
  {
    id: "mod-2-ast-verifier",
    sectionTitle: "Section 2 • Deterministic Execution & AST Verification",
    title: "2.1 Implementing WAL Log Compaction & Hybrid Citation Grounding",
    durationMinutes: 55,
    artifactMilestoneType: "PYTHON_WASM_AST",
    summary:
      "Execute Python WASM (Pyodide) benchmarks directly in-browser with deterministic AST static analysis verifying zero ungrounded citations or blocking calls.",
    invariantSpec:
      "Pyodide AST Verifier enforces p99 latency < 350ms and 100% deterministic seed reproducibility.",
  },
  {
    id: "mod-3-oral-defense",
    sectionTitle: "Section 3 • Principal Mentor Evaluation & Escrow Release",
    title: "3.1 60fps Voice-over-Canvas Oral Defense & Rubric Sign-Off",
    durationMinutes: 35,
    artifactMilestoneType: "VOICE_CANVAS_DEFENSE",
    summary:
      "Submit your completed WorkArtifact bundle for asynchronous 5–8 minute Principal Mentor review recorded with 24kbps Opus voice + laser pointer keyframes.",
    invariantSpec:
      "Final PASS verdict triggers Double-Entry Ledger release of 50% Mentor Escrow + 15% Author IP Royalty Escrow.",
  },
];

export default function HybridCourseCohortPlayerPage() {
  const params = useParams<{ slug?: string }>();
  const slug = typeof params?.slug === "string" ? params.slug : "production-agentic-rag-evals";

  const matchedCourse = useMemo(() => {
    return (
      STOREFRONT_CATALOG_SKUS.find((item) => item.slug === slug) ??
      STOREFRONT_CATALOG_SKUS[1]!
    );
  }, [slug]);

  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>(
    matchedCourse.deliveryMode
  );
  const [activeLessonId, setActiveLessonId] = useState<string>(
    CURRICULUM_LESSONS[0]!.id
  );
  const [cohortSnapshot, setCohortSnapshot] = useState({
    id: `cohort-${matchedCourse.slug}-oct26`,
    courseId: matchedCourse.id,
    capacity: matchedCourse.seatTelemetry?.capacity ?? 30,
    enrolledCount: matchedCourse.seatTelemetry?.enrolled ?? 26,
    status: "ACTIVE" as const,
    version: matchedCourse.seatTelemetry?.casVersion ?? 14,
  });
  const [casStatusBanner, setCasStatusBanner] = useState<string | null>(null);

  const activeLesson =
    CURRICULUM_LESSONS.find((l) => l.id === activeLessonId) ??
    CURRICULUM_LESSONS[0]!;

  function handleSimulateSeatCasReservation() {
    const mutableCopy = { ...cohortSnapshot };
    const result = reserveCohortSeatCas({
      cohort: mutableCopy,
      expectedVersion: cohortSnapshot.version,
      quantity: 1,
    });

    if (result.outcome === "RESERVED") {
      setCohortSnapshot(mutableCopy);
      setCasStatusBanner(
        `✓ Atomic CAS Seat Reserved (v${cohortSnapshot.version} → v${result.nextVersion}). ${result.remainingSeats} seats remaining.`
      );
    } else {
      setCasStatusBanner(`✕ CAS Rejected (${result.outcome}): ${result.reason}`);
    }
  }

  return (
    <main
      style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "36px 24px 80px",
        lineHeight: 1.6,
      }}
    >
      {/* Top Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "28px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Link
            href="/explore"
            style={{
              color: "#94a3b8",
              textDecoration: "none",
              fontSize: "13px",
              padding: "6px 12px",
              borderRadius: "8px",
              background: "#0f172a",
              border: "1px solid #1e293b",
            }}
          >
            ← Back to /explore Storefront
          </Link>
          <span
            style={{
              padding: "4px 12px",
              borderRadius: "999px",
              background: "rgba(56, 189, 248, 0.14)",
              color: "#38bdf8",
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            {matchedCourse.domain} • {matchedCourse.credits} NEP Credits
          </span>
        </div>

        {/* Delivery Mode Switcher */}
        <div
          style={{
            display: "flex",
            gap: "6px",
            padding: "4px",
            borderRadius: "10px",
            background: "#0f172a",
            border: "1px solid #334155",
          }}
        >
          <button
            type="button"
            onClick={() => setDeliveryMode("LIVE_COHORT")}
            style={{
              padding: "7px 14px",
              borderRadius: "7px",
              border: "none",
              background:
                deliveryMode === "LIVE_COHORT" ? "#0284c7" : "transparent",
              color: "#f8fafc",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            🔴 LIVE_COHORT (Seat CAS Telemetry)
          </button>
          <button
            type="button"
            onClick={() => setDeliveryMode("SELF_PACED")}
            style={{
              padding: "7px 14px",
              borderRadius: "7px",
              border: "none",
              background:
                deliveryMode === "SELF_PACED" ? "#059669" : "transparent",
              color: "#f8fafc",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ⚡ SELF_PACED (Async Mastery)
          </button>
        </div>
      </div>

      {/* Course Title & Delivery Telemetry Banner */}
      <header
        style={{
          background: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: "16px",
          padding: "24px",
          marginBottom: "28px",
        }}
      >
        <h1 style={{ fontSize: "30px", margin: "0 0 8px 0", color: "#f8fafc" }}>
          {matchedCourse.title}
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "15px", margin: "0 0 18px 0" }}>
          Lead Faculty: <strong>{matchedCourse.mentorLead}</strong> • Slug:{" "}
          <code>{slug}</code>
        </p>

        {deliveryMode === "LIVE_COHORT" ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              padding: "14px 18px",
              borderRadius: "12px",
              background: "#020617",
              border: "1px solid rgba(56, 189, 248, 0.35)",
            }}
          >
            <div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#38bdf8" }}>
                LIVE_COHORT Optimistic CAS Seat Guard Active
              </div>
              <div style={{ fontSize: "12px", color: "#cbd5e1", marginTop: "2px" }}>
                Enrolled:{" "}
                <strong>
                  {cohortSnapshot.enrolledCount} / {cohortSnapshot.capacity}
                </strong>{" "}
                • CAS Version: <code>v{cohortSnapshot.version}</code> • Remaining:{" "}
                <strong>
                  {cohortSnapshot.capacity - cohortSnapshot.enrolledCount} seats
                </strong>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSimulateSeatCasReservation}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid #38bdf8",
                background: "rgba(56, 189, 248, 0.16)",
                color: "#f8fafc",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Test `reserveCohortSeatCas()` (+1 Seat)
            </button>
          </div>
        ) : (
          <div
            style={{
              padding: "14px 18px",
              borderRadius: "12px",
              background: "#020617",
              border: "1px solid rgba(52, 211, 153, 0.35)",
              fontSize: "13px",
              color: "#a7f3d0",
            }}
          >
            <strong>SELF_PACED Asynchronous Mastery Mode:</strong> Instant access
            to all 3-Pane Work Artifact sandboxes with 48-hour SLA on Principal
            Mentor 24kbps Opus Voice-over-Canvas evaluations.
          </div>
        )}

        {casStatusBanner && (
          <div
            style={{
              marginTop: "12px",
              fontSize: "12px",
              color: "#38bdf8",
              fontFamily: "monospace",
            }}
          >
            {casStatusBanner}
          </div>
        )}
      </header>

      {/* Main Split Curriculum Navigator + Active Milestone Player */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: "24px",
          alignItems: "start",
        }}
      >
        {/* Left Sidebar: Section & Lesson Navigator */}
        <nav
          aria-label="Course Curriculum Sections"
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "14px",
            padding: "20px",
          }}
        >
          <h2
            style={{
              fontSize: "15px",
              margin: "0 0 14px 0",
              color: "#cbd5e1",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Curriculum &amp; Artifact Checkpoints
          </h2>

          <div style={{ display: "grid", gap: "10px" }}>
            {CURRICULUM_LESSONS.map((lesson) => {
              const isSelected = lesson.id === activeLesson.id;
              return (
                <button
                  key={lesson.id}
                  type="button"
                  onClick={() => setActiveLessonId(lesson.id)}
                  style={{
                    textAlign: "left",
                    padding: "14px",
                    borderRadius: "10px",
                    border: isSelected
                      ? "1px solid #38bdf8"
                      : "1px solid #1e293b",
                    background: isSelected ? "#131c31" : "#020617",
                    color: "#f8fafc",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#38bdf8",
                      fontWeight: 600,
                      marginBottom: "4px",
                    }}
                  >
                    {lesson.sectionTitle}
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "6px" }}>
                    {lesson.title}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "11px",
                      color: "#94a3b8",
                    }}
                  >
                    <span>{lesson.durationMinutes} mins</span>
                    <code>{lesson.artifactMilestoneType}</code>
                  </div>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Right Stage: Active Lesson Workspace & Studio/Mentor Deep Links */}
        <section
          style={{
            background: "#0f172a",
            border: "1px solid #334155",
            borderRadius: "14px",
            padding: "28px",
          }}
        >
          <div
            style={{
              display: "inline-block",
              padding: "3px 10px",
              borderRadius: "999px",
              background: "rgba(192, 132, 252, 0.16)",
              color: "#c084fc",
              fontSize: "11px",
              fontWeight: 700,
              marginBottom: "10px",
            }}
          >
            Milestone Artifact: {activeLesson.artifactMilestoneType}
          </div>

          <h2 style={{ fontSize: "24px", margin: "0 0 12px 0", color: "#f8fafc" }}>
            {activeLesson.title}
          </h2>

          <p style={{ color: "#cbd5e1", fontSize: "15px", margin: "0 0 20px 0" }}>
            {activeLesson.summary}
          </p>

          <div
            style={{
              padding: "16px",
              borderRadius: "12px",
              background: "#020617",
              border: "1px solid #1e293b",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#34d399",
                marginBottom: "6px",
              }}
            >
              Automated AST / Topology Verification Gate:
            </div>
            <div style={{ fontSize: "13px", color: "#94a3b8" }}>
              {activeLesson.invariantSpec}
            </div>
          </div>

          {/* Deep Links into /studio/demo and /mentor/demo */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
            }}
          >
            <Link
              href="/studio/demo"
              style={{
                display: "block",
                padding: "16px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #0284c7, #4f46e5)",
                color: "#ffffff",
                textDecoration: "none",
              }}
            >
              <div style={{ fontSize: "11px", fontWeight: 700, opacity: 0.9 }}>
                LEARNER WORKSPACE
              </div>
              <div style={{ fontSize: "16px", fontWeight: 700, marginTop: "4px" }}>
                Open `/studio/demo` Milestone →
              </div>
              <div style={{ fontSize: "12px", opacity: 0.85, marginTop: "4px" }}>
                Launch 3-Pane Excalidraw + Pyodide AST + DCF Studio
              </div>
            </Link>

            <Link
              href="/mentor/demo"
              style={{
                display: "block",
                padding: "16px",
                borderRadius: "12px",
                background: "#1e293b",
                border: "1px solid #475569",
                color: "#f8fafc",
                textDecoration: "none",
              }}
            >
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#34d399" }}>
                PRINCIPAL MENTOR COCKPIT
              </div>
              <div style={{ fontSize: "16px", fontWeight: 700, marginTop: "4px" }}>
                Open `/mentor/demo` Review →
              </div>
              <div style={{ fontSize: "12px", color: "#cbd5e1", marginTop: "4px" }}>
                Inspect 24kbps Opus Voice-over-Canvas &amp; 50% Escrow Payout
              </div>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

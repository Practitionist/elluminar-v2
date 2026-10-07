import type { Metadata } from "next";
import { MentorReviewCockpit } from "../../../components/mentor/MentorReviewCockpit";

export const metadata: Metadata = {
  title: "Mentor Review Cockpit • Elluminar v2",
  description:
    "Unified 5–8 Minute High-Signal Mentor Review Cockpit with AI First-Pass Brief, 24kbps Opus Voice-over-Canvas Recorder, and Instant 50% Escrow Payout.",
};

export default function MentorDemoPage() {
  return (
    <main
      style={{
        maxWidth: "1360px",
        margin: "0 auto",
        padding: "32px 24px 64px",
      }}
    >
      <header
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          marginBottom: "24px",
          paddingBottom: "16px",
          borderBottom: "1px solid #1e293b",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-block",
              padding: "3px 10px",
              borderRadius: "999px",
              background: "#1e293b",
              color: "#38bdf8",
              fontSize: "12px",
              fontWeight: 600,
              marginBottom: "6px",
            }}
          >
            Elluminar v2 • Phase 3B Mentor Review Cockpit
          </div>
          <h1 style={{ fontSize: "26px", margin: 0, color: "#f8fafc" }}>
            Capstone Review: High-Throughput FinTech Double-Entry Ledger
          </h1>
          <div style={{ fontSize: "13px", color: "#94a3b8", marginTop: "4px" }}>
            Candidate: <strong>Arjun Nair (USN: 1RV23CS042)</strong> • Cohort: RVCE B.Tech CSE 8th Sem NEP Capstone (16 Credits)
          </div>
        </div>

        <nav style={{ display: "flex", gap: "12px", fontSize: "13px" }}>
          <a
            href="/org/dossier-demo"
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              background: "#1e293b",
              color: "#f8fafc",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            NEP / AICTE Dossier &amp; GST Invoice →
          </a>
          <a
            href="/verify/ELM-2026-ARJUN-99"
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              background: "#0f766e",
              color: "#ffffff",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Public Proof-of-Work Credential →
          </a>
        </nav>
      </header>

      <MentorReviewCockpit />
    </main>
  );
}

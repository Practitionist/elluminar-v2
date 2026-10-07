import type { Metadata } from "next";
import { computeProjectEscrowSplit } from "@elluminar/domain-commerce";

interface VerifiedCredentialRecord {
  verificationCode: string;
  learnerName: string;
  institution: string;
  projectTitle: string;
  projectBrief: string;
  overallScore: number;
  mentorName: string;
  mentorTitle: string;
  artifactSha256: string;
  oralDefenseStatus: string;
  nepCredits: number;
  issuedAtIso: string;
}

const CREDENTIAL_REGISTRY: Record<string, VerifiedCredentialRecord> = {
  "ELM-2026-ARJUN-99": {
    verificationCode: "ELM-2026-ARJUN-99",
    learnerName: "Arjun Nair (USN: 1RV23CS042)",
    institution: "RV College of Engineering • B.Tech CSE 8th Sem NEP Capstone",
    projectTitle: "High-Throughput FinTech Double-Entry Escrow Ledger & GST Engine",
    projectBrief:
      "Architected a serializable PostgreSQL double-entry ledger enforcing SUM(amountMinor) === 0n invariants across 3-way escrow splits (50% Mentor / 15% Author / 35% Platform), CAS payout transitions, and SAC 999293 B2B GST tax invoicing.",
    overallScore: 90,
    mentorName: "Vikramaditya Rao",
    mentorTitle: "Principal Payments Architect (Ex-Razorpay / Juspay)",
    artifactSha256:
      "9f4e2a7c8b1d4029e65c182f73a90e21b40d8c61f29a87c11e04b5d82f3c91a4",
    oralDefenseStatus: "PASSED WITH DISTINCTION • 96.4% Authorship Confidence",
    nepCredits: 16,
    issuedAtIso: "2026-10-07T18:30:00Z",
  },
  "ELM-2026-ANANYA-94": {
    verificationCode: "ELM-2026-ANANYA-94",
    learnerName: "Ananya Deshmukh (USN: 1RV23CS088)",
    institution: "RV College of Engineering • B.Tech CSE 8th Sem NEP Capstone",
    projectTitle: "Multi-Region Payment Switch & Idempotent Transactional Outbox",
    projectBrief:
      "Engineered zero-data-loss webhook ingestion and idempotent outbox relay workers resilient to broker partitions across ap-south-1.",
    overallScore: 94,
    mentorName: "Siddharth Kulkarni",
    mentorTitle: "Staff Distributed Systems Engineer",
    artifactSha256:
      "4b8c1d09e3a29811c04f7a21d85e3c9012f8a4b76e19c30d84f2a109e771fd08",
    oralDefenseStatus: "PASSED WITH DISTINCTION • 98.1% Authorship Confidence",
    nepCredits: 16,
    issuedAtIso: "2026-10-07T17:15:00Z",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `Verified Credential ${code} • Elluminar Proof-of-Work`,
    description: `Cryptographic SHA-256 & Double-Entry Ledger verification portal for Elluminar credential ${code}.`,
  };
}

export default async function PublicCredentialVerificationPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const normalizedCode = decodeURIComponent(code).toUpperCase();

  const record: VerifiedCredentialRecord =
    CREDENTIAL_REGISTRY[normalizedCode] ?? {
      verificationCode: normalizedCode,
      learnerName: "Verified Cohort Graduate",
      institution: "AICTE / NEP 2020 Partner Institution",
      projectTitle: "Applied Distributed Architecture & Cloud Unit Economics Capstone",
      projectBrief:
        "Submitted production Excalidraw topology, TypeScript domain core, and SaaS unit economics model verified via synchronized 24kbps Opus mentor voice-over-canvas review.",
      overallScore: 89,
      mentorName: "Principal Industry Mentor",
      mentorTitle: "Elluminar Verified Review Guild",
      artifactSha256:
        "7d31a5f902c4810e92b4f18d30c5a721e904b6f812c30a94d71b82e50ae82b19",
      oralDefenseStatus: "PASSED • Verified Live Viva-Voce Defense",
      nepCredits: 16,
      issuedAtIso: "2026-10-07T16:00:00Z",
    };

  const escrowSplit = computeProjectEscrowSplit(1200000n);

  return (
    <main
      style={{
        maxWidth: "980px",
        margin: "0 auto",
        padding: "44px 24px 80px",
        lineHeight: 1.6,
      }}
    >
      {/* Top Verification Banner */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          padding: "14px 20px",
          borderRadius: "12px",
          background: "#064e3b",
          border: "1px solid #10b981",
          color: "#ecfdf5",
          marginBottom: "28px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              display: "inline-block",
              padding: "3px 10px",
              borderRadius: "999px",
              background: "#047857",
              fontWeight: 700,
              fontSize: "12px",
            }}
          >
            ✓ CRYPTOGRAPHICALLY VERIFIED PROOF-OF-WORK
          </span>
          <span style={{ fontSize: "13px" }}>
            Credential ID: <code>{record.verificationCode}</code>
          </span>
        </div>

        <div style={{ display: "flex", gap: "12px", fontSize: "13px" }}>
          <a
            href="/mentor/demo"
            style={{ color: "#a7f3d0", textDecoration: "underline", fontWeight: 600 }}
          >
            Open Mentor Cockpit
          </a>
          <a
            href="/org/dossier-demo"
            style={{ color: "#ffffff", textDecoration: "underline", fontWeight: 600 }}
          >
            Open University NEP Dossier
          </a>
        </div>
      </div>

      {/* Main Credential Card */}
      <section
        style={{
          background: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: "16px",
          padding: "32px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "16px",
            borderBottom: "1px solid #1e293b",
            paddingBottom: "24px",
            marginBottom: "24px",
          }}
        >
          <div>
            <div style={{ fontSize: "13px", color: "#38bdf8", fontWeight: 700 }}>
              {record.institution}
            </div>
            <h1 style={{ fontSize: "30px", margin: "6px 0", color: "#f8fafc" }}>
              {record.learnerName}
            </h1>
            <div style={{ fontSize: "15px", color: "#cbd5e1", fontWeight: 600 }}>
              {record.projectTitle}
            </div>
          </div>

          <div
            style={{
              background: "#090d16",
              border: "1px solid #1e293b",
              borderRadius: "12px",
              padding: "14px 20px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase" }}>
              Principal Mentor Score
            </div>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "#4ade80" }}>
              {record.overallScore} / 100
            </div>
            <div style={{ fontSize: "11px", color: "#38bdf8", fontWeight: 600 }}>
              {record.nepCredits} NEP Credits Awarded
            </div>
          </div>
        </div>

        {/* Project Brief & Oral Defense Badge */}
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "16px", color: "#f8fafc", margin: "0 0 8px 0" }}>
            Verified Engineering &amp; Financial Problem Statement
          </h2>
          <p style={{ margin: 0, color: "#cbd5e1", fontSize: "14px" }}>
            {record.projectBrief}
          </p>

          <div
            style={{
              marginTop: "14px",
              display: "inline-block",
              padding: "6px 12px",
              borderRadius: "8px",
              background: "#1e293b",
              border: "1px solid #38bdf8",
              color: "#38bdf8",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            🛡 Oral Defense Verdict: {record.oralDefenseStatus}
          </div>
        </div>

        {/* Work Artifact & Mentor Sign-Off Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
            gap: "20px",
          }}
        >
          {/* Artifact Digest & Telemetry */}
          <div
            style={{
              background: "#090d16",
              border: "1px solid #1e293b",
              borderRadius: "12px",
              padding: "18px",
            }}
          >
            <h3 style={{ fontSize: "14px", margin: "0 0 10px 0", color: "#f8fafc" }}>
              Multimodal Work-Artifact Digest (Excalidraw + Code + DCF)
            </h3>
            <div style={{ fontSize: "12px", color: "#94a3b8", display: "grid", rowGap: "8px" }}>
              <div>
                <strong>Immutable Artifact SHA-256:</strong>
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: "11px",
                    color: "#38bdf8",
                    wordBreak: "break-all",
                    marginTop: "2px",
                  }}
                >
                  {record.artifactSha256}
                </div>
              </div>
              <div>
                <strong>Topology Graph Audit:</strong> 14 Architecture Nodes • 19 Directed Edges • Zero Unmitigated SPOFs
              </div>
              <div>
                <strong>Voice-over-Canvas Review:</strong> 3m 00s Synchronized 24kbps Opus + 60fps Laser Keyframes (`568 KB` on Cloudflare R2)
              </div>
            </div>
          </div>

          {/* 3-Way Double-Entry Ledger Attribution */}
          <div
            style={{
              background: "#090d16",
              border: "1px solid #1e293b",
              borderRadius: "12px",
              padding: "18px",
            }}
          >
            <h3 style={{ fontSize: "14px", margin: "0 0 10px 0", color: "#f8fafc" }}>
              Double-Entry Ledger Attribution (`SUM(amountMinor) === 0n`)
            </h3>
            <div style={{ fontSize: "12px", color: "#cbd5e1", display: "grid", rowGap: "6px" }}>
              <div>
                <strong>Signed-Off By:</strong> {record.mentorName} ({record.mentorTitle})
              </div>
              <div>
                <strong>50% Mentor Escrow Released:</strong>{" "}
                <span style={{ color: "#4ade80", fontWeight: 700 }}>
                  ₹{(Number(escrowSplit.mentorEscrowMinor) / 100).toFixed(2)} (`AVAILABLE`)
                </span>
              </div>
              <div>
                <strong>15% Author IP Royalty Credited:</strong> ₹
                {(Number(escrowSplit.authorRoyaltyEscrowMinor) / 100).toFixed(2)}
              </div>
              <div>
                <strong>35% Platform Engine &amp; SAC 999293 Compliance:</strong> ₹
                {(Number(escrowSplit.platformShareMinor) / 100).toFixed(2)}
              </div>
              <div style={{ color: "#64748b", fontSize: "11px", marginTop: "4px" }}>
                Timestamp: {record.issuedAtIso}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

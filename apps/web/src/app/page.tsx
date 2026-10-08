import Link from "next/link";
import {
  calculateIndiaGstBreakdown,
  computeProjectEscrowSplit,
  EDTECH_SAC_CODE,
} from "@elluminar/domain-commerce";

export default function CleanArchitectureLandingPage() {
  const sampleSplit = computeProjectEscrowSplit(1000000n);
  const sampleGst = calculateIndiaGstBreakdown({
    taxableAmountMinor: 1000000n,
    supplierStateCode: "29",
    buyerGstin: "27AABCM9876K1Z2",
  });

  const portals = [
    {
      href: "/explore",
      badge: "Outcome Storefront & GST Checkout",
      title: "Role Tracks, Catalog & B2B/Stipend Drawer",
      description:
        "Interactive SKU selector with live 80/20 vs 90/10 creator splits, CGST/SGST vs IGST tax quotes, tenant coupons & ₹0 scholarship bypass.",
    },
    {
      href: "/learn/course/distributed-systems-capstone",
      badge: "Hybrid Course Player",
      title: "Cohort Seat CAS & Self-Paced Mastery",
      description:
        "Switch between LIVE_COHORT (atomic CAS seat lock) and SELF_PACED tracks with direct milestone handoff into the Artifact Studio.",
    },
    {
      href: "/studio/demo",
      badge: "Learner Studio",
      title: "3-Pane Work Artifact Studio",
      description:
        "Split-screen Excalidraw System Design Stencils, Pyodide WASM Python Sandbox, DCF Formula Inspector & 60fps Voice-over-Canvas Player.",
    },
    {
      href: "/studio/creator-demo",
      badge: "Creator Studio",
      title: "IP Royalty, Rubric Cache & RBAC Builder",
      description:
        "Simulate 15% Project IP Royalty + 90/10 Direct referral economics, Gemini implicit cache rubric builder & multi-tenant RBAC guards.",
    },
    {
      href: "/mentor/demo",
      badge: "Mentor Cockpit",
      title: "5–8 Min Review & 24kbps Opus Recorder",
      description:
        "AI Engine 2 3-Bullet Mentor Brief, live rubric sliders, real-time pointer/laser keyframe recorder & 50% Escrow Payout preview.",
    },
    {
      href: "/org/dossier-demo",
      badge: "B2B & University Portal",
      title: "NEP 2020 / AICTE Dossier & GST Invoice",
      description:
        "Print-ready (@media print) 14–20 Credit Academic Compliance Dossier & gapless SAC 999293 CGST/SGST vs IGST Tax Invoice generator.",
    },
    {
      href: "/verify/ELL-2026-DEMO",
      badge: "Public Proof-of-Work",
      title: "Cryptographic Credential Verification",
      description:
        "Public employer verification portal displaying SHA-256 artifact digests, Principal Mentor rubric sign-off & Oral Defense verdict.",
    },
  ];

  return (
    <main
      style={{
        maxWidth: "960px",
        margin: "0 auto",
        padding: "64px 24px",
        lineHeight: 1.6,
      }}
    >
      <div
        style={{
          display: "inline-block",
          padding: "4px 12px",
          borderRadius: "999px",
          background: "#1e293b",
          color: "#38bdf8",
          fontSize: "13px",
          fontWeight: 600,
          marginBottom: "16px",
        }}
      >
        Elluminar v2 • Clean-Sheet Hexagonal Monolith
      </div>

      <h1 style={{ fontSize: "40px", margin: "0 0 16px 0", letterSpacing: "-0.02em" }}>
        Applied Mastery &amp; Verified Proof-of-Work Engine
      </h1>

      <p style={{ color: "#94a3b8", fontSize: "18px", marginBottom: "40px" }}>
        Engineered with strict domain isolation: Prisma 7.10 Rust-Free ESM (`ap-south-1`),
        True Double-Entry Ledger (`SUM(amountMinor) === 0n`), India B2B GST Engine (`SAC ${EDTECH_SAC_CODE}`),
        and Pluggable Work Artifact AST/Topology Extractors.
      </p>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "20px",
          marginBottom: "36px",
        }}
      >
        <div
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "12px",
            padding: "24px",
          }}
        >
          <h2 style={{ fontSize: "18px", marginTop: 0, color: "#f8fafc" }}>
            3-Way Project Escrow Split (₹10,000 Sample)
          </h2>
          <ul style={{ paddingLeft: "20px", color: "#cbd5e1", margin: 0 }}>
            <li>
              Mentor Escrow (50%):{" "}
              <strong>₹{(Number(sampleSplit.mentorEscrowMinor) / 100).toFixed(2)}</strong>
            </li>
            <li>
              Author IP Royalty Escrow (15%):{" "}
              <strong>
                ₹{(Number(sampleSplit.authorRoyaltyEscrowMinor) / 100).toFixed(2)}
              </strong>
            </li>
            <li>
              Platform Share (35%):{" "}
              <strong>₹{(Number(sampleSplit.platformShareMinor) / 100).toFixed(2)}</strong>
            </li>
          </ul>
        </div>

        <div
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "12px",
            padding: "24px",
          }}
        >
          <h2 style={{ fontSize: "18px", marginTop: 0, color: "#f8fafc" }}>
            India B2B GST Engine (`SAC ${sampleGst.sacCode}`)
          </h2>
          <ul style={{ paddingLeft: "20px", color: "#cbd5e1", margin: 0 }}>
            <li>
              Supply Mode:{" "}
              <strong>
                {sampleGst.isInterState
                  ? "Inter-State (KA 29 → MH 27)"
                  : "Intra-State"}
              </strong>
            </li>
            <li>
              IGST (18%):{" "}
              <strong>₹{(Number(sampleGst.igstAmountMinor) / 100).toFixed(2)}</strong>
            </li>
            <li>
              Total Invoice:{" "}
              <strong>
                ₹{(Number(sampleGst.totalInvoiceAmountMinor) / 100).toFixed(2)}
              </strong>
            </li>
          </ul>
        </div>
      </section>

      <h2 style={{ fontSize: "22px", margin: "0 0 16px 0", color: "#f8fafc" }}>
        Interactive Clean-Sheet Portals
      </h2>
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "20px",
        }}
      >
        {portals.map((portal) => (
          <Link
            key={portal.href}
            href={portal.href}
            style={{
              display: "block",
              textDecoration: "none",
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "12px",
              padding: "24px",
              color: "#f8fafc",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#38bdf8",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "8px",
              }}
            >
              {portal.badge}
            </div>
            <h3 style={{ fontSize: "18px", margin: "0 0 8px 0", color: "#f8fafc" }}>
              {portal.title} →
            </h3>
            <p style={{ fontSize: "14px", color: "#94a3b8", margin: 0 }}>
              {portal.description}
            </p>
          </Link>
        ))}
      </section>
    </main>
  );
}


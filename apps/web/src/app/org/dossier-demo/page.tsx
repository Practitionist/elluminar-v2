"use client";

import React, { useState } from "react";
import {
  calculateIndiaGstBreakdown,
  EDTECH_SAC_CODE,
} from "@elluminar/domain-commerce";

interface CohortRosterEntry {
  rollNo: string;
  studentName: string;
  track: string;
  mentorScore: number;
  artifactSha256: string;
  oralDefenseVerdict: "PASSED_WITH_DISTINCTION" | "PASSED";
  nepCredits: number;
  verificationCode: string;
}

const COHORT_ROSTER: CohortRosterEntry[] = [
  {
    rollNo: "1RV23CS042",
    studentName: "Arjun Nair",
    track: "Distributed FinTech Double-Entry Ledger",
    mentorScore: 90,
    artifactSha256: "9f4e2a7c8b1d...3c91a4",
    oralDefenseVerdict: "PASSED_WITH_DISTINCTION",
    nepCredits: 16,
    verificationCode: "ELM-2026-ARJUN-99",
  },
  {
    rollNo: "1RV23CS088",
    studentName: "Ananya Deshmukh",
    track: "Multi-Region Payment Switch & Idempotent Outbox",
    mentorScore: 94,
    artifactSha256: "4b8c1d09e3a2...71fd08",
    oralDefenseVerdict: "PASSED_WITH_DISTINCTION",
    nepCredits: 16,
    verificationCode: "ELM-2026-ANANYA-94",
  },
  {
    rollNo: "1RV23CS114",
    studentName: "Rohan Kulkarni",
    track: "Cloudflare R2 Zero-Egress Telemetry Pipeline",
    mentorScore: 86,
    artifactSha256: "7d31a5f902c4...e82b19",
    oralDefenseVerdict: "PASSED",
    nepCredits: 16,
    verificationCode: "ELM-2026-ROHAN-86",
  },
  {
    rollNo: "1RV23CS159",
    studentName: "Meera Subramanian",
    track: "B2B SaaS Revenue Recognition & SaaS DCF Engine",
    mentorScore: 91,
    artifactSha256: "2c69e8a14f0b...94ac22",
    oralDefenseVerdict: "PASSED_WITH_DISTINCTION",
    nepCredits: 16,
    verificationCode: "ELM-2026-MEERA-91",
  },
];

export default function UniversityDossierAndGstPortalPage() {
  // Toggle Intra-State (Karnataka 29 -> Karnataka 29) vs Inter-State (Karnataka 29 -> Maharashtra 27)
  const [supplyMode, setSupplyMode] = useState<"INTRA_STATE" | "INTER_STATE">(
    "INTRA_STATE"
  );

  const buyerGstin =
    supplyMode === "INTRA_STATE"
      ? "29AAAJR0942L1Z8" // RV College of Engineering, Bengaluru (State 29 - Karnataka)
      : "27AAATI4128M1Z4"; // IIT Bombay / Enterprise Partner, Mumbai (State 27 - Maharashtra)

  // Batch fee for 120 students @ ₹8,000/student = ₹9,60,000.00 = 96,000,000 paisa
  const taxableCohortFeeMinor = 96000000n;
  const gstBreakdown = calculateIndiaGstBreakdown({
    taxableAmountMinor: taxableCohortFeeMinor,
    supplierStateCode: "29",
    buyerGstin,
  });

  const formatInr = (amountMinor: bigint) =>
    `₹${(Number(amountMinor) / 100).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <main
      className="dossier-print-container"
      style={{
        maxWidth: "1180px",
        margin: "0 auto",
        padding: "36px 24px 80px",
      }}
    >
      <style>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #0f172a !important;
          }
          .no-print {
            display: none !important;
          }
          .dossier-print-container {
            padding: 0 !important;
            max-width: 100% !important;
          }
          .print-card {
            background: #ffffff !important;
            color: #0f172a !important;
            border: 1px solid #cbd5e1 !important;
            break-inside: avoid;
          }
          .print-text-dark {
            color: #0f172a !important;
          }
        }
      `}</style>

      {/* Top Interactive Action Bar (Hidden in Print) */}
      <div
        className="no-print"
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          marginBottom: "28px",
          padding: "16px 20px",
          background: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span
            style={{
              padding: "4px 10px",
              borderRadius: "999px",
              background: "#1e3a8a",
              color: "#93c5fd",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            NEP 2020 &amp; AICTE Audit Portal
          </span>
          <span style={{ fontSize: "13px", color: "#cbd5e1" }}>
            Select GST Place of Supply Mode:
          </span>
          <button
            type="button"
            onClick={() => setSupplyMode("INTRA_STATE")}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "none",
              background: supplyMode === "INTRA_STATE" ? "#2563eb" : "#1e293b",
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Intra-State (KA 29 → KA 29: CGST 9% + SGST 9%)
          </button>
          <button
            type="button"
            onClick={() => setSupplyMode("INTER_STATE")}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "none",
              background: supplyMode === "INTER_STATE" ? "#2563eb" : "#1e293b",
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Inter-State (KA 29 → MH 27: IGST 18%)
          </button>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <a
            href="/mentor/demo"
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              background: "#1e293b",
              color: "#f8fafc",
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            ← Mentor Cockpit
          </a>
          <button
            type="button"
            onClick={() => window.print()}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              background: "#16a34a",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            🖨 Print / Export Official PDF Dossier &amp; Tax Invoice
          </button>
        </div>
      </div>

      {/* SECTION 1: AICTE / NEP 2020 MANDATORY CAPSTONE & VIRTUAL INTERNSHIP DOSSIER */}
      <section
        className="print-card"
        style={{
          background: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: "14px",
          padding: "28px",
          marginBottom: "28px",
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
            paddingBottom: "20px",
            marginBottom: "20px",
          }}
        >
          <div>
            <div style={{ fontSize: "12px", color: "#38bdf8", fontWeight: 700, textTransform: "uppercase" }}>
              AICTE Mandatory Internship &amp; NAAC Criterion 1.3.4 Compliance Record
            </div>
            <h1 className="print-text-dark" style={{ fontSize: "24px", margin: "6px 0", color: "#f8fafc" }}>
              RV College of Engineering (Autonomous) — B.Tech CSE 8th Semester NEP Capstone
            </h1>
            <div style={{ fontSize: "13px", color: "#94a3b8" }}>
              Academic Session: AY 2026–27 • Credit Weightage: <strong>16 NEP Credits (480 Notional Hours)</strong> • Dossier ID: <code>DOSSIER-RVCE-2026-Q4</code>
            </div>
          </div>

          <div
            style={{
              textAlign: "right",
              fontSize: "12px",
              color: "#6ee7b7",
              background: "#064e3b",
              padding: "8px 14px",
              borderRadius: "8px",
              fontWeight: 700,
            }}
          >
            ✓ AUDIT VERIFIED • ZERO PLAGIARISM
          </div>
        </div>

        {/* Cohort Batch Summary Strip */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          {[
            { label: "Total Enrolled Learners", value: "120 Students" },
            { label: "Verified Completion Rate", value: "96.7% (116 / 120)" },
            { label: "Mean Principal Mentor Score", value: "90.3 / 100" },
            { label: "SHA-256 Anchored Artifacts", value: "360 Work Artifacts" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="print-card"
              style={{
                background: "#090d16",
                border: "1px solid #1e293b",
                borderRadius: "10px",
                padding: "14px",
              }}
            >
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>{stat.label}</div>
              <div className="print-text-dark" style={{ fontSize: "18px", fontWeight: 700, color: "#f8fafc", marginTop: "4px" }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Verified Student Roster Table */}
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "13px",
              textAlign: "left",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid #334155", color: "#94a3b8" }}>
                <th style={{ padding: "10px 8px" }}>USN / Roll No</th>
                <th style={{ padding: "10px 8px" }}>Student Name</th>
                <th style={{ padding: "10px 8px" }}>Applied Capstone Track</th>
                <th style={{ padding: "10px 8px" }}>Mentor Rubric</th>
                <th style={{ padding: "10px 8px" }}>Artifact SHA-256</th>
                <th style={{ padding: "10px 8px" }}>Oral Defense Verdict</th>
                <th style={{ padding: "10px 8px" }}>Verification Link</th>
              </tr>
            </thead>
            <tbody>
              {COHORT_ROSTER.map((student) => (
                <tr
                  key={student.rollNo}
                  style={{ borderBottom: "1px solid #1e293b", color: "#e2e8f0" }}
                >
                  <td className="print-text-dark" style={{ padding: "12px 8px", fontWeight: 600 }}>
                    {student.rollNo}
                  </td>
                  <td className="print-text-dark" style={{ padding: "12px 8px", fontWeight: 700 }}>
                    {student.studentName}
                  </td>
                  <td className="print-text-dark" style={{ padding: "12px 8px" }}>
                    {student.track}
                  </td>
                  <td style={{ padding: "12px 8px", fontWeight: 700, color: "#4ade80" }}>
                    {student.mentorScore} / 100
                  </td>
                  <td style={{ padding: "12px 8px", fontFamily: "monospace", fontSize: "12px", color: "#94a3b8" }}>
                    {student.artifactSha256}
                  </td>
                  <td style={{ padding: "12px 8px" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        background: "#064e3b",
                        color: "#6ee7b7",
                        fontWeight: 600,
                      }}
                    >
                      {student.oralDefenseVerdict} ({student.nepCredits} Cr)
                    </span>
                  </td>
                  <td style={{ padding: "12px 8px" }}>
                    <a
                      href={`/verify/${student.verificationCode}`}
                      style={{ color: "#38bdf8", textDecoration: "underline", fontWeight: 600 }}
                    >
                      /verify/{student.verificationCode}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 2: GAPLESS INDIA B2B GST TAX INVOICE (SAC 999293) */}
      <section
        className="print-card"
        style={{
          background: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: "14px",
          padding: "28px",
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
            paddingBottom: "16px",
            marginBottom: "20px",
          }}
        >
          <div>
            <div style={{ fontSize: "12px", color: "#fbbf24", fontWeight: 700, textTransform: "uppercase" }}>
              Rule 46 CGST Rules • Gapless Sequential Tax Invoice
            </div>
            <h2 className="print-text-dark" style={{ fontSize: "20px", margin: "4px 0", color: "#f8fafc" }}>
              Tax Invoice #INV-FY2627-000142 (SAC {EDTECH_SAC_CODE})
            </h2>
            <div style={{ fontSize: "12px", color: "#94a3b8" }}>
              Supplier: <strong>Elluminar Technologies Pvt. Ltd.</strong> • GSTIN: <code>29AABCE4821K1Z5</code> (Bengaluru, Karnataka - 29)
            </div>
          </div>

          <div style={{ textAlign: "right", fontSize: "12px", color: "#cbd5e1" }}>
            <div>
              Recipient GSTIN: <code>{buyerGstin}</code>
            </div>
            <div style={{ marginTop: "4px", color: "#38bdf8", fontWeight: 700 }}>
              Supply Regime:{" "}
              {gstBreakdown.isInterState
                ? "Inter-State Supply (IGST @ 18%)"
                : "Intra-State Supply (CGST 9% + SGST 9%)"}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            rowGap: "10px",
            fontSize: "14px",
            maxWidth: "560px",
            marginLeft: "auto",
          }}
        >
          <span style={{ color: "#94a3b8" }}>
            Taxable Cohort Mentorship Fee (120 Learners × ₹8,000 • SAC {gstBreakdown.sacCode}):
          </span>
          <strong className="print-text-dark" style={{ color: "#f8fafc", textAlign: "right" }}>
            {formatInr(gstBreakdown.taxableAmountMinor)}
          </strong>

          {!gstBreakdown.isInterState ? (
            <>
              <span style={{ color: "#94a3b8" }}>CGST @ 9.00% (Central Tax):</span>
              <span className="print-text-dark" style={{ color: "#e2e8f0", textAlign: "right" }}>
                {formatInr(gstBreakdown.cgstAmountMinor)}
              </span>

              <span style={{ color: "#94a3b8" }}>SGST @ 9.00% (Karnataka State Tax):</span>
              <span className="print-text-dark" style={{ color: "#e2e8f0", textAlign: "right" }}>
                {formatInr(gstBreakdown.sgstAmountMinor)}
              </span>
            </>
          ) : (
            <>
              <span style={{ color: "#94a3b8" }}>IGST @ 18.00% (Integrated Tax):</span>
              <span className="print-text-dark" style={{ color: "#e2e8f0", textAlign: "right" }}>
                {formatInr(gstBreakdown.igstAmountMinor)}
              </span>
            </>
          )}

          <div style={{ gridColumn: "1 / -1", borderTop: "1px solid #334155", margin: "4px 0" }} />

          <strong className="print-text-dark" style={{ color: "#4ade80", fontSize: "16px" }}>
            Total Invoice Value (Inclusive of GST):
          </strong>
          <strong style={{ color: "#4ade80", fontSize: "16px", textAlign: "right" }}>
            {formatInr(gstBreakdown.totalInvoiceAmountMinor)}
          </strong>
        </div>
      </section>
    </main>
  );
}

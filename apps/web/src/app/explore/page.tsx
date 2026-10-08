"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckoutQuoteDrawer,
  formatInrMinor,
  STOREFRONT_CATALOG_SKUS,
  type DeliveryMode,
  type StorefrontSkuItem,
} from "../../components/storefront/CheckoutQuoteDrawer";

interface RoleTrackItem {
  id: string;
  roleTitle: string;
  domain: "Distributed Systems" | "Agentic RAG" | "Venture Capital DCF";
  totalCredits: number;
  targetOutcome: string;
  flagshipDeliverables: string[];
}

const ROLE_TRACKS: RoleTrackItem[] = [
  {
    id: "track-dist-sys",
    roleTitle: "Principal Distributed Systems & Storage Architect",
    domain: "Distributed Systems",
    totalCredits: 18,
    targetOutcome: "Design & verify multi-region linearizable engines with Jepsen fault-injection proofs.",
    flagshipDeliverables: [
      "Excalidraw Quorum & Split-Brain Topology",
      "Pyodide WAL + LSM Compaction Simulator",
      "8-Min Principal Engineer Oral Defense",
    ],
  },
  {
    id: "track-agentic-rag",
    roleTitle: "Staff Applied AI & Agentic RAG Systems Engineer",
    domain: "Agentic RAG",
    totalCredits: 16,
    targetOutcome: "Ship sub-400ms hybrid retrieval pipelines with deterministic AST citation guardrails.",
    flagshipDeliverables: [
      "HNSW + BM25 Reciprocal Rank Fusion Benchmark",
      "AST Citation Groundedness Verifier",
      "Multi-Turn Tool Routing Evaluation Harness",
    ],
  },
  {
    id: "track-vc-dcf",
    roleTitle: "VP Quantitative Growth Equity & Venture Capital",
    domain: "Venture Capital DCF",
    totalCredits: 14,
    targetOutcome: "Author institutional Series B/C IC Memos with zero hardcoded spreadsheet overrides.",
    flagshipDeliverables: [
      "3-Statement SaaS Cohort & NRR Engine",
      "Formula AST WACC / Terminal Value Matrix",
      "Liquidation Preference Waterfall & Voice-over-Sheet",
    ],
  },
];

export default function UnifiedOutcomeStorefrontPage() {
  const [selectedDomain, setSelectedDomain] = useState<string>("ALL");
  const [selectedDeliveryMode, setSelectedDeliveryMode] =
    useState<"ALL" | DeliveryMode>("ALL");
  const [activeSku, setActiveSku] = useState<StorefrontSkuItem>(
    STOREFRONT_CATALOG_SKUS[0]!
  );

  const filteredSkus = useMemo(() => {
    return STOREFRONT_CATALOG_SKUS.filter((sku) => {
      const matchesDomain =
        selectedDomain === "ALL" || sku.domain === selectedDomain;
      const matchesMode =
        selectedDeliveryMode === "ALL" ||
        sku.deliveryMode === selectedDeliveryMode;
      return matchesDomain && matchesMode;
    });
  }, [selectedDomain, selectedDeliveryMode]);

  return (
    <main
      style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "40px 24px 80px",
        lineHeight: 1.55,
      }}
    >
      {/* Top Breadcrumb & Navigation Bar */}
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
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link
            href="/"
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
            ← Architecture Hub
          </Link>
          <span
            style={{
              padding: "4px 12px",
              borderRadius: "999px",
              background: "rgba(56, 189, 248, 0.14)",
              color: "#38bdf8",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            Unified Outcome Storefront • SAC 999293
          </span>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Link
            href="/learn/course/production-agentic-rag-evals"
            style={{
              color: "#38bdf8",
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: 600,
              padding: "7px 14px",
              borderRadius: "8px",
              background: "#0f172a",
              border: "1px solid #334155",
            }}
          >
            Open Hybrid Cohort Player →
          </Link>
          <Link
            href="/studio/demo"
            style={{
              color: "#34d399",
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: 600,
              padding: "7px 14px",
              borderRadius: "8px",
              background: "#0f172a",
              border: "1px solid #334155",
            }}
          >
            3-Pane Artifact Studio →
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <header style={{ marginBottom: "36px" }}>
        <h1
          style={{
            fontSize: "36px",
            margin: "0 0 12px 0",
            letterSpacing: "-0.02em",
            color: "#f8fafc",
          }}
        >
          Outcome-Backed Role Tracks, Live Cohorts &amp; Proof-of-Work Capstones
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "16px", maxWidth: "820px", margin: 0 }}>
          Every Flagship Project locks <strong>50% Mentor Escrow</strong> +{" "}
          <strong>15% Author IP Royalty Escrow</strong> in our Double-Entry Ledger
          until your multimodal artifact passes Principal Mentor evaluation.
        </p>
      </header>

      {/* Role Tracks Showcase */}
      <section style={{ marginBottom: "40px" }}>
        <h2
          style={{
            fontSize: "18px",
            margin: "0 0 16px 0",
            color: "#cbd5e1",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Verified NEP 2020 / Industry Role Tracks
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "16px",
          }}
        >
          {ROLE_TRACKS.map((track) => (
            <div
              key={track.id}
              style={{
                background: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: "14px",
                padding: "20px",
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
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#38bdf8",
                    textTransform: "uppercase",
                  }}
                >
                  {track.domain}
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    padding: "2px 8px",
                    borderRadius: "999px",
                    background: "#1e293b",
                    color: "#cbd5e1",
                  }}
                >
                  {track.totalCredits} Academic Credits
                </span>
              </div>
              <h3 style={{ fontSize: "17px", margin: "0 0 8px 0", color: "#f8fafc" }}>
                {track.roleTitle}
              </h3>
              <p style={{ fontSize: "13px", color: "#94a3b8", margin: "0 0 12px 0" }}>
                {track.targetOutcome}
              </p>
              <ul
                style={{
                  paddingLeft: "18px",
                  margin: 0,
                  fontSize: "12px",
                  color: "#cbd5e1",
                }}
              >
                {track.flagshipDeliverables.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Filter Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "24px",
          padding: "14px 18px",
          borderRadius: "12px",
          background: "#0f172a",
          border: "1px solid #1e293b",
        }}
      >
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {(
            [
              "ALL",
              "Distributed Systems",
              "Agentic RAG",
              "Venture Capital DCF",
            ] as const
          ).map((dom) => (
            <button
              key={dom}
              type="button"
              onClick={() => setSelectedDomain(dom)}
              style={{
                padding: "7px 14px",
                borderRadius: "8px",
                border:
                  selectedDomain === dom
                    ? "1px solid #38bdf8"
                    : "1px solid #334155",
                background:
                  selectedDomain === dom
                    ? "rgba(56, 189, 248, 0.16)"
                    : "#020617",
                color: "#f8fafc",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {dom === "ALL" ? "All Domains" : dom}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          {(["ALL", "LIVE_COHORT", "SELF_PACED"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setSelectedDeliveryMode(mode)}
              style={{
                padding: "7px 12px",
                borderRadius: "8px",
                border:
                  selectedDeliveryMode === mode
                    ? "1px solid #34d399"
                    : "1px solid #334155",
                background:
                  selectedDeliveryMode === mode
                    ? "rgba(52, 211, 153, 0.16)"
                    : "#020617",
                color: "#f8fafc",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {mode === "ALL"
                ? "All Delivery Modes"
                : mode === "LIVE_COHORT"
                ? "🔴 LIVE_COHORT"
                : "⚡ SELF_PACED"}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split Grid: Catalog SKUs on Left + Interactive GST/Escrow Drawer on Right */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
          gap: "24px",
          alignItems: "start",
        }}
      >
        <div style={{ display: "grid", gap: "16px" }}>
          {filteredSkus.map((sku) => {
            const isSelected = activeSku.id === sku.id;
            return (
              <article
                key={sku.id}
                style={{
                  background: isSelected ? "#131c31" : "#0f172a",
                  border: isSelected
                    ? "1px solid #38bdf8"
                    : "1px solid #1e293b",
                  borderRadius: "14px",
                  padding: "22px",
                  transition: "border-color 0.15s ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "8px",
                    marginBottom: "10px",
                  }}
                >
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span
                      style={{
                        padding: "3px 9px",
                        borderRadius: "6px",
                        background:
                          sku.kind === "PROJECT"
                            ? "rgba(192, 132, 252, 0.16)"
                            : "rgba(56, 189, 248, 0.16)",
                        color: sku.kind === "PROJECT" ? "#c084fc" : "#38bdf8",
                        fontSize: "11px",
                        fontWeight: 700,
                      }}
                    >
                      {sku.kind === "PROJECT"
                        ? "CAPSTONE PROJECT (50/15/35 Escrow)"
                        : "HYBRID COURSE (80/20 or 90/10)"}
                    </span>
                    <span
                      style={{
                        padding: "3px 9px",
                        borderRadius: "6px",
                        background: "#1e293b",
                        color:
                          sku.deliveryMode === "LIVE_COHORT"
                            ? "#34d399"
                            : "#cbd5e1",
                        fontSize: "11px",
                        fontWeight: 600,
                      }}
                    >
                      {sku.deliveryMode}
                    </span>
                  </div>

                  <strong style={{ fontSize: "18px", color: "#f8fafc" }}>
                    {formatInrMinor(sku.priceMinor)}{" "}
                    <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 400 }}>
                      + GST
                    </span>
                  </strong>
                </div>

                <h3 style={{ fontSize: "19px", margin: "0 0 8px 0", color: "#f8fafc" }}>
                  {sku.title}
                </h3>
                <p style={{ fontSize: "13px", color: "#94a3b8", margin: "0 0 12px 0" }}>
                  <strong>Artifact Proof:</strong> {sku.artifactSummary}
                </p>

                {sku.seatTelemetry && (
                  <div
                    style={{
                      padding: "8px 12px",
                      borderRadius: "8px",
                      background: "#020617",
                      border: "1px solid #1e293b",
                      fontSize: "12px",
                      color: "#cbd5e1",
                      marginBottom: "14px",
                    }}
                  >
                    Live Cohort CAS Capacity:{" "}
                    <strong>
                      {sku.seatTelemetry.enrolled}/{sku.seatTelemetry.capacity}{" "}
                      Seats Reserved
                    </strong>{" "}
                    (<code>casVersion: v{sku.seatTelemetry.casVersion}</code> —{" "}
                    {sku.seatTelemetry.capacity - sku.seatTelemetry.enrolled}{" "}
                    seats remaining)
                  </div>
                )}

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => setActiveSku(sku)}
                    style={{
                      padding: "9px 14px",
                      borderRadius: "8px",
                      border: "none",
                      background: isSelected ? "#0284c7" : "#1e293b",
                      color: "#ffffff",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {isSelected
                      ? "✓ Inspecting in GST & Escrow Drawer"
                      : "Configure B2B GST & Escrow Quote →"}
                  </button>

                  <Link
                    href={`/learn/course/${sku.slug}`}
                    style={{
                      padding: "9px 14px",
                      borderRadius: "8px",
                      border: "1px solid #334155",
                      background: "#020617",
                      color: "#38bdf8",
                      textDecoration: "none",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    Launch Course Player →
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        {/* Sticky Interactive Checkout Quote Drawer */}
        <div style={{ position: "sticky", top: "24px" }}>
          <CheckoutQuoteDrawer
            selectedSku={activeSku}
            onSelectSku={(sku) => setActiveSku(sku)}
          />
        </div>
      </div>
    </main>
  );
}

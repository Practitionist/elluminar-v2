"use client";

import React, { useMemo, useState } from "react";
import {
  calculateIndiaGstBreakdown,
  computeCourseRevenueSplit,
  computeProjectEscrowSplit,
  formatGaplessInvoiceNumber,
  processZeroRupeeCheckout,
  validateTenantCoupon,
  type CourseSplitTier,
  type TenantCouponRecord,
} from "@elluminar/domain-commerce";

export type StorefrontSkuKind = "PROJECT" | "COURSE";
export type DeliveryMode = "LIVE_COHORT" | "SELF_PACED";

export interface StorefrontSkuItem {
  id: string;
  slug: string;
  title: string;
  domain: "Distributed Systems" | "Agentic RAG" | "Venture Capital DCF";
  kind: StorefrontSkuKind;
  deliveryMode: DeliveryMode;
  organizationId: string;
  organizationName: string;
  priceMinor: bigint;
  credits: number;
  mentorLead: string;
  artifactSummary: string;
  seatTelemetry?: {
    capacity: number;
    enrolled: number;
    casVersion: number;
  };
}

export const STOREFRONT_CATALOG_SKUS: StorefrontSkuItem[] = [
  {
    id: "sku-proj-dist-raft",
    slug: "distributed-consensus-kv-engine",
    title: "Multi-Region Raft Consensus & Linearizable KV Storage Engine",
    domain: "Distributed Systems",
    kind: "PROJECT",
    deliveryMode: "LIVE_COHORT",
    organizationId: "org-elluminar-systems",
    organizationName: "Elluminar Systems Architecture Guild",
    priceMinor: 249900n, // ₹2,499.00
    credits: 6,
    mentorLead: "Principal Staff Engineer (Ex-Cloud Spanner)",
    artifactSummary:
      "Excalidraw Quorum Topology + Pyodide Jepsen Split-Brain Simulator + 5-min Oral Defense",
    seatTelemetry: { capacity: 30, enrolled: 27, casVersion: 14 },
  },
  {
    id: "sku-course-agentic-rag",
    slug: "production-agentic-rag-evals",
    title: "Production Agentic RAG, Hybrid Rerankers & Hallucination Guardrails",
    domain: "Agentic RAG",
    kind: "COURSE",
    deliveryMode: "LIVE_COHORT",
    organizationId: "org-elluminar-systems",
    organizationName: "Elluminar Applied AI Lab",
    priceMinor: 499900n, // ₹4,999.00
    credits: 8,
    mentorLead: "Staff ML Systems Architect",
    artifactSummary:
      "AST Citation Verifier + HNSW Recall Benchmark + Multi-Hop Tool Routing Studio",
    seatTelemetry: { capacity: 45, enrolled: 41, casVersion: 29 },
  },
  {
    id: "sku-proj-vc-dcf",
    slug: "series-b-saas-dcf-lbo-ic-memo",
    title: "Series B Cloud Infrastructure Valuation, 3-Statement DCF & IC Memo",
    domain: "Venture Capital DCF",
    kind: "PROJECT",
    deliveryMode: "SELF_PACED",
    organizationId: "org-elluminar-systems",
    organizationName: "Elluminar Quantitative Finance Practice",
    priceMinor: 199900n, // ₹1,999.00
    credits: 4,
    mentorLead: "VP Growth Equity & DeepTech Investing",
    artifactSummary:
      "Formula AST WACC/Terminal Sensitivity Grid + Cap Table Waterfall + Voice-over-Sheet Review",
  },
  {
    id: "sku-course-dist-internals",
    slug: "storage-engines-lsm-wal-internals",
    title: "High-Throughput Storage Engines: WAL, LSM-Trees & MVCC Isolation",
    domain: "Distributed Systems",
    kind: "COURSE",
    deliveryMode: "SELF_PACED",
    organizationId: "org-elluminar-systems",
    organizationName: "Elluminar Systems Architecture Guild",
    priceMinor: 349900n, // ₹3,499.00
    credits: 6,
    mentorLead: "Distinguished Storage Kernel Engineer",
    artifactSummary:
      "Compaction Watermark Stencils + Snapshot Isolation Anomaly Detector",
  },
];

export const DEMO_TENANT_COUPONS: TenantCouponRecord[] = [
  {
    id: "cpn-elluminar-25",
    organizationId: "org-elluminar-systems",
    code: "ELLUMINAR25",
    discountType: "PERCENTAGE_BPS",
    discountValue: 2500n, // 25.00%
    maxRedemptions: 500,
    redeemedCount: 112,
    expiresAt: new Date("2028-12-31T23:59:59Z"),
    isActive: true,
  },
  {
    id: "cpn-scholar-100",
    organizationId: "org-elluminar-systems",
    code: "SCHOLAR100",
    discountType: "PERCENTAGE_BPS",
    discountValue: 10000n, // 100.00% Full Scholarship -> ₹0 Free Checkout
    maxRedemptions: 100,
    redeemedCount: 19,
    expiresAt: new Date("2028-12-31T23:59:59Z"),
    isActive: true,
  },
  {
    id: "cpn-cross-tenant-invalid",
    organizationId: "org-other-university-tenant",
    code: "OTHER_ORG_50",
    discountType: "PERCENTAGE_BPS",
    discountValue: 5000n,
    maxRedemptions: 50,
    redeemedCount: 4,
    expiresAt: new Date("2028-12-31T23:59:59Z"),
    isActive: true,
  },
];

export function formatInrMinor(amountMinor: bigint): string {
  const isNegative = amountMinor < 0n;
  const abs = isNegative ? -amountMinor : amountMinor;
  const rupees = abs / 100n;
  const paisa = (abs % 100n).toString().padStart(2, "0");
  return `${isNegative ? "-₹" : "₹"}${Number(rupees).toLocaleString("en-IN")}.${paisa}`;
}

export interface CheckoutQuoteDrawerProps {
  selectedSku: StorefrontSkuItem;
  onSelectSku?: (sku: StorefrontSkuItem) => void;
  onClose?: () => void;
}

export function CheckoutQuoteDrawer({
  selectedSku,
  onSelectSku,
  onClose,
}: CheckoutQuoteDrawerProps) {
  const [courseSplitTier, setCourseSplitTier] =
    useState<CourseSplitTier>("STANDARD_80_20");
  const [buyerGstin, setBuyerGstin] = useState<string>("29AABCE1234F1Z5");
  const [couponInput, setCouponInput] = useState<string>("ELLUMINAR25");
  const [forceZeroScholarship, setForceZeroScholarship] =
    useState<boolean>(false);
  const [checkoutSubmitted, setCheckoutSubmitted] = useState<boolean>(false);

  const activeCouponCode = forceZeroScholarship
    ? "SCHOLAR100"
    : couponInput.trim().toUpperCase();

  const quoteEngine = useMemo(() => {
    const matchedCoupon = DEMO_TENANT_COUPONS.find(
      (c) => c.code === activeCouponCode
    );

    const couponValidation = matchedCoupon
      ? validateTenantCoupon({
          coupon: matchedCoupon,
          orderOrganizationId: selectedSku.organizationId,
          subtotalMinor: selectedSku.priceMinor,
          now: new Date("2026-10-08T00:00:00Z"),
        })
      : null;

    const discountMinor =
      couponValidation && couponValidation.valid
        ? couponValidation.discountMinor
        : 0n;

    const netTaxableMinor = selectedSku.priceMinor - discountMinor;

    const zeroRupeeCheckout =
      netTaxableMinor === 0n
        ? processZeroRupeeCheckout({
            orderId: `ORD-2026-${selectedSku.id.slice(-4).toUpperCase()}`,
            subtotalMinor: selectedSku.priceMinor,
            discountMinor,
          })
        : null;

    let gstBreakdown;
    let gstinError: string | null = null;
    try {
      gstBreakdown = calculateIndiaGstBreakdown({
        taxableAmountMinor: netTaxableMinor,
        supplierStateCode: "29", // Karnataka (Bengaluru Headquarters)
        buyerGstin: buyerGstin.trim() || undefined,
      });
    } catch (err) {
      gstinError =
        err instanceof Error ? err.message : "Invalid GSTIN format";
      gstBreakdown = calculateIndiaGstBreakdown({
        taxableAmountMinor: netTaxableMinor,
        supplierStateCode: "29",
      });
    }

    const projectSplit =
      selectedSku.kind === "PROJECT"
        ? computeProjectEscrowSplit(netTaxableMinor)
        : null;

    const courseSplit =
      selectedSku.kind === "COURSE"
        ? computeCourseRevenueSplit(netTaxableMinor, courseSplitTier)
        : null;

    const invoiceNumber = formatGaplessInvoiceNumber({
      prefix: "INV",
      financialYear: "2026-27",
      sequenceNumber: 1042,
    });

    return {
      matchedCoupon,
      couponValidation,
      discountMinor,
      netTaxableMinor,
      zeroRupeeCheckout,
      gstBreakdown,
      gstinError,
      projectSplit,
      courseSplit,
      invoiceNumber,
    };
  }, [
    activeCouponCode,
    buyerGstin,
    courseSplitTier,
    selectedSku.id,
    selectedSku.kind,
    selectedSku.organizationId,
    selectedSku.priceMinor,
  ]);

  return (
    <aside
      aria-label="B2B Corporate Stipend GST & Double-Entry Escrow Checkout Drawer"
      style={{
        background: "#0f172a",
        border: "1px solid #334155",
        borderRadius: "16px",
        padding: "24px",
        color: "#f8fafc",
        boxShadow: "0 20px 45px rgba(0, 0, 0, 0.45)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "12px",
          borderBottom: "1px solid #1e293b",
          paddingBottom: "16px",
          marginBottom: "18px",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-block",
              padding: "3px 10px",
              borderRadius: "999px",
              background: "rgba(56, 189, 248, 0.14)",
              color: "#38bdf8",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: "6px",
            }}
          >
            B2B / L&amp;D Stipend Quote &amp; Escrow Engine
          </div>
          <h2 style={{ fontSize: "20px", margin: 0, color: "#f8fafc" }}>
            {selectedSku.title}
          </h2>
          <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
            Invoice Seq: <code>{quoteEngine.invoiceNumber}</code> • SAC{" "}
            <code>{quoteEngine.gstBreakdown.sacCode}</code> •{" "}
            {selectedSku.credits} NEP Credits
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#1e293b",
              color: "#cbd5e1",
              border: "1px solid #334155",
              borderRadius: "8px",
              padding: "6px 10px",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            Close ✕
          </button>
        )}
      </div>

      {/* Quick SKU Selector */}
      {onSelectSku && (
        <div style={{ marginBottom: "16px" }}>
          <label
            htmlFor="drawer-sku-select"
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: 600,
              color: "#cbd5e1",
              marginBottom: "6px",
            }}
          >
            1. Select Course or Proof-of-Work Project SKU
          </label>
          <select
            id="drawer-sku-select"
            value={selectedSku.id}
            onChange={(e) => {
              const found = STOREFRONT_CATALOG_SKUS.find(
                (item) => item.id === e.target.value
              );
              if (found) {
                setCheckoutSubmitted(false);
                onSelectSku(found);
              }
            }}
            style={{
              width: "100%",
              padding: "9px 12px",
              borderRadius: "8px",
              border: "1px solid #334155",
              background: "#020617",
              color: "#f8fafc",
              fontSize: "13px",
            }}
          >
            {STOREFRONT_CATALOG_SKUS.map((sku) => (
              <option key={sku.id} value={sku.id}>
                [{sku.kind}] {sku.title} ({formatInrMinor(sku.priceMinor)})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Attribution Split Toggle (for Courses) or 3-Way Escrow Notice (for Projects) */}
      <div style={{ marginBottom: "16px" }}>
        <div
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "#cbd5e1",
            marginBottom: "6px",
          }}
        >
          2. Revenue Attribution &amp; Escrow Policy
        </div>
        {selectedSku.kind === "COURSE" ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <button
              type="button"
              onClick={() => setCourseSplitTier("STANDARD_80_20")}
              style={{
                padding: "9px 12px",
                borderRadius: "8px",
                border:
                  courseSplitTier === "STANDARD_80_20"
                    ? "1px solid #38bdf8"
                    : "1px solid #334155",
                background:
                  courseSplitTier === "STANDARD_80_20"
                    ? "rgba(56, 189, 248, 0.16)"
                    : "#020617",
                color: "#f8fafc",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              STANDARD_80_20 (80% Creator / 20% Platform)
            </button>
            <button
              type="button"
              onClick={() => setCourseSplitTier("CREATOR_DIRECT_90_10")}
              style={{
                padding: "9px 12px",
                borderRadius: "8px",
                border:
                  courseSplitTier === "CREATOR_DIRECT_90_10"
                    ? "1px solid #34d399"
                    : "1px solid #334155",
                background:
                  courseSplitTier === "CREATOR_DIRECT_90_10"
                    ? "rgba(52, 211, 153, 0.16)"
                    : "#020617",
                color: "#f8fafc",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              CREATOR_DIRECT_90_10 (90% Creator / 10% Platform)
            </button>
          </div>
        ) : (
          <div
            style={{
              padding: "10px 12px",
              borderRadius: "8px",
              background: "#020617",
              border: "1px solid #1e293b",
              fontSize: "12px",
              color: "#94a3b8",
            }}
          >
            Deterministic 3-Way Project Escrow Split:{" "}
            <strong style={{ color: "#38bdf8" }}>
              50% Mentor ESCROW_LOCKED
            </strong>{" "}
            +{" "}
            <strong style={{ color: "#c084fc" }}>
              15% Author IP Royalty ESCROW_LOCKED
            </strong>{" "}
            +{" "}
            <strong style={{ color: "#34d399" }}>
              35% Platform AVAILABLE
            </strong>{" "}
            (released strictly upon final <code>PASS</code> verdict).
          </div>
        )}
      </div>

      {/* Buyer GSTIN Input & State Presets */}
      <div style={{ marginBottom: "16px" }}>
        <label
          htmlFor="buyer-gstin-input"
          style={{
            display: "block",
            fontSize: "12px",
            fontWeight: 600,
            color: "#cbd5e1",
            marginBottom: "6px",
          }}
        >
          3. Buyer Corporate GSTIN (Supplier HQ: State 29 Karnataka)
        </label>
        <input
          id="buyer-gstin-input"
          type="text"
          value={buyerGstin}
          onChange={(e) => setBuyerGstin(e.target.value)}
          placeholder="Enter 15-digit India GSTIN (e.g. 29AABCE1234F1Z5)"
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "9px 12px",
            borderRadius: "8px",
            border: quoteEngine.gstinError
              ? "1px solid #f87171"
              : "1px solid #334155",
            background: "#020617",
            color: "#f8fafc",
            fontSize: "13px",
            fontFamily: "monospace",
            marginBottom: "8px",
          }}
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          <button
            type="button"
            onClick={() => setBuyerGstin("29AABCE1234F1Z5")}
            style={{
              padding: "5px 10px",
              borderRadius: "6px",
              border:
                buyerGstin === "29AABCE1234F1Z5"
                  ? "1px solid #38bdf8"
                  : "1px solid #334155",
              background: "#1e293b",
              color: "#e2e8f0",
              fontSize: "11px",
              cursor: "pointer",
            }}
          >
            KA Intra-State (`29AABCE1234F1Z5` → CGST 9% + SGST 9%)
          </button>
          <button
            type="button"
            onClick={() => setBuyerGstin("27AABCM9876K1Z2")}
            style={{
              padding: "5px 10px",
              borderRadius: "6px",
              border:
                buyerGstin === "27AABCM9876K1Z2"
                  ? "1px solid #c084fc"
                  : "1px solid #334155",
              background: "#1e293b",
              color: "#e2e8f0",
              fontSize: "11px",
              cursor: "pointer",
            }}
          >
            MH Inter-State (`27AABCM9876K1Z2` → IGST 18%)
          </button>
        </div>
        {quoteEngine.gstinError && (
          <div style={{ color: "#f87171", fontSize: "12px", marginTop: "6px" }}>
            {quoteEngine.gstinError}
          </div>
        )}
      </div>

      {/* Tenant-Scoped Coupon & ₹0 Free Checkout Toggle */}
      <div style={{ marginBottom: "18px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "6px",
          }}
        >
          <label
            htmlFor="tenant-coupon-input"
            style={{ fontSize: "12px", fontWeight: 600, color: "#cbd5e1" }}
          >
            4. Tenant-Scoped Coupon (`{selectedSku.organizationId}`)
          </label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              color: "#34d399",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={forceZeroScholarship}
              onChange={(e) => setForceZeroScholarship(e.target.checked)}
            />
            Test ₹0 Free Checkout (`SCHOLAR100`)
          </label>
        </div>
        <div style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
          <input
            id="tenant-coupon-input"
            type="text"
            disabled={forceZeroScholarship}
            value={activeCouponCode}
            onChange={(e) => setCouponInput(e.target.value)}
            placeholder="ELLUMINAR25, SCHOLAR100, or OTHER_ORG_50"
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #334155",
              background: "#020617",
              color: "#f8fafc",
              fontSize: "13px",
              fontFamily: "monospace",
            }}
          />
          {DEMO_TENANT_COUPONS.map((cpn) => (
            <button
              key={cpn.id}
              type="button"
              onClick={() => {
                setForceZeroScholarship(false);
                setCouponInput(cpn.code);
              }}
              style={{
                padding: "6px 10px",
                borderRadius: "8px",
                border: "1px solid #334155",
                background:
                  activeCouponCode === cpn.code ? "#0369a1" : "#1e293b",
                color: "#f8fafc",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {cpn.code}
            </button>
          ))}
        </div>
        {quoteEngine.couponValidation && !quoteEngine.couponValidation.valid && (
          <div style={{ fontSize: "12px", color: "#fbbf24" }}>
            Coupon rejected by domain invariant:{" "}
            <code>{quoteEngine.couponValidation.reason}</code>
          </div>
        )}
      </div>

      {/* Live SAC 999293 GST Invoice & Double-Entry Ledger Split Breakdown */}
      <div
        style={{
          background: "#020617",
          border: "1px solid #1e293b",
          borderRadius: "12px",
          padding: "16px",
          marginBottom: "18px",
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
          <span style={{ color: "#94a3b8" }}>Gross Catalog Price:</span>
          <span>{formatInrMinor(selectedSku.priceMinor)}</span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "13px",
            marginBottom: "6px",
          }}
        >
          <span style={{ color: "#94a3b8" }}>
            Tenant Coupon Discount ({activeCouponCode || "NONE"}):
          </span>
          <span style={{ color: "#34d399" }}>
            -{formatInrMinor(quoteEngine.discountMinor)}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "13px",
            fontWeight: 600,
            paddingTop: "6px",
            borderTop: "1px dashed #1e293b",
            marginBottom: "8px",
          }}
        >
          <span>Net Taxable Value (`SAC {quoteEngine.gstBreakdown.sacCode}`):</span>
          <span>{formatInrMinor(quoteEngine.netTaxableMinor)}</span>
        </div>

        {/* GST Tax Lines */}
        {quoteEngine.gstBreakdown.isInterState ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "12px",
              color: "#c084fc",
              marginBottom: "8px",
            }}
          >
            <span>
              Inter-State IGST (18% • State {quoteEngine.gstBreakdown.supplierStateCode}{" "}
              → {quoteEngine.gstBreakdown.placeOfSupplyStateCode}):
            </span>
            <span>{formatInrMinor(quoteEngine.gstBreakdown.igstAmountMinor)}</span>
          </div>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "12px",
                color: "#38bdf8",
                marginBottom: "4px",
              }}
            >
              <span>Intra-State CGST (9% • State 29 KA):</span>
              <span>
                {formatInrMinor(quoteEngine.gstBreakdown.cgstAmountMinor)}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "12px",
                color: "#38bdf8",
                marginBottom: "8px",
              }}
            >
              <span>Intra-State SGST (9% • State 29 KA):</span>
              <span>
                {formatInrMinor(quoteEngine.gstBreakdown.sgstAmountMinor)}
              </span>
            </div>
          </>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "16px",
            fontWeight: 700,
            paddingTop: "8px",
            borderTop: "1px solid #334155",
            color: "#f8fafc",
          }}
        >
          <span>Total B2B / Stipend Invoice Payable:</span>
          <span style={{ color: "#38bdf8" }}>
            {formatInrMinor(quoteEngine.gstBreakdown.totalInvoiceAmountMinor)}
          </span>
        </div>
      </div>

      {/* Double-Entry Ledger Allocation Preview */}
      <div
        style={{
          background: "rgba(15, 23, 42, 0.9)",
          border: "1px solid #1e293b",
          borderRadius: "12px",
          padding: "14px",
          marginBottom: "18px",
        }}
      >
        <div
          style={{
            fontSize: "12px",
            fontWeight: 700,
            color: "#cbd5e1",
            marginBottom: "8px",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          Double-Entry Ledger Journal (`SUM(amountMinor) === 0n`)
        </div>

        {quoteEngine.zeroRupeeCheckout ? (
          <div
            style={{
              padding: "10px",
              borderRadius: "8px",
              background: "rgba(52, 211, 153, 0.12)",
              border: "1px solid rgba(52, 211, 153, 0.35)",
              fontSize: "12px",
              color: "#6ee7b7",
            }}
          >
            <strong>₹0 Free Checkout Bypass Active:</strong> Status{" "}
            <code>{quoteEngine.zeroRupeeCheckout.status}</code> via{" "}
            <code>{quoteEngine.zeroRupeeCheckout.gateway}</code> (
            <code>requiresExternalGateway: false</code>). Instant seat &amp;
            studio provisioning without payment gateway redirect.
          </div>
        ) : quoteEngine.projectSplit ? (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              fontSize: "12px",
              display: "grid",
              gap: "6px",
            }}
          >
            <li style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#94a3b8" }}>
                DR Buyer Clearing (`USER / AVAILABLE`):
              </span>
              <code style={{ color: "#f87171" }}>
                {formatInrMinor(-quoteEngine.projectSplit.netAmountMinor)}
              </code>
            </li>
            <li style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#38bdf8" }}>
                CR Mentor Escrow (`MENTOR / ESCROW_LOCKED` 50%):
              </span>
              <code style={{ color: "#38bdf8" }}>
                +{formatInrMinor(quoteEngine.projectSplit.mentorEscrowMinor)}
              </code>
            </li>
            <li style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#c084fc" }}>
                CR Author IP Royalty (`TENANT / ESCROW_LOCKED` 15%):
              </span>
              <code style={{ color: "#c084fc" }}>
                +
                {formatInrMinor(
                  quoteEngine.projectSplit.authorRoyaltyEscrowMinor
                )}
              </code>
            </li>
            <li style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#34d399" }}>
                CR Elluminar Platform (`PLATFORM / AVAILABLE` 35%):
              </span>
              <code style={{ color: "#34d399" }}>
                +{formatInrMinor(quoteEngine.projectSplit.platformShareMinor)}
              </code>
            </li>
          </ul>
        ) : quoteEngine.courseSplit ? (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              fontSize: "12px",
              display: "grid",
              gap: "6px",
            }}
          >
            <li style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#94a3b8" }}>
                DR Buyer Clearing (`USER / AVAILABLE`):
              </span>
              <code style={{ color: "#f87171" }}>
                {formatInrMinor(-quoteEngine.courseSplit.netAmountMinor)}
              </code>
            </li>
            <li style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#38bdf8" }}>
                CR Creator Revenue (`TENANT / AVAILABLE`{" "}
                {quoteEngine.courseSplit.creatorBps / 100}%):
              </span>
              <code style={{ color: "#38bdf8" }}>
                +{formatInrMinor(quoteEngine.courseSplit.creatorShareMinor)}
              </code>
            </li>
            <li style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#34d399" }}>
                CR Elluminar Platform (`PLATFORM / AVAILABLE`{" "}
                {quoteEngine.courseSplit.platformBps / 100}%):
              </span>
              <code style={{ color: "#34d399" }}>
                +{formatInrMinor(quoteEngine.courseSplit.platformShareMinor)}
              </code>
            </li>
          </ul>
        ) : null}
      </div>

      {/* CTA Button */}
      <button
        type="button"
        onClick={() => setCheckoutSubmitted(true)}
        style={{
          width: "100%",
          padding: "13px 18px",
          borderRadius: "10px",
          border: "none",
          background: quoteEngine.zeroRupeeCheckout
            ? "#10b981"
            : "linear-gradient(135deg, #0284c7, #4f46e5)",
          color: "#ffffff",
          fontSize: "14px",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {quoteEngine.zeroRupeeCheckout
          ? "Complete Instant ₹0 Scholarship Enrollment →"
          : `Lock Escrow & Generate GST Invoice (${formatInrMinor(
              quoteEngine.gstBreakdown.totalInvoiceAmountMinor
            )}) →`}
      </button>

      {checkoutSubmitted && (
        <div
          style={{
            marginTop: "12px",
            padding: "12px",
            borderRadius: "8px",
            background: "rgba(16, 185, 129, 0.14)",
            border: "1px solid rgba(16, 185, 129, 0.4)",
            fontSize: "12px",
            color: "#a7f3d0",
          }}
        >
          ✓ Order locked via CAS (`version: 1 → 2`) &amp; Tax Invoice{" "}
          <code>{quoteEngine.invoiceNumber}</code> queued for{" "}
          <strong>{selectedSku.title}</strong>.
        </div>
      )}
    </aside>
  );
}

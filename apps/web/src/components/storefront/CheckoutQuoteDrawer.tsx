"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  FileText,
  Lock,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Award,
} from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

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

const STATE_GST_PRESETS = [
  {
    label: "Karnataka (29) — Intra-State CGST 9% + SGST 9%",
    shortLabel: "Karnataka (29) • CGST 9% + SGST 9%",
    gstin: "29AABCE1234F1Z5",
  },
  {
    label: "Maharashtra (27) — Inter-State IGST 18%",
    shortLabel: "Maharashtra (27) • IGST 18%",
    gstin: "27AABCM9876K1Z2",
  },
  {
    label: "Delhi NCR (07) — Inter-State IGST 18%",
    shortLabel: "Delhi (07) • IGST 18%",
    gstin: "07AABCD4321G1Z9",
  },
] as const;

export interface CheckoutQuoteDrawerProps {
  selectedSku: StorefrontSkuItem;
  onSelectSku?: (sku: StorefrontSkuItem) => void;
  onClose?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CheckoutQuoteDrawer({
  selectedSku,
  onSelectSku,
  onClose,
  open,
  onOpenChange,
}: CheckoutQuoteDrawerProps) {
  const [courseSplitTier, setCourseSplitTier] =
    useState<CourseSplitTier>("STANDARD_80_20");
  const [buyerGstin, setBuyerGstin] = useState<string>("29AABCE1234F1Z5");
  const [couponInput, setCouponInput] = useState<string>("ELLUMINAR25");
  const [checkoutSubmitted, setCheckoutSubmitted] = useState<boolean>(false);

  const activeCouponCode = couponInput.trim().toUpperCase();

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
    } catch {
      gstinError =
        "Please enter a valid 15-character Indian GSTIN (for example, 29AABCE1234F1Z5) or leave blank for standard intra-state billing.";
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

  const seatsRemaining = selectedSku.seatTelemetry
    ? selectedSku.seatTelemetry.capacity - selectedSku.seatTelemetry.enrolled
    : null;

  const drawerBody = (
    <div className="flex flex-col gap-5">
      {/* Program Switcher */}
      {onSelectSku && (
        <div className="space-y-2">
          <Label htmlFor="drawer-sku-select" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Selected Cohort or Capstone Program
          </Label>
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
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {STOREFRONT_CATALOG_SKUS.map((sku) => (
              <option key={sku.id} value={sku.id}>
                {sku.title} — {formatInrMinor(sku.priceMinor)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Program Summary Strip */}
      <div className="rounded-xl border border-border bg-muted/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant="secondary" className="font-medium">
            {selectedSku.domain}
          </Badge>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Award className="size-3.5 text-primary" />
            <span>{selectedSku.credits} Academic Credits</span>
          </div>
        </div>
        <h3 className="mt-2 font-display text-lg font-medium leading-snug text-foreground">
          {selectedSku.title}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Led by <span className="font-medium text-foreground">{selectedSku.mentorLead}</span>
        </p>
        {seatsRemaining !== null && (
          <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-distinction-subtle px-2.5 py-0.5 text-xs font-medium text-distinction-subtle-foreground">
            <span className="size-1.5 rounded-full bg-distinction" />
            Live Cohort — Only {seatsRemaining} Seats Left for October Batch
          </div>
        )}
      </div>

      {/* 1-Click Scholarship & Corporate Grant Chips */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="tenant-coupon-input" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Scholarship or Corporate L&amp;D Grant Code
          </Label>
          <span className="text-[11px] font-medium text-success">
            Instant Eligibility Verification
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setCheckoutSubmitted(false);
              setCouponInput("ELLUMINAR25");
            }}
            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left transition-all ${
              activeCouponCode === "ELLUMINAR25"
                ? "border-primary bg-primary-subtle/60 text-foreground shadow-xs"
                : "border-border bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground"
            }`}
          >
            <div>
              <div className="font-mono text-xs font-semibold text-foreground">ELLUMINAR25</div>
              <div className="text-[11px] text-muted-foreground">25% L&amp;D Tuition Grant</div>
            </div>
            <Sparkles className="size-3.5 text-primary" />
          </button>

          <button
            type="button"
            onClick={() => {
              setCheckoutSubmitted(false);
              setCouponInput("SCHOLAR100");
            }}
            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left transition-all ${
              activeCouponCode === "SCHOLAR100"
                ? "border-success bg-success-subtle text-foreground shadow-xs"
                : "border-border bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground"
            }`}
          >
            <div>
              <div className="font-mono text-xs font-semibold text-foreground">SCHOLAR100</div>
              <div className="text-[11px] text-success-subtle-foreground">100% Full Scholarship (₹0)</div>
            </div>
            <CheckCircle2 className="size-3.5 text-success" />
          </button>
        </div>

        <div className="flex gap-2">
          <Input
            id="tenant-coupon-input"
            type="text"
            value={couponInput}
            onChange={(e) => {
              setCheckoutSubmitted(false);
              setCouponInput(e.target.value);
            }}
            placeholder="Enter scholarship or corporate grant code"
            className="font-mono text-xs uppercase"
          />
          {couponInput && (
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={() => {
                setCheckoutSubmitted(false);
                setCouponInput("");
              }}
            >
              Clear
            </Button>
          )}
        </div>

        {quoteEngine.couponValidation && !quoteEngine.couponValidation.valid && (
          <p className="text-xs text-destructive">
            This grant code is reserved for another partner organization or has expired.
          </p>
        )}
      </div>

      {/* Corporate GSTIN & Place of Supply Selector */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="buyer-gstin-input" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Corporate GSTIN &amp; Place of Supply (SAC 999293)
          </Label>
          <span className="text-[11px] text-muted-foreground">
            100% Input Tax Credit Eligible
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {STATE_GST_PRESETS.map((preset) => {
            const isSelected = buyerGstin.trim().toUpperCase() === preset.gstin;
            return (
              <button
                key={preset.gstin}
                type="button"
                onClick={() => setBuyerGstin(preset.gstin)}
                className={`rounded-md border px-2.5 py-1.5 text-left text-xs transition-all ${
                  isSelected
                    ? "border-primary bg-primary-subtle/50 font-medium text-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                {preset.shortLabel}
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Building2 className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
          <Input
            id="buyer-gstin-input"
            type="text"
            value={buyerGstin}
            onChange={(e) => setBuyerGstin(e.target.value)}
            placeholder="29AABCE1234F1Z5 (Optional Corporate GSTIN)"
            className="pl-9 font-mono text-xs uppercase"
          />
        </div>

        {quoteEngine.gstinError && (
          <p className="text-xs text-destructive">{quoteEngine.gstinError}</p>
        )}
      </div>

      {/* Tax Invoice Breakdown */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium text-foreground flex items-center gap-1.5">
            <FileText className="size-3.5 text-primary" />
            GST Tax Invoice Summary
          </span>
          <span className="font-mono text-[11px]">
            Ref: {quoteEngine.invoiceNumber} • SAC {quoteEngine.gstBreakdown.sacCode}
          </span>
        </div>

        <Separator />

        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Standard Program Tuition</span>
            <span className="font-mono text-foreground">{formatInrMinor(selectedSku.priceMinor)}</span>
          </div>

          {quoteEngine.discountMinor > 0n && (
            <div className="flex justify-between text-success-subtle-foreground">
              <span>Scholarship / Grant Applied ({activeCouponCode})</span>
              <span className="font-mono font-medium">-{formatInrMinor(quoteEngine.discountMinor)}</span>
            </div>
          )}

          <div className="flex justify-between pt-1 font-medium text-foreground">
            <span>Net Taxable Tuition Value</span>
            <span className="font-mono">{formatInrMinor(quoteEngine.netTaxableMinor)}</span>
          </div>

          {quoteEngine.gstBreakdown.isInterState ? (
            <div className="flex justify-between text-muted-foreground">
              <span>
                Inter-State IGST (18% • State {quoteEngine.gstBreakdown.placeOfSupplyStateCode})
              </span>
              <span className="font-mono">{formatInrMinor(quoteEngine.gstBreakdown.igstAmountMinor)}</span>
            </div>
          ) : (
            <>
              <div className="flex justify-between text-muted-foreground">
                <span>Intra-State CGST (9% • Karnataka 29)</span>
                <span className="font-mono">{formatInrMinor(quoteEngine.gstBreakdown.cgstAmountMinor)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Intra-State SGST (9% • Karnataka 29)</span>
                <span className="font-mono">{formatInrMinor(quoteEngine.gstBreakdown.sgstAmountMinor)}</span>
              </div>
            </>
          )}
        </div>

        <Separator />

        <div className="flex items-baseline justify-between pt-0.5">
          <div>
            <div className="text-sm font-semibold text-foreground">Total Payable (Incl. GST)</div>
            <div className="text-[11px] text-muted-foreground">
              {quoteEngine.zeroRupeeCheckout
                ? "100% Covered by Fellowship Scholarship"
                : "Instant GST E-Invoice issued upon enrollment"}
            </div>
          </div>
          <div className="font-mono text-xl font-bold text-primary">
            {formatInrMinor(quoteEngine.gstBreakdown.totalInvoiceAmountMinor)}
          </div>
        </div>
      </div>

      {/* Protected Milestone Escrow Breakdown Card */}
      <div className="rounded-xl border border-success/25 bg-success-subtle/40 p-4 space-y-3">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
          <div>
            <div className="text-xs font-semibold text-foreground">
              Protected Milestone Escrow Guarantee
            </div>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Your tuition is locked until a Staff Engineer reviews your architecture and signs off on your defense.
            </p>
          </div>
        </div>

        {selectedSku.kind === "PROJECT" && quoteEngine.projectSplit ? (
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="rounded-lg border border-border bg-background/80 p-2.5">
              <div className="text-[11px] font-medium text-muted-foreground">50% Mentor Escrow</div>
              <div className="mt-0.5 font-mono text-xs font-semibold text-foreground">
                {formatInrMinor(quoteEngine.projectSplit.mentorEscrowMinor)}
              </div>
              <div className="mt-0.5 text-[10px] text-success-subtle-foreground">
                Staff Review Lock
              </div>
            </div>

            <div className="rounded-lg border border-border bg-background/80 p-2.5">
              <div className="text-[11px] font-medium text-muted-foreground">15% Author Royalty</div>
              <div className="mt-0.5 font-mono text-xs font-semibold text-foreground">
                {formatInrMinor(quoteEngine.projectSplit.authorRoyaltyEscrowMinor)}
              </div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">
                Curriculum IP Share
              </div>
            </div>

            <div className="rounded-lg border border-border bg-background/80 p-2.5">
              <div className="text-[11px] font-medium text-muted-foreground">35% Lab Infra</div>
              <div className="mt-0.5 font-mono text-xs font-semibold text-foreground">
                {formatInrMinor(quoteEngine.projectSplit.platformShareMinor)}
              </div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">
                Sandbox &amp; Voice Studio
              </div>
            </div>
          </div>
        ) : quoteEngine.courseSplit ? (
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCourseSplitTier("STANDARD_80_20")}
                className={`rounded-lg border p-2 text-left text-xs transition-all ${
                  courseSplitTier === "STANDARD_80_20"
                    ? "border-primary bg-background font-medium text-foreground"
                    : "border-border bg-background/50 text-muted-foreground"
                }`}
              >
                <div>Standard Guild Track</div>
                <div className="font-mono text-[11px] text-muted-foreground">
                  80% Faculty ({formatInrMinor(quoteEngine.courseSplit.creatorShareMinor)})
                </div>
              </button>
              <button
                type="button"
                onClick={() => setCourseSplitTier("CREATOR_DIRECT_90_10")}
                className={`rounded-lg border p-2 text-left text-xs transition-all ${
                  courseSplitTier === "CREATOR_DIRECT_90_10"
                    ? "border-primary bg-background font-medium text-foreground"
                    : "border-border bg-background/50 text-muted-foreground"
                }`}
              >
                <div>Fellow Referral Link</div>
                <div className="font-mono text-[11px] text-muted-foreground">
                  90% Faculty Attribution
                </div>
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Primary Action Button */}
      <div className="space-y-3 pt-1">
        <Button
          type="button"
          size="lg"
          className="h-11 w-full text-sm font-semibold shadow-sm"
          onClick={() => setCheckoutSubmitted(true)}
        >
          <Lock className="size-4" />
          {quoteEngine.zeroRupeeCheckout
            ? "Confirm Instant ₹0 Scholarship Enrollment"
            : `Reserve Seat & Lock Protected Escrow (${formatInrMinor(
                quoteEngine.gstBreakdown.totalInvoiceAmountMinor
              )})`}
        </Button>

        {checkoutSubmitted && (
          <div
            role="status"
            className="rounded-xl border border-success/40 bg-success-subtle p-4 text-xs text-success-subtle-foreground space-y-2.5"
          >
            <div className="flex items-center justify-between font-semibold text-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-success" />
                Seat Reserved &amp; Tax Invoice Generated
              </span>
              <Badge variant="outline" className="font-mono text-[11px] bg-background">
                {quoteEngine.invoiceNumber}
              </Badge>
            </div>
            <p className="leading-relaxed">
              Your enrollment for <strong>{selectedSku.title}</strong> is confirmed under Protected Milestone Escrow. Your official GST e-invoice (SAC {quoteEngine.gstBreakdown.sacCode}) is ready for download.
            </p>
            <div className="pt-1">
              <Button
                variant="default"
                size="sm"
                className="w-full"
                render={<Link href={`/learn/course/${selectedSku.slug}`} />}
              >
                Enter Course &amp; Artifact Studio
                <ArrowRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Slide-over Sheet mode when `open` boolean is provided
  if (typeof open === "boolean") {
    return (
      <Sheet
        open={open}
        onOpenChange={(nextOpen) => {
          onOpenChange?.(nextOpen);
          if (!nextOpen && onClose) {
            onClose();
          }
        }}
      >
        <SheetContent
          side="right"
          className="w-full overflow-y-auto p-6 sm:max-w-lg"
        >
          <SheetHeader className="p-0 pb-2 text-left">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-[11px]">
                Protected Milestone Escrow
              </Badge>
              <Badge variant="outline" className="font-mono text-[11px]">
                SAC 999293
              </Badge>
            </div>
            <SheetTitle className="mt-2 font-display text-2xl font-medium">
              Reserve Seat &amp; GST Tax Quote
            </SheetTitle>
            <SheetDescription>
              Configure corporate GST input credit, apply scholarship grants, and review your milestone escrow guarantee.
            </SheetDescription>
          </SheetHeader>

          {drawerBody}
        </SheetContent>
      </Sheet>
    );
  }

  // Standalone inline card mode when rendered without Sheet state
  return (
    <aside
      aria-label="Program Tuition, GST Invoice & Protected Escrow Quote"
      className="rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm"
    >
      <div className="mb-5 flex items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="text-[11px]">
              Protected Milestone Escrow
            </Badge>
            <Badge variant="outline" className="font-mono text-[11px]">
              SAC 999293
            </Badge>
          </div>
          <h2 className="mt-2 font-display text-xl font-medium text-foreground">
            Reserve Seat &amp; GST Tax Quote
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Instant B2B corporate tax invoice &amp; verified milestone protection.
          </p>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      {drawerBody}
    </aside>
  );
}

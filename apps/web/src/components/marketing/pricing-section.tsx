"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Check,
  GraduationCap,
  ReceiptIndianRupee,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  calculateIndiaGstBreakdown,
  EDTECH_SAC_CODE,
} from "@elluminar/domain-commerce";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/fade-in";
import { cn } from "@/lib/utils";

type SupplyRegion = "intra_state_ka" | "inter_state_in";

function formatInrMinor(amountMinor: bigint): string {
  const rupees = Number(amountMinor) / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

export function PricingSection() {
  const [supplyRegion, setSupplyRegion] = useState<SupplyRegion>("intra_state_ka");

  const buyerStateCode = supplyRegion === "intra_state_ka" ? "29" : "27";

  const sprintGst = calculateIndiaGstBreakdown({
    taxableAmountMinor: 1499900n,
    supplierStateCode: "29",
    buyerStateCode,
  });

  const flagshipGst = calculateIndiaGstBreakdown({
    taxableAmountMinor: 2499900n,
    supplierStateCode: "29",
    buyerStateCode,
  });

  return (
    <section
      id="pricing"
      className="w-full border-b border-border/60 bg-background py-16 md:py-24 lg:py-28"
    >
      <div className="container">
        {/* Heading + Live India GST Tax Supply Switcher */}
        <FadeIn direction="up">
          <div className="mx-auto mb-12 flex max-w-3xl flex-col items-center space-y-4 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-subtle px-3.5 py-1 text-xs font-bold tracking-wider text-primary-subtle-foreground uppercase">
              <ReceiptIndianRupee className="size-3.5 text-primary" />
              Transparent B2C, B2B &amp; University Pricing (SAC {EDTECH_SAC_CODE})
            </span>

            <h2 className="font-display text-3xl leading-tight font-medium tracking-tight text-foreground sm:text-4xl md:text-5xl">
              Pay for verified <span className="text-primary italic">proof of work</span>,
              protected by escrow
            </h2>

            <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
              Your tuition is locked until a Staff Engineer reviews your architecture
              and signs off on your defense. Full SAC {EDTECH_SAC_CODE} GST tax invoices
              included for corporate L&amp;D reimbursement and Input Tax Credit.
            </p>

            {/* Interactive GST Supply Mode Toggle */}
            <div className="inline-flex flex-wrap items-center gap-1.5 rounded-2xl border border-border bg-card p-1.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setSupplyRegion("intra_state_ka")}
                className={cn(
                  "cursor-pointer rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all",
                  supplyRegion === "intra_state_ka"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                Karnataka Intra-State (9% CGST + 9% SGST)
              </button>

              <button
                type="button"
                onClick={() => setSupplyRegion("inter_state_in")}
                className={cn(
                  "cursor-pointer rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all",
                  supplyRegion === "inter_state_in"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                Rest of India Inter-State (18% IGST)
              </button>
            </div>
          </div>
        </FadeIn>

        {/* 4 Tier Cards */}
        <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Tier 1: Scholarship & Open Studio */}
          <FadeIn direction="up" delay={0.05}>
            <div className="flex h-full flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-2xs">
              <div>
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-success-subtle px-3 py-1 text-xs font-bold text-success-subtle-foreground">
                  Merit &amp; Need Scholarship
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground">
                  Fellowship &amp; Sandbox
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Open 3-pane artifact studio preview + 100% tuition waivers for
                  selected fellows.
                </p>

                <div className="mt-5 border-b border-border pb-4">
                  <div className="font-display text-3xl font-bold text-foreground">
                    ₹0
                  </div>
                  <div className="mt-1 text-xs font-semibold text-success">
                    No credit card required
                  </div>
                </div>

                <ul className="mt-5 space-y-2.5 text-xs text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
                    <span>Interactive 3-pane architecture &amp; code sandbox</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
                    <span>Sample rubric &amp; public credential explorer</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
                    <span>100% scholarship vouchers for qualifying fellows</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-4">
                <Button
                  variant="outline"
                  size="lg"
                  render={<Link href="/explore" />}
                  className="w-full justify-center rounded-full font-semibold"
                >
                  Start Free in Studio
                </Button>
              </div>
            </div>
          </FadeIn>

          {/* Tier 2: Self-Paced + Mentor Sprint */}
          <FadeIn direction="up" delay={0.1}>
            <div className="flex h-full flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-2xs">
              <div>
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary-subtle px-3 py-1 text-xs font-bold text-primary-subtle-foreground">
                  Self-Paced + Async Review
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground">
                  Artifact Sprint Track
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ideal for working engineers building one verified portfolio artifact at
                  their own pace.
                </p>

                <div className="mt-5 border-b border-border pb-4">
                  <div className="font-display text-3xl font-bold text-foreground">
                    {formatInrMinor(sprintGst.taxableAmountMinor)}
                  </div>
                  <div className="mt-1 text-xs font-medium text-muted-foreground">
                    {sprintGst.isInterState ? (
                      <>
                        + {formatInrMinor(sprintGst.igstAmountMinor)} IGST (18%) ={" "}
                        <strong className="text-foreground">
                          {formatInrMinor(sprintGst.totalInvoiceAmountMinor)}
                        </strong>
                      </>
                    ) : (
                      <>
                        + {formatInrMinor(sprintGst.cgstAmountMinor)} CGST +{" "}
                        {formatInrMinor(sprintGst.sgstAmountMinor)} SGST ={" "}
                        <strong className="text-foreground">
                          {formatInrMinor(sprintGst.totalInvoiceAmountMinor)}
                        </strong>
                      </>
                    )}
                  </div>
                </div>

                <ul className="mt-5 space-y-2.5 text-xs text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
                    <span>5-Min AI Socratic Critique on every checkpoint</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
                    <span>24kbps Voice-over-Canvas Staff Engineer review</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
                    <span>SAC {EDTECH_SAC_CODE} GST invoice for L&amp;D reimbursement</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-4">
                <Button
                  variant="outline"
                  size="lg"
                  render={<Link href="/explore" />}
                  className="w-full justify-center rounded-full font-semibold"
                >
                  Select Sprint Track
                </Button>
              </div>
            </div>
          </FadeIn>

          {/* Tier 3: Flagship Hybrid Cohort & Oral Defense (Most Popular) */}
          <FadeIn direction="up" delay={0.15}>
            <div className="relative flex h-full flex-col justify-between rounded-3xl border-2 border-primary bg-card p-6 shadow-xl shadow-primary/10">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3.5 py-0.5 text-[11px] font-extrabold text-primary-foreground shadow-sm whitespace-nowrap">
                MOST POPULAR • ESCROW PROTECTED
              </span>

              <div>
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary-subtle px-3 py-1 text-xs font-bold text-primary-subtle-foreground">
                  <Sparkles className="size-3.5 text-primary" />
                  Live Cohort + Oral Defense
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground">
                  Flagship Role Capstone
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Full 6-week hybrid cohort, Staff Engineer mentorship, and 1:1 live oral
                  defense credential.
                </p>

                <div className="mt-5 border-b border-border pb-4">
                  <div className="font-display text-3xl font-bold text-foreground">
                    {formatInrMinor(flagshipGst.taxableAmountMinor)}
                  </div>
                  <div className="mt-1 text-xs font-medium text-muted-foreground">
                    {flagshipGst.isInterState ? (
                      <>
                        + {formatInrMinor(flagshipGst.igstAmountMinor)} IGST (18%) ={" "}
                        <strong className="text-foreground">
                          {formatInrMinor(flagshipGst.totalInvoiceAmountMinor)}
                        </strong>
                      </>
                    ) : (
                      <>
                        + {formatInrMinor(flagshipGst.cgstAmountMinor)} CGST +{" "}
                        {formatInrMinor(flagshipGst.sgstAmountMinor)} SGST ={" "}
                        <strong className="text-foreground">
                          {formatInrMinor(flagshipGst.totalInvoiceAmountMinor)}
                        </strong>
                      </>
                    )}
                  </div>
                </div>

                <ul className="mt-5 space-y-2.5 text-xs text-foreground/90">
                  <li className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-success" />
                    <span className="font-semibold">
                      Protected Milestone Escrow until Staff sign-off
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
                    <span>Weekly live architecture critiques &amp; office hours</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
                    <span>25-min 1:1 live oral defense &amp; SHA-256 credential</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
                    <span>Eligible for 14–20 NEP 2020 Honours credits</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-4">
                <Button
                  size="lg"
                  render={<Link href="/explore" />}
                  className="w-full justify-center rounded-full font-semibold shadow-sm"
                >
                  Reserve Cohort Seat
                  <ArrowRight className="ml-1.5 size-4" />
                </Button>
              </div>
            </div>
          </FadeIn>

          {/* Tier 4: Enterprise GCC & University NEP 2020 Portal */}
          <FadeIn direction="up" delay={0.2}>
            <div className="flex h-full flex-col justify-between rounded-3xl border border-transparent bg-ink p-6 text-ink-foreground shadow-xl">
              <div>
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-primary">
                  <Building2 className="size-3.5" />
                  Enterprise GCC &amp; Universities
                </div>
                <h3 className="font-display text-xl font-semibold text-ink-foreground">
                  Institutional Cohort License
                </h3>
                <p className="mt-1 text-xs text-ink-muted">
                  Dedicated cohorts for engineering GCCs and autonomous NEP 2020
                  universities.
                </p>

                <div className="mt-5 border-b border-white/10 pb-4">
                  <div className="font-display text-2xl font-bold text-ink-foreground">
                    Custom Seat Volume
                  </div>
                  <div className="mt-1 text-xs font-semibold text-emerald-400">
                    100% SAC {EDTECH_SAC_CODE} Input Tax Credit Ready
                  </div>
                </div>

                <ul className="mt-5 space-y-2.5 text-xs text-ink-foreground/85">
                  <li className="flex items-start gap-2">
                    <GraduationCap className="mt-0.5 size-3.5 shrink-0 text-emerald-400" />
                    <span>Print-ready 14–20 Credit NEP 2020 / AICTE Dossier</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-400" />
                    <span>Automated CGST/SGST &amp; IGST B2B Tax Invoices</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-400" />
                    <span>Enterprise OIDC SSO &amp; L&amp;D readiness analytics</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-4">
                <Button
                  size="lg"
                  render={<Link href="/org/dossier-demo" />}
                  className="w-full justify-center rounded-full font-semibold"
                >
                  Open B2B &amp; University Portal
                  <ArrowRight className="ml-1.5 size-4" />
                </Button>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

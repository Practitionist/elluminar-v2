"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  Layers,
  ShieldCheck,
  Sparkles,
  Users,
  ArrowRight,
  GraduationCap,
} from "lucide-react";
import {
  CheckoutQuoteDrawer,
  formatInrMinor,
  STOREFRONT_CATALOG_SKUS,
  type DeliveryMode,
  type StorefrontSkuItem,
} from "@/components/storefront/CheckoutQuoteDrawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
    targetOutcome:
      "Design and verify multi-region linearizable engines with deterministic fault-injection proofs.",
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
    targetOutcome:
      "Ship sub-400ms hybrid retrieval pipelines with verified citation groundedness guardrails.",
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
    targetOutcome:
      "Author institutional Series B/C Investment Committee Memos with audited valuation models.",
    flagshipDeliverables: [
      "3-Statement SaaS Cohort & NRR Engine",
      "Formula AST WACC / Terminal Value Matrix",
      "Liquidation Preference Waterfall & Voice-over-Sheet",
    ],
  },
];

const DOMAIN_FILTERS = [
  "ALL",
  "Distributed Systems",
  "Agentic RAG",
  "Venture Capital DCF",
] as const;

const FORMAT_FILTERS: readonly {
  value: "ALL" | DeliveryMode;
  label: string;
}[] = [
  { value: "ALL", label: "All Formats" },
  { value: "LIVE_COHORT", label: "Live Cohort" },
  { value: "SELF_PACED", label: "Self-Paced Mastery" },
];

export default function UnifiedOutcomeStorefrontPage() {
  const [selectedDomain, setSelectedDomain] = useState<string>("ALL");
  const [selectedDeliveryMode, setSelectedDeliveryMode] =
    useState<"ALL" | DeliveryMode>("ALL");
  const [activeSku, setActiveSku] = useState<StorefrontSkuItem>(
    STOREFRONT_CATALOG_SKUS[0]!
  );
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

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

  const handleOpenQuoteDrawer = (sku: StorefrontSkuItem) => {
    setActiveSku(sku);
    setDrawerOpen(true);
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Editorial Header */}
      <header className="mb-12 border-b border-border pb-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default" className="gap-1 px-2.5 py-0.5 text-xs">
              <Sparkles className="size-3" />
              October 2026 Admissions Open
            </Badge>
            <Badge variant="outline" className="text-xs font-medium">
              GST E-Invoice Eligible (SAC 999293)
            </Badge>
            <Badge variant="secondary" className="text-xs font-medium">
              NEP 2020 Credit-Bearing
            </Badge>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setDrawerOpen(true)}
          >
            <FileText className="size-3.5" />
            Corporate L&amp;D &amp; Scholarship Quote Calculator
          </Button>
        </div>

        <h1 className="mt-5 max-w-4xl font-display text-4xl font-medium tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          Verified Proof-of-Work Capstones, Live Cohorts &amp; Role Tracks
        </h1>

        <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Master high-stakes engineering, applied AI, and quantitative finance systems alongside practicing Staff &amp; Principal architects. Every program builds an audited technical dossier backed by voice defense reviews.
        </p>

        {/* Commercial Trust & Escrow Protection Strip */}
        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-success/30 bg-success-subtle/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success" />
            <div className="text-sm text-foreground">
              <strong className="font-semibold">Protected Milestone Escrow:</strong>{" "}
              <span className="text-muted-foreground">
                Your tuition is locked until a Staff Engineer reviews your architecture and signs off on your defense.
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3 text-xs font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 text-foreground">
              <CheckCircle2 className="size-3.5 text-success" />
              100% Corporate GST Input Credit
            </span>
            <span className="inline-flex items-center gap-1.5 text-foreground">
              <CheckCircle2 className="size-3.5 text-success" />
              Merit Scholarships Available
            </span>
          </div>
        </div>
      </header>

      {/* NEP 2020 / Industry Role Track Highlight Cards */}
      <section aria-labelledby="role-tracks-heading" className="mb-14">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <GraduationCap className="size-4" />
              Executive &amp; Academic Degree Pathways
            </div>
            <h2
              id="role-tracks-heading"
              className="mt-1 font-display text-2xl font-medium text-foreground sm:text-3xl"
            >
              NEP 2020 &amp; Industry Role Specializations (14–18 Academic Credits)
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Stackable capstone credits recognized across partner engineering guilds and universities.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {ROLE_TRACKS.map((track) => (
            <Card
              key={track.id}
              className="flex flex-col justify-between transition-all hover:ring-primary/30"
            >
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary" className="font-medium">
                    {track.domain}
                  </Badge>
                  <Badge variant="outline" className="font-mono text-xs">
                    {track.totalCredits} Academic Credits
                  </Badge>
                </div>
                <CardTitle className="mt-2 font-display text-xl font-medium leading-snug">
                  {track.roleTitle}
                </CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  {track.targetOutcome}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="space-y-1.5 border-t border-border pt-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Verified Portfolio Deliverables
                  </div>
                  <ul className="space-y-1.5 text-xs text-foreground">
                    {track.flagshipDeliverables.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Catalog Filter Bar */}
      <section aria-label="Catalog Filters" className="mb-8">
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-xs lg:flex-row lg:items-center lg:justify-between">
          {/* Domain Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Domain:
            </span>
            {DOMAIN_FILTERS.map((dom) => {
              const active = selectedDomain === dom;
              return (
                <Button
                  key={dom}
                  type="button"
                  variant={active ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedDomain(dom)}
                  className="rounded-full"
                >
                  {dom === "ALL" ? "All Domains" : dom}
                </Button>
              );
            })}
          </div>

          {/* Delivery Format Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Format:
            </span>
            {FORMAT_FILTERS.map((fmt) => {
              const active = selectedDeliveryMode === fmt.value;
              return (
                <Button
                  key={fmt.value}
                  type="button"
                  variant={active ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedDeliveryMode(fmt.value)}
                  className={`rounded-full ${
                    active ? "ring-1 ring-primary/40 font-semibold text-foreground" : ""
                  }`}
                >
                  {fmt.value === "LIVE_COHORT" && (
                    <Users className="size-3.5 text-primary" />
                  )}
                  {fmt.value === "SELF_PACED" && (
                    <Clock className="size-3.5 text-muted-foreground" />
                  )}
                  {fmt.label}
                </Button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Full-Width Responsive Catalog Grid */}
      <section aria-label="Courses and Capstone Projects">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {filteredSkus.map((sku) => {
            const seatsLeft = sku.seatTelemetry
              ? sku.seatTelemetry.capacity - sku.seatTelemetry.enrolled
              : null;

            return (
              <Card
                key={sku.id}
                className="flex flex-col justify-between transition-all hover:shadow-md hover:ring-foreground/20"
              >
                <CardHeader className="space-y-3">
                  {/* Top Badges & Scarcity Strip */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={sku.kind === "PROJECT" ? "default" : "secondary"}
                      >
                        {sku.kind === "PROJECT"
                          ? "Proof-of-Work Capstone"
                          : "Applied Engineering Course"}
                      </Badge>

                      <Badge variant="outline">
                        {sku.deliveryMode === "LIVE_COHORT"
                          ? "Live Cohort"
                          : "Self-Paced Mastery"}
                      </Badge>

                      <Badge variant="outline" className="font-mono text-[11px]">
                        {sku.credits} NEP Credits
                      </Badge>
                    </div>
                  </div>

                  {/* Live Cohort Commercial Urgency Banner */}
                  {seatsLeft !== null && (
                    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-distinction/30 bg-distinction-subtle px-3 py-1 text-xs font-medium text-distinction-subtle-foreground">
                      <span className="size-2 rounded-full bg-distinction" />
                      Live Cohort — Only {seatsLeft} Seats Left for October Batch • Reserve Your Seat
                    </div>
                  )}

                  <div>
                    <CardTitle className="font-display text-2xl font-medium leading-snug text-foreground">
                      {sku.title}
                    </CardTitle>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Faculty Lead:{" "}
                      <span className="font-semibold text-foreground">
                        {sku.mentorLead}
                      </span>{" "}
                      • {sku.organizationName}
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Artifact Deliverables Box */}
                  <div className="rounded-xl border border-border bg-muted/40 p-3.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <Layers className="size-3.5 text-primary" />
                      Verified Portfolio Artifact &amp; Evaluation
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-foreground">
                      {sku.artifactSummary}
                    </p>
                  </div>

                  {/* Protected Milestone Escrow Value Notice */}
                  <div className="flex items-start gap-2.5 rounded-xl border border-success/20 bg-success-subtle/30 p-3 text-xs">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
                    <span className="leading-relaxed text-muted-foreground">
                      <strong className="font-medium text-foreground">
                        Protected Milestone Escrow:
                      </strong>{" "}
                      Your tuition is locked until a Staff Engineer reviews your architecture and signs off on your defense.
                    </span>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Tuition Fee (Corporate L&amp;D Eligible)
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono text-2xl font-bold text-foreground">
                        {formatInrMinor(sku.priceMinor)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        + 18% GST
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <Button
                      variant="outline"
                      size="lg"
                      render={<Link href={`/learn/course/${sku.slug}`} />}
                    >
                      <BookOpen className="size-4" />
                      Preview Curriculum
                    </Button>

                    <Button
                      type="button"
                      variant="default"
                      size="lg"
                      onClick={() => handleOpenQuoteDrawer(sku)}
                    >
                      Reserve Seat &amp; View GST Quote
                      <ArrowRight className="size-4" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Slide-Over shadcn/ui Sheet Checkout Drawer */}
      <CheckoutQuoteDrawer
        selectedSku={activeSku}
        onSelectSku={(sku) => setActiveSku(sku)}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </main>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Flame,
  GraduationCap,
  Play,
  Pause,
  ShieldCheck,
  Sparkles,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/fade-in";
import { cn } from "@/lib/utils";

type PersonaId = "learners" | "enterprise" | "universities";

interface PersonaConfig {
  id: PersonaId;
  label: string;
  shortLabel: string;
  icon: typeof Sparkles;
  headlineLead: string;
  headlineAccent: string;
  headlineTail: string;
  description: string;
  primaryCta: {
    label: string;
    href: string;
  };
  secondaryCta: {
    label: string;
    href: string;
  };
  metrics: {
    value: string;
    label: string;
  }[];
  previewBadge: string;
  previewTitle: string;
  previewMentor: string;
  previewQuote: string;
}

const PERSONAS: Record<PersonaId, PersonaConfig> = {
  learners: {
    id: "learners",
    label: "For Learners",
    shortLabel: "Learners",
    icon: Sparkles,
    headlineLead: "Build real systems.",
    headlineAccent: "Defend your architecture",
    headlineTail: "with Staff Engineers.",
    description:
      "Stop collecting passive video completion badges. Ship production distributed systems, agentic AI workflows, and Series B financial models—backed by Protected Milestone Escrow where your tuition stays locked until a Staff Engineer signs off on your defense.",
    primaryCta: {
      label: "Explore Role Tracks",
      href: "/explore",
    },
    secondaryCta: {
      label: "Launch Interactive Studio",
      href: "/studio/demo",
    },
    metrics: [
      { value: "89%", label: "Cohort defense completion" },
      { value: "< 6 hrs", label: "24kbps Voice-over-Canvas review" },
      { value: "100%", label: "Protected Milestone Escrow" },
    ],
    previewBadge: "24kbps Voice-over-Canvas • Staff Review #408",
    previewTitle: "Raft Consensus Log Replication & Split-Brain Recovery",
    previewMentor: "Reviewed by Siddharth R. • Staff Distributed Systems Engineer",
    previewQuote:
      "\"At 02:14 on your quorum state machine diagram: fencing tokens cleanly prevent stale leader writes under asymmetric network partitions. Cleared for live oral defense.\"",
  },
  enterprise: {
    id: "enterprise",
    label: "For Enterprise GCC Leaders",
    shortLabel: "Enterprise GCCs",
    icon: Building2,
    headlineLead: "Verify engineering judgment.",
    headlineAccent: "Deploy production-ready",
    headlineTail: "GCC cohorts in 6 weeks.",
    description:
      "Upskill L4–L6 platform and AI engineering teams with hands-on architecture sprints graded by Principal Practitioners. Includes corporate OIDC SSO, live capability readiness telemetry, and automated SAC 999293 GST tax invoicing.",
    primaryCta: {
      label: "Inspect GCC Procurement Dossier",
      href: "/org/dossier-demo",
    },
    secondaryCta: {
      label: "Verify Sample Credential",
      href: "/verify/ELL-2026-DEMO",
    },
    metrics: [
      { value: "3.4x", label: "Faster L5 design doc sign-off" },
      { value: "SAC 999293", label: "100% GST Input Tax Credit compliant" },
      { value: "OIDC SSO", label: "Zero-friction enterprise provisioning" },
    ],
    previewBadge: "Enterprise GCC Readiness Matrix • Cohort Q4",
    previewTitle: "Production Agentic RAG & Guardrail Latency Architecture",
    previewMentor: "Signed off by Ananya M. • Principal AI Systems Architect",
    previewQuote:
      "\"All 18 cohort engineers demonstrated deterministic PII redaction and sub-280ms semantic cache fallback before production rollout.\"",
  },
  universities: {
    id: "universities",
    label: "For University Deans (NEP 2020)",
    shortLabel: "Universities (NEP 2020)",
    icon: GraduationCap,
    headlineLead: "Turn final-year capstones into",
    headlineAccent: "14–20 NEP 2020 credits",
    headlineTail: "and verified proof of work.",
    description:
      "Equip autonomous engineering and management institutions with turnkey AICTE & NEP 2020 Honours capstone studios. Every student graduates with an employer-verifiable SHA-256 portfolio and external industry viva sign-off.",
    primaryCta: {
      label: "Download NEP 2020 Academic Dossier",
      href: "/org/dossier-demo",
    },
    secondaryCta: {
      label: "Explore Honours Tracks",
      href: "/explore",
    },
    metrics: [
      { value: "14–20", label: "NEP 2020 Honours & Major credits" },
      { value: "SHA-256", label: "Tamper-evident academic portfolio" },
      { value: "1:1 Viva", label: "External Staff Engineer oral defense" },
    ],
    previewBadge: "NEP 2020 Honours Viva • AICTE Credit Mapped",
    previewTitle: "B.Tech CSE Honours Capstone — Distributed KV Storage Engine",
    previewMentor: "External Examiner: Vikramaditya K. • Principal Systems Architect",
    previewQuote:
      "\"Candidate defended WAL crash recovery invariants and compaction throughput live across a 25-minute oral examination. Grade: O (Outstanding, 9.7/10).\"",
  },
};

const WAVEFORM_BARS = [
  38, 64, 52, 86, 94, 70, 44, 78, 92, 60, 48, 84, 96, 72, 58, 88, 66, 42, 76, 90,
  62, 54, 80, 68, 46, 74, 86, 56,
];

export function HeroSection() {
  const [activePersona, setActivePersona] = useState<PersonaId>("learners");
  const [isPlayingPreview, setIsPlayingPreview] = useState(true);

  const persona = PERSONAS[activePersona];

  return (
    <section className="relative w-full overflow-hidden border-b border-border/60 bg-background pt-10 pb-16 md:pt-14 md:pb-24 lg:pt-18 lg:pb-28">
      {/* Subtle OKLCH ambient editorial gradient mesh */}
      <div className="pointer-events-none absolute inset-0 gradient-mesh opacity-60" />

      <div className="container relative">
        {/* Top Live Cohort Scarcity Pill */}
        <FadeIn direction="up" delay={0.05}>
          <div className="mb-8 flex justify-center lg:justify-start">
            <Link
              href="/explore"
              className="group inline-flex flex-wrap items-center gap-2 rounded-full border border-primary/25 bg-primary-subtle px-4 py-1.5 text-xs font-semibold text-primary-subtle-foreground shadow-xs transition-all hover:border-primary/50 hover:shadow-md sm:text-sm"
            >
              <span className="inline-flex size-2 animate-pulse rounded-full bg-primary" />
              <Flame className="size-3.5 text-primary" />
              <span>
                Live Cohort — Only 4 Seats Left for October Batch • Reserve Your Seat
              </span>
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </FadeIn>

        {/* Interactive Multi-Persona Switcher */}
        <FadeIn direction="up" delay={0.1}>
          <div
            role="tablist"
            aria-label="Select your role or institution type"
            className="mb-10 inline-flex flex-wrap items-center gap-1.5 rounded-2xl border border-border bg-card p-1.5 shadow-xs"
          >
            {(Object.keys(PERSONAS) as PersonaId[]).map((key) => {
              const item = PERSONAS[key];
              const Icon = item.icon;
              const isSelected = activePersona === key;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setActivePersona(key)}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all sm:text-sm",
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="hidden sm:inline">{item.label}</span>
                  <span className="sm:hidden">{item.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </FadeIn>

        {/* Main 2-Column Editorial Hero Grid */}
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
          {/* Left Column: Editorial Headline, Value Copy & Conversion CTAs */}
          <div className="space-y-8 lg:col-span-7">
            <div className="space-y-5">
              <h1 className="font-display text-4xl leading-[1.06] font-medium tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-[3.65rem]">
                {persona.headlineLead}{" "}
                <span className="text-primary italic">{persona.headlineAccent}</span>{" "}
                {persona.headlineTail}
              </h1>

              <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg md:text-xl">
                {persona.description}
              </p>
            </div>

            {/* Protected Milestone Escrow Guarantee Callout */}
            <div className="flex items-start gap-3 rounded-2xl border border-success/25 bg-success-subtle p-4 text-success-subtle-foreground">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success" />
              <div className="text-sm leading-relaxed">
                <span className="font-bold">Protected Milestone Escrow Guarantee: </span>
                &ldquo;Your tuition is locked until a Staff Engineer reviews your
                architecture and signs off on your defense.&rdquo;
              </div>
            </div>

            {/* Primary & Secondary Action Buttons (@base-ui/react render pattern) */}
            <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center">
              <Button
                size="lg"
                render={<Link href={persona.primaryCta.href} />}
                className="h-11 rounded-full px-7 text-sm font-semibold shadow-md transition-all hover:shadow-lg sm:text-base"
              >
                {persona.primaryCta.label}
                <ArrowRight className="ml-1.5 size-4" />
              </Button>

              <Button
                variant="outline"
                size="lg"
                render={<Link href={persona.secondaryCta.href} />}
                className="h-11 rounded-full px-6 text-sm font-semibold sm:text-base"
              >
                {persona.secondaryCta.label}
              </Button>
            </div>

            {/* Persona-Tailored Conversion Metrics */}
            <div className="grid grid-cols-3 gap-4 border-t border-border pt-6 sm:gap-8">
              {persona.metrics.map((metric) => (
                <div key={metric.label} className="space-y-1">
                  <div className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    {metric.value}
                  </div>
                  <div className="text-xs leading-snug font-medium text-muted-foreground sm:text-sm">
                    {metric.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Live Interactive Proof-of-Work & 24kbps Voice-over-Canvas Review Preview */}
          <div className="lg:col-span-5">
            <FadeIn direction="left" delay={0.15}>
              <div className="relative overflow-hidden rounded-3xl border border-border bg-ink p-6 text-ink-foreground shadow-2xl bg-ink-grid sm:p-7">
                {/* Top Header Strip */}
                <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary">
                    <Volume2 className="size-3.5" />
                    {persona.previewBadge}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                    <CheckCircle2 className="size-3.5" />
                    SHA-256 Verified
                  </span>
                </div>

                {/* Artifact Title & Reviewer Metadata */}
                <div className="mb-5 space-y-1.5">
                  <h2 className="font-display text-xl font-medium text-ink-foreground sm:text-2xl">
                    {persona.previewTitle}
                  </h2>
                  <p className="text-xs font-medium text-ink-muted">
                    {persona.previewMentor}
                  </p>
                </div>

                {/* Simulated Architecture Topology + Staff Laser Pointer Annotation */}
                <div className="mb-5 rounded-2xl border border-white/10 bg-ink-deep p-4">
                  <div className="mb-3 flex items-center justify-between text-[11px] font-medium text-ink-muted">
                    <span>SYSTEM TOPOLOGY &amp; QUORUM STATE CANVAS</span>
                    <span className="font-mono text-emerald-400">02:14 / 06:40</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="font-mono text-[10px] text-ink-muted">NODE-01</div>
                      <div className="mt-1 font-bold text-ink-foreground">Leader (Term 4)</div>
                      <div className="mt-1 text-[10px] text-emerald-400">Fencing Token #89</div>
                    </div>
                    <div className="relative rounded-xl border-2 border-primary bg-primary/15 p-3 shadow-sm">
                      <span className="absolute -top-2 right-2 rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground uppercase">
                        Staff Laser Focus
                      </span>
                      <div className="font-mono text-[10px] text-ink-foreground/80">WAL QUORUM</div>
                      <div className="mt-1 font-bold text-ink-foreground">Commit Index 1,402</div>
                      <div className="mt-1 text-[10px] text-primary">Zero Split-Brain</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="font-mono text-[10px] text-ink-muted">NODE-02/03</div>
                      <div className="mt-1 font-bold text-ink-foreground">Followers Sync</div>
                      <div className="mt-1 text-[10px] text-emerald-400">p99 &lt; 4.2ms</div>
                    </div>
                  </div>
                </div>

                {/* Interactive 24kbps Opus Voice-over-Canvas Scrub Bar */}
                <div className="mb-5 rounded-2xl border border-white/10 bg-white/5 p-3.5">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsPlayingPreview((prev) => !prev)}
                      aria-label={
                        isPlayingPreview
                          ? "Pause 24kbps Voice-over-Canvas critique"
                          : "Play 24kbps Voice-over-Canvas critique"
                      }
                      className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform hover:scale-105"
                    >
                      {isPlayingPreview ? (
                        <Pause className="size-4" />
                      ) : (
                        <Play className="ml-0.5 size-4" />
                      )}
                    </button>

                    <div className="flex flex-1 items-end gap-1 h-8" aria-hidden="true">
                      {WAVEFORM_BARS.map((height, idx) => (
                        <span
                          key={idx}
                          style={{ height: `${height}%` }}
                          className={cn(
                            "flex-1 rounded-full transition-all duration-300",
                            idx < 14
                              ? "bg-primary"
                              : isPlayingPreview
                                ? "bg-white/40"
                                : "bg-white/20"
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-ink-foreground/90 italic">
                    {persona.previewQuote}
                  </p>
                </div>

                {/* Bottom Action Links */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
                  <Link
                    href="/verify/ELL-2026-DEMO"
                    className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
                  >
                    <ShieldCheck className="size-4" />
                    Inspect Verified Credential (ELL-2026-DEMO)
                  </Link>
                  <Link
                    href="/studio/demo"
                    className="inline-flex items-center gap-1 font-semibold text-ink-foreground/80 hover:text-ink-foreground"
                  >
                    Open 3-Pane Studio
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
}

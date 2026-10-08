"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  Fingerprint,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/fade-in";
import { cn } from "@/lib/utils";

type CredentialTab = "rubric" | "verdict" | "digest";

const RUBRIC_DIMENSIONS = [
  {
    criterion: "Consensus Safety & Split-Brain Fencing",
    score: "9.8 / 10",
    barPercent: 98,
    note: "Zero stale-leader writes across 1,000 chaos partition runs",
  },
  {
    criterion: "Write-Ahead Log & Compaction Throughput",
    score: "9.5 / 10",
    barPercent: 95,
    note: "Sustained 42,000 ops/sec at p99 latency under 4.2ms",
  },
  {
    criterion: "Live 25-Min Architecture Oral Defense",
    score: "9.7 / 10",
    barPercent: 97,
    note: "Articulated clear trade-offs between lease reads and quorum reads",
  },
] as const;

export function CredentialCenterpieceSection() {
  const [activeTab, setActiveTab] = useState<CredentialTab>("rubric");

  return (
    <section
      id="verify-showcase"
      className="w-full border-b border-border/60 bg-background py-16 md:py-24 lg:py-28"
    >
      <div className="container">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-12">
          {/* Left Column: Editorial Story & Employer Acceptance */}
          <div className="space-y-6 lg:col-span-5">
            <FadeIn direction="right">
              <div className="space-y-5">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-subtle px-3.5 py-1 text-xs font-bold tracking-wider text-primary-subtle-foreground uppercase">
                  <ShieldCheck className="size-3.5 text-primary" />
                  Cryptographic Proof-of-Work
                </span>

                <h2 className="font-display text-3xl leading-[1.08] font-medium tracking-tight text-foreground sm:text-4xl md:text-5xl">
                  A PDF certificate claims completion.{" "}
                  <span className="text-primary italic">A verified dossier</span>{" "}
                  proves capability.
                </h2>

                <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
                  Every completed capstone generates an immutable SHA-256 verification
                  record exposing your architecture topology, rubric scores, Staff
                  Engineer sign-off, and oral defense verdict—verifiable by any hiring
                  manager in one click.
                </p>

                <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                  <Button
                    size="lg"
                    render={<Link href="/verify/ELL-2026-DEMO" />}
                    className="rounded-full px-6 font-semibold shadow-sm"
                  >
                    Open Public Verification Portal
                    <ExternalLink className="ml-1.5 size-4" />
                  </Button>
                </div>
              </div>
            </FadeIn>
          </div>

          {/* Right Column: Interactive Verified Credential Inspector */}
          <div className="lg:col-span-7">
            <FadeIn direction="left" delay={0.1}>
              <div className="overflow-hidden rounded-3xl border-2 border-border bg-card shadow-xl">
                {/* Credential Header Banner */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-muted/40 px-6 py-5">
                  <div className="flex items-center gap-3">
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-success text-success-foreground shadow-sm">
                      <Award className="size-6" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">
                          CREDENTIAL ID: ELL-2026-DEMO
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-success-subtle px-2 py-0.5 text-[11px] font-bold text-success-subtle-foreground">
                          <CheckCircle2 className="size-3 text-success" />
                          Verified Active
                        </span>
                      </div>
                      <h3 className="mt-0.5 font-display text-lg font-semibold text-foreground sm:text-xl">
                        Distributed Systems &amp; Fault-Tolerant Raft Engine
                      </h3>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-semibold text-muted-foreground">
                      Composite Rubric Score
                    </div>
                    <div className="font-display text-2xl font-bold text-foreground">
                      9.67 <span className="text-sm font-normal text-muted-foreground">/ 10</span>
                    </div>
                  </div>
                </div>

                {/* Interactive Inspector Tabs */}
                <div className="flex flex-wrap gap-1.5 border-b border-border bg-background px-6 py-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab("rubric")}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all",
                      activeTab === "rubric"
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <FileCheck2 className="size-3.5" />
                    Rubric Score Breakdown
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("verdict")}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all",
                      activeTab === "verdict"
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <ShieldCheck className="size-3.5" />
                    Staff Mentor Sign-Off
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("digest")}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all",
                      activeTab === "digest"
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Fingerprint className="size-3.5" />
                    SHA-256 Artifact Digest
                  </button>
                </div>

                {/* Tab Content Body */}
                <div className="p-6">
                  {activeTab === "rubric" && (
                    <div className="space-y-4">
                      {RUBRIC_DIMENSIONS.map((item) => (
                        <div
                          key={item.criterion}
                          className="rounded-2xl border border-border/80 bg-background p-4"
                        >
                          <div className="flex items-center justify-between text-sm font-bold text-foreground">
                            <span>{item.criterion}</span>
                            <span className="text-primary">{item.score}</span>
                          </div>
                          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              style={{ width: `${item.barPercent}%` }}
                              className="h-full rounded-full bg-primary transition-all duration-500"
                            />
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">{item.note}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === "verdict" && (
                    <div className="space-y-4 rounded-2xl border border-success/30 bg-success-subtle/60 p-5">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-bold text-foreground">
                            Siddharth R. • Staff Distributed Systems Engineer
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Ex-Cloud Infrastructure Lead • 114 Capstones Graded
                          </div>
                        </div>
                        <span className="rounded-full bg-success px-3 py-1 text-xs font-bold text-success-foreground">
                          STRONG HIRE SIGNAL (L5 BAR)
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-foreground/90 italic">
                        &ldquo;Candidate independently architected split-brain fencing
                        tokens and defended snapshot installation trade-offs during our
                        live 25-minute oral examination. Exceeds our internal L5 systems
                        design hiring bar.&rdquo;
                      </p>
                    </div>
                  )}

                  {activeTab === "digest" && (
                    <div className="space-y-3 rounded-2xl border border-border bg-ink p-5 font-mono text-xs text-ink-foreground">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2 text-[11px] text-ink-muted">
                        <span>IMMUTABLE ARTIFACT VERIFICATION RECORD</span>
                        <span className="text-emerald-400">TAMPER-PROOF</span>
                      </div>
                      <div className="space-y-1.5 break-all">
                        <div>
                          <span className="text-ink-muted">Credential Slug: </span>
                          <span className="text-primary">ELL-2026-DEMO</span>
                        </div>
                        <div>
                          <span className="text-ink-muted">Artifact SHA-256: </span>
                          <span>
                            e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
                          </span>
                        </div>
                        <div>
                          <span className="text-ink-muted">Escrow Release State: </span>
                          <span className="text-emerald-400">
                            SIGNED OFF BY STAFF MENTOR • VERIFIED
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Footer Verification Bar */}
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-xs">
                    <span className="text-muted-foreground">
                      Public URL:{" "}
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">
                        elluminar.com/verify/ELL-2026-DEMO
                      </code>
                    </span>

                    <Link
                      href="/verify/ELL-2026-DEMO"
                      className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
                    >
                      Verify Live Record
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
}

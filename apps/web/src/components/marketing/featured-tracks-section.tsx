import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  Cpu,
  Flame,
  LineChart,
  ShieldCheck,
  Users,
} from "lucide-react";
import { calculateIndiaGstBreakdown, EDTECH_SAC_CODE } from "@elluminar/domain-commerce";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/fade-in";
import { cn } from "@/lib/utils";

function formatInrFromMinor(amountMinor: bigint): string {
  const rupees = Number(amountMinor) / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

interface RoleTrackItem {
  id: string;
  title: string;
  subtitle: string;
  domain: string;
  icon: typeof Cpu;
  tuitionMinor: bigint;
  seatsRemaining: number;
  cohortBatch: string;
  durationWeeks: number;
  creditsLabel: string;
  deliverables: string[];
  primaryHref: string;
  primaryCta: string;
  featured?: boolean;
}

const ROLE_TRACKS: RoleTrackItem[] = [
  {
    id: "distributed-systems-capstone",
    title: "Distributed Systems & Raft Engine",
    subtitle:
      "Design and implement a fault-tolerant Raft consensus engine, WAL log compaction, and linearizable read routing under simulated network partitions.",
    domain: "L5/L6 Systems Architecture",
    icon: Cpu,
    tuitionMinor: 2499900n,
    seatsRemaining: 4,
    cohortBatch: "October Batch",
    durationWeeks: 6,
    creditsLabel: "16 NEP 2020 Honours Credits",
    deliverables: [
      "Leader Election & Split-Brain Fencing Topology",
      "Crash-Consistent Write-Ahead Log & Compaction Engine",
      "24kbps Staff Engineer Review + 25-Min Oral Defense",
    ],
    primaryHref: "/learn/course/distributed-systems-capstone",
    primaryCta: "Inspect Track & Syllabus",
    featured: true,
  },
  {
    id: "production-agentic-rag",
    title: "Production Agentic RAG & Guardrails",
    subtitle:
      "Build deterministic multi-agent retrieval pipelines with hybrid reranking, PII redaction guardrails, semantic caching, and sub-300ms latency SLAs.",
    domain: "Applied AI Systems",
    icon: Bot,
    tuitionMinor: 2299900n,
    seatsRemaining: 6,
    cohortBatch: "October Batch",
    durationWeeks: 6,
    creditsLabel: "16 NEP 2020 Honours Credits",
    deliverables: [
      "Hybrid Dense/BM25 Retriever & Cross-Encoder Reranker",
      "Real-Time Hallucination & PII Guardrail Evaluation Suite",
      "Principal AI Architect Voice-over-Canvas Sign-Off",
    ],
    primaryHref: "/explore",
    primaryCta: "Reserve Cohort Seat",
  },
  {
    id: "venture-capital-dcf-modeling",
    title: "Venture Capital & Series B DCF Modeling",
    subtitle:
      "Construct institutional SaaS cohort unit economics, multi-scenario Series B cap table waterfalls, and 3-statement DCF models defended before growth equity principals.",
    domain: "Institutional Finance",
    icon: LineChart,
    tuitionMinor: 1999900n,
    seatsRemaining: 5,
    cohortBatch: "November Batch",
    durationWeeks: 5,
    creditsLabel: "14 NEP 2020 Honours Credits",
    deliverables: [
      "Multi-Scenario ARR Cohort Retention & Burn Multiple Model",
      "Liquidation Preference & Anti-Dilution Waterfall Schedule",
      "Live Investment Committee Oral Defense & Credential",
    ],
    primaryHref: "/explore",
    primaryCta: "Reserve Cohort Seat",
  },
];

export function FeaturedTracksSection() {
  return (
    <section
      id="tracks"
      className="w-full border-b border-border/60 bg-card/50 py-16 md:py-24 lg:py-28"
    >
      <div className="container">
        {/* Header Row */}
        <FadeIn direction="up">
          <div className="mb-14 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl space-y-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-subtle px-3.5 py-1 text-xs font-bold tracking-wider text-primary-subtle-foreground uppercase">
                <Flame className="size-3.5 text-primary" />
                Featured Role Tracks &amp; Hybrid Cohorts
              </span>
              <h2 className="font-display text-3xl leading-tight font-medium tracking-tight text-foreground sm:text-4xl md:text-5xl">
                Outcome-backed sprints built for{" "}
                <span className="text-primary italic">high-trust</span> roles
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                render={<Link href="/explore" />}
                className="rounded-full px-5 font-semibold"
              >
                Browse Full Outcome Catalog
                <ArrowRight className="ml-1.5 size-4" />
              </Button>
            </div>
          </div>
        </FadeIn>

        {/* 3 Flagship Track Cards */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {ROLE_TRACKS.map((track, idx) => {
            const Icon = track.icon;
            const gstQuote = calculateIndiaGstBreakdown({
              taxableAmountMinor: track.tuitionMinor,
              supplierStateCode: "29",
              buyerStateCode: "29",
            });

            return (
              <FadeIn key={track.id} direction="up" delay={0.08 * idx}>
                <div
                  className={cn(
                    "relative flex h-full flex-col justify-between rounded-3xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-7",
                    track.featured
                      ? "border-2 border-primary bg-card shadow-lg shadow-primary/10"
                      : "border-border bg-card shadow-2xs"
                  )}
                >
                  <div>
                    {/* Scarcity & Domain Badges */}
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-subtle px-3 py-1 text-xs font-bold text-primary-subtle-foreground">
                        <Icon className="size-3.5 text-primary" />
                        {track.domain}
                      </span>

                      <span className="inline-flex items-center gap-1 rounded-full border border-distinction/30 bg-distinction-subtle px-2.5 py-0.5 text-[11px] font-bold text-distinction-subtle-foreground">
                        <Users className="size-3" />
                        Only {track.seatsRemaining} Seats Left • {track.cohortBatch}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <h3 className="font-display text-2xl font-semibold tracking-tight text-foreground">
                      {track.title}
                    </h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                      {track.subtitle}
                    </p>

                    {/* Duration & Credit Metadata */}
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3.5 text-primary" />
                        {track.durationWeeks} Weeks Hybrid
                      </span>
                      <span>•</span>
                      <span>{track.creditsLabel}</span>
                    </div>

                    {/* Key Deliverables */}
                    <div className="mt-5 space-y-2 border-t border-border/70 pt-4">
                      <div className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                        Verified Artifacts You Ship
                      </div>
                      <ul className="space-y-2">
                        {track.deliverables.map((item) => (
                          <li
                            key={item}
                            className="flex items-start gap-2 text-xs leading-snug text-foreground/90"
                          >
                            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Pricing & Action Footer */}
                  <div className="mt-6 border-t border-border pt-5">
                    <div className="flex items-baseline justify-between gap-2">
                      <div>
                        <div className="text-2xl font-extrabold tracking-tight text-foreground">
                          {formatInrFromMinor(track.tuitionMinor)}
                          <span className="ml-1 text-xs font-semibold text-muted-foreground">
                            + 18% GST ({formatInrFromMinor(gstQuote.totalTaxMinor)})
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-success">
                          <ShieldCheck className="size-3.5" />
                          <span>
                            Protected Milestone Escrow • SAC {EDTECH_SAC_CODE} Invoice
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2">
                      <Button
                        size="lg"
                        variant={track.featured ? "default" : "outline"}
                        render={<Link href={track.primaryHref} />}
                        className="w-full justify-center rounded-full font-semibold"
                      >
                        {track.primaryCta}
                        <ArrowRight className="ml-1.5 size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}

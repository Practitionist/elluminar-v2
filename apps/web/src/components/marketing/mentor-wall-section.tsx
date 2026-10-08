import Link from "next/link";
import { ArrowRight, CheckCircle2, Mic, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/fade-in";

const FACULTY_MENTORS = [
  {
    initials: "SR",
    name: "Siddharth R.",
    role: "Staff Distributed Systems Engineer",
    affiliation: "Hyperscale Cloud Storage Infra",
    specialty: "Raft Consensus, WAL & Distributed KV Engines",
    signOffCount: "114 Capstones Signed Off",
    turnaround: "Avg 4.8 hr Voice-over-Canvas Review",
  },
  {
    initials: "AM",
    name: "Ananya M.",
    role: "Principal AI Systems Architect",
    affiliation: "Frontier Enterprise AI Lab",
    specialty: "Multi-Agent RAG, Rerankers & Latency Guardrails",
    signOffCount: "92 Capstones Signed Off",
    turnaround: "Avg 5.2 hr Voice-over-Canvas Review",
  },
  {
    initials: "VK",
    name: "Vikramaditya K.",
    role: "Principal Payments Infrastructure Lead",
    affiliation: "High-Throughput FinTech Core",
    specialty: "Idempotent Ledgers & High-Concurrency APIs",
    signOffCount: "138 Capstones Signed Off",
    turnaround: "Avg 5.0 hr Voice-over-Canvas Review",
  },
  {
    initials: "RN",
    name: "Rohan N.",
    role: "Vice President — Growth Equity",
    affiliation: "B2B SaaS & DeepTech Fund",
    specialty: "Series B DCF Waterfalls & Cohort Unit Economics",
    signOffCount: "76 Capstones Signed Off",
    turnaround: "Avg 5.6 hr Voice-over-Canvas Review",
  },
] as const;

export function MentorWallSection() {
  return (
    <section
      id="mentors"
      className="w-full border-b border-border/60 bg-card/40 py-16 md:py-24 lg:py-28"
    >
      <div className="container">
        {/* Heading + Mentor Cockpit CTA */}
        <FadeIn direction="up">
          <div className="mb-14 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl space-y-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-info/25 bg-info-subtle px-3.5 py-1 text-xs font-bold tracking-wider text-info-subtle-foreground uppercase">
                <Mic className="size-3.5 text-info" />
                Staff &amp; Principal Mentor Wall
              </span>
              <h2 className="font-display text-3xl leading-tight font-medium tracking-tight text-foreground sm:text-4xl md:text-5xl">
                Graded by practitioners whose{" "}
                <span className="text-primary italic">reputation</span> is on your
                verdict
              </h2>
              <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
                Every capstone is reviewed asynchronously via 24kbps Voice-over-Canvas and
                defended live before active Staff Engineers, Principal Architects, and
                Growth Equity investors.
              </p>
            </div>

            <Button
              variant="outline"
              render={<Link href="/mentor/demo" />}
              className="rounded-full px-5 font-semibold"
            >
              Inspect Mentor Review Cockpit
              <ArrowRight className="ml-1.5 size-4" />
            </Button>
          </div>
        </FadeIn>

        {/* 4 Mentor Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FACULTY_MENTORS.map((mentor, idx) => (
            <FadeIn key={mentor.name} direction="up" delay={0.07 * idx}>
              <Link
                href="/mentor/demo"
                className="group flex h-full flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-2xs transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
              >
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-subtle font-display text-lg font-bold text-primary-subtle-foreground">
                      {mentor.initials}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-success-subtle px-2.5 py-0.5 text-[11px] font-bold text-success-subtle-foreground">
                      <ShieldCheck className="size-3 text-success" />
                      Verified Faculty
                    </span>
                  </div>

                  <h3 className="font-display text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                    {mentor.name}
                  </h3>
                  <div className="mt-0.5 text-xs font-bold text-foreground/85">
                    {mentor.role}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {mentor.affiliation}
                  </div>

                  <div className="mt-4 rounded-xl bg-muted/60 p-3 text-xs leading-snug text-foreground/90">
                    <span className="font-semibold text-muted-foreground block mb-1">
                      Review Focus:
                    </span>
                    {mentor.specialty}
                  </div>
                </div>

                <div className="mt-5 space-y-1.5 border-t border-border/70 pt-3.5 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-success">
                    <CheckCircle2 className="size-3.5 shrink-0" />
                    <span>{mentor.signOffCount}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {mentor.turnaround}
                  </div>
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

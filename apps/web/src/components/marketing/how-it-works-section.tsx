import Link from "next/link";
import {
  ArrowRight,
  Award,
  BrainCircuit,
  Code2,
  Mic,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/fade-in";
import { cn } from "@/lib/utils";

const MASTERY_STEPS = [
  {
    stepNumber: "01",
    badge: "3-Pane Work Artifact Studio",
    title: "Build Real Artifacts",
    description:
      "Architect distributed storage engines, multi-agent RAG guardrails, or Series B valuation models inside our unified canvas, code sandbox, and financial formula studio.",
    icon: Code2,
    toneClass: "bg-primary-subtle text-primary-subtle-foreground border-primary/20",
  },
  {
    stepNumber: "02",
    badge: "Pre-Review Diagnostic",
    title: "5-Min AI Socratic Critique",
    description:
      "Receive instant Socratic questioning mapped against the public capstone rubric—identifying single points of failure, missing edge cases, and unstated assumptions.",
    icon: BrainCircuit,
    toneClass: "bg-info-subtle text-info-subtle-foreground border-info/20",
  },
  {
    stepNumber: "03",
    badge: "Async Practitioner Deep-Dive",
    title: "24kbps Voice-over-Canvas Staff Engineer Review",
    description:
      "A vetted Staff or Principal Engineer records a synchronized voice and laser-pointer walkthrough directly over your topology diagram and codebase within 6 hours.",
    icon: Mic,
    toneClass:
      "bg-distinction-subtle text-distinction-subtle-foreground border-distinction/20",
  },
  {
    stepNumber: "04",
    badge: "Escrow Milestone Unlock",
    title: "Live Oral Defense & Verified Credential",
    description:
      "Defend your architectural trade-offs live. Once your mentor signs off on the rubric, your Protected Milestone Escrow unlocks and your SHA-256 credential goes live.",
    icon: Award,
    toneClass: "bg-success-subtle text-success-subtle-foreground border-success/20",
  },
] as const;

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="w-full border-b border-border/60 bg-background py-16 md:py-24 lg:py-28"
    >
      <div className="container">
        {/* Section Heading */}
        <FadeIn direction="up">
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-subtle px-3.5 py-1 text-xs font-bold tracking-wider text-primary-subtle-foreground uppercase">
              How Applied Mastery Works
            </span>
            <h2 className="mt-4 font-display text-3xl leading-tight font-medium tracking-tight text-foreground sm:text-4xl md:text-5xl">
              Four rigorous steps from{" "}
              <span className="text-primary italic">blank canvas</span> to
              verified proof
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Every sprint mirrors a real L5/L6 engineering design review or investment
              committee defense—combining rapid Socratic feedback with human practitioner
              sign-off.
            </p>
          </div>
        </FadeIn>

        {/* 4-Step Progression Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {MASTERY_STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <FadeIn key={step.stepNumber} direction="up" delay={0.08 * index}>
                <div className="flex h-full flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-2xs transition-all duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-lg">
                  <div>
                    <div className="mb-5 flex items-center justify-between">
                      <span
                        className={cn(
                          "inline-flex size-11 items-center justify-center rounded-2xl border text-base font-extrabold",
                          step.toneClass
                        )}
                      >
                        {step.stepNumber}
                      </span>
                      <Icon className="size-6 text-muted-foreground" />
                    </div>

                    <div className="mb-2 text-[11px] font-bold tracking-wider text-primary uppercase">
                      {step.badge}
                    </div>

                    <h3 className="mb-3 font-display text-xl font-semibold text-foreground">
                      {step.title}
                    </h3>

                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                  </div>

                  {index < MASTERY_STEPS.length - 1 ? (
                    <div className="mt-6 flex items-center gap-1.5 border-t border-border/60 pt-3 text-xs font-semibold text-muted-foreground">
                      <span>Advances to Step 0{index + 2}</span>
                      <ArrowRight className="size-3.5 text-primary" />
                    </div>
                  ) : (
                    <div className="mt-6 flex items-center gap-1.5 border-t border-border/60 pt-3 text-xs font-bold text-success">
                      <ShieldCheck className="size-4" />
                      <span>Public SHA-256 Credential Issued</span>
                    </div>
                  )}
                </div>
              </FadeIn>
            );
          })}
        </div>

        {/* Bottom Protected Escrow Assurance Strip */}
        <FadeIn direction="up" delay={0.2}>
          <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-3xl border border-border bg-card p-6 sm:flex-row sm:px-8">
            <div className="flex items-start gap-3.5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success-subtle text-success">
                <ShieldCheck className="size-5" />
              </span>
              <div>
                <div className="text-sm font-bold text-foreground">
                  Zero-Risk Protected Milestone Escrow
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  &ldquo;Your tuition is locked until a Staff Engineer reviews your
                  architecture and signs off on your defense.&rdquo;
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              render={<Link href="/studio/demo" />}
              className="shrink-0 rounded-full px-5 font-semibold"
            >
              Try the Artifact Studio
              <ArrowRight className="ml-1.5 size-4" />
            </Button>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

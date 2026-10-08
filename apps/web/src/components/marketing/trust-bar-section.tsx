import { Award, Building2, CheckCircle2, GraduationCap, ShieldCheck } from "lucide-react";
import { FadeIn } from "@/components/ui/fade-in";

const PLATFORM_METRICS = [
  {
    value: "89%",
    label: "Cohort Defense Completion",
    comparison: "vs. 14% Async Industry Avg",
  },
  {
    value: "5.4 hrs",
    label: "Median Staff Engineer Review",
    comparison: "24kbps Voice-over-Canvas",
  },
  {
    value: "14–20",
    label: "NEP 2020 Honours Credits",
    comparison: "AICTE & Autonomous University Ready",
  },
  {
    value: "100%",
    label: "Protected Milestone Escrow",
    comparison: "Released Only After Defense Sign-Off",
  },
] as const;

const INSTITUTIONAL_BADGES = [
  {
    category: "Enterprise GCC Partners",
    icon: Building2,
    items: [
      "Cloud Infrastructure GCCs (Bengaluru)",
      "Global FinTech & Payments Engineering",
      "Frontier Enterprise AI Labs (Hyderabad)",
      "Series B–D Product Engineering Teams",
    ],
  },
  {
    category: "Academic & Regulatory Alignment",
    icon: GraduationCap,
    items: [
      "NEP 2020 Honours & Minor Credit Framework",
      "AICTE Model Internship & Capstone Rubric",
      "Autonomous Engineering Institutions",
      "Public SHA-256 Employer Verification Standard",
    ],
  },
] as const;

export function TrustBarSection() {
  return (
    <section
      aria-label="Platform Completion Outcomes and Institutional Partners"
      className="w-full border-b border-border/60 bg-card py-12 md:py-16"
    >
      <div className="container">
        {/* Top 4 Outcome Metrics */}
        <FadeIn direction="up">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PLATFORM_METRICS.map((item) => (
              <div
                key={item.label}
                className="flex flex-col justify-between rounded-2xl border border-border/80 bg-background p-5 transition-colors hover:border-primary/30"
              >
                <div>
                  <div className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                    {item.value}
                  </div>
                  <div className="mt-1.5 text-sm font-bold text-foreground">
                    {item.label}
                  </div>
                </div>
                <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-success">
                  <CheckCircle2 className="size-3.5 shrink-0" />
                  <span>{item.comparison}</span>
                </div>
              </div>
            ))}
          </div>
        </FadeIn>

        {/* Bottom Enterprise GCC & AICTE / Autonomous University Trust Strip */}
        <FadeIn direction="up" delay={0.1}>
          <div className="mt-8 grid gap-4 rounded-2xl border border-border/70 bg-muted/40 p-5 lg:grid-cols-2">
            {INSTITUTIONAL_BADGES.map((group) => {
              const Icon = group.icon;
              return (
                <div key={group.category} className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                    <Icon className="size-4 text-primary" />
                    <span>{group.category}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.items.map((badge) => (
                      <span
                        key={badge}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground shadow-2xs"
                      >
                        <ShieldCheck className="size-3.5 text-primary" />
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

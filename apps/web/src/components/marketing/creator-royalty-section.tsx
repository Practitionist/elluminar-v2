"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Coins, Sparkles, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/fade-in";
import { cn } from "@/lib/utils";

const VOLUME_PRESETS = [
  { label: "25 Capstones / Qtr", count: 25 },
  { label: "75 Capstones / Qtr", count: 75 },
  { label: "150 Capstones / Qtr", count: 150 },
] as const;

function formatInr(amountRupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amountRupees);
}

export function CreatorRoyaltySection() {
  const [selectedCount, setSelectedCount] = useState<number>(75);

  const unitTuitionRupees = 24999;
  const directReferralSharePerEnrollment = Math.round(unitTuitionRupees * 0.9);
  const ipRoyaltyPerCapstoneGraded = Math.round(unitTuitionRupees * 0.15);

  // Illustrative mix: 40% creator direct referrals + 60% marketplace enrollments graded by mentor network
  const directReferrals = Math.round(selectedCount * 0.4);
  const networkGradedCapstones = selectedCount - directReferrals;

  const quarterlyDirectEarnings = directReferrals * directReferralSharePerEnrollment;
  const quarterlyPerpetualRoyalties =
    networkGradedCapstones * ipRoyaltyPerCapstoneGraded;
  const totalQuarterlyPayout = quarterlyDirectEarnings + quarterlyPerpetualRoyalties;

  return (
    <section
      id="creators"
      className="w-full border-b border-border/60 bg-ink py-16 text-ink-foreground bg-ink-grid md:py-24 lg:py-28"
    >
      <div className="container">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-12">
          {/* Left Column: Creator & Principal Author Pitch */}
          <div className="space-y-6 lg:col-span-6">
            <FadeIn direction="right">
              <div className="space-y-5">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/20 px-3.5 py-1 text-xs font-bold tracking-wider text-primary uppercase">
                  <Sparkles className="size-3.5" />
                  For Creators &amp; Principal Authors
                </span>

                <h2 className="font-display text-3xl leading-[1.08] font-medium tracking-tight text-ink-foreground sm:text-4xl md:text-5xl">
                  Earn <span className="text-primary italic">90% on Direct Referrals</span>{" "}
                  + 15% Perpetual IP Royalties on Every Capstone Graded
                </h2>

                <p className="text-base leading-relaxed text-ink-muted sm:text-lg">
                  Publish your engineering architecture blueprint, AI evaluation harness,
                  or financial modeling rubric once. Keep 90% of tuition when learners
                  join via your link—and earn an automatic 15% perpetual IP royalty
                  every time our vetted Staff Mentor network grades a capstone on your
                  track.
                </p>

                <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-ink-foreground">
                      <TrendingUp className="size-4 text-primary" />
                      90% Direct Creator Share
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                      Industry-leading creator economics for cohorts enrolled via your
                      direct invitation link.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-ink-foreground">
                      <Coins className="size-4 text-emerald-400" />
                      15% Perpetual IP Royalty
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                      Zero grading bottleneck—vetted peer Staff Mentors grade submissions
                      while your IP earns passively.
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    size="lg"
                    render={<Link href="/studio/creator-demo" />}
                    className="rounded-full px-7 font-semibold shadow-lg"
                  >
                    Launch Creator &amp; Rubric Studio
                    <ArrowRight className="ml-1.5 size-4" />
                  </Button>
                </div>
              </div>
            </FadeIn>
          </div>

          {/* Right Column: Interactive Creator Payout Estimator */}
          <div className="lg:col-span-6">
            <FadeIn direction="left" delay={0.1}>
              <div className="rounded-3xl border border-white/15 bg-ink-deep p-6 shadow-2xl sm:p-8">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
                  <div>
                    <div className="text-xs font-bold tracking-wider text-primary uppercase">
                      Interactive Author Economics Simulator
                    </div>
                    <h3 className="mt-1 font-display text-xl font-semibold text-ink-foreground">
                      Quarterly Creator &amp; IP Royalty Projection
                    </h3>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-ink-foreground">
                    <Users className="size-3.5 text-primary" />
                    {selectedCount} Enrollments
                  </span>
                </div>

                {/* Preset Volume Switcher */}
                <div className="mb-6 grid grid-cols-3 gap-2">
                  {VOLUME_PRESETS.map((preset) => {
                    const active = selectedCount === preset.count;
                    return (
                      <button
                        key={preset.count}
                        type="button"
                        onClick={() => setSelectedCount(preset.count)}
                        className={cn(
                          "cursor-pointer rounded-xl border px-3 py-2 text-xs font-bold transition-all",
                          active
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-white/10 bg-white/5 text-ink-muted hover:bg-white/10 hover:text-ink-foreground"
                        )}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                {/* Breakdown Rows */}
                <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink-muted">
                      Direct Referrals ({directReferrals} learners × 90% share)
                    </span>
                    <span className="font-mono font-bold text-ink-foreground">
                      {formatInr(quarterlyDirectEarnings)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink-muted">
                      Perpetual IP Royalties ({networkGradedCapstones} network-graded × 15%)
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      + {formatInr(quarterlyPerpetualRoyalties)}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between border-t border-white/10 pt-3">
                    <span className="text-sm font-bold text-ink-foreground">
                      Estimated Quarterly Author Payout
                    </span>
                    <span className="font-display text-3xl font-bold text-primary">
                      {formatInr(totalQuarterlyPayout)}
                    </span>
                  </div>
                </div>

                <p className="mt-4 text-xs text-ink-muted">
                  Automated milestone payouts settle directly to your bank account as soon
                  as each learner&apos;s oral defense is signed off.
                </p>
              </div>
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
}

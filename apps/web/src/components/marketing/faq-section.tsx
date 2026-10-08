"use client";

import Link from "next/link";
import { ArrowRight, HelpCircle, ShieldCheck } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/fade-in";

const FAQ_ITEMS = [
  {
    value: "escrow-guarantee",
    question: "How does Protected Milestone Escrow protect my tuition?",
    answer:
      "When you enroll in a hybrid cohort or capstone sprint, your tuition is held in Protected Milestone Escrow. It is never released prematurely—your tuition stays locked until a vetted Staff Engineer reviews your architecture via 24kbps Voice-over-Canvas and signs off on your live oral defense.",
  },
  {
    value: "voice-over-canvas",
    question:
      "What is a 24kbps Voice-over-Canvas Staff Engineer Review compared to a regular code review?",
    answer:
      "Instead of static text comments, your reviewing Staff Engineer records a synchronized voice walkthrough with live laser-pointer annotations directly over your system design canvas, Python/Rust codebase, or DCF financial model—explaining exact failure modes, concurrency edge cases, and L5/L6 hiring trade-offs.",
  },
  {
    value: "nep-2020-credits",
    question:
      "How do autonomous universities map Elluminar capstones to 14–20 NEP 2020 Honours credits?",
    answer:
      "Our Institutional Portal generates a print-ready NEP 2020 & AICTE Compliance Dossier detailing contact hours, rubric assessment weights, external industry examiner sign-offs, and immutable SHA-256 artifact digests—allowing Board of Studies committees to approve 14–20 Honours or Major project credits seamlessly.",
  },
  {
    value: "gst-invoicing",
    question:
      "Do corporate GCCs and learners receive compliant 18% GST Tax Invoices (SAC 999293)?",
    answer:
      "Yes. Every B2C and B2B purchase automatically issues a compliant India GST Tax Invoice under SAC 999293 (Commercial Training & Coaching), accurately computing 9% CGST + 9% SGST for Karnataka intra-state supply or 18% IGST for inter-state corporate GSTIN procurement.",
  },
  {
    value: "creator-royalties",
    question:
      "How do Principal Authors earn 90% on direct referrals and 15% perpetual IP royalties?",
    answer:
      "When learners enroll through your direct invitation link, you receive 90% of net tuition. Whenever learners enroll through the marketplace or enterprise cohorts and have their capstones graded by our peer Staff Mentor network, you automatically earn a 15% perpetual IP royalty on every capstone signed off.",
  },
] as const;

export function FaqSection() {
  return (
    <section
      id="faq"
      className="w-full bg-background py-16 md:py-24 lg:py-28"
    >
      <div className="container">
        <div className="grid items-start gap-12 lg:grid-cols-12 lg:gap-12">
          {/* Left Column: Editorial FAQ Header */}
          <div className="space-y-5 lg:col-span-5">
            <FadeIn direction="up">
              <div className="space-y-4">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-subtle px-3.5 py-1 text-xs font-bold tracking-wider text-primary-subtle-foreground uppercase">
                  <HelpCircle className="size-3.5 text-primary" />
                  Frequently Asked Questions
                </span>

                <h2 className="font-display text-3xl leading-tight font-medium tracking-tight text-foreground sm:text-4xl md:text-5xl">
                  Clear answers on{" "}
                  <span className="text-primary italic">escrow, credits</span> &amp;
                  procurement
                </h2>

                <p className="text-base leading-relaxed text-muted-foreground">
                  Everything learners, engineering leaders, university deans, and
                  principal creators need to know before starting a cohort.
                </p>
              </div>
            </FadeIn>
          </div>

          {/* Right Column: Accessible @base-ui/react Accordion */}
          <div className="lg:col-span-7">
            <FadeIn direction="up" delay={0.1}>
              <div className="rounded-3xl border border-border bg-card p-6 shadow-2xs sm:p-8">
                <Accordion defaultValue={["escrow-guarantee"]}>
                  {FAQ_ITEMS.map((item) => (
                    <AccordionItem
                      key={item.value}
                      value={item.value}
                      className="border-border/70 py-1"
                    >
                      <AccordionTrigger className="py-3.5 text-base font-semibold text-foreground hover:no-underline hover:text-primary">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="pb-4 text-sm leading-relaxed text-muted-foreground">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </FadeIn>
          </div>
        </div>

        {/* High-Contrast Closing Commercial CTA Banner */}
        <FadeIn direction="up" delay={0.15}>
          <div className="mt-16 overflow-hidden rounded-3xl border border-border bg-ink p-8 text-ink-foreground shadow-2xl bg-ink-grid sm:p-12">
            <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
              <div className="max-w-2xl space-y-3">
                <div className="inline-flex items-center gap-2 text-xs font-bold tracking-wider text-primary uppercase">
                  <ShieldCheck className="size-4" />
                  Live Cohort — Only 4 Seats Left for October Batch • Reserve Your Seat
                </div>
                <h2 className="font-display text-3xl leading-tight font-medium text-ink-foreground sm:text-4xl">
                  Ready to replace passive certificates with{" "}
                  <span className="text-primary italic">cryptographic proof</span>?
                </h2>
                <p className="text-sm leading-relaxed text-ink-muted sm:text-base">
                  Your tuition is locked until a Staff Engineer reviews your
                  architecture and signs off on your defense.
                </p>
              </div>

              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <Button
                  size="lg"
                  render={<Link href="/explore" />}
                  className="h-11 rounded-full px-7 font-semibold shadow-lg"
                >
                  Reserve Your Seat
                  <ArrowRight className="ml-1.5 size-4" />
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  render={<Link href="/org/dossier-demo" />}
                  className="h-11 rounded-full border-white/20 bg-white/10 px-6 font-semibold text-ink-foreground hover:bg-white/20 hover:text-ink-foreground"
                >
                  B2B &amp; University Dossier
                </Button>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

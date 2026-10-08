"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Award,
  CheckCircle2,
  Clock,
  Layers,
  Mic,
  Radio,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { reserveCohortSeatCas } from "@elluminar/domain-commerce";
import {
  STOREFRONT_CATALOG_SKUS,
  type DeliveryMode,
} from "../../../../components/storefront/CheckoutQuoteDrawer";
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
import { Separator } from "@/components/ui/separator";

interface CurriculumLesson {
  id: string;
  sectionTitle: string;
  title: string;
  durationMinutes: number;
  artifactMilestoneType: "SYSTEM_TOPOLOGY" | "PYTHON_WASM_AST" | "VOICE_CANVAS_DEFENSE";
  milestoneLabel: string;
  summary: string;
  invariantSpec: string;
}

const CURRICULUM_LESSONS: CurriculumLesson[] = [
  {
    id: "mod-1-quorum-topology",
    sectionTitle: "Module 1 · Architecture & Invariant Specification",
    title: "1.1 Designing Linearizable Read/Write Quorums & Split-Brain Guards",
    durationMinutes: 42,
    artifactMilestoneType: "SYSTEM_TOPOLOGY",
    milestoneLabel: "System Topology Blueprint",
    summary:
      "Construct multi-region leader election topologies in the Excalidraw System Stencil Canvas and validate quorum intersection guarantees under regional network partitions.",
    invariantSpec:
      "Automated topology audit verifies zero single-point-of-failure edges across three availability zones.",
  },
  {
    id: "mod-2-ast-verifier",
    sectionTitle: "Module 2 · Deterministic Execution & Static Analysis",
    title: "2.1 Implementing WAL Log Compaction & Hybrid Citation Grounding",
    durationMinutes: 55,
    artifactMilestoneType: "PYTHON_WASM_AST",
    milestoneLabel: "Python WASM & AST Gate",
    summary:
      "Execute Python WASM benchmarks directly in-browser with deterministic AST verification ensuring sub-350ms tail latency and reproducible execution.",
    invariantSpec:
      "In-browser verification gate confirms p99 latency under 350ms with zero ungrounded citations.",
  },
  {
    id: "mod-3-oral-defense",
    sectionTitle: "Module 3 · Staff Engineer Viva-Voce & Escrow Release",
    title: "3.1 60fps Voice-over-Canvas Oral Defense & Rubric Sign-Off",
    durationMinutes: 35,
    artifactMilestoneType: "VOICE_CANVAS_DEFENSE",
    milestoneLabel: "Staff Engineer Oral Defense",
    summary:
      "Submit your completed engineering and financial artifact bundle for an asynchronous 5–8 minute Staff Engineer review with 24kbps Opus audio and 60fps pointer annotations.",
    invariantSpec:
      "Verified rubric pass issues your SHA-256 signed public credential and releases mentor escrow.",
  },
];

export default function HybridCourseCohortPlayerPage() {
  const params = useParams<{ slug?: string }>();
  const slug =
    typeof params?.slug === "string"
      ? params.slug
      : "production-agentic-rag-evals";

  const matchedCourse = useMemo(() => {
    return (
      STOREFRONT_CATALOG_SKUS.find((item) => item.slug === slug) ??
      STOREFRONT_CATALOG_SKUS[1]!
    );
  }, [slug]);

  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>(
    matchedCourse.deliveryMode
  );
  const [activeLessonId, setActiveLessonId] = useState<string>(
    CURRICULUM_LESSONS[0]!.id
  );
  const [cohortSnapshot, setCohortSnapshot] = useState({
    id: `cohort-${matchedCourse.slug}-oct26`,
    courseId: matchedCourse.id,
    capacity: matchedCourse.seatTelemetry?.capacity ?? 30,
    enrolledCount: matchedCourse.seatTelemetry?.enrolled ?? 26,
    status: "ACTIVE" as const,
    version: matchedCourse.seatTelemetry?.casVersion ?? 14,
  });
  const [seatReservationNotice, setSeatReservationNotice] = useState<
    string | null
  >(null);

  const activeLesson =
    CURRICULUM_LESSONS.find((l) => l.id === activeLessonId) ??
    CURRICULUM_LESSONS[0]!;

  const remainingSeats = Math.max(
    0,
    cohortSnapshot.capacity - cohortSnapshot.enrolledCount
  );
  const fillPercent = Math.min(
    100,
    Math.round((cohortSnapshot.enrolledCount / cohortSnapshot.capacity) * 100)
  );

  function handleReserveCohortSeat() {
    const mutableCopy = { ...cohortSnapshot };
    const result = reserveCohortSeatCas({
      cohort: mutableCopy,
      expectedVersion: cohortSnapshot.version,
      quantity: 1,
    });

    if (result.outcome === "RESERVED") {
      setCohortSnapshot(mutableCopy);
      setSeatReservationNotice(
        `Your seat in the October Cohort has been reserved (${result.remainingSeats} ${
          result.remainingSeats === 1 ? "seat" : "seats"
        } remaining in batch). Launch the Artifact Studio below to begin Module 1.`
      );
    } else {
      setSeatReservationNotice(
        "The October Live Cohort is now at full capacity. Switch to Self-Paced Mastery for immediate enrollment with 48-hour Staff Engineer review guarantees."
      );
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
      {/* Top Navigation & Commercial Delivery Mode Switcher */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" render={<Link href="/explore" />}>
            <ArrowLeft className="mr-1.5 size-3.5" />
            Explore Catalog
          </Button>

          <Badge
            variant="secondary"
            className="bg-primary-subtle font-medium text-primary-subtle-foreground"
          >
            {matchedCourse.domain} · {matchedCourse.credits} NEP Credits
          </Badge>
        </div>

        {/* Mode Switcher: Live Cohort vs Self-Paced Mastery */}
        <div className="inline-flex rounded-xl border border-border bg-card p-1 shadow-xs">
          <Button
            type="button"
            size="sm"
            variant={deliveryMode === "LIVE_COHORT" ? "default" : "ghost"}
            onClick={() => setDeliveryMode("LIVE_COHORT")}
          >
            <Radio className="mr-1.5 size-3.5" />
            Live Cohort with Staff Engineer Reviews
          </Button>
          <Button
            type="button"
            size="sm"
            variant={deliveryMode === "SELF_PACED" ? "default" : "ghost"}
            onClick={() => setDeliveryMode("SELF_PACED")}
          >
            <Zap className="mr-1.5 size-3.5" />
            Self-Paced Mastery
          </Button>
        </div>
      </div>

      {/* Course Header & Live Cohort Seat Reservation Card */}
      <Card className="mb-8 border-border/80 shadow-sm">
        <CardHeader className="pb-5 sm:px-8">
          <div className="space-y-2">
            <h1 className="font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
              {matchedCourse.title}
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Lead Industry Faculty:{" "}
              <strong className="font-semibold text-foreground">
                {matchedCourse.mentorLead}
              </strong>{" "}
              · Verified Proof-of-Work Capstone Track
            </p>
          </div>
        </CardHeader>

        <CardContent className="sm:px-8">
          {deliveryMode === "LIVE_COHORT" ? (
            <div className="rounded-xl border border-primary/25 bg-primary-subtle/40 p-5">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-primary text-primary-foreground">
                      <Users className="mr-1.5 size-3" />
                      Live Cohort — Reserve Your Seat in October Batch
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-distinction/35 bg-distinction-subtle font-medium text-distinction-subtle-foreground"
                    >
                      {remainingSeats === 0
                        ? "Waitlist Open"
                        : `${remainingSeats} of ${cohortSnapshot.capacity} Seats Remaining`}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground sm:text-sm">
                    Includes weekly live architectural architecture clinics, peer design critiques,
                    and guaranteed 24-hour Staff Engineer 24kbps Voice-over-Canvas evaluations.
                  </p>

                  {/* Cohort Seat Progress Bar */}
                  <div className="max-w-md pt-1">
                    <div className="mb-1 flex justify-between text-[11px] font-medium text-muted-foreground">
                      <span>{cohortSnapshot.enrolledCount} Engineers Enrolled</span>
                      <span>Capacity: {cohortSnapshot.capacity}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-background/80 ring-1 ring-border">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${fillPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  <Button
                    type="button"
                    size="lg"
                    disabled={remainingSeats === 0}
                    onClick={handleReserveCohortSeat}
                    className="w-full sm:w-auto"
                  >
                    <Sparkles className="mr-1.5 size-4" />
                    {remainingSeats === 0
                      ? "October Batch Full"
                      : "Reserve Seat in October Batch"}
                  </Button>
                </div>
              </div>

              {seatReservationNotice && (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-success/30 bg-success-subtle px-3.5 py-2.5 text-xs font-medium text-success-subtle-foreground">
                  <CheckCircle2 className="size-4 shrink-0 text-success" />
                  <span>{seatReservationNotice}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-success/30 bg-success-subtle/60 p-5 text-success-subtle-foreground">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-success text-success-foreground">
                  <Zap className="mr-1 size-3" />
                  Self-Paced Mastery Active
                </Badge>
                <span className="text-xs font-semibold">
                  Immediate 3-Pane Studio Access · 48-Hour Staff Engineer Review Guarantee
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-foreground/85 sm:text-sm">
                Progress through all three architectural milestones on your own schedule with
                unlimited Socratic AI architecture critiques and asynchronous 24kbps Opus
                Voice-over-Canvas evaluations from Principal Mentors.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Split Curriculum Syllabus + Active Milestone Workspace */}
      <div className="grid items-start gap-6 lg:grid-cols-12">
        {/* Left Column: Milestone Syllabus Cards */}
        <div className="space-y-3 lg:col-span-5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Milestone Syllabus &amp; Proof-of-Work Gates
            </h2>
            <span className="text-xs text-muted-foreground">3 Checkpoints</span>
          </div>

          <div className="space-y-3">
            {CURRICULUM_LESSONS.map((lesson) => {
              const isSelected = lesson.id === activeLesson.id;
              return (
                <button
                  key={lesson.id}
                  type="button"
                  onClick={() => setActiveLessonId(lesson.id)}
                  className={`w-full rounded-xl border p-4 text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary-subtle/35 shadow-xs ring-1 ring-primary/20"
                      : "border-border bg-card hover:bg-muted/40"
                  }`}
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-primary">
                      {lesson.sectionTitle}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="size-3" />
                      {lesson.durationMinutes} min
                    </span>
                  </div>

                  <div className="text-sm font-semibold leading-snug text-foreground">
                    {lesson.title}
                  </div>

                  <div className="mt-2.5 flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className="text-[11px] font-medium text-muted-foreground"
                    >
                      {lesson.milestoneLabel}
                    </Badge>
                    {isSelected && (
                      <span className="text-xs font-semibold text-primary">
                        Active Milestone →
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Stage: Active Lesson Workspace & Direct Launch into /studio/demo */}
        <Card className="border-border/80 shadow-sm lg:col-span-7">
          <CardHeader className="border-b bg-muted/20 pb-5 sm:px-7">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-primary/30 bg-primary-subtle font-medium text-primary-subtle-foreground"
              >
                <Layers className="mr-1 size-3" />
                {activeLesson.milestoneLabel}
              </Badge>
              <Badge
                variant="outline"
                className="border-distinction/30 bg-distinction-subtle font-medium text-distinction-subtle-foreground"
              >
                <Award className="mr-1 size-3" />
                Required for Credential Sign-Off
              </Badge>
            </div>

            <CardTitle className="mt-2 font-display text-2xl font-medium text-foreground">
              {activeLesson.title}
            </CardTitle>

            <CardDescription className="text-sm leading-relaxed text-muted-foreground">
              {activeLesson.summary}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-6 sm:px-7">
            {/* Automated Verification Gate Box */}
            <div className="rounded-xl border border-success/30 bg-success-subtle/50 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-success-subtle-foreground uppercase">
                <ShieldCheck className="size-4 text-success" />
                Automated Engineering Verification Gate
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-foreground/90 sm:text-sm">
                {activeLesson.invariantSpec}
              </p>
            </div>

            <Separator />

            {/* Commercial Launch Actions into /studio/demo & /mentor/demo */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Launch Interactive Engineering Workspace
              </h3>

              <div className="grid gap-3 sm:grid-cols-2">
                <Card className="border-primary/30 bg-primary-subtle/20 shadow-none">
                  <CardContent className="flex h-full flex-col justify-between gap-4 p-4">
                    <div>
                      <div className="text-xs font-semibold text-primary">
                        3-Pane Artifact Studio
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Open Excalidraw System Stencils, Pyodide Python Sandbox &amp; Unit
                        Economics DCF Model.
                      </p>
                    </div>
                    <Button size="sm" className="w-full" render={<Link href="/studio/demo" />}>
                      Launch Artifact Studio
                      <ArrowUpRight className="ml-1.5 size-3.5" />
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-border bg-muted/20 shadow-none">
                  <CardContent className="flex h-full flex-col justify-between gap-4 p-4">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <Mic className="size-3.5 text-success" />
                        Staff Engineer Cockpit
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Preview synchronized 24kbps Opus Voice-over-Canvas review &amp; rubric
                        scoring.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      render={<Link href="/mentor/demo" />}
                    >
                      Inspect Mentor Review
                      <ArrowUpRight className="ml-1.5 size-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>

          <CardFooter className="border-t bg-muted/30 px-6 py-3.5 text-xs text-muted-foreground sm:px-7">
            All artifact submissions are cryptographically anchored with SHA-256 digests upon rubric completion.
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}

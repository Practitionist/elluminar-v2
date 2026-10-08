"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Award,
  Building2,
  CheckCircle2,
  ExternalLink,
  FileSpreadsheet,
  GraduationCap,
  Landmark,
  Printer,
  ShieldCheck,
} from "lucide-react";
import {
  calculateIndiaGstBreakdown,
  EDTECH_SAC_CODE,
} from "@elluminar/domain-commerce";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CohortRosterEntry {
  rollNo: string;
  studentName: string;
  track: string;
  mentorScore: number;
  artifactSha256: string;
  oralDefenseVerdict: "PASSED_WITH_DISTINCTION" | "PASSED";
  nepCredits: number;
  verificationCode: string;
}

const COHORT_ROSTER: CohortRosterEntry[] = [
  {
    rollNo: "1RV23CS042",
    studentName: "Arjun Nair",
    track: "Distributed FinTech Double-Entry Ledger",
    mentorScore: 90,
    artifactSha256: "9f4e2a7c8b1d...3c91a4",
    oralDefenseVerdict: "PASSED_WITH_DISTINCTION",
    nepCredits: 16,
    verificationCode: "ELM-2026-ARJUN-99",
  },
  {
    rollNo: "1RV23CS088",
    studentName: "Ananya Deshmukh",
    track: "Multi-Region Payment Switch & Idempotent Outbox",
    mentorScore: 94,
    artifactSha256: "4b8c1d09e3a2...71fd08",
    oralDefenseVerdict: "PASSED_WITH_DISTINCTION",
    nepCredits: 16,
    verificationCode: "ELM-2026-ANANYA-94",
  },
  {
    rollNo: "1RV23CS114",
    studentName: "Rohan Kulkarni",
    track: "Cloudflare R2 Zero-Egress Telemetry Pipeline",
    mentorScore: 86,
    artifactSha256: "7d31a5f902c4...e82b19",
    oralDefenseVerdict: "PASSED",
    nepCredits: 16,
    verificationCode: "ELM-2026-ROHAN-86",
  },
  {
    rollNo: "1RV23CS159",
    studentName: "Meera Subramanian",
    track: "B2B SaaS Revenue Recognition & SaaS DCF Engine",
    mentorScore: 91,
    artifactSha256: "2c69e8a14f0b...94ac22",
    oralDefenseVerdict: "PASSED_WITH_DISTINCTION",
    nepCredits: 16,
    verificationCode: "ELM-2026-MEERA-91",
  },
];

export default function UniversityDossierAndGstPortalPage() {
  // Toggle Intra-State (Karnataka 29 -> Karnataka 29) vs Inter-State (Karnataka 29 -> Maharashtra 27)
  const [supplyMode, setSupplyMode] = useState<"INTRA_STATE" | "INTER_STATE">(
    "INTRA_STATE"
  );

  const buyerGstin =
    supplyMode === "INTRA_STATE"
      ? "29AAAJR0942L1Z8" // RV College of Engineering, Bengaluru (State 29 - Karnataka)
      : "27AAATI4128M1Z4"; // IIT Bombay / Enterprise Partner, Mumbai (State 27 - Maharashtra)

  // Batch fee for 120 students @ ₹8,000/student = ₹9,60,000.00 = 96,000,000 paisa
  const taxableCohortFeeMinor = 96000000n;
  const gstBreakdown = calculateIndiaGstBreakdown({
    taxableAmountMinor: taxableCohortFeeMinor,
    supplierStateCode: "29",
    buyerGstin,
  });

  const formatInr = (amountMinor: bigint) =>
    `₹${(Number(amountMinor) / 100).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 print:max-w-none print:bg-white print:p-0 sm:px-6 lg:px-8 lg:py-12">
      {/* Top Institutional Compliance & Print Action Bar (Hidden in Print) */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-xs print:hidden">
        <div className="flex flex-wrap items-center gap-2.5">
          <Badge className="bg-primary-subtle px-3 py-1 font-semibold text-primary-subtle-foreground">
            <GraduationCap className="mr-1.5 size-3.5" />
            NEP 2020 &amp; AICTE Institutional Portal
          </Badge>

          <span className="text-xs font-medium text-muted-foreground">
            GST Place of Supply Regime:
          </span>

          <div className="inline-flex rounded-lg border border-border bg-muted/50 p-1">
            <Button
              type="button"
              size="sm"
              variant={supplyMode === "INTRA_STATE" ? "default" : "ghost"}
              onClick={() => setSupplyMode("INTRA_STATE")}
            >
              Intra-State (KA 29 → KA 29 · CGST 9% + SGST 9%)
            </Button>
            <Button
              type="button"
              size="sm"
              variant={supplyMode === "INTER_STATE" ? "default" : "ghost"}
              onClick={() => setSupplyMode("INTER_STATE")}
            >
              Inter-State (KA 29 → MH 27 · IGST 18%)
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="outline" size="sm" render={<Link href="/mentor/demo" />}>
            Staff Engineer Cockpit
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => window.print()}
            className="bg-success text-success-foreground hover:bg-success/90"
          >
            <Printer className="mr-1.5 size-3.5" />
            Export Official Dossier &amp; GST Invoice (PDF)
          </Button>
        </div>
      </div>

      {/* SECTION 1: AICTE / NEP 2020 14–20 CREDIT ACADEMIC COMPLIANCE DOSSIER */}
      <Card className="mb-8 border-border/80 shadow-sm print:border-border print:bg-white print:shadow-none">
        <CardHeader className="border-b bg-muted/25 pb-6 pt-6 print:bg-white sm:px-8">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-primary/30 bg-primary-subtle font-medium text-primary-subtle-foreground"
                >
                  NAAC Criterion 1.3.4 &amp; AICTE Mandatory Internship Record
                </Badge>
                <Badge
                  variant="outline"
                  className="border-distinction/30 bg-distinction-subtle font-medium text-distinction-subtle-foreground"
                >
                  14–20 Credit NEP 2020 Honours Mapping
                </Badge>
              </div>

              <h1 className="font-display text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
                RV College of Engineering (Autonomous) — B.Tech CSE 8th Semester NEP Capstone
              </h1>

              <p className="text-xs text-muted-foreground sm:text-sm">
                Academic Session: <strong className="text-foreground">AY 2026–27</strong> ·
                Credit Weightage:{" "}
                <strong className="text-foreground">16 NEP Credits (480 Notional Hours)</strong> ·
                Dossier Reference:{" "}
                <span className="font-mono font-semibold text-foreground">
                  DOSSIER-RVCE-2026-Q4
                </span>
              </p>
            </div>

            <Badge className="h-fit bg-success-subtle px-3 py-1.5 text-xs font-semibold text-success-subtle-foreground ring-1 ring-success/30">
              <ShieldCheck className="mr-1.5 size-4 text-success" />
              Audit Verified · Zero Plagiarism
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-8 pt-6 sm:px-8">
          {/* Cohort Batch Summary Strip */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Enrolled Cohort Strength",
                value: "120 Students",
                sub: "8th Semester B.Tech CSE",
              },
              {
                label: "Verified Completion Rate",
                value: "96.7% (116 / 120)",
                sub: "Live Viva-Voce Signed Off",
              },
              {
                label: "Mean Principal Mentor Score",
                value: "90.3 / 100",
                sub: "Evaluated by Industry Guild",
              },
              {
                label: "SHA-256 Anchored Artifacts",
                value: "360 Work Artifacts",
                sub: "Topology · Code · DCF Models",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-border/80 bg-muted/20 p-4 print:bg-white"
              >
                <div className="text-xs font-medium text-muted-foreground">
                  {stat.label}
                </div>
                <div className="mt-1 font-display text-2xl font-semibold text-foreground">
                  {stat.value}
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {stat.sub}
                </div>
              </div>
            ))}
          </div>

          {/* 14–20 Credit NEP 2020 Notional Hours & Escrow Governance Overview */}
          <div className="grid gap-4 rounded-xl border border-border/80 bg-muted/15 p-5 md:grid-cols-3 print:bg-white">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-primary uppercase">
                <FileSpreadsheet className="size-3.5" />
                NEP 2020 Credit Allocation (14–20 Cr)
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                Maps 30 notional hours per credit across architectural design (6 Cr),
                deterministic WASM implementation (6 Cr), and Staff Engineer oral defense (4 Cr).
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-success uppercase">
                <CheckCircle2 className="size-3.5" />
                Protected Milestone Escrow Governance
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                Institutional batch fees are locked in double-entry escrow: 50% Principal Mentor
                payout &amp; 15% Author IP royalty release strictly upon rubric sign-off.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-distinction uppercase">
                <Award className="size-3.5" />
                Permanent Registrar Verification
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                Every student row anchors directly to an immutable SHA-256 digest and synchronized
                24kbps Opus review for NAAC / NBA external peer inspection.
              </p>
            </div>
          </div>

          {/* Verified Student Roster Table */}
          <div className="space-y-3">
            <h2 className="font-display text-lg font-medium text-foreground">
              Verified Student Capstone Roster &amp; Cryptographic Audit Trail
            </h2>

            <div className="rounded-xl border border-border">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="font-semibold">USN / Roll No</TableHead>
                    <TableHead className="font-semibold">Student Name</TableHead>
                    <TableHead className="font-semibold">Applied Capstone Track</TableHead>
                    <TableHead className="font-semibold">Mentor Score</TableHead>
                    <TableHead className="font-semibold">Artifact SHA-256</TableHead>
                    <TableHead className="font-semibold">Viva-Voce Standing</TableHead>
                    <TableHead className="text-right font-semibold">Credential Proof</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {COHORT_ROSTER.map((student) => {
                    const isDistinction =
                      student.oralDefenseVerdict === "PASSED_WITH_DISTINCTION";
                    return (
                      <TableRow key={student.rollNo}>
                        <TableCell className="font-mono text-xs font-semibold">
                          {student.rollNo}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {student.studentName}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {student.track}
                        </TableCell>
                        <TableCell className="font-mono font-bold text-success">
                          {student.mentorScore} / 100
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {student.artifactSha256}
                        </TableCell>
                        <TableCell>
                          {isDistinction ? (
                            <Badge
                              variant="outline"
                              className="border-distinction/35 bg-distinction-subtle font-medium text-distinction-subtle-foreground"
                            >
                              Distinction · {student.nepCredits} Cr
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-success/30 bg-success-subtle font-medium text-success-subtle-foreground"
                            >
                              Passed · {student.nepCredits} Cr
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 font-mono text-xs"
                            render={<Link href={`/verify/${student.verificationCode}`} />}
                          >
                            Verify Record
                            <ExternalLink className="ml-1 size-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2: RULE 46 INDIA B2B GST TAX INVOICE (SAC 999293) */}
      <Card className="border-border/80 shadow-sm print:border-border print:bg-white print:shadow-none">
        <CardHeader className="border-b bg-muted/25 pb-5 pt-6 print:bg-white sm:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Landmark className="size-4 text-distinction" />
                <span className="text-xs font-semibold tracking-wider text-distinction uppercase">
                  Rule 46 CGST Rules · Gapless Sequential Institutional Tax Invoice
                </span>
              </div>

              <CardTitle className="font-display text-2xl font-medium text-foreground">
                Tax Invoice #INV-FY2627-000142 (SAC {EDTECH_SAC_CODE})
              </CardTitle>

              <CardDescription className="text-xs">
                Supplier:{" "}
                <strong className="text-foreground">
                  Elluminar Technologies Pvt. Ltd.
                </strong>{" "}
                · GSTIN:{" "}
                <span className="font-mono font-semibold text-foreground">
                  29AABCE4821K1Z5
                </span>{" "}
                (Bengaluru, Karnataka – State Code 29)
              </CardDescription>
            </div>

            <div className="rounded-xl border border-border bg-background px-4 py-3 text-left sm:text-right print:bg-white">
              <div className="text-xs text-muted-foreground">
                Recipient Institution GSTIN:{" "}
                <span className="font-mono font-semibold text-foreground">
                  {buyerGstin}
                </span>
              </div>
              <div className="mt-1 text-xs font-semibold text-primary">
                {gstBreakdown.isInterState
                  ? "Inter-State Supply · IGST @ 18%"
                  : "Intra-State Supply · CGST 9% + SGST 9%"}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6 sm:px-8">
          <div className="ml-auto max-w-xl space-y-3 rounded-xl border border-border/80 bg-muted/20 p-6 print:bg-white">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Institutional Cohort Mentorship Fee (120 Students × ₹8,000 · SAC{" "}
                {gstBreakdown.sacCode})
              </span>
              <span className="font-mono font-semibold text-foreground">
                {formatInr(gstBreakdown.taxableAmountMinor)}
              </span>
            </div>

            {!gstBreakdown.isInterState ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    CGST @ 9.00% (Central Goods &amp; Services Tax)
                  </span>
                  <span className="font-mono text-foreground">
                    {formatInr(gstBreakdown.cgstAmountMinor)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    SGST @ 9.00% (Karnataka State Goods &amp; Services Tax)
                  </span>
                  <span className="font-mono text-foreground">
                    {formatInr(gstBreakdown.sgstAmountMinor)}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  IGST @ 18.00% (Integrated Goods &amp; Services Tax)
                </span>
                <span className="font-mono text-foreground">
                  {formatInr(gstBreakdown.igstAmountMinor)}
                </span>
              </div>
            )}

            <Separator className="my-2" />

            <div className="flex items-center justify-between pt-1">
              <span className="font-display text-lg font-medium text-foreground">
                Total Institutional Invoice Value (Inclusive of GST)
              </span>
              <span className="font-display text-2xl font-semibold text-success">
                {formatInr(gstBreakdown.totalInvoiceAmountMinor)}
              </span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/30 px-6 py-3.5 text-xs text-muted-foreground print:bg-white sm:px-8">
          <div className="flex items-center gap-1.5">
            <Building2 className="size-3.5 text-primary" />
            Eligible for B2B Input Tax Credit (ITC) under Section 16 of CGST Act · HSN/SAC{" "}
            {EDTECH_SAC_CODE}
          </div>
          <span>Digitally Signed by Elluminar Finance &amp; Registrar Compliance Engine</span>
        </CardFooter>
      </Card>
    </main>
  );
}

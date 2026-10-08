import React from "react";
import Link from "next/link";
import { ShieldCheck, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const FOOTER_COLUMNS = [
  {
    title: "Programs & Capstones",
    links: [
      { label: "Explore All Role Tracks", href: "/explore" },
      {
        label: "Distributed Systems & Raft Engine",
        href: "/learn/course/distributed-systems-capstone",
      },
      {
        label: "3-Pane Work Artifact Studio",
        href: "/studio/demo",
      },
      {
        label: "Public Credential Verifier",
        href: "/verify/ELL-2026-DEMO",
      },
    ],
  },
  {
    title: "Universities & Enterprise GCCs",
    links: [
      {
        label: "NEP 2020 & AICTE Credit Dossiers",
        href: "/org/dossier-demo",
      },
      {
        label: "B2B GST Invoices (SAC 999293)",
        href: "/explore",
      },
      {
        label: "Enterprise OIDC / SAML Single Sign-On",
        href: "/sign-in",
      },
      {
        label: "Staff Mentor Review Cockpit",
        href: "/mentor/demo",
      },
    ],
  },
  {
    title: "Creators & Faculty",
    links: [
      {
        label: "Author Studio (90% Direct + 15% IP Royalty)",
        href: "/studio/creator-demo",
      },
      {
        label: "Become a Staff / Principal Mentor",
        href: "/mentor/demo",
      },
      {
        label: "Protected Milestone Escrow Charter",
        href: "/explore",
      },
      {
        label: "Learner & Corporate Sign In",
        href: "/sign-in",
      },
    ],
  },
] as const;

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-auto overflow-hidden bg-ink text-ink-foreground border-t border-white/10">
      <div className="bg-ink-grid pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative container py-14">
        {/* Top Conversion Banner */}
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-white/10 bg-ink-deep/90 p-8 shadow-xl md:flex-row md:items-center">
          <div className="max-w-xl space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider text-success uppercase">
              <CheckCircle2 className="size-3.5" />
              <span>Protected Milestone Escrow • Verified by Principal Engineers</span>
            </div>
            <h2 className="font-display text-2xl font-medium tracking-tight text-white md:text-3xl">
              Stop collecting attendance badges. Ship verified proof of work.
            </h2>
            <p className="text-sm text-ink-muted">
              Every capstone is defended live and cryptographically signed so hiring managers, university deans, and engineering leaders can verify your work in seconds.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              render={<Link href="/explore" />}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-6"
            >
              Explore Live Cohorts
              <ArrowRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              render={<Link href="/verify/ELL-2026-DEMO" />}
              className="border-white/25 bg-white/5 text-white hover:bg-white/15 hover:text-white"
            >
              Inspect Sample Credential
            </Button>
          </div>
        </div>

        {/* Navigation Columns */}
        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <Link href="/" className="inline-flex items-center gap-2 text-white">
              <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <ShieldCheck className="size-4" />
              </span>
              <span className="font-display text-xl font-semibold tracking-tight">
                elluminar
              </span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-ink-muted">
              Applied engineering, AI systems, and quantitative finance mastery verified by Staff &amp; Principal practitioners across global technology centers.
            </p>
            <div className="pt-1 text-xs font-medium text-ink-muted">
              GST Compliant Education &amp; Assessment Services (`SAC 999293`)
            </div>
          </div>

          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title} className="space-y-3">
              <h3 className="text-xs font-semibold tracking-wider text-white/90 uppercase">
                {col.title}
              </h3>
              <ul className="space-y-2.5 text-sm text-ink-muted">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Legal & Payment Rail Bar */}
        <div className="flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} Elluminar Learning Technologies Pvt. Ltd. · Proof Over Promise
          </p>
          <p>
            UPI · Corporate Cards · B2B Tax Invoices (`CGST/SGST` &amp; `IGST`) · NEP 2020 Credit Ready
          </p>
        </div>
      </div>
    </footer>
  );
}

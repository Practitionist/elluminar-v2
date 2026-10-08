"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  ShieldCheck,
  Sparkles,
  GraduationCap,
  BookOpen,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    label: "Explore Programs",
    href: "/explore",
    icon: BookOpen,
  },
  {
    label: "For Universities (AICTE)",
    href: "/org/dossier-demo",
    icon: GraduationCap,
  },
  {
    label: "For Creators",
    href: "/studio/creator-demo",
    icon: Sparkles,
  },
  {
    label: "Verify Credential",
    href: "/verify/ELL-2026-DEMO",
    icon: ShieldCheck,
  },
] as const;

export function SiteNavbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/85 backdrop-blur-md transition-colors">
      <div className="container flex h-16 items-center justify-between gap-4">
        {/* Brand Wordmark */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="group flex items-center gap-2.5 text-foreground transition-opacity hover:opacity-90"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <ShieldCheck className="size-4.5" />
            </span>
            <div className="flex flex-col">
              <span className="font-display text-xl font-semibold leading-none tracking-tight">
                elluminar
              </span>
              <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                Proof Over Promise
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav
            aria-label="Primary Navigation"
            className="hidden items-center gap-1 lg:flex"
          >
            {NAV_ITEMS.map((item) => {
              const isActive =
                pathname === item.href || pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary-subtle text-primary-subtle-foreground font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-2.5 md:flex">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="default"
            render={<Link href="/sign-in" />}
            className="font-medium text-foreground"
          >
            Sign In
          </Button>
          <Button
            variant="default"
            size="default"
            render={<Link href="/explore" />}
            className="font-semibold shadow-sm"
          >
            Get Started
            <ArrowUpRight className="size-3.5" />
          </Button>
        </div>

        {/* Mobile Actions & Hamburger Drawer */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Open navigation menu"
                />
              }
            >
              <Menu className="size-4" />
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:max-w-sm">
              <SheetHeader className="border-b border-border pb-4 text-left">
                <SheetTitle className="font-display text-lg font-semibold">
                  elluminar
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1.5 p-4">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary-subtle text-primary-subtle-foreground font-semibold"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      <Icon className="size-4 text-primary" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
                <div className="my-3 border-t border-border" />
                <Button
                  variant="outline"
                  size="lg"
                  render={
                    <Link
                      href="/sign-in"
                      onClick={() => setMobileOpen(false)}
                    />
                  }
                  className="w-full justify-center"
                >
                  Sign In (Learner / Corporate SSO)
                </Button>
                <Button
                  variant="default"
                  size="lg"
                  render={
                    <Link
                      href="/explore"
                      onClick={() => setMobileOpen(false)}
                    />
                  }
                  className="w-full justify-center font-semibold"
                >
                  Get Started
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

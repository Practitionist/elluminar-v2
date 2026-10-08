import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const MARKETING_FILES = [
  "src/app/page.tsx",
  "src/components/marketing/index.ts",
  "src/components/marketing/hero-section.tsx",
  "src/components/marketing/trust-bar-section.tsx",
  "src/components/marketing/how-it-works-section.tsx",
  "src/components/marketing/featured-tracks-section.tsx",
  "src/components/marketing/credential-centerpiece-section.tsx",
  "src/components/marketing/mentor-wall-section.tsx",
  "src/components/marketing/creator-royalty-section.tsx",
  "src/components/marketing/pricing-section.tsx",
  "src/components/marketing/faq-section.tsx",
];

const FORBIDDEN_DEV_JARGON = [
  "reserveCohortSeatCas",
  "computeProjectEscrowSplit",
  "SUM(amountMinor) === 0n",
  "Prisma 7.10",
];

describe("Flagship 9-Band Commercial Landing Page Hygiene & Conversion Guards", () => {
  it("contains zero internal developer debug leakage across page.tsx and all marketing bands", () => {
    for (const relPath of MARKETING_FILES) {
      const fullPath = resolve(process.cwd(), relPath);
      const source = readFileSync(fullPath, "utf8");
      for (const token of FORBIDDEN_DEV_JARGON) {
        expect(source, `Found forbidden debug token "${token}" in ${relPath}`).not.toContain(
          token
        );
      }
    }
  });

  it("never uses deprecated asChild on Button across marketing sections", () => {
    for (const relPath of MARKETING_FILES) {
      const fullPath = resolve(process.cwd(), relPath);
      const source = readFileSync(fullPath, "utf8");
      expect(source).not.toContain("asChild");
    }
  });
});

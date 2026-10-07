import { describe, expect, it } from "vitest";
import {
  ArtifactKind,
  CourseDeliveryMode,
  InvoiceDocType,
  LedgerBucket,
  LedgerOwnerType,
  LicenseScope,
  MentoringModality,
  OrganizationType,
} from "../index.js";

describe("@elluminar/db — Generated Prisma Client Enums & Domain Contracts", () => {
  it("exports all core bounded-context enums cleanly", () => {
    expect(OrganizationType.ENTERPRISE).toBe("ENTERPRISE");
    expect(CourseDeliveryMode.LIVE_COHORT).toBe("LIVE_COHORT");
    expect(MentoringModality.TIER_2_CHAT_VOICE_CANVAS).toBe(
      "TIER_2_CHAT_VOICE_CANVAS"
    );
    expect(ArtifactKind.SYSTEM_CANVAS).toBe("SYSTEM_CANVAS");
    expect(LedgerBucket.ESCROW_LOCKED).toBe("ESCROW_LOCKED");
    expect(LedgerOwnerType.MENTOR).toBe("MENTOR");
    expect(InvoiceDocType.TAX_INVOICE).toBe("TAX_INVOICE");
    expect(LicenseScope.ALLOWLIST).toBe("ALLOWLIST");
  });
});

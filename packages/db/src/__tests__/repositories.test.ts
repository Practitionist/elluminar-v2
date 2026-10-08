import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../generated/prisma/client";
import {
  DoubleEntryImbalanceError,
  PrismaAiWalletRepository,
  PrismaCommerceRepository,
  parseServerEnv,
  seedElluminarPlatform,
} from "../index";

describe("parseServerEnv", () => {
  it("degrades gracefully with all capability flags set to false when env is empty", () => {
    const parsed = parseServerEnv({
      DATABASE_URL: "",
      R2_ACCOUNT_ID: "",
      GEMINI_API_KEY: "",
    });

    expect(parsed.hasLiveDatabase).toBe(false);
    expect(parsed.hasCloudflareR2).toBe(false);
    expect(parsed.hasGeminiApi).toBe(false);
    expect(parsed.hasRazorpay).toBe(false);
    expect(parsed.hasUpstashRedis).toBe(false);
    expect(parsed.capabilities).toEqual({
      hasLiveDatabase: false,
      hasCloudflareR2: false,
      hasGeminiApi: false,
      hasRazorpay: false,
      hasUpstashRedis: false,
    });
  });

  it("enables capability flags when valid provider credentials are provided", () => {
    const parsed = parseServerEnv({
      DATABASE_URL:
        "postgresql://postgres:secret@db.ap-south-1.supabase.co:5432/postgres",
      DIRECT_URL:
        "postgresql://postgres:secret@db.ap-south-1.supabase.co:5432/postgres",
      BETTER_AUTH_SECRET: "a-very-secure-32-character-secret-token",
      BETTER_AUTH_URL: "https://app.elluminar.com",
      R2_ACCOUNT_ID: "acct_123456",
      R2_ACCESS_KEY_ID: "r2_key_id",
      R2_SECRET_ACCESS_KEY: "r2_secret_key",
      R2_BUCKET_NAME: "elluminar-v2-artifacts",
      GEMINI_API_KEY: "AIzaSyExampleKey",
      RAZORPAY_KEY_ID: "rzp_live_123",
      RAZORPAY_WEBHOOK_SECRET: "whsec_rzp_456",
      UPSTASH_REDIS_REST_URL: "https://ap1-redis.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "AX1234567890",
    });

    expect(parsed.hasLiveDatabase).toBe(true);
    expect(parsed.hasCloudflareR2).toBe(true);
    expect(parsed.hasGeminiApi).toBe(true);
    expect(parsed.hasRazorpay).toBe(true);
    expect(parsed.hasUpstashRedis).toBe(true);
  });

  it("throws a ZodError when DATABASE_URL is not a valid postgres connection string", () => {
    expect(() =>
      parseServerEnv({
        DATABASE_URL: "mysql://invalid-scheme:3306/db",
      }),
    ).toThrow();
  });
});

describe("PrismaCommerceRepository", () => {
  it("transitions Order status atomically on CAS match (count === 1) and rejects CAS conflicts (count === 0)", async () => {
    const updateManyMock = vi
      .fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    const mockPrisma = {
      $transaction: vi.fn(async (cb) =>
        cb({
          order: { updateMany: updateManyMock },
        }),
      ),
    } as unknown as PrismaClient;

    const repo = new PrismaCommerceRepository(mockPrisma);

    const successResult = await repo.transitionOrderStatusCas(
      "ord_101",
      "PENDING",
      1,
      "PAID",
      { buyerGstin: "29AABCT1234D1Z5" },
    );

    expect(successResult).toEqual({
      transitioned: true,
      rowsUpdated: 1,
      orderId: "ord_101",
      previousStatus: "PENDING",
      status: "PAID",
      previousVersion: 1,
      nextVersion: 2,
    });
    expect(updateManyMock).toHaveBeenCalledWith({
      where: { id: "ord_101", status: "PENDING", version: 1 },
      data: {
        status: "PAID",
        version: { increment: 1 },
        buyerGstin: "29AABCT1234D1Z5",
      },
    });

    const conflictResult = await repo.transitionOrderStatusCas(
      "ord_101",
      "PENDING",
      1,
      "PAID",
    );

    expect(conflictResult).toEqual({
      transitioned: false,
      rowsUpdated: 0,
      orderId: "ord_101",
      expectedStatus: "PENDING",
      expectedVersion: 1,
      targetStatus: "PAID",
    });
  });

  it("enforces seat ceiling on reserveCohortSeatCas and handles concurrent CAS conflicts", async () => {
    const cohortUpdateMany = vi
      .fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    const mockPrisma = {
      $transaction: vi.fn(async (cb) =>
        cb({
          cohort: { updateMany: cohortUpdateMany },
        }),
      ),
    } as unknown as PrismaClient;

    const repo = new PrismaCommerceRepository(mockPrisma);

    // 1. Over-ceiling rejection before hitting DB
    const ceilingExceeded = await repo.reserveCohortSeatCas("coh_1", 25, 25);
    expect(ceilingExceeded).toEqual({
      reserved: false,
      rowsUpdated: 0,
      cohortId: "coh_1",
      enrolledCount: 25,
      maxSeats: 25,
      reason: "SEAT_CEILING_EXCEEDED",
    });
    expect(cohortUpdateMany).not.toHaveBeenCalled();

    // 2. CAS success on last available seat (24 -> 25 of 25)
    const reserved = await repo.reserveCohortSeatCas("coh_1", 24, 25);
    expect(reserved).toEqual({
      reserved: true,
      rowsUpdated: 1,
      cohortId: "coh_1",
      enrolledCount: 25,
      remainingSeats: 0,
    });

    // 3. Concurrent CAS conflict when another buyer grabbed the seat simultaneously
    const conflict = await repo.reserveCohortSeatCas("coh_1", 24, 25);
    expect(conflict).toEqual({
      reserved: false,
      rowsUpdated: 0,
      cohortId: "coh_1",
      enrolledCount: 24,
      maxSeats: 25,
      reason: "CAS_CONFLICT_OR_CAPACITY_MISMATCH",
    });
  });

  it("enforces SUM(entries.amountMinor) === 0n and posts balanced 3-way split journals atomically", async () => {
    const journalCreate = vi.fn().mockResolvedValue({
      id: "jrn_001",
      idempotencyKey: "order:ord_101:escrow_split",
      referenceType: "ORDER",
      referenceId: "ord_101",
      description: "Project 3-way split (50% Mentor / 15% Author / 35% Platform)",
      createdAt: new Date("2026-10-08T00:00:00Z"),
    });
    const entryCreate = vi.fn(async ({ data }) => ({
      id: `ent_${data.accountId}`,
      ...data,
      createdAt: new Date("2026-10-08T00:00:00Z"),
    }));
    const accountUpdate = vi.fn().mockResolvedValue({});

    const mockPrisma = {
      $transaction: vi.fn(async (cb) =>
        cb({
          ledgerJournal: { create: journalCreate },
          ledgerEntry: { create: entryCreate },
          ledgerAccount: { update: accountUpdate },
        }),
      ),
    } as unknown as PrismaClient;

    const repo = new PrismaCommerceRepository(mockPrisma);

    // Reject unbalanced journal before starting a transaction
    await expect(
      repo.postBalancedDoubleEntryJournal({
        idempotencyKey: "bad_journal",
        referenceType: "ORDER",
        referenceId: "ord_bad",
        description: "Unbalanced",
        entries: [
          { accountId: "acc_clearing", amountMinor: -10000n },
          { accountId: "acc_platform", amountMinor: 9999n },
        ],
      }),
    ).rejects.toThrow(DoubleEntryImbalanceError);

    expect(journalCreate).not.toHaveBeenCalled();

    // Post balanced 3-way project split (₹10,000.00 = 1,000,000 paisa)
    const posted = await repo.postBalancedDoubleEntryJournal({
      idempotencyKey: "order:ord_101:escrow_split",
      referenceType: "ORDER",
      referenceId: "ord_101",
      description: "Project 3-way split (50% Mentor / 15% Author / 35% Platform)",
      entries: [
        { accountId: "acc_gateway_clearing", amountMinor: -1_000_000n },
        { accountId: "acc_mentor_escrow", amountMinor: 500_000n },
        { accountId: "acc_author_escrow", amountMinor: 150_000n },
        { accountId: "acc_platform_available", amountMinor: 350_000n },
      ],
    });

    expect(posted.journal.id).toBe("jrn_001");
    expect(posted.entries).toHaveLength(4);
    expect(accountUpdate).toHaveBeenCalledTimes(4);
  });
});

describe("PrismaAiWalletRepository", () => {
  it("reserves AI credits via CAS and settles delta refunds atomically with AiUsageEvent logging", async () => {
    const aiWalletUpdateMany = vi
      .fn()
      .mockResolvedValueOnce({ count: 1 }) // reserve success
      .mockResolvedValueOnce({ count: 0 }) // concurrent reserve conflict
      .mockResolvedValueOnce({ count: 1 }); // settle delta refund success

    const aiUsageEventCreate = vi.fn().mockResolvedValue({
      id: "evt_001",
      walletId: "wal_1",
      idempotencyKey: "eval:sub_42",
      feature: "RUBRIC_CRITIQUE",
      modelId: "gemini-2.5-pro",
      inputTokens: 4200,
      outputTokens: 1100,
      creditsDebited: 320n,
      artifactId: "art_99",
      createdAt: new Date("2026-10-08T00:00:00Z"),
    });

    const mockPrisma = {
      $transaction: vi.fn(async (cb) =>
        cb({
          aiWallet: { updateMany: aiWalletUpdateMany },
          aiUsageEvent: { create: aiUsageEventCreate },
        }),
      ),
    } as unknown as PrismaClient;

    const walletRepo = new PrismaAiWalletRepository(mockPrisma);

    // 1. Insufficient balance guard
    const insufficient = await walletRepo.reserveWalletCreditsCas({
      walletId: "wal_1",
      expectedBalanceCredits: 200n,
      reservedCredits: 500n,
    });
    expect(insufficient).toEqual({
      reserved: false,
      rowsUpdated: 0,
      walletId: "wal_1",
      reason: "INSUFFICIENT_CREDITS",
    });

    // 2. CAS Reservation success (1000n - 500n = 500n)
    const reserved = await walletRepo.reserveWalletCreditsCas({
      walletId: "wal_1",
      expectedBalanceCredits: 1000n,
      reservedCredits: 500n,
    });
    expect(reserved).toEqual({
      reserved: true,
      rowsUpdated: 1,
      walletId: "wal_1",
      reservedCredits: 500n,
      remainingBalanceCredits: 500n,
    });

    // 3. Concurrent CAS conflict
    const raceConflict = await walletRepo.reserveWalletCreditsCas({
      walletId: "wal_1",
      expectedBalanceCredits: 1000n,
      reservedCredits: 500n,
    });
    expect(raceConflict).toEqual({
      reserved: false,
      rowsUpdated: 0,
      walletId: "wal_1",
      reason: "CAS_CONFLICT",
    });

    // 4. Settle reservation where actual usage (320n) < reserved (500n) -> refunds 180n
    const settled = await walletRepo.settleWalletReservationCas({
      walletId: "wal_1",
      expectedBalanceCredits: 500n,
      reservedCredits: 500n,
      actualCreditsUsed: 320n,
      idempotencyKey: "eval:sub_42",
      feature: "RUBRIC_CRITIQUE",
      modelId: "gemini-2.5-pro",
      inputTokens: 4200,
      outputTokens: 1100,
      artifactId: "art_99",
    });

    expect(settled).toMatchObject({
      settled: true,
      rowsUpdated: 1,
      walletId: "wal_1",
      actualCreditsDebited: 320n,
      netDeltaCredits: -180n,
      finalBalanceCredits: 680n,
    });
    expect(aiUsageEventCreate).toHaveBeenCalledTimes(1);
  });
});

describe("seedElluminarPlatform", () => {
  it("idempotently seeds organizations, enterprise SSO, ledger accounts, course, project, and rubric criteria", async () => {
    const mockPrisma = {
      organization: {
        upsert: vi.fn(async ({ create }) => ({ id: `org_${create.slug}`, ...create })),
      },
      enterpriseSsoProvider: {
        upsert: vi.fn(async ({ create }) => ({ id: "sso_1", ...create })),
      },
      user: {
        upsert: vi.fn(async ({ create }) => ({ id: "usr_author", ...create })),
      },
      ledgerAccount: {
        upsert: vi.fn(async ({ create }) => ({
          id: `acc_${create.ownerType}_${create.bucket}`,
          ...create,
        })),
      },
      roleTrack: {
        upsert: vi.fn(async ({ create }) => ({ id: "rt_1", ...create })),
      },
      course: {
        upsert: vi.fn(async ({ create }) => ({ id: "crs_1", ...create })),
      },
      project: {
        upsert: vi.fn(async ({ create }) => ({ id: "prj_1", ...create })),
      },
      rubric: {
        upsert: vi.fn(async ({ create }) => ({ id: "rub_1", ...create })),
      },
      rubricCriterion: {
        upsert: vi.fn(async ({ create }) => ({
          id: `crit_${create.sortOrder}`,
          ...create,
        })),
      },
    } as unknown as PrismaClient;

    const result = await seedElluminarPlatform(mockPrisma);

    expect(result.organizations.creator.slug).toBe("elluminar-core");
    expect(result.organizations.enterprise.slug).toBe("tech-gcc-india");
    expect(result.organizations.university.slug).toBe("iit-capstone-hub");
    expect(result.ssoProvider.domain).toBe("tech-gcc.example.com");
    expect(result.ledgerAccounts).toHaveLength(4);
    expect(result.project.title).toBe("Distributed Payment Ledger & Outbox");
    const totalWeightBps = result.criteria.reduce((acc, c) => acc + c.weightBps, 0);
    expect(totalWeightBps).toBe(10000);
  });
});

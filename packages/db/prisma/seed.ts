import type {
  Course,
  EnterpriseSsoProvider,
  LedgerAccount,
  Organization,
  PrismaClient,
  Project,
  RoleTrack,
  Rubric,
  RubricCriterion,
  User,
} from "../src/generated/prisma/client";

export interface SeedPlatformSummary {
  organizations: {
    creator: Organization;
    enterprise: Organization;
    university: Organization;
  };
  ssoProvider: EnterpriseSsoProvider;
  authorUser: User;
  ledgerAccounts: LedgerAccount[];
  roleTrack: RoleTrack;
  course: Course;
  project: Project;
  rubric: Rubric;
  criteria: RubricCriterion[];
}

/**
 * Idempotent (`upsert`-based) seed runner populating canonical multi-tenant organizations,
 * B2B enterprise SSO provider configuration, double-entry escrow/available ledger accounts,
 * role tracks, hybrid cohort course, and capstone project rubric.
 */
export async function seedElluminarPlatform(
  prisma: PrismaClient,
): Promise<SeedPlatformSummary> {
  // 1. Seed sample Organization tenants across CREATOR, ENTERPRISE, and UNIVERSITY tiers
  const creatorOrg = await prisma.organization.upsert({
    where: { slug: "elluminar-core" },
    update: {
      name: "Elluminar Core Engineering",
      type: "CREATOR",
      stateCode: "29",
      billingEmail: "billing@elluminar.com",
    },
    create: {
      slug: "elluminar-core",
      name: "Elluminar Core Engineering",
      type: "CREATOR",
      stateCode: "29",
      billingEmail: "billing@elluminar.com",
    },
  });

  const enterpriseOrg = await prisma.organization.upsert({
    where: { slug: "tech-gcc-india" },
    update: {
      name: "Tech GCC India Pvt Ltd",
      type: "ENTERPRISE",
      gstin: "29AABCT1234D1Z5",
      stateCode: "29",
      billingEmail: "procurement@tech-gcc.example.com",
    },
    create: {
      slug: "tech-gcc-india",
      name: "Tech GCC India Pvt Ltd",
      type: "ENTERPRISE",
      gstin: "29AABCT1234D1Z5",
      stateCode: "29",
      billingEmail: "procurement@tech-gcc.example.com",
    },
  });

  const universityOrg = await prisma.organization.upsert({
    where: { slug: "iit-capstone-hub" },
    update: {
      name: "IIT Capstone Innovation Hub",
      type: "UNIVERSITY",
      stateCode: "33",
      billingEmail: "registrar@iit-capstone.example.edu.in",
    },
    create: {
      slug: "iit-capstone-hub",
      name: "IIT Capstone Innovation Hub",
      type: "UNIVERSITY",
      stateCode: "33",
      billingEmail: "registrar@iit-capstone.example.edu.in",
    },
  });

  // 2. Seed EnterpriseSsoProvider strictly bound to the B2B ENTERPRISE tenant
  const ssoProvider = await prisma.enterpriseSsoProvider.upsert({
    where: { domain: "tech-gcc.example.com" },
    update: {
      organizationId: enterpriseOrg.id,
      providerId: "oidc-tech-gcc-india",
      issuer: "https://idp.tech-gcc.example.com/oauth2/default",
      oidcConfig: {
        clientId: "elluminar-b2b-tech-gcc",
        scopes: ["openid", "email", "profile"],
      },
    },
    create: {
      organizationId: enterpriseOrg.id,
      providerId: "oidc-tech-gcc-india",
      domain: "tech-gcc.example.com",
      issuer: "https://idp.tech-gcc.example.com/oauth2/default",
      oidcConfig: {
        clientId: "elluminar-b2b-tech-gcc",
        scopes: ["openid", "email", "profile"],
      },
    },
  });

  // 3. Seed Principal Curriculum Author User
  const authorUser = await prisma.user.upsert({
    where: { email: "principal-architect@elluminar.com" },
    update: {
      name: "Principal Distributed Systems Architect",
      role: "CREATOR",
      emailVerified: true,
    },
    create: {
      email: "principal-architect@elluminar.com",
      name: "Principal Distributed Systems Architect",
      role: "CREATOR",
      emailVerified: true,
    },
  });

  // 4. Seed Double-Entry Ledger Accounts (ESCROW_LOCKED + AVAILABLE for PLATFORM & TENANT)
  const accountSpecs = [
    {
      ownerType: "PLATFORM" as const,
      ownerId: "elluminar-platform",
      bucket: "ESCROW_LOCKED" as const,
      currency: "INR",
    },
    {
      ownerType: "PLATFORM" as const,
      ownerId: "elluminar-platform",
      bucket: "AVAILABLE" as const,
      currency: "INR",
    },
    {
      ownerType: "TENANT" as const,
      ownerId: creatorOrg.id,
      bucket: "ESCROW_LOCKED" as const,
      currency: "INR",
    },
    {
      ownerType: "TENANT" as const,
      ownerId: creatorOrg.id,
      bucket: "AVAILABLE" as const,
      currency: "INR",
    },
  ];

  const ledgerAccounts: LedgerAccount[] = [];
  for (const spec of accountSpecs) {
    const account = await prisma.ledgerAccount.upsert({
      where: {
        ownerType_ownerId_bucket_currency: spec,
      },
      update: {},
      create: {
        ...spec,
        balanceMinor: 0n,
      },
    });
    ledgerAccounts.push(account);
  }

  // 5. Seed RoleTrack
  const roleTrack = await prisma.roleTrack.upsert({
    where: {
      organizationId_slug: {
        organizationId: creatorOrg.id,
        slug: "principal-fintech-systems-architect",
      },
    },
    update: {
      title: "Principal Fintech & Distributed Systems Architect",
      description:
        "End-to-end engineering track covering high-concurrency double-entry ledgers, transactional outboxes, and zero-data-loss payment settlement.",
      isPublished: true,
    },
    create: {
      organizationId: creatorOrg.id,
      slug: "principal-fintech-systems-architect",
      title: "Principal Fintech & Distributed Systems Architect",
      description:
        "End-to-end engineering track covering high-concurrency double-entry ledgers, transactional outboxes, and zero-data-loss payment settlement.",
      isPublished: true,
    },
  });

  // 6. Seed Hybrid Live Cohort Course
  const course = await prisma.course.upsert({
    where: {
      organizationId_slug: {
        organizationId: creatorOrg.id,
        slug: "high-throughput-payment-engines",
      },
    },
    update: {
      title: "High-Throughput Payment Engines & Double-Entry Accounting",
      summary:
        "Master optimistic CAS concurrency, idempotency keys, and India B2B GST invoicing.",
      deliveryMode: "LIVE_COHORT",
      includedInSubscriptionPool: true,
      isPublished: true,
    },
    create: {
      organizationId: creatorOrg.id,
      authorId: authorUser.id,
      slug: "high-throughput-payment-engines",
      title: "High-Throughput Payment Engines & Double-Entry Accounting",
      summary:
        "Master optimistic CAS concurrency, idempotency keys, and India B2B GST invoicing.",
      deliveryMode: "LIVE_COHORT",
      includedInSubscriptionPool: true,
      isPublished: true,
    },
  });

  // 7. Seed Flagship Project: Distributed Payment Ledger & Outbox
  const project = await prisma.project.upsert({
    where: {
      organizationId_slug: {
        organizationId: creatorOrg.id,
        slug: "distributed-payment-ledger-outbox",
      },
    },
    update: {
      title: "Distributed Payment Ledger & Outbox",
      briefMarkdown:
        "Design and implement an atomic double-entry ledger with optimistic CAS locks, idempotent webhook ingestion, and deterministic 3-way revenue splits.",
      tier: "CAPSTONE",
      defaultArtifactKind: "SYSTEM_CANVAS",
      isPublished: true,
    },
    create: {
      organizationId: creatorOrg.id,
      authorId: authorUser.id,
      slug: "distributed-payment-ledger-outbox",
      title: "Distributed Payment Ledger & Outbox",
      briefMarkdown:
        "Design and implement an atomic double-entry ledger with optimistic CAS locks, idempotent webhook ingestion, and deterministic 3-way revenue splits.",
      tier: "CAPSTONE",
      defaultArtifactKind: "SYSTEM_CANVAS",
      isPublished: true,
    },
  });

  // 8. Seed Weighted Rubric + RubricCriterion items (total weight = 10,000 bps)
  const rubric = await prisma.rubric.upsert({
    where: { projectId: project.id },
    update: { passingScoreBps: 7500 },
    create: {
      projectId: project.id,
      passingScoreBps: 7500,
    },
  });

  const criterionDefinitions = [
    {
      sortOrder: 1,
      title: "Double-Entry Invariant & Zero-Sum Ledger Integrity",
      description:
        "Enforces SUM(amountMinor) === 0n across every LedgerJournal with strict integer-paisa math.",
      weightBps: 4000,
      maxScore: 100,
    },
    {
      sortOrder: 2,
      title: "Optimistic CAS Concurrency & Idempotency",
      description:
        "Prevents duplicate order fulfillments, oversold cohorts, and concurrent refund races via versioned CAS updates.",
      weightBps: 3500,
      maxScore: 100,
    },
    {
      sortOrder: 3,
      title: "Transactional Outbox & Fault Tolerance",
      description:
        "Guarantees at-least-once event publication with idempotent downstream consumers.",
      weightBps: 2500,
      maxScore: 100,
    },
  ];

  const criteria: RubricCriterion[] = [];
  for (const def of criterionDefinitions) {
    const criterion = await prisma.rubricCriterion.upsert({
      where: {
        rubricId_sortOrder: {
          rubricId: rubric.id,
          sortOrder: def.sortOrder,
        },
      },
      update: {
        title: def.title,
        description: def.description,
        weightBps: def.weightBps,
        maxScore: def.maxScore,
      },
      create: {
        rubricId: rubric.id,
        sortOrder: def.sortOrder,
        title: def.title,
        description: def.description,
        weightBps: def.weightBps,
        maxScore: def.maxScore,
      },
    });
    criteria.push(criterion);
  }

  return {
    organizations: {
      creator: creatorOrg,
      enterprise: enterpriseOrg,
      university: universityOrg,
    },
    ssoProvider,
    authorUser,
    ledgerAccounts,
    roleTrack,
    course,
    project,
    rubric,
    criteria,
  };
}

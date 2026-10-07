# Elluminar v2 — Clean-Sheet Hexagonal Architecture

## 1. Bounded Contexts & Workspace Topology

| Package | Bounded Context | Core Responsibilities |
| :--- | :--- | :--- |
| `@elluminar/db` | Persistence Adapter | Prisma 7/8 `prisma-client` generator + `@prisma/adapter-pg` (`PrismaPg` pool for Supabase PostgreSQL `ap-south-1`). Houses 38 clean-sheet models across Identity, Catalog, Double-Entry Ledger/GST, and Work Artifacts. |
| `@elluminar/domain-commerce` | Financial Core | True Double-Entry Ledger (`SUM(amountMinor) === 0n`), 80/20 & 90/10 Course splits, 50% Mentor Escrow + 15% Author IP Royalty Escrow + 35% Platform Project splits, Escrow-to-Available release on `PASS`, ₹0 free checkout, tenant-scoped coupons, failed-refund compensating journal reversals, and India B2B GST Engine (`SAC 999293`). |
| `@elluminar/domain-artifacts` | Work Artifacts & Replay | Unified `ArtifactPlugin` interface (`SYSTEM_CANVAS`, `CODE_SANDBOX`, `DOCUMENT_REDLINE`, `SPREADSHEET_GRID`, `MEDIA_CRITIQUE`), Excalidraw Scene Graph Topology Extractor, Univer Spreadsheet Formula AST Extractor, and Tier-2 Voice-over-Canvas (`24kbps Opus` + 60fps viewport lerp). |
| `@elluminar/domain-ai-mentorship` | Rubric & AI Credits | Weighted basis-point Rubric Evaluation Engine (`scoreBps` against `passingScoreBps`) and integer-credit AI token metering. |
| `@elluminar/web` | Next.js 16.4 + Hono RPC | App Router frontend + Hono RPC API (`/api/v2/[[...route]]`) + `hc<AppType>` end-to-end typed RPC client. |

## 2. Database Schema Invariants Enforced at Engine Level

1. **Duplicate Self-Paced Enrollment Prevention**: `Enrollment.cohortKey` is non-nullable with `@default("SELF_PACED")`, allowing `@@unique([userId, courseId, cohortKey])` to strictly prevent duplicate self-paced enrollments in PostgreSQL (where nullable unique columns would otherwise permit duplicates under SQL `NULL != NULL` semantics).
2. **Enterprise SSO Tenant Scoping**: `EnterpriseSsoProvider` is strictly bound to `Organization` (`ENTERPRISE | UNIVERSITY`).
3. **Default-Deny B2B Licensing**: `OrgLicense.accessScope` defaults exclusively to `ALLOWLIST` (`allowedCourseIds`, `allowedProjectIds`).
4. **Tenant-Isolated Coupons**: `Coupon` enforces `@@unique([organizationId, code])` and verifies `coupon.organizationId === orderOrganizationId` prior to redemption.

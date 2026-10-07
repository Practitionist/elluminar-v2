# True Double-Entry Financial Ledger & India GST Specification

## 1. Double-Entry Conservation Invariant

Every monetary movement in Elluminar v2 is recorded as an immutable `LedgerJournal` containing two or more `LedgerEntry` rows denominated in signed `bigint` minor units (paisa) such that:

$$\sum_{i=1}^{k} \text{entry}_i.\text{amountMinor} \equiv 0\text{n}$$

Accounts are partitioned by `(ownerType, ownerId, bucket, currency)` where:
- `ownerType`: `PLATFORM | TENANT | MENTOR | USER`
- `bucket`: `ESCROW_LOCKED | AVAILABLE`

## 2. Deterministic Integer-Paisa Revenue Splits

- **Courses (`LIVE_COHORT | SELF_PACED`)**:
  - Marketplace discovery (`STANDARD_80_20`): `80%` (`8000 bps`) Creator Tenant + `20%` (`2000 bps`) Platform.
  - Creator direct referral (`CREATOR_DIRECT_90_10`): `90%` (`9000 bps`) Creator Tenant + `10%` (`1000 bps`) Platform.
- **Projects (`SPRINT | CAPSTONE | FLAGSHIP`)**:
  - `50%` (`5000 bps`) credited to `MENTOR` (`ESCROW_LOCKED`).
  - `15%` (`1500 bps`) credited to `TENANT` Author IP Royalty (`ESCROW_LOCKED`).
  - `35%` (`3500 bps`) remainder credited to `PLATFORM` (`AVAILABLE`).
  - **Escrow Release**: Only when the learner's `ProjectInstance` attains final `PASS` verdict does `createEscrowReleaseJournal` debit `ESCROW_LOCKED` and credit `AVAILABLE` for both Mentor and Author Tenant.

## 3. India B2B GST Engine (`SAC 999293`)

- **Service Accounting Code**: `999293` (Commercial training and coaching services).
- **GST Rate**: `18%` (`1800 bps`).
- **Intra-State Supply** (`placeOfSupplyStateCode === supplierStateCode`, e.g., Karnataka `29` → `29`):
  - `CGST 9%` (`900 bps`) + `SGST 9%` (`900 bps`), `IGST 0%`.
- **Inter-State Supply** (`placeOfSupplyStateCode !== supplierStateCode`, e.g., Karnataka `29` → Maharashtra `27`):
  - `IGST 18%` (`1800 bps`), `CGST 0%`, `SGST 0%`.

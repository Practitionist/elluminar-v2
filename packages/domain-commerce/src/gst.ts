/**
 * India B2B GST Tax Invoice Engine (SAC 999293 — Commercial Training & Coaching / EdTech)
 * Enforces deterministic integer-paisa CGST (9%) + SGST (9%) Intra-State vs IGST (18%) Inter-State calculation
 * and Gapless Financial Year Invoice Sequencing.
 */

export const EDTECH_SAC_CODE = "999293" as const;
export const STANDARD_GST_RATE_BPS = 1800 as const; // 18.00%
export const INTRA_STATE_HALF_RATE_BPS = 900 as const; // 9.00% each for CGST & SGST

const GSTIN_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export interface GstTaxBreakdown {
  sacCode: typeof EDTECH_SAC_CODE;
  supplierStateCode: string;
  placeOfSupplyStateCode: string;
  isInterState: boolean;
  taxableAmountMinor: bigint;
  cgstRateBps: number;
  cgstAmountMinor: bigint;
  sgstRateBps: number;
  sgstAmountMinor: bigint;
  igstRateBps: number;
  igstAmountMinor: bigint;
  totalTaxMinor: bigint;
  totalInvoiceAmountMinor: bigint;
}

/**
 * Extracts the 2-digit Indian State Code from a valid 15-character GSTIN.
 */
export function extractStateCodeFromGstin(gstin: string): string {
  const normalized = gstin.trim().toUpperCase();
  if (!GSTIN_REGEX.test(normalized)) {
    throw new Error(`Invalid Indian GSTIN format: ${gstin}`);
  }
  return normalized.slice(0, 2);
}

/**
 * Computes exact India GST Tax Breakdown for SAC 999293 in minor units (paisa).
 * - Intra-State (`placeOfSupplyStateCode === supplierStateCode`): CGST 9% + SGST 9%
 * - Inter-State (`placeOfSupplyStateCode !== supplierStateCode`): IGST 18%
 */
export function calculateIndiaGstBreakdown(params: {
  taxableAmountMinor: bigint;
  supplierStateCode: string;
  buyerStateCode?: string;
  buyerGstin?: string;
}): GstTaxBreakdown {
  if (params.taxableAmountMinor < 0n) {
    throw new RangeError("taxableAmountMinor must be non-negative");
  }

  const rawSupplierState = params.supplierStateCode.trim();
  if (!rawSupplierState) {
    throw new Error("supplierStateCode cannot be empty");
  }
  const supplierStateCode = rawSupplierState.padStart(2, "0");
  const placeOfSupplyStateCode = params.buyerGstin
    ? extractStateCodeFromGstin(params.buyerGstin)
    : (params.buyerStateCode ?? supplierStateCode).trim().padStart(2, "0");

  const isInterState = placeOfSupplyStateCode !== supplierStateCode;

  if (params.taxableAmountMinor === 0n) {
    return {
      sacCode: EDTECH_SAC_CODE,
      supplierStateCode,
      placeOfSupplyStateCode,
      isInterState,
      taxableAmountMinor: 0n,
      cgstRateBps: isInterState ? 0 : INTRA_STATE_HALF_RATE_BPS,
      cgstAmountMinor: 0n,
      sgstRateBps: isInterState ? 0 : INTRA_STATE_HALF_RATE_BPS,
      sgstAmountMinor: 0n,
      igstRateBps: isInterState ? STANDARD_GST_RATE_BPS : 0,
      igstAmountMinor: 0n,
      totalTaxMinor: 0n,
      totalInvoiceAmountMinor: 0n,
    };
  }

  if (isInterState) {
    const igstAmountMinor =
      (params.taxableAmountMinor * BigInt(STANDARD_GST_RATE_BPS)) / 10000n;
    return {
      sacCode: EDTECH_SAC_CODE,
      supplierStateCode,
      placeOfSupplyStateCode,
      isInterState: true,
      taxableAmountMinor: params.taxableAmountMinor,
      cgstRateBps: 0,
      cgstAmountMinor: 0n,
      sgstRateBps: 0,
      sgstAmountMinor: 0n,
      igstRateBps: STANDARD_GST_RATE_BPS,
      igstAmountMinor,
      totalTaxMinor: igstAmountMinor,
      totalInvoiceAmountMinor: params.taxableAmountMinor + igstAmountMinor,
    };
  }

  const cgstAmountMinor =
    (params.taxableAmountMinor * BigInt(INTRA_STATE_HALF_RATE_BPS)) / 10000n;
  const sgstAmountMinor =
    (params.taxableAmountMinor * BigInt(INTRA_STATE_HALF_RATE_BPS)) / 10000n;
  const totalTaxMinor = cgstAmountMinor + sgstAmountMinor;

  return {
    sacCode: EDTECH_SAC_CODE,
    supplierStateCode,
    placeOfSupplyStateCode,
    isInterState: false,
    taxableAmountMinor: params.taxableAmountMinor,
    cgstRateBps: INTRA_STATE_HALF_RATE_BPS,
    cgstAmountMinor,
    sgstRateBps: INTRA_STATE_HALF_RATE_BPS,
    sgstAmountMinor,
    igstRateBps: 0,
    igstAmountMinor: 0n,
    totalTaxMinor,
    totalInvoiceAmountMinor: params.taxableAmountMinor + totalTaxMinor,
  };
}

/**
 * Formats a gapless GST compliant document number (e.g. `ELM/INV/2026-27/000042`).
 */
export function formatGaplessInvoiceNumber(params: {
  prefix: "INV" | "CN";
  financialYear: string;
  sequenceNumber: number;
}): string {
  if (!Number.isInteger(params.sequenceNumber) || params.sequenceNumber <= 0) {
    throw new RangeError(
      `Invoice sequenceNumber must be a positive integer, got ${params.sequenceNumber}`
    );
  }
  const paddedSeq = String(params.sequenceNumber).padStart(6, "0");
  return `ELM/${params.prefix}/${params.financialYear}/${paddedSeq}`;
}

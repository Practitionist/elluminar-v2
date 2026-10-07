import { createHmac, timingSafeEqual } from "node:crypto";
import {
  executeCasOrderTransition,
  type CasOrderSnapshot,
} from "./cas-fulfillment";

export type FulfillmentTriggerSource =
  | "RAZORPAY_WEBHOOK"
  | "BROWSER_CONFIRM_CHECKOUT";

export interface OutboxFulfillmentRecord {
  fulfillmentKey: string;
  orderId: string;
  gatewayPaymentId: string;
  winningSource: FulfillmentTriggerSource;
  fulfilledOrderVersion: number;
  journalIdempotencyKey: string;
  invoiceIdempotencyKey: string;
}

export interface WebhookOutboxStore {
  processedKeys: Map<string, OutboxFulfillmentRecord>;
}

export function createInMemoryWebhookOutboxStore(): WebhookOutboxStore {
  return {
    processedKeys: new Map<string, OutboxFulfillmentRecord>(),
  };
}

export type WebhookOutboxEvaluationResult =
  | {
      decision: "EXECUTE_FULFILLMENT_ONCE";
      rowsUpdated: 1;
      orderId: string;
      gatewayPaymentId: string;
      source: FulfillmentTriggerSource;
      nextOrderVersion: number;
      shouldPostLedgerJournal: true;
      shouldGenerateTaxInvoice: true;
      journalIdempotencyKey: string;
      invoiceIdempotencyKey: string;
    }
  | {
      decision: "SKIP_DUPLICATE_IDEMPOTENT";
      rowsUpdated: 0;
      orderId: string;
      gatewayPaymentId: string;
      source: FulfillmentTriggerSource;
      winningSource: FulfillmentTriggerSource;
      shouldPostLedgerJournal: false;
      shouldGenerateTaxInvoice: false;
      journalIdempotencyKey: string;
      invoiceIdempotencyKey: string;
    }
  | {
      decision: "REJECT_UNFULFILLABLE_ORDER_STATE";
      rowsUpdated: 0;
      orderId: string;
      currentStatus: string;
      reason: string;
      shouldPostLedgerJournal: false;
      shouldGenerateTaxInvoice: false;
    };

/**
 * Webhook & Fast-Path Checkout Idempotency Outbox (`evaluateWebhookOutboxIdempotency`):
 * Safely deduplicates concurrent Razorpay `payment.captured` webhooks and browser
 * `confirmCheckout` callbacks so `Order` fulfillment, `Invoice` generation, and
 * Double-Entry Ledger posting happen **at most once**.
 */
export function evaluateWebhookOutboxIdempotency(params: {
  source: FulfillmentTriggerSource;
  order: CasOrderSnapshot;
  expectedVersion: number;
  gatewayPaymentId: string;
  outboxStore: WebhookOutboxStore;
}): WebhookOutboxEvaluationResult {
  const { source, order, expectedVersion, gatewayPaymentId, outboxStore } =
    params;

  const canonicalFulfillmentKey = `fulfill-order:${order.id}`;
  const journalIdempotencyKey = `capture-journal:${order.id}`;
  const invoiceIdempotencyKey = `tax-invoice:${order.id}`;

  // 1. Check outbox deduplication table first
  const existingRecord = outboxStore.processedKeys.get(canonicalFulfillmentKey);
  if (existingRecord) {
    return {
      decision: "SKIP_DUPLICATE_IDEMPOTENT",
      rowsUpdated: 0,
      orderId: order.id,
      gatewayPaymentId,
      source,
      winningSource: existingRecord.winningSource,
      shouldPostLedgerJournal: false,
      shouldGenerateTaxInvoice: false,
      journalIdempotencyKey: existingRecord.journalIdempotencyKey,
      invoiceIdempotencyKey: existingRecord.invoiceIdempotencyKey,
    };
  }

  // 2. Execute optimistic CAS state transition on Order (`PENDING -> PAID`)
  const casResult = executeCasOrderTransition({
    current: order,
    expectedStatus: "PENDING",
    expectedVersion,
    targetStatus: "PAID",
  });

  if (casResult.outcome === "IDEMPOTENT_ALREADY_IN_TARGET_STATE") {
    return {
      decision: "SKIP_DUPLICATE_IDEMPOTENT",
      rowsUpdated: 0,
      orderId: order.id,
      gatewayPaymentId,
      source,
      winningSource: source,
      shouldPostLedgerJournal: false,
      shouldGenerateTaxInvoice: false,
      journalIdempotencyKey,
      invoiceIdempotencyKey,
    };
  }

  if (casResult.outcome !== "APPLIED") {
    return {
      decision: "REJECT_UNFULFILLABLE_ORDER_STATE",
      rowsUpdated: 0,
      orderId: order.id,
      currentStatus: casResult.currentStatus,
      reason: casResult.reason,
      shouldPostLedgerJournal: false,
      shouldGenerateTaxInvoice: false,
    };
  }

  // 3. Persist winning outbox record so any subsequent webhook retry or browser callback skips
  const record: OutboxFulfillmentRecord = {
    fulfillmentKey: canonicalFulfillmentKey,
    orderId: order.id,
    gatewayPaymentId,
    winningSource: source,
    fulfilledOrderVersion: casResult.nextVersion,
    journalIdempotencyKey,
    invoiceIdempotencyKey,
  };
  outboxStore.processedKeys.set(canonicalFulfillmentKey, record);

  return {
    decision: "EXECUTE_FULFILLMENT_ONCE",
    rowsUpdated: 1,
    orderId: order.id,
    gatewayPaymentId,
    source,
    nextOrderVersion: casResult.nextVersion,
    shouldPostLedgerJournal: true,
    shouldGenerateTaxInvoice: true,
    journalIdempotencyKey,
    invoiceIdempotencyKey,
  };
}

/**
 * Verifies Razorpay `x-razorpay-signature` header using constant-time HMAC-SHA256 comparison.
 */
export function verifyRazorpayWebhookSignature(params: {
  rawBody: string;
  signature: string;
  webhookSecret: string;
}): boolean {
  const { rawBody, signature, webhookSecret } = params;
  if (!signature || !webhookSecret) {
    return false;
  }

  const expectedHex = createHmac("sha256", webhookSecret)
    .update(rawBody, "utf8")
    .digest("hex");

  const sigBuf = Buffer.from(signature, "utf8");
  const expectedBuf = Buffer.from(expectedHex, "utf8");

  if (sigBuf.length !== expectedBuf.length) {
    return false;
  }

  return timingSafeEqual(sigBuf, expectedBuf);
}

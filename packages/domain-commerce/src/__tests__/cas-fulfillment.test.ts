import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  createInMemoryWebhookOutboxStore,
  evaluateWebhookOutboxIdempotency,
  executeCasOrderTransition,
  executeCasRefundTransition,
  reserveCohortSeatCas,
  verifyRazorpayWebhookSignature,
} from "../index";

describe("domain-commerce Phase 2A — Optimistic CAS Transitions, Cohort Seat Lock & Webhook Idempotency Outbox", () => {
  describe("executeCasOrderTransition", () => {
    it("transitions PENDING (v1) -> PAID (v2) atomically and rejects illegal EXPIRED/REFUNDED -> PAID with 0 rows updated", () => {
      const order = {
        id: "ord_1001",
        status: "PENDING" as const,
        version: 1,
      };

      const validTransition = executeCasOrderTransition({
        current: order,
        expectedStatus: "PENDING",
        expectedVersion: 1,
        targetStatus: "PAID",
      });

      expect(validTransition).toEqual({
        outcome: "APPLIED",
        rowsUpdated: 1,
        entityId: "ord_1001",
        previousStatus: "PENDING",
        status: "PAID",
        previousVersion: 1,
        nextVersion: 2,
      });

      // Duplicate concurrent transition to PAID returns deterministic idempotency
      const replayTransition = executeCasOrderTransition({
        current: order,
        expectedStatus: "PENDING",
        expectedVersion: 1,
        targetStatus: "PAID",
      });
      expect(replayTransition).toEqual({
        outcome: "IDEMPOTENT_ALREADY_IN_TARGET_STATE",
        rowsUpdated: 0,
        entityId: "ord_1001",
        status: "PAID",
        currentVersion: 2,
      });

      // Illegal EXPIRED -> PAID rejected with 0 rows updated
      const expiredOrder = {
        id: "ord_expired",
        status: "EXPIRED" as const,
        version: 2,
      };
      const expiredAttempt = executeCasOrderTransition({
        current: expiredOrder,
        expectedStatus: "EXPIRED",
        expectedVersion: 2,
        targetStatus: "PAID",
      });
      expect(expiredAttempt.rowsUpdated).toBe(0);
      expect(expiredAttempt.outcome).toBe("REJECTED_ILLEGAL_TRANSITION");

      // Illegal REFUNDED -> PAID rejected with 0 rows updated
      const refundedOrder = {
        id: "ord_refunded",
        status: "REFUNDED" as const,
        version: 3,
      };
      const refundedAttempt = executeCasOrderTransition({
        current: refundedOrder,
        expectedStatus: "REFUNDED",
        expectedVersion: 3,
        targetStatus: "PAID",
      });
      expect(refundedAttempt.rowsUpdated).toBe(0);
      expect(refundedAttempt.outcome).toBe("REJECTED_ILLEGAL_TRANSITION");
    });
  });

  describe("executeCasRefundTransition", () => {
    it("prevents duplicate REQUESTED -> PROCESSING double-admin refund approvals via CAS version lock", () => {
      const refund = {
        id: "rfnd_501",
        orderId: "ord_1001",
        status: "REQUESTED" as const,
        version: 1,
      };

      const adminOneApproval = executeCasRefundTransition({
        current: refund,
        expectedStatus: "REQUESTED",
        expectedVersion: 1,
        targetStatus: "PROCESSING",
      });
      expect(adminOneApproval).toEqual({
        outcome: "APPLIED",
        rowsUpdated: 1,
        entityId: "rfnd_501",
        previousStatus: "REQUESTED",
        status: "PROCESSING",
        previousVersion: 1,
        nextVersion: 2,
      });

      const adminTwoDuplicateApproval = executeCasRefundTransition({
        current: refund,
        expectedStatus: "REQUESTED",
        expectedVersion: 1,
        targetStatus: "PROCESSING",
      });
      expect(adminTwoDuplicateApproval.rowsUpdated).toBe(0);
      expect(adminTwoDuplicateApproval.outcome).toBe("REJECTED_CAS_CONFLICT");
    });
  });

  describe("reserveCohortSeatCas", () => {
    it("atomically reserves final cohort seat and blocks overselling with 0 rows updated", () => {
      const cohort = {
        id: "cohort_spring_26",
        courseId: "course_sys_design",
        capacity: 30,
        enrolledCount: 29,
        status: "UPCOMING" as const,
        version: 10,
      };

      const lastSeat = reserveCohortSeatCas({
        cohort,
        expectedVersion: 10,
        quantity: 1,
      });
      expect(lastSeat).toEqual({
        outcome: "RESERVED",
        rowsUpdated: 1,
        cohortId: "cohort_spring_26",
        enrolledCount: 30,
        remainingSeats: 0,
        nextVersion: 11,
      });

      const overCapacityAttempt = reserveCohortSeatCas({
        cohort,
        expectedVersion: 11,
        quantity: 1,
      });
      expect(overCapacityAttempt.rowsUpdated).toBe(0);
      expect(overCapacityAttempt.outcome).toBe("REJECTED_COHORT_FULL");
    });
  });

  describe("evaluateWebhookOutboxIdempotency & verifyRazorpayWebhookSignature", () => {
    it("deduplicates concurrent Razorpay payment.captured webhook and confirmCheckout so fulfillment runs at most once", () => {
      const outboxStore = createInMemoryWebhookOutboxStore();
      const order = {
        id: "ord_race_999",
        status: "PENDING" as const,
        version: 1,
      };

      // 1. Browser fast-path arrives first
      const firstResult = evaluateWebhookOutboxIdempotency({
        source: "BROWSER_CONFIRM_CHECKOUT",
        order,
        expectedVersion: 1,
        gatewayPaymentId: "pay_Rzp999",
        outboxStore,
      });
      expect(firstResult).toEqual({
        decision: "EXECUTE_FULFILLMENT_ONCE",
        rowsUpdated: 1,
        orderId: "ord_race_999",
        gatewayPaymentId: "pay_Rzp999",
        source: "BROWSER_CONFIRM_CHECKOUT",
        nextOrderVersion: 2,
        shouldPostLedgerJournal: true,
        shouldGenerateTaxInvoice: true,
        journalIdempotencyKey: "capture-journal:ord_race_999",
        invoiceIdempotencyKey: "tax-invoice:ord_race_999",
      });

      // 2. Async Razorpay payment.captured webhook arrives 50ms later
      const secondResult = evaluateWebhookOutboxIdempotency({
        source: "RAZORPAY_WEBHOOK",
        order,
        expectedVersion: 1,
        gatewayPaymentId: "pay_Rzp999",
        outboxStore,
      });
      expect(secondResult).toEqual({
        decision: "SKIP_DUPLICATE_IDEMPOTENT",
        rowsUpdated: 0,
        orderId: "ord_race_999",
        gatewayPaymentId: "pay_Rzp999",
        source: "RAZORPAY_WEBHOOK",
        winningSource: "BROWSER_CONFIRM_CHECKOUT",
        shouldPostLedgerJournal: false,
        shouldGenerateTaxInvoice: false,
        journalIdempotencyKey: "capture-journal:ord_race_999",
        invoiceIdempotencyKey: "tax-invoice:ord_race_999",
      });
    });

    it("verifies valid Razorpay HMAC-SHA256 webhook signatures and rejects forged payloads", () => {
      const secret = "whsec_elluminar_test_secret_2026";
      const rawBody = JSON.stringify({
        event: "payment.captured",
        payload: { payment: { entity: { id: "pay_123", order_id: "ord_123" } } },
      });
      const validSignature = createHmac("sha256", secret)
        .update(rawBody, "utf8")
        .digest("hex");

      expect(
        verifyRazorpayWebhookSignature({
          rawBody,
          signature: validSignature,
          webhookSecret: secret,
        })
      ).toBe(true);

      expect(
        verifyRazorpayWebhookSignature({
          rawBody: rawBody + " ",
          signature: validSignature,
          webhookSecret: secret,
        })
      ).toBe(false);
    });
  });
});

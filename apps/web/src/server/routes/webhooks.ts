import { Hono } from "hono";
import { z } from "zod";
import {
  createInMemoryWebhookOutboxStore,
  evaluateWebhookOutboxIdempotency,
  verifyRazorpayWebhookSignature,
} from "@elluminar/domain-commerce";

const RazorpayWebhookEventSchema = z.object({
  event: z.literal("payment.captured"),
  payload: z.object({
    payment: z.object({
      entity: z.object({
        id: z.string().min(1),
        order_id: z.string().min(1),
        notes: z
          .object({
            elluminarOrderId: z.string().optional(),
            expectedOrderVersion: z.coerce.number().int().positive().optional(),
          })
          .optional(),
      }),
    }),
  }),
});

const defaultWebhookOutboxStore = createInMemoryWebhookOutboxStore();

export const webhooksRouter = new Hono().post("/razorpay", async (c) => {
  const signature = c.req.header("x-razorpay-signature") ?? "";
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";
  const rawBody = await c.req.text();

  const isSignatureValid = verifyRazorpayWebhookSignature({
    rawBody,
    signature,
    webhookSecret,
  });

  if (!isSignatureValid) {
    return c.json(
      {
        status: "rejected",
        code: "INVALID_RAZORPAY_HMAC_SIGNATURE",
      },
      401
    );
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawBody);
  } catch {
    return c.json({ status: "rejected", code: "MALFORMED_JSON_BODY" }, 400);
  }

  const parsedEvent = RazorpayWebhookEventSchema.safeParse(parsedJson);
  if (!parsedEvent.success) {
    return c.json(
      {
        status: "ignored",
        code: "UNHANDLED_OR_INVALID_WEBHOOK_EVENT",
      },
      200
    );
  }

  const paymentEntity = parsedEvent.data.payload.payment.entity;
  const orderId =
    paymentEntity.notes?.elluminarOrderId ?? paymentEntity.order_id;
  const expectedVersion = paymentEntity.notes?.expectedOrderVersion ?? 1;

  const existingRecord = defaultWebhookOutboxStore.processedKeys.get(
    `fulfill-order:${orderId}`
  );
  const orderSnapshot = existingRecord
    ? {
        id: orderId,
        status: "PAID" as const,
        version: existingRecord.fulfilledOrderVersion,
      }
    : {
        id: orderId,
        status: "PENDING" as const,
        version: expectedVersion,
      };

  const outboxDecision = evaluateWebhookOutboxIdempotency({
    source: "RAZORPAY_WEBHOOK",
    order: orderSnapshot,
    expectedVersion,
    gatewayPaymentId: paymentEntity.id,
    outboxStore: defaultWebhookOutboxStore,
  });

  return c.json({
    status: "ok",
    outboxDecision,
  });
});

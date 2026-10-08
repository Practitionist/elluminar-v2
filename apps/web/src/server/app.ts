import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import {
  ExcalidrawSceneSchema,
  ExcalidrawSystemCanvasPlugin,
  extractExcalidrawTopology,
} from "@elluminar/domain-artifacts";
import {
  calculateIndiaGstBreakdown,
  computeCourseRevenueSplit,
  computeProjectEscrowSplit,
  EDTECH_SAC_CODE,
} from "@elluminar/domain-commerce";
import { aiMentorshipRouter } from "./routes/ai-mentorship";
import { identityRouter } from "./routes/identity";
import { storageRouter } from "./routes/storage";
import { webhooksRouter } from "./routes/webhooks";

const QuoteRequestSchema = z.object({
  itemType: z.enum(["COURSE", "PROJECT"]),
  amountMinor: z.string().regex(/^\d+$/),
  courseSplitTier: z
    .enum(["STANDARD_80_20", "CREATOR_DIRECT_90_10"])
    .optional(),
  supplierStateCode: z.string().length(2).default("29"),
  buyerStateCode: z.string().length(2).optional(),
  buyerGstin: z.string().optional(),
});

export const apiApp = new Hono()
  .basePath("/api/v2")
  .route("/identity", identityRouter)
  .route("/storage", storageRouter)
  .route("/webhooks", webhooksRouter)
  .route("/ai-mentorship", aiMentorshipRouter)
  .get("/health", (c) => {
    return c.json({
      status: "ok",
      architecture: "clean-sheet-hexagonal-monolith",
      gstSacCode: EDTECH_SAC_CODE,
      timestamp: new Date().toISOString(),
    });
  })
  .post(
    "/commerce/quote",
    zValidator("json", QuoteRequestSchema),
    (c) => {
      const body = c.req.valid("json");
      const netAmountMinor = BigInt(body.amountMinor);

      const gst = calculateIndiaGstBreakdown({
        taxableAmountMinor: netAmountMinor,
        supplierStateCode: body.supplierStateCode,
        buyerStateCode: body.buyerStateCode,
        buyerGstin: body.buyerGstin,
      });

      if (body.itemType === "COURSE") {
        const split = computeCourseRevenueSplit(
          netAmountMinor,
          body.courseSplitTier ?? "STANDARD_80_20"
        );
        return c.json({
          itemType: "COURSE" as const,
          sacCode: gst.sacCode,
          isInterState: gst.isInterState,
          taxableAmountMinor: gst.taxableAmountMinor.toString(),
          cgstAmountMinor: gst.cgstAmountMinor.toString(),
          sgstAmountMinor: gst.sgstAmountMinor.toString(),
          igstAmountMinor: gst.igstAmountMinor.toString(),
          totalInvoiceAmountMinor: gst.totalInvoiceAmountMinor.toString(),
          split: {
            creatorShareMinor: split.creatorShareMinor.toString(),
            platformShareMinor: split.platformShareMinor.toString(),
            creatorBps: split.creatorBps,
            platformBps: split.platformBps,
          },
        });
      }

      const split = computeProjectEscrowSplit(netAmountMinor);
      return c.json({
        itemType: "PROJECT" as const,
        sacCode: gst.sacCode,
        isInterState: gst.isInterState,
        taxableAmountMinor: gst.taxableAmountMinor.toString(),
        cgstAmountMinor: gst.cgstAmountMinor.toString(),
        sgstAmountMinor: gst.sgstAmountMinor.toString(),
        igstAmountMinor: gst.igstAmountMinor.toString(),
        totalInvoiceAmountMinor: gst.totalInvoiceAmountMinor.toString(),
        split: {
          mentorEscrowMinor: split.mentorEscrowMinor.toString(),
          authorRoyaltyEscrowMinor: split.authorRoyaltyEscrowMinor.toString(),
          platformShareMinor: split.platformShareMinor.toString(),
          mentorShareBps: split.mentorShareBps,
          authorRoyaltyBps: split.authorRoyaltyBps,
          platformShareBps: split.platformShareBps,
        },
      });
    }
  )
  .post(
    "/artifacts/extract-topology",
    zValidator("json", ExcalidrawSceneSchema),
    (c) => {
      const scene = c.req.valid("json");
      const topology = extractExcalidrawTopology(scene);
      const multimodalPromptSummary =
        ExcalidrawSystemCanvasPlugin.summarizeForMultimodalPrompt(topology);

      return c.json({
        kind: "SYSTEM_CANVAS" as const,
        topology,
        multimodalPromptSummary,
      });
    }
  );

export type AppType = typeof apiApp;

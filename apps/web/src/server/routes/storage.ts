import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import {
  generateR2PresignedReplayUrl,
  generateR2PresignedUploadUrl,
  type AllowedR2MimeType,
} from "../storage/r2-presigner";

const PresignUploadSchema = z.object({
  objectKey: z
    .string()
    .trim()
    .min(3)
    .max(512)
    .refine((val) => !val.includes(".."), {
      message: "Path traversal segments ('..') are not allowed in objectKey",
    }),
  contentType: z.string().trim().min(1),
  contentLengthBytes: z.number().int().positive(),
  expiresInSeconds: z.number().int().min(60).max(3600).optional(),
});

const PresignReplaySchema = z.object({
  objectKey: z
    .string()
    .trim()
    .min(3)
    .max(512)
    .refine((val) => !val.includes(".."), {
      message: "Path traversal segments ('..') are not allowed in objectKey",
    }),
  responseContentType: z
    .enum([
      "audio/ogg; codecs=opus",
      "image/png",
      "application/json",
    ])
    .optional(),
  expiresInSeconds: z.number().int().min(60).max(86400).optional(),
});

export const storageRouter = new Hono()
  .post(
    "/presign-upload",
    zValidator("json", PresignUploadSchema),
    async (c) => {
      const body = c.req.valid("json");
      const result = await generateR2PresignedUploadUrl({
        objectKey: body.objectKey,
        contentType: body.contentType,
        contentLengthBytes: body.contentLengthBytes,
        expiresInSeconds: body.expiresInSeconds,
      });

      if (result.status === "REJECTED") {
        return c.json(result, 422);
      }

      return c.json(result, 200);
    }
  )
  .post(
    "/presign-replay",
    zValidator("json", PresignReplaySchema),
    async (c) => {
      const body = c.req.valid("json");
      const result = await generateR2PresignedReplayUrl({
        objectKey: body.objectKey,
        responseContentType: body.responseContentType as
          | AllowedR2MimeType
          | undefined,
        expiresInSeconds: body.expiresInSeconds,
      });

      return c.json(result, 200);
    }
  );

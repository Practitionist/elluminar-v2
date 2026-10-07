import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import {
  resolveSignInStrategy,
  type EnterpriseSsoProviderRecord,
} from "@elluminar/domain-identity";

const DiscoverSsoRequestSchema = z.object({
  email: z.string().trim().email("Valid email address is required"),
  providers: z
    .array(
      z.object({
        id: z.string(),
        providerId: z.string(),
        organizationId: z.string(),
        organizationSlug: z.string(),
        organizationType: z.enum([
          "CREATOR",
          "ENTERPRISE",
          "UNIVERSITY",
          "HIRING_PARTNER",
        ]),
        domain: z.string(),
        issuer: z.string(),
        isVerified: z.boolean().optional(),
      })
    )
    .optional(),
});

export const identityRouter = new Hono().post(
  "/discover-sso",
  zValidator("json", DiscoverSsoRequestSchema),
  (c) => {
    const body = c.req.valid("json");
    const providers: readonly EnterpriseSsoProviderRecord[] =
      body.providers ?? [];

    const strategy = resolveSignInStrategy({
      email: body.email,
      providers,
    });

    return c.json(strategy);
  }
);

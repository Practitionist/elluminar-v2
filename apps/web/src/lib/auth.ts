import { domainToASCII } from "node:url";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { sso } from "@better-auth/sso";
import { db } from "@elluminar/db";
import {
  extractEmailDomain,
  isPersonalEmailDomain,
} from "@elluminar/domain-identity";

/**
 * Guard helper integrated with `@elluminar/domain-identity` to ensure personal consumer
 * email domains (`gmail.com`, `googlemail.com`, `outlook.com`, `yahoo.com`, `icloud.com`, etc.)
 * and their subdomains can NEVER be registered or provisioned as an Enterprise/University OIDC or SAML tenant domain.
 */
export function assertEnterpriseSsoDomainAllowed(domain: string): string {
  const stripped = domain.trim().toLowerCase().replace(/\.+$/, "");
  if (
    !stripped ||
    stripped.includes("@") ||
    stripped.startsWith(".") ||
    stripped.includes("..") ||
    /\s/.test(stripped)
  ) {
    throw new Error(`Invalid enterprise tenant DNS domain: "${domain}"`);
  }
  const normalizedDomain = domainToASCII(stripped).toLowerCase();
  if (!normalizedDomain) {
    throw new Error(`Invalid enterprise tenant DNS domain: "${domain}"`);
  }
  if (isPersonalEmailDomain(normalizedDomain)) {
    throw new Error(
      `Personal email domain "${normalizedDomain}" is prohibited from Enterprise OIDC/SAML SSO registration.`
    );
  }
  return normalizedDomain;
}

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  baseURL:
    process.env["BETTER_AUTH_URL"] ??
    process.env["NEXT_PUBLIC_APP_URL"] ??
    "http://localhost:3000",
  secret:
    process.env["BETTER_AUTH_SECRET"] ??
    "elluminar-v2-dev-secret-key-min-32-chars!!",
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  socialProviders: {
    google: {
      clientId: process.env["GOOGLE_CLIENT_ID"] ?? "google-dev-client-id",
      clientSecret:
        process.env["GOOGLE_CLIENT_SECRET"] ?? "google-dev-client-secret",
    },
  },
  plugins: [
    sso({
      modelName: "enterpriseSsoProvider",
      provisionUser: async ({ user, provider }) => {
        if (provider.domain) {
          assertEnterpriseSsoDomainAllowed(provider.domain);
        }
        const userDomain = extractEmailDomain(user.email);
        if (isPersonalEmailDomain(userDomain)) {
          throw new Error(
            `Enterprise SSO user provisioning blocked for personal email domain "${userDomain}".`
          );
        }
      },
    }),
  ],
  databaseHooks: {
    // Enforce domain guard at database persistence layer if an SSO provider row is inserted
    ...({
      ssoProvider: {
        create: {
          before: async (providerRecord: { domain?: string }) => {
            if (providerRecord.domain) {
              assertEnterpriseSsoDomainAllowed(providerRecord.domain);
            }
            return { data: providerRecord };
          },
        },
      },
    } as Record<string, unknown>),
  },
});

export type AuthInstance = typeof auth;

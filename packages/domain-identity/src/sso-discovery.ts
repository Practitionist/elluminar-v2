import { z } from "zod";

/**
 * Consumer / personal email domains strictly prohibited from claiming
 * B2B Enterprise or University OIDC/SAML SSO domains.
 */
export const PERSONAL_EMAIL_DOMAINS = new Set<string>([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "ymail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "proton.me",
  "protonmail.com",
  "aol.com",
  "zoho.com",
  "hey.com",
]);

export type SsoEligibleOrganizationType =
  | "CREATOR"
  | "ENTERPRISE"
  | "UNIVERSITY"
  | "HIRING_PARTNER";

export interface EnterpriseSsoProviderRecord {
  id: string;
  providerId: string;
  organizationId: string;
  organizationSlug: string;
  organizationType: SsoEligibleOrganizationType;
  domain: string;
  issuer: string;
  /** Defaults to true when loaded from verified DB table unless explicitly false */
  isVerified?: boolean;
}

export type SignInStrategyResult =
  | {
      mode: "ENTERPRISE_OIDC";
      redirectUrl: `/org/${string}/sso`;
      providerId: string;
      organizationSlug: string;
      domain: string;
    }
  | {
      mode: "STANDARD_OAUTH_OR_PASSWORD";
      domain: string;
      reason:
        | "PERSONAL_EMAIL_DOMAIN"
        | "NO_MATCHING_SSO_PROVIDER"
        | "UNVERIFIED_SSO_PROVIDER"
        | "NON_B2B_ORGANIZATION_TYPE";
    };

export const DiscoverSsoInputSchema = z.object({
  email: z.string().trim().email("Valid email address is required"),
});

/**
 * Extracts and normalizes the DNS domain component from an email address.
 */
export function extractEmailDomain(email: string): string {
  const normalized = email.trim().toLowerCase();
  const atIndex = normalized.lastIndexOf("@");
  if (atIndex <= 0 || atIndex === normalized.length - 1) {
    throw new Error(`Invalid email address: "${email}"`);
  }
  return normalized.slice(atIndex + 1);
}

/**
 * Returns true if the domain is a consumer/personal email provider that must
 * never be hijacked by an Enterprise SSO tenant configuration.
 */
export function isPersonalEmailDomain(domain: string): boolean {
  return PERSONAL_EMAIL_DOMAINS.has(domain.trim().toLowerCase());
}

/**
 * Dynamic B2B Domain Discovery (`resolveSignInStrategy`):
 * Given an email address on `/sign-in`:
 * 1. Extracts the domain (`@company.com`)
 * 2. Blocks personal email domains (`gmail.com`, `outlook.com`, `yahoo.com`, `icloud.com`, etc.)
 *    from ever claiming enterprise SSO
 * 3. Matches verified `EnterpriseSsoProvider` records strictly scoped to
 *    `ENTERPRISE` or `UNIVERSITY` organizations
 * 4. Returns either `{ mode: "ENTERPRISE_OIDC", redirectUrl: "/org/<slug>/sso", providerId }`
 *    or `{ mode: "STANDARD_OAUTH_OR_PASSWORD" }`.
 */
export function resolveSignInStrategy(params: {
  email: string;
  providers: readonly EnterpriseSsoProviderRecord[];
}): SignInStrategyResult {
  const domain = extractEmailDomain(params.email);

  if (isPersonalEmailDomain(domain)) {
    return {
      mode: "STANDARD_OAUTH_OR_PASSWORD",
      domain,
      reason: "PERSONAL_EMAIL_DOMAIN",
    };
  }

  const matchedProvider = params.providers.find(
    (p) => p.domain.trim().toLowerCase() === domain
  );

  if (!matchedProvider) {
    return {
      mode: "STANDARD_OAUTH_OR_PASSWORD",
      domain,
      reason: "NO_MATCHING_SSO_PROVIDER",
    };
  }

  if (matchedProvider.isVerified === false) {
    return {
      mode: "STANDARD_OAUTH_OR_PASSWORD",
      domain,
      reason: "UNVERIFIED_SSO_PROVIDER",
    };
  }

  if (
    matchedProvider.organizationType !== "ENTERPRISE" &&
    matchedProvider.organizationType !== "UNIVERSITY"
  ) {
    return {
      mode: "STANDARD_OAUTH_OR_PASSWORD",
      domain,
      reason: "NON_B2B_ORGANIZATION_TYPE",
    };
  }

  return {
    mode: "ENTERPRISE_OIDC",
    redirectUrl: `/org/${matchedProvider.organizationSlug}/sso`,
    providerId: matchedProvider.providerId,
    organizationSlug: matchedProvider.organizationSlug,
    domain,
  };
}

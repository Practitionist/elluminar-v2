import { domainToASCII } from "node:url";
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
 * Canonicalizes a raw DNS domain string into lowercase ASCII (punycode),
 * stripping trailing DNS root dots and rejecting empty/invalid labels.
 */
function normalizeDnsDomain(rawDomain: string): string {
  const stripped = rawDomain.trim().toLowerCase().replace(/\.+$/, "");
  if (
    !stripped ||
    stripped.startsWith(".") ||
    stripped.includes("..") ||
    /\s/.test(stripped)
  ) {
    return "";
  }
  const ascii = domainToASCII(stripped);
  return ascii.toLowerCase();
}

/**
 * Extracts and normalizes the DNS domain component from an email address.
 */
export function extractEmailDomain(email: string): string {
  const normalized = email.trim().toLowerCase();
  const firstAt = normalized.indexOf("@");
  const lastAt = normalized.lastIndexOf("@");
  if (firstAt <= 0 || firstAt !== lastAt || lastAt === normalized.length - 1) {
    throw new Error(`Invalid email address: "${email}"`);
  }
  const rawDomain = normalized.slice(lastAt + 1);
  const canonicalDomain = normalizeDnsDomain(rawDomain);
  if (!canonicalDomain) {
    throw new Error(`Invalid email address domain: "${email}"`);
  }
  return canonicalDomain;
}

/**
 * Returns true if the domain (or any parent registrable domain) is a consumer/personal
 * email provider that must never be hijacked by an Enterprise SSO tenant configuration.
 */
export function isPersonalEmailDomain(domain: string): boolean {
  const canonical = normalizeDnsDomain(domain);
  if (!canonical) {
    return false;
  }
  if (PERSONAL_EMAIL_DOMAINS.has(canonical)) {
    return true;
  }
  for (const personal of PERSONAL_EMAIL_DOMAINS) {
    if (canonical.endsWith(`.${personal}`)) {
      return true;
    }
  }
  return false;
}

/**
 * Dynamic B2B Domain Discovery (`resolveSignInStrategy`):
 * Given an email address on `/sign-in`:
 * 1. Extracts the canonical ASCII domain (`@company.com`)
 * 2. Blocks personal email domains (`gmail.com`, `googlemail.com`, `outlook.com`, `yahoo.com`, `icloud.com`, etc.)
 *    and their subdomains from ever claiming enterprise SSO
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
    (p) => normalizeDnsDomain(p.domain) === domain
  );

  if (!matchedProvider) {
    return {
      mode: "STANDARD_OAUTH_OR_PASSWORD",
      domain,
      reason: "NO_MATCHING_SSO_PROVIDER",
    };
  }

  if (isPersonalEmailDomain(matchedProvider.domain)) {
    return {
      mode: "STANDARD_OAUTH_OR_PASSWORD",
      domain,
      reason: "PERSONAL_EMAIL_DOMAIN",
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


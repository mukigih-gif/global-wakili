/**
 * Pure security header and CORS validation utilities — no HTTP, no database.
 *
 * Extracted from app.ts and security middleware to enable unit testing of
 * security configuration logic without a live Express server.
 *
 * Security context: Global Wakili is a multi-tenant legal platform.
 * CORS misconfiguration can allow any website to make authenticated API
 * calls on behalf of logged-in users (credentialed CORS bypass).
 */

export type NodeEnv = 'development' | 'test' | 'production';

export type CorsOriginConfig =
  | string[]   // explicit list of allowed origins
  | boolean    // true = allow all (dev only); false = deny all
  | undefined;

/**
 * Resolves the CORS origin configuration for the current environment.
 *
 * Rules:
 *   - If CORS_ORIGIN env var is set: use the parsed origin list
 *   - Production + no CORS_ORIGIN: return false (deny all cross-origin)
 *     Rationale: origin: true with credentials: true allows ANY website to
 *     make authenticated requests — a credentialed CORS bypass.
 *   - Development + no CORS_ORIGIN: return true (allow all for localhost dev)
 *
 * This function mirrors the logic in app.ts so both can be tested together.
 */
export function resolveCorsOrigin(
  corsOriginEnv: string[] | undefined,
  nodeEnv: NodeEnv,
): string[] | boolean {
  if (corsOriginEnv && corsOriginEnv.length > 0) {
    return corsOriginEnv;
  }

  return nodeEnv === 'production' ? false : true;
}

/**
 * Checks whether a given origin is allowed by the CORS configuration.
 *
 * Used for security testing / audit assertions — not for runtime enforcement
 * (the cors npm package handles that).
 */
export function isOriginAllowed(
  origin: string,
  config: string[] | boolean,
): boolean {
  if (config === true) return true;
  if (config === false) return false;
  return config.includes(origin);
}

/**
 * Returns the required security headers that must be present in all
 * API responses. Used to verify helmet is configured correctly.
 *
 * Helmet 7.x sets these by default; listing them here documents what
 * we rely on and allows drift detection.
 */
export const REQUIRED_SECURITY_HEADERS = [
  'x-content-type-options',     // nosniff — prevents MIME-type sniffing
  'x-frame-options',             // SAMEORIGIN — clickjacking protection
  'x-xss-protection',            // legacy, but still set by helmet
  'referrer-policy',             // controls referrer header leakage
] as const;

/**
 * Validates that the given headers object contains all required
 * security headers. Returns a list of any that are missing.
 */
export function findMissingSecurityHeaders(
  headers: Record<string, string | undefined>,
): string[] {
  const lowerHeaders = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
  );

  return REQUIRED_SECURITY_HEADERS.filter(
    (h) => !lowerHeaders[h],
  );
}

/**
 * Checks whether a CORS configuration is safe for production use
 * (does not allow all origins when credentials are enabled).
 */
export function isCorsProductionSafe(
  origin: string[] | boolean,
  credentialsEnabled: boolean,
): boolean {
  // The ONLY unsafe combination: wildcard origin + credentials enabled.
  // Any site can make authenticated requests → credentialed CORS bypass.
  if (origin === true && credentialsEnabled) return false;

  // All other cases are safe:
  // - origin: false (deny all cross-origin) ✅
  // - origin: true + credentials: false (public API, no auth forwarded) ✅
  // - origin: string[] (explicit list) ✅
  return true;
}

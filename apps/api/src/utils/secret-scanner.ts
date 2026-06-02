/**
 * Pure secret detection utilities — for audit and testing only.
 *
 * These functions help verify that configuration files contain only
 * placeholder values and not real credentials. Used in secret audit
 * tests (Gate 6 G6-D05) and CI pre-commit checks.
 *
 * NOT for runtime use — these are audit/test helpers.
 */

/**
 * Patterns that indicate a real PostgreSQL connection string
 * (not a placeholder like user:password@localhost).
 */
export const REAL_CONNECTION_STRING_PATTERNS = [
  /postgresql:\/\/[^:]+:[^@]{10,}@[a-z0-9-]+\.(neon\.tech|supabase\.co|amazonaws\.com|cloud\.google\.com)/i,
  /postgres:\/\/[^:]+:[^@]{10,}@[a-z0-9-]+\.(neon\.tech|supabase\.co|amazonaws\.com)/i,
];

/**
 * Patterns that look like real secret values (high-entropy, provider-specific).
 */
export const REAL_SECRET_PATTERNS = [
  /npg_[A-Za-z0-9]{15,}/,               // Neon Postgres token
  /sk_live_[A-Za-z0-9]{20,}/,           // Stripe live key
  /sk_test_[A-Za-z0-9]{20,}/,           // Stripe test key
  /AKIA[0-9A-Z]{16}(?![A-Za-z0-9/+])/,  // AWS access key (not followed by base64 chars)
  /ghp_[A-Za-z0-9]{36}/,                // GitHub personal access token
  /glpat-[A-Za-z0-9-_]{20}/,            // GitLab personal access token
];

/**
 * Placeholder patterns — strings that look like example/dummy values.
 */
export const PLACEHOLDER_PATTERNS = [
  /dev_key_change_in_production/i,
  /your[_-].*here/i,
  /change[_-]me/i,
  /your[_-](super[_-])?secret/i,
  /example/i,
  /placeholder/i,
  /localhost:\d{4}/,
  /user:password@localhost/,
];

/**
 * Returns true if the value matches any placeholder pattern.
 * Placeholder values are safe to commit in .env.example.
 */
export function isPlaceholderValue(value: string): boolean {
  return PLACEHOLDER_PATTERNS.some((p) => p.test(value));
}

/**
 * Returns true if the text contains a real (non-placeholder) connection string.
 * Used to verify .env.example does not contain live DB credentials.
 */
export function containsRealConnectionString(text: string): boolean {
  return REAL_CONNECTION_STRING_PATTERNS.some((p) => p.test(text));
}

/**
 * Returns true if the text contains a pattern matching a real secret.
 * Excludes matches that appear to be in base64-encoded binary data.
 */
export function containsRealSecret(text: string): boolean {
  return REAL_SECRET_PATTERNS.some((p) => p.test(text));
}

/**
 * Scans a config file's content and returns any non-placeholder secret values.
 * Lines beginning with # are ignored (comments).
 * Returns the line numbers + values of any suspicious entries.
 */
export function auditEnvFile(content: string): Array<{
  line: number;
  key: string;
  suspicious: boolean;
  reason: string;
}> {
  const results: Array<{ line: number; key: string; suspicious: boolean; reason: string }> = [];

  content.split('\n').forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) return;

    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) return;

    const key = line.slice(0, eqIdx).trim();
    const value = line.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');

    if (!value) return;

    if (containsRealConnectionString(value)) {
      results.push({
        line: index + 1,
        key,
        suspicious: true,
        reason: 'Real database connection string detected',
      });
    } else if (containsRealSecret(value)) {
      results.push({
        line: index + 1,
        key,
        suspicious: true,
        reason: 'Real secret token pattern detected',
      });
    }
  });

  return results;
}

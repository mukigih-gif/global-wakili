/**
 * Pure notification security utilities — no database required.
 *
 * Extracted from NotificationDeliveryService and related services to
 * enable unit testing of notification security properties.
 *
 * Security properties verified:
 *   1. Template interpolation uses \w+ key matching — no expression injection
 *   2. Missing variables produce empty strings (not errors/undefined)
 *   3. Null/undefined templates are safe (return null)
 *   4. All notification operations require tenantId (assertTenant)
 */

/**
 * Interpolates template variables using {{ varName }} syntax.
 *
 * Security properties:
 *   - Key pattern: \w+ (only [a-zA-Z0-9_]) — no arbitrary expressions
 *   - Missing variables → empty string (not undefined, not error)
 *   - Null/undefined template → null (safe no-op)
 *   - Values cast to String() — no object prototype access
 *
 * Mirrors NotificationDeliveryService.interpolate.
 */
export function interpolateTemplate(
  value: string | null | undefined,
  variables?: Record<string, unknown> | null,
): string | null {
  if (!value) return null;

  return value.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
    // Use hasOwnProperty to block prototype chain access (__proto__, constructor, etc.)
    if (!variables || !Object.prototype.hasOwnProperty.call(variables, key)) return '';
    const replacement = variables[key];
    if (replacement === undefined || replacement === null) return '';
    return String(replacement);
  });
}

/**
 * Validates that a tenant ID is present for notification operations.
 * All notifications must be scoped to a tenant.
 */
export function assertNotificationTenant(tenantId: string | null | undefined): void {
  if (!tenantId?.trim()) {
    throw Object.assign(
      new Error('Tenant ID is required for notification operations'),
      { statusCode: 400, code: 'NOTIFICATION_TENANT_REQUIRED' },
    );
  }
}

/**
 * Returns true if the template key is a valid variable name
 * (matches \w+ — only alphanumeric and underscore).
 * Used to validate that no injection patterns are present.
 */
export function isValidTemplateKey(key: string): boolean {
  return /^\w+$/.test(key);
}

/**
 * Extracts all variable keys from a template string.
 * Returns only keys that match the safe \w+ pattern.
 */
export function extractTemplateKeys(template: string): string[] {
  const matches = template.matchAll(/\{\{\s*(\w+)\s*\}\}/g);
  return [...matches].map((m) => m[1]!);
}

/**
 * Shared password-policy validator (F-16 / F-18).
 * Throws a 400 error (code WEAK_PASSWORD) with a specific message on failure.
 */
export function validatePasswordPolicy(password: string): void {
  const fail = (msg: string): never => {
    throw Object.assign(new Error(msg), { statusCode: 400, code: 'WEAK_PASSWORD' });
  };
  if (typeof password !== 'string' || password.length < 8) fail('Password must be at least 8 characters.');
  if (!/[A-Z]/.test(password)) fail('Password must contain at least one uppercase letter.');
  if (!/[a-z]/.test(password)) fail('Password must contain at least one lowercase letter.');
  if (!/[0-9]/.test(password)) fail('Password must contain at least one digit.');
  if (!/[^A-Za-z0-9]/.test(password)) fail('Password must contain at least one special character.');
}

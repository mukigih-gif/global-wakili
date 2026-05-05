import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';

export interface AuthTokenPayload extends JwtPayload {
  sub: string;
  userId: string;
  email?: string;
  tenantId?: string | null;
  role?: string | null;
  isSuperAdmin: boolean;
  systemRole?: string | null;
  tenantRole?: string | null;
  roleIds: string[];
  roleNames: string[];
  roles?: string[];
  primaryRole?: string | null;
}

export type TokenPayload = AuthTokenPayload;
export type JwtExpiresIn = NonNullable<SignOptions['expiresIn']>;

function requireJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret) {
    throw new Error('JWT_SECRET is required.');
  }

  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long.');
  }

  const lowered = secret.toLowerCase();

  if (
    lowered.includes('fallback') ||
    lowered.includes('changeme') ||
    lowered.includes('change-me') ||
    lowered.includes('password') ||
    lowered.includes('secret-2026')
  ) {
    throw new Error('JWT_SECRET appears unsafe. Replace it with a strong secret.');
  }

  return secret;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

export function resolveJwtExpiresIn(value = process.env.JWT_EXPIRES_IN): JwtExpiresIn {
  const raw = value?.trim();

  if (!raw) {
    return '2h' as JwtExpiresIn;
  }

  if (/^\d+$/.test(raw)) {
    return Number(raw);
  }

  if (/^\d+(ms|s|m|h|d|w|y)$/.test(raw)) {
    return raw as JwtExpiresIn;
  }

  throw new Error(
    'JWT_EXPIRES_IN must be a number of seconds or a duration such as 15m, 2h, or 7d.',
  );
}

/**
 * Signs a new session token.
 * Algorithms are restricted to HS256 for consistent server-side verification.
 */
export function signToken(
  payload: Omit<AuthTokenPayload, 'iat' | 'exp' | 'nbf' | 'jti'>,
  expiresIn: JwtExpiresIn = resolveJwtExpiresIn(),
): string {
  const signOptions: SignOptions = {
    expiresIn,
    algorithm: 'HS256',
  };

  return jwt.sign(payload, requireJwtSecret(), signOptions);
}

/**
 * Verifies a token and returns a normalized payload.
 * Throws when the token is missing, tampered with, expired, or malformed.
 */
export function verifyToken(token: string): AuthTokenPayload {
  if (!token || token.trim().length === 0) {
    throw new Error('Security Violation: Missing session token.');
  }

  const decoded = jwt.verify(token, requireJwtSecret(), {
    algorithms: ['HS256'],
  });

  if (typeof decoded === 'string') {
    throw new Error('Security Violation: Invalid session token payload.');
  }

  const payload = decoded as Partial<AuthTokenPayload> & JwtPayload;
  const userId = payload.sub ?? payload.userId;

  if (!userId || typeof userId !== 'string') {
    throw new Error('Security Violation: Session token is missing subject.');
  }

  const roleIds = normalizeStringArray(payload.roleIds);
  const roleNames = normalizeStringArray(payload.roleNames);
  const roles = normalizeStringArray(payload.roles).length > 0
    ? normalizeStringArray(payload.roles)
    : roleNames;

  return {
    ...payload,
    sub: userId,
    userId,
    email: typeof payload.email === 'string' ? payload.email : undefined,
    tenantId: typeof payload.tenantId === 'string' ? payload.tenantId : null,
    role: typeof payload.role === 'string' ? payload.role : null,
    isSuperAdmin: payload.isSuperAdmin === true,
    systemRole:
      typeof payload.systemRole === 'string' ? payload.systemRole : null,
    tenantRole:
      typeof payload.tenantRole === 'string' ? payload.tenantRole : null,
    roleIds,
    roleNames,
    roles,
    primaryRole:
      typeof payload.primaryRole === 'string' ? payload.primaryRole : null,
  };
}

/**
 * Converts JWT expiry values like 2h, 15m, 7d, or numeric seconds to milliseconds.
 */
export function parseJwtExpiryToMs(expiry: JwtExpiresIn): number {
  if (typeof expiry === 'number') {
    return expiry * 1000;
  }

  if (/^\d+$/.test(expiry)) {
    return Number(expiry) * 1000;
  }

  const match = expiry.match(/^(\d+)(ms|s|m|h|d|w|y)$/);

  if (!match) {
    return 2 * 60 * 60 * 1000;
  }

  const value = Number(match[1]);
  const unit = match[2];

  switch (unit) {
    case 'ms':
      return value;
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    case 'w':
      return value * 7 * 24 * 60 * 60 * 1000;
    case 'y':
      return value * 365 * 24 * 60 * 60 * 1000;
    default:
      return 2 * 60 * 60 * 1000;
  }
}
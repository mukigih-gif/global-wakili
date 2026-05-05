// apps/api/src/lib/mfa.ts

import {
  generateSecret,
  generateSync,
  generateURI,
  verifySync,
  NobleCryptoPlugin,
  ScureBase32Plugin,
} from 'otplib';

const MFA_ISSUER = 'Global Wakili Admin';
const MFA_DIGITS = 6;
const MFA_PERIOD_SECONDS = 30;
const MFA_WINDOW_STEPS = 1;
const MFA_EPOCH_TOLERANCE_SECONDS = MFA_WINDOW_STEPS * MFA_PERIOD_SECONDS;

const crypto = new NobleCryptoPlugin();
const base32 = new ScureBase32Plugin();

type MfaSecretResult = {
  secret: string;
  otpauth: string;
};

function normalizeRequiredString(value: string, fieldName: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalized;
}

/**
 * Generates a Base32 secret key and otpauth URI for MFA app enrollment.
 */
export function generateMfaSecret(userEmail: string): MfaSecretResult {
  const normalizedEmail = normalizeRequiredString(
    userEmail,
    'User email',
  ).toLowerCase();

  const secret = generateSecret({
    base32,
  });

  const otpauth = generateURI({
    issuer: MFA_ISSUER,
    label: normalizedEmail,
    secret,
    digits: MFA_DIGITS,
    period: MFA_PERIOD_SECONDS,
  });

  return {
    secret,
    otpauth,
  };
}

/**
 * Generates a TOTP token from a stored Base32 secret.
 */
export function generateMfaToken(secret: string): string {
  const normalizedSecret = normalizeRequiredString(secret, 'MFA secret');

  return generateSync({
    secret: normalizedSecret,
    digits: MFA_DIGITS,
    period: MFA_PERIOD_SECONDS,
    crypto,
    base32,
  });
}

/**
 * Verifies a 6-digit TOTP token against the stored Base32 secret.
 */
export function verifyMfaToken(token: string, secret: string): boolean {
  const normalizedToken = token.trim();
  const normalizedSecret = secret.trim();

  if (!normalizedToken || !normalizedSecret) {
    return false;
  }

  const result = verifySync({
    token: normalizedToken,
    secret: normalizedSecret,
    digits: MFA_DIGITS,
    period: MFA_PERIOD_SECONDS,
    epochTolerance: MFA_EPOCH_TOLERANCE_SECONDS,
    crypto,
    base32,
  });

  return result.valid;
}
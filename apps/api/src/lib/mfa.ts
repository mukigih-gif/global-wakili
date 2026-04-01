import { authenticator } from "otplib";

// Configured for high-sensitivity access
authenticator.options = { window: 1 }; // Only allow 1-step window for codes

/**
 * Generates a secret key and a URI for QR code generation.
 */
export const generateMfaSecret = (userEmail: string) => {
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(
    userEmail, 
    "Global Wakili Admin", 
    secret
  );
  return { secret, otpauth };
};

/**
 * Verifies a 6-digit TOTP token against the stored secret.
 */
export const verifyMfaToken = (token: string, secret: string): boolean => {
  return authenticator.check(token, secret);
};
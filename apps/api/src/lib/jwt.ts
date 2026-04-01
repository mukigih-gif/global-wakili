import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "concrete-grid-fallback-secret-2026";

export interface TokenPayload {
  userId: string;
  tenantId?: string; // Essential for scoping the request
  isSuperAdmin: boolean;
}

/**
 * Signs a new session token.
 * Algorithms are restricted to HS256 for consistent server-side verification.
 */
export const signToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "12h", 
    algorithm: "HS256",
  });
};

/**
 * Verifies a token and returns the payload.
 * Throws an error if the token is tampered with or expired.
 */
export const verifyToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    throw new Error("Security Violation: Invalid or expired session token.");
  }
};
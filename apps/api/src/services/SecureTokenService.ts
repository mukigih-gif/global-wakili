/**
 * SecureTokenService — generic single-use token store (F-18 + future flows).
 *
 * Only the SHA-256 hash of a token is ever persisted; the raw token is returned
 * once (for the email link) and never stored. Used for PASSWORD_RESET and future
 * EMAIL_INVITE / EMAIL_VERIFY / ACCOUNT_ACTIVATE flows (SecureTokenType).
 *
 * Runs on the base (non-tenant-scoped) Prisma client because some flows (e.g.
 * forgot-password) have no authenticated tenant context; tenantId is always
 * stored explicitly on the row.
 */
import crypto from 'crypto';
import type { SecureTokenType } from '@prisma/client';
import prisma from '../config/database';

export type VerifiedToken = { id: string; userId: string; tenantId: string };

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function tokenError(message: string, code: string): Error {
  return Object.assign(new Error(message), { statusCode: 400, code });
}

export const SecureTokenService = {
  /**
   * Generate a token: 32 random bytes (hex), store only its sha256 hash, return
   * the RAW token (for the email link — never persisted).
   */
  async generateToken(
    userId: string,
    tenantId: string,
    type: SecureTokenType,
    expiresInMinutes: number,
  ): Promise<string> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60_000);

    await prisma.secureToken.create({
      data: { userId, tenantId, type, tokenHash, expiresAt },
    });

    return rawToken;
  },

  /**
   * Verify a raw token for a given type: must exist, be unused, and not expired.
   * Throws 400 (INVALID_TOKEN / TOKEN_EXPIRED) otherwise.
   */
  async verifyToken(rawToken: string, type: SecureTokenType): Promise<VerifiedToken> {
    const tokenHash = hashToken(rawToken);

    const record = await prisma.secureToken.findFirst({
      where: { tokenHash, type, usedAt: null },
      select: { id: true, userId: true, tenantId: true, expiresAt: true },
    });

    if (!record) throw tokenError('Invalid or expired token', 'INVALID_TOKEN');
    if (record.expiresAt < new Date()) throw tokenError('Token has expired', 'TOKEN_EXPIRED');

    return { id: record.id, userId: record.userId, tenantId: record.tenantId };
  },

  /**
   * Consume a token: mark it used and delete every other unused token of the
   * same type for the user, so only one active token per type remains.
   */
  async consumeToken(tokenId: string, userId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const token = await tx.secureToken.update({
        where: { id: tokenId },
        data: { usedAt: new Date() },
        select: { type: true },
      });
      await tx.secureToken.deleteMany({
        where: { userId, type: token.type, usedAt: null, id: { not: tokenId } },
      });
    });
  },
};

export default SecureTokenService;

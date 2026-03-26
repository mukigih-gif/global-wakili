// ==========================================
// RATE LIMITING MIDDLEWARE
// ==========================================

import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import { Request } from 'express';

const prisma = new PrismaClient();

// General API rate limiter
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/ready';
  },
  handler: (req, res) => {
    logRateLimitViolation(req);
    res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: (req as any).rateLimit?.resetTime,
    });
  },
});

// Stricter limiter for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 attempts per 15 minutes
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for sensitive operations
export const sensitiveOperationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many sensitive operations, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

async function logRateLimitViolation(req: Request) {
  try {
    const ipAddress = req.ip || '';
    const userId = (req as any).user?.id;
    const tenantId = (req as any).context?.tenantId;

    if (!tenantId) return; // Skip if no tenant context

    await prisma.rateLimitLog.create({
      data: {
        tenantId,
        userId,
        ipAddress,
        endpoint: req.path,
        method: req.method,
        limitExceeded: true,
        windowStart: new Date(),
        windowEnd: new Date(Date.now() + 15 * 60 * 1000),
      },
    });
  } catch (error) {
    // Silently fail rate limit logging
    console.error('Failed to log rate limit violation:', error);
  }
}
import { createHash } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { AuditAction, AuditSeverity, Prisma } from '@prisma/client';

import prisma from '../config/database';

type AuditRouteMapping = {
  action: AuditAction;
  eventCode: string;
  entityType: string;
};

type JsonSafeValue = Prisma.InputJsonValue | null;

function getRouteMapping(method: string, path: string): AuditRouteMapping | null {
  const normalizedMethod = method.toUpperCase();
  const normalizedPath = path.toLowerCase();

  if (normalizedPath.includes('/matters')) {
    if (normalizedMethod === 'POST') {
      return {
        action: AuditAction.CREATE,
        eventCode: 'MATTER_CREATED',
        entityType: 'Matter',
      };
    }

    if (normalizedMethod === 'PUT' || normalizedMethod === 'PATCH') {
      return {
        action: AuditAction.UPDATE,
        eventCode: 'MATTER_UPDATED',
        entityType: 'Matter',
      };
    }

    if (normalizedMethod === 'DELETE') {
      return {
        action: AuditAction.DELETE,
        eventCode: 'MATTER_DELETED',
        entityType: 'Matter',
      };
    }
  }

  if (normalizedPath.includes('/registry')) {
    if (normalizedMethod === 'POST') {
      return {
        action: AuditAction.CREATE,
        eventCode: 'REGISTRY_RECORD_CREATED',
        entityType: 'Registry',
      };
    }

    if (normalizedMethod === 'PUT' || normalizedMethod === 'PATCH') {
      return {
        action: AuditAction.UPDATE,
        eventCode: 'REGISTRY_RECORD_UPDATED',
        entityType: 'Registry',
      };
    }

    if (normalizedMethod === 'DELETE') {
      return {
        action: AuditAction.DELETE,
        eventCode: 'REGISTRY_RECORD_DELETED',
        entityType: 'Registry',
      };
    }
  }

  return null;
}

function getUserId(req: Request): string | null {
  const candidate = req.user?.id ?? req.user?.sub;

  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : null;
}

function getTenantId(req: Request): string | null {
  return typeof req.tenantId === 'string' && req.tenantId.trim()
    ? req.tenantId.trim()
    : null;
}

function getRequestId(req: Request): string | undefined {
  return typeof req.id === 'string' && req.id.trim() ? req.id.trim() : undefined;
}

function getEntityId(data: unknown, req: Request): string {
  if (data && typeof data === 'object') {
    const record = data as {
      id?: unknown;
      data?: {
        id?: unknown;
      };
    };

    if (typeof record.id === 'string' && record.id.trim()) {
      return record.id.trim();
    }

    if (typeof record.data?.id === 'string' && record.data.id.trim()) {
      return record.data.id.trim();
    }
  }

  const routeId =
    req.params.id ??
    req.params.matterId ??
    req.params.registryId ??
    req.params.entityId;

  if (typeof routeId === 'string' && routeId.trim()) {
    return routeId.trim();
  }

  return getRequestId(req) ?? 'unknown';
}

function makeAuditHash(params: {
  tenantId: string;
  userId: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  requestId: string | undefined;
  createdAt: Date;
}): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        tenantId: params.tenantId,
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        requestId: params.requestId ?? null,
        createdAt: params.createdAt.toISOString(),
      }),
    )
    .digest('hex');
}

function toJsonValue(value: unknown): JsonSafeValue {
  if (value === null || value === undefined) {
    return null; // Changed from Prisma.JsonNull to standard null
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJsonValue(item)) as Prisma.InputJsonArray;
  }

  if (typeof value === 'object') {
    const output: Record<string, JsonSafeValue> = {};

    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      output[key] = toJsonValue(nestedValue);
    }

    return output as Prisma.InputJsonObject;
  }

  return String(value);
}

function sanitizeBody(body: unknown): Prisma.InputJsonObject {
  if (!body || typeof body !== 'object') {
    return {
      value: toJsonValue(body),
    } as Prisma.InputJsonObject;
  }

  const sanitized: Record<string, JsonSafeValue> = {};

  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (/password|token|secret|apiKey|authorization|credential/i.test(key)) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = toJsonValue(value);
    }
  }

  return sanitized as Prisma.InputJsonObject;
}

function buildAfterData(params: {
  eventCode: string;
  method: string;
  path: string;
  requestId: string | undefined;
  requestBody: Prisma.InputJsonObject;
  responseStatusCode: number;
}): Prisma.InputJsonObject {
  const afterData: Record<string, JsonSafeValue> = {
    eventCode: params.eventCode,
    method: params.method,
    path: params.path,
    requestId: params.requestId ?? null, // Changed from Prisma.JsonNull to standard null
    requestBody: params.requestBody,
    responseStatusCode: params.responseStatusCode,
  };

  return afterData as Prisma.InputJsonObject;
}

export function auditTrailMiddleware(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);

  res.json = (body: unknown): Response => {
    const mapping = getRouteMapping(req.method, req.path);
    const tenantId = getTenantId(req);
    const userId = getUserId(req);

    if (mapping && tenantId && res.statusCode < 400) {
      const createdAt = new Date();
      const entityId = getEntityId(body, req);
      const requestId = getRequestId(req);

      prisma.auditLog
        .create({
          data: {
            tenantId,
            userId,
            action: mapping.action,
            severity: AuditSeverity.INFO,
            entityType: mapping.entityType,
            entityId,
            beforeData: Prisma.DbNull, // Explicit Database null for the top-level JSON field
            afterData: buildAfterData({
              eventCode: mapping.eventCode,
              method: req.method,
              path: req.originalUrl ?? req.path,
              requestId,
              requestBody: sanitizeBody(req.body),
              responseStatusCode: res.statusCode,
            }),
            changedFields: [],
            ipAddress: req.ip ?? null,
            userAgent:
              typeof req.headers['user-agent'] === 'string'
                ? req.headers['user-agent']
                : null,
            correlationId: requestId ?? null,
            hash: makeAuditHash({
              tenantId,
              userId,
              action: mapping.action,
              entityType: mapping.entityType,
              entityId,
              requestId,
              createdAt,
            }),
            success: true,
            createdAt,
          },
        })
        .catch((error: unknown) => {
          console.error('[AUDIT_TRAIL_ERROR] Failed to record audit log', error);
        });
    }

    return originalJson(body);
  };

  next();
}

export default auditTrailMiddleware;
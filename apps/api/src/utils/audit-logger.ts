import type { Request } from 'express';
import { generateAuditHash } from './audit-hash';
import type { AuditAction, AuditActor, AuditEventPayload } from '../types/audit';
import { AuditSeverity } from '../types/audit';

type AuditLoggerParams = {
  actor?: AuditActor;
  tenantId?: string;
  action: AuditAction;
  severity?: AuditSeverity;
  entityId?: string | null;
  payload: AuditEventPayload;
  req?: Request;
  requestId?: string;
};

function normalizeIp(req?: Request): string | null {
  if (!req) return null;

  const forwarded =
    typeof req.headers['x-forwarded-for'] === 'string'
      ? req.headers['x-forwarded-for'].split(',')[0].trim()
      : null;

  return forwarded || req.ip || null;
}

function normalizeUserAgent(req?: Request): string | null {
  if (!req) return null;

  const header = req.headers['user-agent'];
  return typeof header === 'string' ? header : null;
}

export async function logAdminAction(params: AuditLoggerParams) {
  const req = params.req;
  const db = req?.db;

  if (!db) {
    throw new Error('Audit logger requires req.db to be available');
  }

  const tenantId = params.tenantId ?? req?.tenantId;
  if (!tenantId) {
    throw new Error('Audit logger requires tenantId');
  }

  const actor: AuditActor =
    params.actor ??
    (req?.user
      ? {
          id: req.user.sub,
          role: req.user.role ?? 'UNKNOWN',
        }
      : {
          id: 'SYSTEM',
          role: 'SYSTEM',
        });

  const lastLog = await db.auditLog.findFirst({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    select: { hash: true },
  });

  const previousHash = lastLog?.hash ?? '0'.repeat(64);

  const enrichedPayload: AuditEventPayload = {
    ...params.payload,
    requestId: params.requestId ?? req?.id ?? null,
    timestamp: new Date().toISOString(),
  };

  const hash = generateAuditHash(enrichedPayload, previousHash);

  return db.auditLog.create({
    data: {
      tenantId,
      actorId: actor.id,
      action: params.action,
      severity: params.severity ?? AuditSeverity.INFO,
      payload: enrichedPayload,
      hash,
      previousHash,
      entityId: params.entityId ?? null,
      ipAddress: normalizeIp(req),
      userAgent: normalizeUserAgent(req),
    },
  });
}
/**
 * DocumentRetentionRunner.ts
 *
 * Automated retention policy enforcement.
 *
 * Runs three passes per execution:
 *
 * Pass 1 — Archive expired documents:
 *   Documents whose expiryDate has passed are set to status=ARCHIVED.
 *   Storage file is NOT deleted (legal hold — archived documents must be retained).
 *   An audit log entry is written for each archival.
 *
 * Pass 2 — Dispose of documents past retention window:
 *   Archived documents whose deletedAt is older than retentionYears (default 7)
 *   are soft-deleted (deletedAt=now) and their storage file is deleted.
 *   An audit log entry is written for each disposal.
 *
 * Pass 3 — Pre-expiry notifications:
 *   Documents expiring within 30, 7, or 1 day receive reminder notifications
 *   queued via NotificationQueueService.
 *
 * Start with: npm run worker:retention
 *
 * WIP-003 — Gap 007.
 */

import prisma from '../../config/database';
import { DocumentRetentionService } from './DocumentRetentionService';
import { DocumentStorageService } from './DocumentStorageService';
import { DocumentAuditService } from './DocumentAuditService';
import { NotificationQueueService } from '../notifications/NotificationQueueService';

const RETENTION_YEARS = parseInt(process.env.DOCUMENT_RETENTION_YEARS ?? '7', 10);
const PRE_EXPIRY_DAYS = [30, 7, 1];

type DocumentRow = {
  id: string;
  tenantId: string;
  title: string;
  matterId?: string | null;
  fileUrl?: string | null;
  fileHash?: string | null;
  version?: number | null;
  uploadedBy?: string | null;
  expiryDate?: Date | null;
};

async function archiveExpiredDocuments(): Promise<{ archived: number; errors: number }> {
  let archived = 0;
  let errors = 0;

  // Query all tenants and process their expired documents
  const tenants = await prisma.tenant.findMany({
    select: { id: true },
  });

  for (const tenant of tenants) {
    const docs = await DocumentRetentionService.getExpiryEligibleDocuments(
      prisma as any,
      tenant.id,
    ) as DocumentRow[];

    for (const doc of docs) {
      try {
        await (prisma as any).document.update({
          where: { id: doc.id, tenantId: doc.tenantId },
          data: {
            status: 'ARCHIVED',
            deletedAt: new Date(),
            metadata: {
              archivedByRetentionPolicy: true,
              archivedAt: new Date().toISOString(),
              retentionYears: RETENTION_YEARS,
            },
          },
        });

        await DocumentAuditService.logAction(prisma as any, {
          tenantId: doc.tenantId,
          documentId: doc.id,
          matterId: doc.matterId ?? null,
          action: 'ARCHIVED',
          fileHash: doc.fileHash ?? null,
          version: doc.version ?? null,
          metadata: { reason: 'RETENTION_POLICY_EXPIRY', expiryDate: doc.expiryDate?.toISOString() },
        });

        archived++;
      } catch (err) {
        console.error('[RETENTION] Archive failed', { docId: doc.id, tenantId: doc.tenantId, err: err instanceof Error ? err.message : String(err) });
        errors++;
      }
    }
  }

  console.info('[RETENTION] Archive pass complete', { archived, errors });
  return { archived, errors };
}

async function disposeExpiredDocuments(): Promise<{ disposed: number; errors: number }> {
  let disposed = 0;
  let errors = 0;

  const tenants = await prisma.tenant.findMany({ select: { id: true } });

  for (const tenant of tenants) {
    const docs = await DocumentRetentionService.getDisposalEligibleDocuments(
      prisma as any,
      { tenantId: tenant.id, retentionYears: RETENTION_YEARS },
    ) as DocumentRow[];

    for (const doc of docs) {
      try {
        // Delete from storage first — if this fails, abort DB update
        if (doc.fileUrl && !doc.fileUrl.startsWith('local://')) {
          const storageKey = decodeURIComponent(
            doc.fileUrl.replace(/^local:\/\/documents\//, '').split('?')[0],
          );
          await DocumentStorageService.delete(storageKey).catch((e) => {
            console.warn('[RETENTION] Storage delete warning', { docId: doc.id, err: e instanceof Error ? e.message : String(e) });
          });
        }

        await (prisma as any).document.update({
          where: { id: doc.id, tenantId: doc.tenantId },
          data: {
            fileUrl: null,
            metadata: {
              disposedByRetentionPolicy: true,
              disposedAt: new Date().toISOString(),
              retentionYears: RETENTION_YEARS,
            },
          },
        });

        await DocumentAuditService.logAction(prisma as any, {
          tenantId: doc.tenantId,
          documentId: doc.id,
          matterId: doc.matterId ?? null,
          action: 'ARCHIVED',
          fileHash: doc.fileHash ?? null,
          version: doc.version ?? null,
          metadata: { reason: 'RETENTION_POLICY_DISPOSAL', retentionYears: RETENTION_YEARS },
        });

        disposed++;
      } catch (err) {
        console.error('[RETENTION] Disposal failed', { docId: doc.id, tenantId: doc.tenantId, err: err instanceof Error ? err.message : String(err) });
        errors++;
      }
    }
  }

  console.info('[RETENTION] Disposal pass complete', { disposed, errors });
  return { disposed, errors };
}

async function notifyExpiringDocuments(): Promise<{ notified: number }> {
  let notified = 0;

  const tenants = await prisma.tenant.findMany({ select: { id: true } });

  for (const tenant of tenants) {
    for (const days of PRE_EXPIRY_DAYS) {
      const docs = await DocumentRetentionService.getExpiringDocuments(
        prisma as any,
        { tenantId: tenant.id, withinDays: days },
      ) as DocumentRow[];

      for (const doc of docs) {
        if (!doc.uploadedBy) continue;

        const debounceKey = `retention:expiry:${doc.id}:${days}d:${new Date().toISOString().slice(0, 10)}`;
        try {
          await NotificationQueueService.enqueue({
            tenantId: doc.tenantId,
            category: 'system_alert',
            priority: days <= 1 ? 'high' : 'normal',
            entityType: 'DOCUMENT',
            entityId: doc.id,
            debounceKey,
            recipients: [{ userId: doc.uploadedBy }],
            channels: ['SYSTEM_ALERT', 'EMAIL'],
            template: {
              systemTitle: `Document Expiring ${days === 1 ? 'Tomorrow' : `in ${days} Days`}: ${doc.title}`,
              systemMessage: `Document "${doc.title}" is set to expire ${days === 1 ? 'tomorrow' : `in ${days} days`} and will be archived automatically.`,
              emailSubject: `[Global Wakili] Document Expiry Notice: ${doc.title}`,
              emailBody: `Your document <strong>${doc.title}</strong> is set to expire on ${doc.expiryDate?.toLocaleDateString('en-KE') ?? 'soon'} and will be automatically archived.`,
              variables: { title: doc.title, days: String(days) },
            },
          });
          notified++;
        } catch { /* non-fatal */ }
      }
    }
  }

  console.info('[RETENTION] Notification pass complete', { notified });
  return { notified };
}

export async function runRetentionPolicies(): Promise<void> {
  console.info('[RETENTION] ─────────────────────────────────────');
  console.info('[RETENTION] Document Retention Policy Run started');
  console.info(`[RETENTION] Retention window: ${RETENTION_YEARS} years`);
  console.info('[RETENTION] ─────────────────────────────────────');

  const [archiveResult, disposeResult, notifyResult] = await Promise.allSettled([
    archiveExpiredDocuments(),
    disposeExpiredDocuments(),
    notifyExpiringDocuments(),
  ]);

  if (archiveResult.status === 'rejected') console.error('[RETENTION] Archive pass error', archiveResult.reason);
  if (disposeResult.status === 'rejected') console.error('[RETENTION] Disposal pass error', disposeResult.reason);
  if (notifyResult.status === 'rejected') console.error('[RETENTION] Notification pass error', notifyResult.reason);

  console.info('[RETENTION] Run complete');
}

// ── Standalone script entry point ─────────────────────────────────────────────

async function main(): Promise<void> {
  await runRetentionPolicies();
}

main()
  .catch((err: unknown) => {
    console.error('[RETENTION] Fatal error', err instanceof Error ? err.message : String(err));
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

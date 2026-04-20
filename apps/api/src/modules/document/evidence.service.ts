import type { TenantDocumentDbClient } from './document.types';
import { DocumentService } from './DocumentService';

export interface EvidenceMetadata {
  exhibitNumber: string;
  witnessName?: string | null;
  isOriginal: boolean;
  dateAcquired: Date | string;
  custodyNote?: string | null;
  sourceLocation?: string | null;
  policeObNumber?: string | null;
}

function normalizeEvidenceDate(value: Date | string): Date {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error('Invalid evidence acquisition date'), {
      statusCode: 422,
      code: 'INVALID_EVIDENCE_ACQUISITION_DATE',
    });
  }
  return parsed;
}

function normalizeExhibitNumber(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (!normalized) {
    throw Object.assign(new Error('Exhibit number is required'), {
      statusCode: 422,
      code: 'EVIDENCE_EXHIBIT_NUMBER_REQUIRED',
    });
  }
  return normalized;
}

export class EvidenceService {
  static async uploadEvidence(
    db: TenantDocumentDbClient,
    payload: {
      tenantId: string;
      matterId: string;
      uploadedBy: string;
      fileName: string;
      title?: string | null;
      description?: string | null;
      mimeType: string;
      fileSize: number;
      buffer: Buffer;
      expiryDate?: Date | string | null;
      metadata?: Record<string, unknown> | null;
    },
    evidenceMetadata: EvidenceMetadata,
  ) {
    if (!payload.matterId) {
      throw Object.assign(new Error('Matter ID is required for evidence upload'), {
        statusCode: 422,
        code: 'EVIDENCE_MATTER_REQUIRED',
      });
    }

    const exhibitNumber = normalizeExhibitNumber(evidenceMetadata.exhibitNumber);
    const dateAcquired = normalizeEvidenceDate(evidenceMetadata.dateAcquired);

    if (db.document.findMany) {
      const existing = await db.document.findMany({
        where: {
          tenantId: payload.tenantId,
          matterId: payload.matterId,
          deletedAt: null,
        },
        select: {
          id: true,
          title: true,
        },
      });

      const duplicate = existing.find((doc: any) =>
        String(doc.title ?? '').toUpperCase().startsWith(`EXHIBIT ${exhibitNumber}:`),
      );

      if (duplicate) {
        throw Object.assign(
          new Error(`Evidence exhibit number already exists in this matter: ${exhibitNumber}`),
          {
            statusCode: 409,
            code: 'DUPLICATE_EVIDENCE_EXHIBIT_NUMBER',
          },
        );
      }
    }

    const title = `EXHIBIT ${exhibitNumber}: ${payload.title?.trim() || payload.fileName}`;

    return DocumentService.createDocument(db, {
      ...payload,
      title,
      metadata: {
        ...(payload.metadata ?? {}),
        category: 'EVIDENCE',
        isRestricted: true,
        isConfidential: true,
        evidence: {
          exhibitNumber,
          witnessName: evidenceMetadata.witnessName?.trim() ?? null,
          isOriginal: evidenceMetadata.isOriginal,
          dateAcquired: dateAcquired.toISOString(),
          custodyNote: evidenceMetadata.custodyNote?.trim() ?? null,
          sourceLocation: evidenceMetadata.sourceLocation?.trim() ?? null,
          policeObNumber: evidenceMetadata.policeObNumber?.trim() ?? null,
          uploadedAt: new Date().toISOString(),
        },
      },
    });
  }
}
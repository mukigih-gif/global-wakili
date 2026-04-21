// apps/api/src/modules/hr/hr-document.service.ts

import crypto from 'crypto';
import { Prisma, prisma } from '@global-wakili/database';

type DbClient = typeof prisma | Prisma.TransactionClient | any;

export type HrDocumentStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'PENDING_SIGNATURE'
  | 'SIGNED'
  | 'EXPIRED'
  | 'REVOKED'
  | 'ARCHIVED';

export type HrDocumentCategory =
  | 'EMPLOYMENT_CONTRACT'
  | 'POLICY_ACKNOWLEDGEMENT'
  | 'ID_DOCUMENT'
  | 'CERTIFICATE'
  | 'PERFORMANCE'
  | 'DISCIPLINARY'
  | 'LEAVE'
  | 'PAYROLL'
  | 'GENERAL';

export type SignatureStatus =
  | 'PENDING'
  | 'SIGNED'
  | 'DECLINED'
  | 'EXPIRED'
  | 'REVOKED';

export type CreateHrDocumentInput = {
  tenantId: string;
  employeeId: string;
  actorId: string;
  title: string;
  category: HrDocumentCategory | string;
  description?: string | null;
  documentId?: string | null;
  storageKey?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
  contentHash?: string | null;
  requiresSignature?: boolean;
  expiresAt?: Date | null;
  metadata?: Record<string, unknown>;
};

export type SignatureRequestInput = {
  tenantId: string;
  hrDocumentId: string;
  actorId: string;
  signerEmployeeId?: string | null;
  signerUserId?: string | null;
  signerName?: string | null;
  signerEmail?: string | null;
  expiresAt?: Date | null;
  message?: string | null;
  metadata?: Record<string, unknown>;
};

export type SignDocumentInput = {
  tenantId: string;
  signatureId: string;
  signerUserId?: string | null;
  signerEmployeeId?: string | null;
  signerName?: string | null;
  signerEmail?: string | null;
  signatureText?: string | null;
  signatureImageHash?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  consentStatement: string;
  signedPayloadHash?: string | null;
};

function delegate(db: DbClient, name: string) {
  const modelDelegate = db[name];

  if (!modelDelegate) {
    throw Object.assign(
      new Error(`Prisma model delegate "${name}" is missing. Apply HR schema before activating this workflow.`),
      {
        statusCode: 500,
        code: 'HR_SCHEMA_DELEGATE_MISSING',
        model: name,
      },
    );
  }

  return modelDelegate;
}

function asRecord(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, any>;
}

function appendHistory(metadata: unknown, entry: Record<string, unknown>) {
  const current = asRecord(metadata);
  const history = Array.isArray(current.history) ? current.history : [];

  return {
    ...current,
    history: [...history, entry],
  };
}

function sha256(value: unknown): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex');
}

function makeSignatureCertificate(input: {
  tenantId: string;
  hrDocumentId: string;
  signatureId: string;
  signerName?: string | null;
  signerEmail?: string | null;
  signedAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
  consentStatement: string;
  documentHash?: string | null;
  signedPayloadHash?: string | null;
}) {
  const certificatePayload = {
    tenantId: input.tenantId,
    hrDocumentId: input.hrDocumentId,
    signatureId: input.signatureId,
    signerName: input.signerName ?? null,
    signerEmail: input.signerEmail ?? null,
    signedAt: input.signedAt.toISOString(),
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    consentStatement: input.consentStatement,
    documentHash: input.documentHash ?? null,
    signedPayloadHash: input.signedPayloadHash ?? null,
  };

  return {
    payload: certificatePayload,
    certificateHash: sha256(certificatePayload),
  };
}

export class HrDocumentService {
  async createDocument(input: CreateHrDocumentInput) {
    const employee = delegate(prisma, 'employee');
    const hrDocument = delegate(prisma, 'hrDocument');

    const existingEmployee = await employee.findFirst({
      where: {
        id: input.employeeId,
        tenantId: input.tenantId,
      },
      select: { id: true },
    });

    if (!existingEmployee) {
      throw Object.assign(new Error('Employee not found'), {
        statusCode: 404,
        code: 'EMPLOYEE_NOT_FOUND',
      });
    }

    const contentHash = input.contentHash ?? sha256({
      tenantId: input.tenantId,
      employeeId: input.employeeId,
      title: input.title,
      documentId: input.documentId ?? null,
      storageKey: input.storageKey ?? null,
      fileName: input.fileName ?? null,
      createdAt: new Date().toISOString(),
    });

    return hrDocument.create({
      data: {
        tenantId: input.tenantId,
        employeeId: input.employeeId,
        title: input.title,
        category: input.category,
        description: input.description ?? null,
        documentId: input.documentId ?? null,
        storageKey: input.storageKey ?? null,
        fileName: input.fileName ?? null,
        mimeType: input.mimeType ?? null,
        fileSizeBytes: input.fileSizeBytes ?? null,
        contentHash,
        requiresSignature: input.requiresSignature ?? false,
        status: input.requiresSignature ? 'PENDING_SIGNATURE' : 'ACTIVE',
        expiresAt: input.expiresAt ?? null,
        createdById: input.actorId,
        metadata: appendHistory(input.metadata, {
          action: 'HR_DOCUMENT_CREATED',
          actorId: input.actorId,
          contentHash,
          at: new Date().toISOString(),
        }) as any,
      },
    });
  }

  async requestSignature(input: SignatureRequestInput) {
    return prisma.$transaction(async (tx) => {
      const hrDocument = delegate(tx, 'hrDocument');
      const hrDocumentSignature = delegate(tx, 'hrDocumentSignature');

      const document = await hrDocument.findFirst({
        where: {
          id: input.hrDocumentId,
          tenantId: input.tenantId,
        },
      });

      if (!document) {
        throw Object.assign(new Error('HR document not found'), {
          statusCode: 404,
          code: 'HR_DOCUMENT_NOT_FOUND',
        });
      }

      if (['REVOKED', 'ARCHIVED', 'EXPIRED'].includes(String(document.status))) {
        throw Object.assign(new Error('Cannot request signature for inactive HR document'), {
          statusCode: 409,
          code: 'HR_DOCUMENT_NOT_SIGNABLE',
        });
      }

      const signature = await hrDocumentSignature.create({
        data: {
          tenantId: input.tenantId,
          hrDocumentId: input.hrDocumentId,
          employeeId: document.employeeId,
          signerEmployeeId: input.signerEmployeeId ?? document.employeeId,
          signerUserId: input.signerUserId ?? null,
          signerName: input.signerName ?? null,
          signerEmail: input.signerEmail ?? null,
          status: 'PENDING',
          requestedById: input.actorId,
          requestedAt: new Date(),
          expiresAt: input.expiresAt ?? null,
          message: input.message ?? null,
          metadata: input.metadata ?? {},
        },
      });

      await hrDocument.update({
        where: {
          id: input.hrDocumentId,
        },
        data: {
          requiresSignature: true,
          status: 'PENDING_SIGNATURE',
          metadata: appendHistory(document.metadata, {
            action: 'HR_DOCUMENT_SIGNATURE_REQUESTED',
            actorId: input.actorId,
            signatureId: signature.id,
            at: new Date().toISOString(),
          }) as any,
        },
      });

      return signature;
    });
  }

  async signDocument(input: SignDocumentInput) {
    if (!input.consentStatement?.trim()) {
      throw Object.assign(new Error('Consent statement is required for e-signature'), {
        statusCode: 400,
        code: 'ESIGN_CONSENT_REQUIRED',
      });
    }

    return prisma.$transaction(async (tx) => {
      const hrDocument = delegate(tx, 'hrDocument');
      const hrDocumentSignature = delegate(tx, 'hrDocumentSignature');

      const signature = await hrDocumentSignature.findFirst({
        where: {
          id: input.signatureId,
          tenantId: input.tenantId,
        },
      });

      if (!signature) {
        throw Object.assign(new Error('Signature request not found'), {
          statusCode: 404,
          code: 'HR_SIGNATURE_REQUEST_NOT_FOUND',
        });
      }

      if (signature.status !== 'PENDING') {
        throw Object.assign(new Error('Signature request is no longer pending'), {
          statusCode: 409,
          code: 'HR_SIGNATURE_NOT_PENDING',
        });
      }

      if (signature.expiresAt && new Date(signature.expiresAt) < new Date()) {
        await hrDocumentSignature.update({
          where: { id: signature.id },
          data: {
            status: 'EXPIRED',
            expiredAt: new Date(),
          },
        });

        throw Object.assign(new Error('Signature request has expired'), {
          statusCode: 409,
          code: 'HR_SIGNATURE_EXPIRED',
        });
      }

      const document = await hrDocument.findFirst({
        where: {
          id: signature.hrDocumentId,
          tenantId: input.tenantId,
        },
      });

      if (!document) {
        throw Object.assign(new Error('HR document not found'), {
          statusCode: 404,
          code: 'HR_DOCUMENT_NOT_FOUND',
        });
      }

      const signedAt = new Date();

      const certificate = makeSignatureCertificate({
        tenantId: input.tenantId,
        hrDocumentId: document.id,
        signatureId: signature.id,
        signerName: input.signerName ?? signature.signerName,
        signerEmail: input.signerEmail ?? signature.signerEmail,
        signedAt,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        consentStatement: input.consentStatement,
        documentHash: document.contentHash ?? null,
        signedPayloadHash: input.signedPayloadHash ?? null,
      });

      const updatedSignature = await hrDocumentSignature.update({
        where: {
          id: signature.id,
        },
        data: {
          status: 'SIGNED',
          signedAt,
          signerUserId: input.signerUserId ?? signature.signerUserId,
          signerEmployeeId: input.signerEmployeeId ?? signature.signerEmployeeId,
          signerName: input.signerName ?? signature.signerName,
          signerEmail: input.signerEmail ?? signature.signerEmail,
          signatureText: input.signatureText ?? null,
          signatureImageHash: input.signatureImageHash ?? null,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
          consentStatement: input.consentStatement,
          signedPayloadHash: input.signedPayloadHash ?? null,
          certificateHash: certificate.certificateHash,
          certificatePayload: certificate.payload as any,
          metadata: appendHistory(signature.metadata, {
            action: 'HR_DOCUMENT_SIGNED',
            certificateHash: certificate.certificateHash,
            at: signedAt.toISOString(),
          }) as any,
        },
      });

      const pendingCount = await hrDocumentSignature.count({
        where: {
          tenantId: input.tenantId,
          hrDocumentId: document.id,
          status: 'PENDING',
        },
      });

      if (pendingCount === 0) {
        await hrDocument.update({
          where: {
            id: document.id,
          },
          data: {
            status: 'SIGNED',
            signedAt,
            metadata: appendHistory(document.metadata, {
              action: 'HR_DOCUMENT_FULLY_SIGNED',
              signatureId: signature.id,
              certificateHash: certificate.certificateHash,
              at: signedAt.toISOString(),
            }) as any,
          },
        });
      }

      return updatedSignature;
    });
  }

  async revokeDocument(input: {
    tenantId: string;
    hrDocumentId: string;
    actorId: string;
    reason: string;
  }) {
    if (!input.reason?.trim()) {
      throw Object.assign(new Error('Revocation reason is required'), {
        statusCode: 400,
        code: 'HR_DOCUMENT_REVOCATION_REASON_REQUIRED',
      });
    }

    const hrDocument = delegate(prisma, 'hrDocument');

    const document = await hrDocument.findFirst({
      where: {
        id: input.hrDocumentId,
        tenantId: input.tenantId,
      },
    });

    if (!document) {
      throw Object.assign(new Error('HR document not found'), {
        statusCode: 404,
        code: 'HR_DOCUMENT_NOT_FOUND',
      });
    }

    return hrDocument.update({
      where: {
        id: input.hrDocumentId,
      },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revokedById: input.actorId,
        revocationReason: input.reason,
        metadata: appendHistory(document.metadata, {
          action: 'HR_DOCUMENT_REVOKED',
          actorId: input.actorId,
          reason: input.reason,
          at: new Date().toISOString(),
        }) as any,
      },
    });
  }

  async listDocuments(input: {
    tenantId: string;
    employeeId?: string;
    category?: HrDocumentCategory | string;
    status?: HrDocumentStatus | string;
    requiresSignature?: boolean;
    take?: number;
    skip?: number;
  }) {
    const hrDocument = delegate(prisma, 'hrDocument');

    return hrDocument.findMany({
      where: {
        tenantId: input.tenantId,
        ...(input.employeeId ? { employeeId: input.employeeId } : {}),
        ...(input.category ? { category: input.category } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.requiresSignature !== undefined
          ? { requiresSignature: input.requiresSignature }
          : {}),
      },
      orderBy: [
        { createdAt: 'desc' },
      ],
      take: Math.min(input.take ?? 100, 100),
      skip: input.skip ?? 0,
    });
  }

  async getDocumentById(tenantId: string, hrDocumentId: string) {
    const hrDocument = delegate(prisma, 'hrDocument');

    const document = await hrDocument.findFirst({
      where: {
        id: hrDocumentId,
        tenantId,
      },
      include: {
        signatures: true,
      },
    });

    if (!document) {
      throw Object.assign(new Error('HR document not found'), {
        statusCode: 404,
        code: 'HR_DOCUMENT_NOT_FOUND',
      });
    }

    return document;
  }
}

export const hrDocumentService = new HrDocumentService();

export default HrDocumentService;
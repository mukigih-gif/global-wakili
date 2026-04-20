import { z } from 'zod';

export const contractCreateSchema = z.object({
  matterId: z.string().cuid(),
  contractNumber: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(5000).optional().nullable(),
  status: z.string().trim().min(1).max(100).optional(),
  executionDate: z.coerce.date().optional().nullable(),
  effectiveDate: z.coerce.date().optional().nullable(),
  expiryDate: z.coerce.date().optional().nullable(),
  counterpartyName: z.string().trim().max(255).optional().nullable(),
  counterpartyEmail: z.string().trim().email().max(255).optional().nullable(),
  counterpartyPhone: z.string().trim().max(50).optional().nullable(),
  createdById: z.string().cuid().optional().nullable(),
});

export const contractUpdateSchema = contractCreateSchema
  .omit({ matterId: true, createdById: true })
  .partial();

export const contractVersionCreateSchema = z.object({
  contractId: z.string().cuid(),
  fileUrl: z.string().trim().url(),
  changesSummary: z.string().trim().max(2000).optional().nullable(),
  createdById: z.string().cuid().optional().nullable(),
});

function normalizeDate(value?: Date | null): Date | null {
  if (!value) return null;
  return value;
}

export function assertContractDates(params: {
  executionDate?: Date | null;
  effectiveDate?: Date | null;
  expiryDate?: Date | null;
}) {
  const executionDate = normalizeDate(params.executionDate);
  const effectiveDate = normalizeDate(params.effectiveDate);
  const expiryDate = normalizeDate(params.expiryDate);

  if (executionDate && effectiveDate && effectiveDate < executionDate) {
    throw Object.assign(new Error('Effective date cannot be earlier than execution date'), {
      statusCode: 422,
      code: 'INVALID_CONTRACT_DATE_SEQUENCE',
    });
  }

  if (effectiveDate && expiryDate && expiryDate < effectiveDate) {
    throw Object.assign(new Error('Expiry date cannot be earlier than effective date'), {
      statusCode: 422,
      code: 'INVALID_CONTRACT_EXPIRY_DATE',
    });
  }

  if (executionDate && expiryDate && expiryDate < executionDate) {
    throw Object.assign(new Error('Expiry date cannot be earlier than execution date'), {
      statusCode: 422,
      code: 'INVALID_CONTRACT_EXPIRY_DATE',
    });
  }
}
import { Prisma } from '@global-wakili/database';
import type {
  ProcurementValidationIssue,
  ProcurementValidationResult,
  TenantProcurementDbClient,
  VendorInput,
} from './procurement.types';

function normalizeEmail(email?: string | null): string | null {
  return email?.trim().toLowerCase() || null;
}

function normalizePin(pin?: string | null): string | null {
  return pin?.trim().toUpperCase() || null;
}

export class VendorService {
  static async validateCreate(
    db: TenantProcurementDbClient,
    tenantId: string,
    input: VendorInput,
  ): Promise<ProcurementValidationResult> {
    const issues: ProcurementValidationIssue[] = [];

    if (input.email) {
      const existingByEmail = await db.vendor.findFirst({
        where: {
          tenantId,
          email: normalizeEmail(input.email),
        },
        select: { id: true },
      });

      if (existingByEmail) {
        issues.push({
          code: 'DUPLICATE_VENDOR_EMAIL',
          message: 'A vendor with this email already exists.',
        });
      }
    }

    if (input.kraPin) {
      const existingByPin = await db.vendor.findFirst({
        where: {
          tenantId,
          kraPin: normalizePin(input.kraPin),
        },
        select: { id: true },
      });

      if (existingByPin) {
        issues.push({
          code: 'DUPLICATE_VENDOR_PIN',
          message: 'A vendor with this KRA PIN already exists.',
        });
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  static async create(
    db: TenantProcurementDbClient,
    tenantId: string,
    input: VendorInput,
  ) {
    const validation = await this.validateCreate(db, tenantId, input);

    if (!validation.valid) {
      throw Object.assign(new Error('Vendor validation failed'), {
        statusCode: 422,
        code: 'VENDOR_VALIDATION_FAILED',
        details: validation.issues,
      });
    }

    return db.vendor.create({
      data: {
        tenantId,
        name: input.name.trim(),
        email: normalizeEmail(input.email),
        phoneNumber: input.phoneNumber?.trim() ?? null,
        kraPin: normalizePin(input.kraPin),
        contactPerson: input.contactPerson?.trim() ?? null,
        address: input.address?.trim() ?? null,
        status: input.status ?? 'ACTIVE',
        currency: input.currency?.trim().toUpperCase() ?? 'KES',
        paymentTermsDays: input.paymentTermsDays ?? 30,
        metadata: input.metadata ?? null,
      },
    });
  }

  static async update(
    db: TenantProcurementDbClient,
    tenantId: string,
    vendorId: string,
    input: Partial<VendorInput>,
  ) {
    const existing = await db.vendor.findFirst({
      where: {
        tenantId,
        id: vendorId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!existing) {
      throw Object.assign(new Error('Vendor not found'), {
        statusCode: 404,
        code: 'MISSING_VENDOR',
      });
    }

    return db.vendor.update({
      where: { id: vendorId },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.email !== undefined ? { email: normalizeEmail(input.email) } : {}),
        ...(input.phoneNumber !== undefined ? { phoneNumber: input.phoneNumber?.trim() ?? null } : {}),
        ...(input.kraPin !== undefined ? { kraPin: normalizePin(input.kraPin) } : {}),
        ...(input.contactPerson !== undefined ? { contactPerson: input.contactPerson?.trim() ?? null } : {}),
        ...(input.address !== undefined ? { address: input.address?.trim() ?? null } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.currency !== undefined ? { currency: input.currency?.trim().toUpperCase() ?? 'KES' } : {}),
        ...(input.paymentTermsDays !== undefined ? { paymentTermsDays: input.paymentTermsDays ?? 30 } : {}),
        ...(input.metadata !== undefined ? { metadata: input.metadata ?? null } : {}),
      },
    });
  }

  static async listActive(db: TenantProcurementDbClient, tenantId: string) {
    return db.vendor.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
      },
      orderBy: [{ name: 'asc' }],
    });
  }
}
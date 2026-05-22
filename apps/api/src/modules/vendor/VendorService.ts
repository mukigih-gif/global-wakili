import {
  type VendorDbClient,
  type VendorInput,
  type VendorListQuery,
  type VendorListResult,
  type VendorStatus,
  type VendorUpdateInput,
  type VendorValidationIssue,
  type VendorValidationResult,
  type VendorView,
} from './vendor.types';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function assertTenant(tenantId: string): void {
  if (!tenantId?.trim()) {
    throw Object.assign(new Error('Tenant ID is required for vendor operations'), {
      statusCode: 400,
      code: 'MISSING_TENANT',
    });
  }
}

function normalizeName(value: string): string {
  return value.trim();
}

function normalizePin(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeEmail(value?: string | null): string | null {
  return value?.trim().toLowerCase() || null;
}

function normalizeOptional(value?: string | null): string | null {
  return value?.trim() || null;
}

function normalizeCurrency(value?: string | null): string {
  return value?.trim().toUpperCase() || 'KES';
}

function normalizeStatus(value?: VendorStatus | null): VendorStatus {
  return value ?? 'ACTIVE';
}

function normalizePaymentTerms(value?: number | null): number {
  if (value === null || value === undefined) {
    return 30;
  }

  return Number(value);
}

function assertValidPaymentTerms(value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > 365) {
    throw Object.assign(new Error('Vendor payment terms must be between 0 and 365 days'), {
      statusCode: 422,
      code: 'INVALID_PAYMENT_TERMS',
    });
  }
}

function cleanMetadata(value: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!value || Array.isArray(value)) {
    return null;
  }

  return value;
}

function toVendorView(row: any): VendorView {
  return {
    id: row.id,
    vendorId: row.id,
    supplierId: row.id,
    tenantId: row.tenantId,
    name: row.name,
    kraPin: row.kraPin,
    etimsId: row.etimsId ?? null,
    email: row.email ?? null,
    phoneNumber: row.phone ?? null,
    contactPerson: row.contactPerson ?? null,
    address: row.address ?? null,
    status: row.status,
    currency: row.currency ?? 'KES',
    paymentTermsDays: row.paymentTermsDays ?? 30,
    metadata: row.metadata ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function buildSearchWhere(tenantId: string, query: VendorListQuery) {
  const search = query.search?.trim();
  const where: Record<string, unknown> = {
    tenantId,
    ...(query.status ? { status: query.status } : {}),
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { kraPin: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { contactPerson: { contains: search, mode: 'insensitive' } },
      { etimsId: { contains: search, mode: 'insensitive' } },
    ];
  }

  return where;
}

export class VendorService {
  static async validateCreate(
    db: VendorDbClient,
    tenantId: string,
    input: VendorInput,
  ): Promise<VendorValidationResult> {
    assertTenant(tenantId);

    const issues: VendorValidationIssue[] = [];
    const name = input.name?.trim();
    const kraPin = input.kraPin?.trim();

    if (!name) {
      issues.push({
        code: 'MISSING_NAME',
        message: 'Vendor name is required.',
      });
    }

    if (!kraPin) {
      issues.push({
        code: 'MISSING_KRA_PIN',
        message: 'Vendor KRA PIN is required by the Supplier schema.',
      });
    }

    const paymentTerms = normalizePaymentTerms(input.paymentTermsDays);
    if (!Number.isInteger(paymentTerms) || paymentTerms < 0 || paymentTerms > 365) {
      issues.push({
        code: 'INVALID_PAYMENT_TERMS',
        message: 'Vendor payment terms must be between 0 and 365 days.',
      });
    }

    if (kraPin) {
      const existingByPin = await db.supplier.findFirst({
        where: {
          tenantId,
          kraPin: normalizePin(kraPin),
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

    const email = normalizeEmail(input.email);
    if (email) {
      const existingByEmail = await db.supplier.findFirst({
        where: {
          tenantId,
          email,
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

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  static async validateUpdate(
    db: VendorDbClient,
    tenantId: string,
    vendorId: string,
    input: VendorUpdateInput,
  ): Promise<VendorValidationResult> {
    assertTenant(tenantId);

    const issues: VendorValidationIssue[] = [];

    const existing = await db.supplier.findFirst({
      where: {
        tenantId,
        id: vendorId,
      },
      select: { id: true },
    });

    if (!existing) {
      issues.push({
        code: 'MISSING_VENDOR',
        message: 'Vendor not found.',
      });

      return {
        valid: false,
        issues,
      };
    }

    if (input.name !== undefined && !input.name?.trim()) {
      issues.push({
        code: 'MISSING_NAME',
        message: 'Vendor name cannot be blank.',
      });
    }

    if (input.kraPin !== undefined && !input.kraPin?.trim()) {
      issues.push({
        code: 'MISSING_KRA_PIN',
        message: 'Vendor KRA PIN cannot be blank.',
      });
    }

    if (input.paymentTermsDays !== undefined && input.paymentTermsDays !== null) {
      const paymentTerms = normalizePaymentTerms(input.paymentTermsDays);
      if (!Number.isInteger(paymentTerms) || paymentTerms < 0 || paymentTerms > 365) {
        issues.push({
          code: 'INVALID_PAYMENT_TERMS',
          message: 'Vendor payment terms must be between 0 and 365 days.',
        });
      }
    }

    if (input.kraPin) {
      const duplicatePin = await db.supplier.findFirst({
        where: {
          tenantId,
          kraPin: normalizePin(input.kraPin),
          NOT: { id: vendorId },
        },
        select: { id: true },
      });

      if (duplicatePin) {
        issues.push({
          code: 'DUPLICATE_VENDOR_PIN',
          message: 'Another vendor with this KRA PIN already exists.',
        });
      }
    }

    const email = normalizeEmail(input.email);
    if (email) {
      const duplicateEmail = await db.supplier.findFirst({
        where: {
          tenantId,
          email,
          NOT: { id: vendorId },
        },
        select: { id: true },
      });

      if (duplicateEmail) {
        issues.push({
          code: 'DUPLICATE_VENDOR_EMAIL',
          message: 'Another vendor with this email already exists.',
        });
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  static async create(
    db: VendorDbClient,
    tenantId: string,
    input: VendorInput,
  ): Promise<VendorView> {
    const validation = await this.validateCreate(db, tenantId, input);

    if (!validation.valid) {
      throw Object.assign(new Error('Vendor validation failed'), {
        statusCode: 422,
        code: 'VENDOR_VALIDATION_FAILED',
        details: validation.issues,
      });
    }

    const paymentTermsDays = normalizePaymentTerms(input.paymentTermsDays);
    assertValidPaymentTerms(paymentTermsDays);

    const created = await db.supplier.create({
      data: {
        tenantId,
        name: normalizeName(input.name),
        kraPin: normalizePin(input.kraPin),
        etimsId: normalizeOptional(input.etimsId),
        email: normalizeEmail(input.email),
        phone: normalizeOptional(input.phoneNumber),
        contactPerson: normalizeOptional(input.contactPerson),
        address: normalizeOptional(input.address),
        status: normalizeStatus(input.status),
        currency: normalizeCurrency(input.currency),
        paymentTermsDays,
        metadata: cleanMetadata(input.metadata),
      },
    });

    return toVendorView(created);
  }

  static async update(
    db: VendorDbClient,
    tenantId: string,
    vendorId: string,
    input: VendorUpdateInput,
  ): Promise<VendorView> {
    const validation = await this.validateUpdate(db, tenantId, vendorId, input);

    if (!validation.valid) {
      const missing = validation.issues.some((issue) => issue.code === 'MISSING_VENDOR');

      throw Object.assign(
        new Error(missing ? 'Vendor not found' : 'Vendor validation failed'),
        {
          statusCode: missing ? 404 : 422,
          code: missing ? 'MISSING_VENDOR' : 'VENDOR_VALIDATION_FAILED',
          details: validation.issues,
        },
      );
    }

    const data: Record<string, unknown> = {};

    if (input.name !== undefined) data.name = normalizeName(input.name);
    if (input.kraPin !== undefined) data.kraPin = normalizePin(input.kraPin);
    if (input.etimsId !== undefined) data.etimsId = normalizeOptional(input.etimsId);
    if (input.email !== undefined) data.email = normalizeEmail(input.email);
    if (input.phoneNumber !== undefined) data.phone = normalizeOptional(input.phoneNumber);
    if (input.contactPerson !== undefined) data.contactPerson = normalizeOptional(input.contactPerson);
    if (input.address !== undefined) data.address = normalizeOptional(input.address);
    if (input.status !== undefined) data.status = input.status;
    if (input.currency !== undefined) data.currency = normalizeCurrency(input.currency);
    if (input.paymentTermsDays !== undefined) {
      const paymentTermsDays = normalizePaymentTerms(input.paymentTermsDays);
      assertValidPaymentTerms(paymentTermsDays);
      data.paymentTermsDays = paymentTermsDays;
    }
    if (input.metadata !== undefined) data.metadata = cleanMetadata(input.metadata);

    const updated = await db.supplier.update({
      where: { id: vendorId },
      data,
    });

    return toVendorView(updated);
  }

  static async getById(
    db: VendorDbClient,
    tenantId: string,
    vendorId: string,
  ): Promise<VendorView> {
    assertTenant(tenantId);

    const vendor = await db.supplier.findFirst({
      where: {
        tenantId,
        id: vendorId,
      },
    });

    if (!vendor) {
      throw Object.assign(new Error('Vendor not found'), {
        statusCode: 404,
        code: 'MISSING_VENDOR',
      });
    }

    return toVendorView(vendor);
  }

  static async list(
    db: VendorDbClient,
    tenantId: string,
    query: VendorListQuery = {},
  ): Promise<VendorListResult> {
    assertTenant(tenantId);

    const page = Math.max(Number(query.page ?? DEFAULT_PAGE), 1);
    const limit = Math.min(Math.max(Number(query.limit ?? DEFAULT_LIMIT), 1), MAX_LIMIT);
    const skip = (page - 1) * limit;
    const where = buildSearchWhere(tenantId, query);

    const [total, rows] = await Promise.all([
      db.supplier.count({ where }),
      db.supplier.findMany({
        where,
        orderBy: [{ name: 'asc' }],
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.max(Math.ceil(total / limit), 1);

    return {
      data: rows.map(toVendorView),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  static async listActive(
    db: VendorDbClient,
    tenantId: string,
  ): Promise<VendorView[]> {
    assertTenant(tenantId);

    const vendors = await db.supplier.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
      },
      orderBy: [{ name: 'asc' }],
    });

    return vendors.map(toVendorView);
  }

  static async changeStatus(
    db: VendorDbClient,
    tenantId: string,
    vendorId: string,
    status: VendorStatus,
  ): Promise<VendorView> {
    return this.update(db, tenantId, vendorId, { status });
  }
}

export default VendorService;

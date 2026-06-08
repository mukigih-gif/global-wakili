import type {
  ClientInput,
  ClientValidationIssue,
  ClientValidationResult,
  TenantClientDbClient,
} from './client.type';

type ClientListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  branchId?: string | null;
};

type ClientListDbClient = TenantClientDbClient & {
  client: TenantClientDbClient['client'] & {
    count: Function;
  };
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

function normalizeEmail(email?: string | null): string | null {
  return email?.trim().toLowerCase() || null;
}

function normalizePhone(phone?: string | null): string | null {
  return phone?.trim() || null;
}

function normalizePin(pin?: string | null): string | null {
  return pin?.trim().toUpperCase() || null;
}

function normalizeCurrency(currency?: string | null): string | null {
  return currency?.trim().toUpperCase() || null;
}

function normalizePage(page?: number): number {
  if (!Number.isFinite(page) || !page || page < 1) {
    return DEFAULT_PAGE;
  }

  return Math.floor(page);
}

function normalizeLimit(limit?: number): number {
  if (!Number.isFinite(limit) || !limit || limit < 1) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.floor(limit), MAX_LIMIT);
}

function buildSearchWhere(search?: string) {
  const normalizedSearch = search?.trim();

  if (!normalizedSearch) {
    return {};
  }

  return {
    OR: [
      { name: { contains: normalizedSearch, mode: 'insensitive' } },
      { clientCode: { contains: normalizedSearch, mode: 'insensitive' } },
      { email: { contains: normalizedSearch, mode: 'insensitive' } },
      { phoneNumber: { contains: normalizedSearch, mode: 'insensitive' } },
      { kraPin: { contains: normalizedSearch, mode: 'insensitive' } },
      { registrationNumber: { contains: normalizedSearch, mode: 'insensitive' } },
      { nationalId: { contains: normalizedSearch, mode: 'insensitive' } },
    ],
  };
}

export class ClientService {
  private static async checkUniqueness(
    db: TenantClientDbClient,
    tenantId: string,
    input: Partial<ClientInput>,
    excludeClientId?: string,
  ): Promise<ClientValidationIssue[]> {
    const issues: ClientValidationIssue[] = [];

    const [existingByCode, existingByEmail, existingByPhone, existingByPin] = await Promise.all([
      input.clientCode
        ? db.client.findFirst({
            where: {
              tenantId,
              clientCode: input.clientCode.trim(),
              ...(excludeClientId ? { id: { not: excludeClientId } } : {}),
            },
            select: { id: true },
          })
        : Promise.resolve(null),
      input.email
        ? db.client.findFirst({
            where: {
              tenantId,
              email: normalizeEmail(input.email),
              ...(excludeClientId ? { id: { not: excludeClientId } } : {}),
            },
            select: { id: true },
          })
        : Promise.resolve(null),
      input.phoneNumber
        ? db.client.findFirst({
            where: {
              tenantId,
              phoneNumber: normalizePhone(input.phoneNumber),
              ...(excludeClientId ? { id: { not: excludeClientId } } : {}),
            },
            select: { id: true },
          })
        : Promise.resolve(null),
      input.kraPin
        ? db.client.findFirst({
            where: {
              tenantId,
              kraPin: normalizePin(input.kraPin),
              ...(excludeClientId ? { id: { not: excludeClientId } } : {}),
            },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

    if (existingByCode) {
      issues.push({
        code: 'DUPLICATE_CLIENT_CODE',
        message: 'A client with this client code already exists.',
      });
    }

    if (existingByEmail) {
      issues.push({
        code: 'DUPLICATE_EMAIL',
        message: 'A client with this email already exists.',
      });
    }

    if (existingByPhone) {
      issues.push({
        code: 'DUPLICATE_PHONE',
        message: 'A client with this phone number already exists.',
      });
    }

    if (existingByPin) {
      issues.push({
        code: 'DUPLICATE_KRA_PIN',
        message: 'A client with this KRA PIN already exists.',
      });
    }

    return issues;
  }

  static async validateCreate(
    db: TenantClientDbClient,
    tenantId: string,
    input: ClientInput,
  ): Promise<ClientValidationResult> {
    const issues: ClientValidationIssue[] = [];

    const [branch, portalUser, uniquenessIssues] = await Promise.all([
      input.branchId
        ? db.branch.findFirst({
            where: {
              tenantId,
              id: input.branchId,
            },
            select: { id: true, tenantId: true },
          })
        : Promise.resolve(null),
      input.portalUserId
        ? db.user.findFirst({
            where: {
              tenantId,
              id: input.portalUserId,
              status: 'ACTIVE',
            },
            select: { id: true, tenantId: true },
          })
        : Promise.resolve(null),
      this.checkUniqueness(db, tenantId, input),
    ]);

    issues.push(...uniquenessIssues);

    if (input.branchId && !branch) {
      issues.push({
        code: 'INVALID_BRANCH',
        message: 'Branch not found for tenant.',
      });
    }

    if (input.portalUserId && !portalUser) {
      issues.push({
        code: 'INVALID_PORTAL_USER',
        message: 'Portal user not found for tenant or inactive.',
      });
    }

    if (input.branchId && branch && branch.tenantId !== tenantId) {
      issues.push({
        code: 'TENANT_BRANCH_CONFLICT',
        message: 'Branch does not belong to the current tenant.',
      });
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  static async create(
    db: TenantClientDbClient,
    tenantId: string,
    input: ClientInput,
  ) {
    const validation = await this.validateCreate(db, tenantId, input);

    if (!validation.valid) {
      throw Object.assign(new Error('Client validation failed'), {
        statusCode: 422,
        code: 'CLIENT_VALIDATION_FAILED',
        details: validation.issues,
      });
    }

    return db.client.create({
      data: {
        tenantId,
        clientCode: input.clientCode?.trim() ?? null,
        type: input.type ?? 'INDIVIDUAL',
        status: input.status ?? 'ACTIVE',
        name: input.name.trim(),
        email: normalizeEmail(input.email),
        phoneNumber: normalizePhone(input.phoneNumber),
        kraPin: normalizePin(input.kraPin),
        nationalId: input.idNumber?.trim() ?? null,
        registrationNumber: input.registrationNumber?.trim() ?? null,
        taxExempt: input.taxExempt ?? false,
        address: input.address?.trim() ?? null,
        postalAddress: input.postalAddress?.trim() ?? null,
        currency: normalizeCurrency(input.currency) ?? 'KES',
        branchId: input.branchId ?? null,
        primaryContactName: input.primaryContactName?.trim() ?? null,
        primaryContactEmail: normalizeEmail(input.primaryContactEmail),
        primaryContactPhone: normalizePhone(input.primaryContactPhone),
        portalUserId: input.portalUserId ?? null,
        kycStatus: 'PENDING',
        pepStatus: 'CLEAR',
        sanctionsStatus: 'CLEAR',
        riskScore: 0,
        riskBand: 'LOW',
        needsEnhancedDueDiligence: false,
        metadata: input.metadata ?? null,
      },
    });
  }

  static async update(
    db: TenantClientDbClient,
    tenantId: string,
    clientId: string,
    input: Partial<ClientInput>,
  ) {
    const existing = await db.client.findFirst({
      where: {
        tenantId,
        id: clientId,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw Object.assign(new Error('Client not found'), {
        statusCode: 404,
        code: 'MISSING_CLIENT',
      });
    }

    const [branch, portalUser, uniquenessIssues] = await Promise.all([
      input.branchId
        ? db.branch.findFirst({
            where: {
              tenantId,
              id: input.branchId,
            },
            select: { id: true, tenantId: true },
          })
        : Promise.resolve(null),
      input.portalUserId
        ? db.user.findFirst({
            where: {
              tenantId,
              id: input.portalUserId,
              status: 'ACTIVE',
            },
            select: { id: true, tenantId: true },
          })
        : Promise.resolve(null),
      this.checkUniqueness(db, tenantId, input, clientId),
    ]);

    const issues: ClientValidationIssue[] = [...uniquenessIssues];

    if (input.branchId && !branch) {
      issues.push({
        code: 'INVALID_BRANCH',
        message: 'Branch not found for tenant.',
      });
    }

    if (input.portalUserId && !portalUser) {
      issues.push({
        code: 'INVALID_PORTAL_USER',
        message: 'Portal user not found for tenant or inactive.',
      });
    }

    if (input.branchId && branch && branch.tenantId !== tenantId) {
      issues.push({
        code: 'TENANT_BRANCH_CONFLICT',
        message: 'Branch does not belong to the current tenant.',
      });
    }

    if (issues.length) {
      throw Object.assign(new Error('Client update validation failed'), {
        statusCode: 422,
        code: 'CLIENT_VALIDATION_FAILED',
        details: issues,
      });
    }

    return db.client.update({
      where: { id: clientId },
      data: {
        ...(input.clientCode !== undefined ? { clientCode: input.clientCode?.trim() ?? null } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.email !== undefined ? { email: normalizeEmail(input.email) } : {}),
        ...(input.phoneNumber !== undefined ? { phoneNumber: normalizePhone(input.phoneNumber) } : {}),
        ...(input.kraPin !== undefined ? { kraPin: normalizePin(input.kraPin) } : {}),
        ...(input.idNumber !== undefined ? { nationalId: input.idNumber?.trim() ?? null } : {}),
        ...(input.registrationNumber !== undefined
          ? { registrationNumber: input.registrationNumber?.trim() ?? null }
          : {}),
        ...(input.taxExempt !== undefined ? { taxExempt: input.taxExempt } : {}),
        ...(input.address !== undefined ? { address: input.address?.trim() ?? null } : {}),
        ...(input.postalAddress !== undefined
          ? { postalAddress: input.postalAddress?.trim() ?? null }
          : {}),
        ...(input.currency !== undefined ? { currency: normalizeCurrency(input.currency) ?? 'KES' } : {}),
        ...(input.branchId !== undefined ? { branchId: input.branchId ?? null } : {}),
        ...(input.primaryContactName !== undefined
          ? { primaryContactName: input.primaryContactName?.trim() ?? null }
          : {}),
        ...(input.primaryContactEmail !== undefined
          ? { primaryContactEmail: normalizeEmail(input.primaryContactEmail) }
          : {}),
        ...(input.primaryContactPhone !== undefined
          ? { primaryContactPhone: normalizePhone(input.primaryContactPhone) }
          : {}),
        ...(input.portalUserId !== undefined ? { portalUserId: input.portalUserId ?? null } : {}),
        ...(input.metadata !== undefined ? { metadata: input.metadata ?? null } : {}),
      },
    });
  }

  static async listActive(
    db: TenantClientDbClient,
    tenantId: string,
    query: ClientListQuery = {},
  ) {
    const clientDb = db as ClientListDbClient;
    const page = normalizePage(query.page);
    const limit = normalizeLimit(query.limit);
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
      status: 'ACTIVE',
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...buildSearchWhere(query.search),
    };

    const [data, total] = await Promise.all([
      clientDb.client.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { name: 'asc' }],
        skip,
        take: limit,
        select: {
          id: true,
          tenantId: true,
          branchId: true,
          clientCode: true,
          name: true,
          type: true,
          email: true,
          phoneNumber: true,
          registrationNumber: true,
          kraPin: true,
          status: true,
          kycStatus: true,
          pepStatus: true,
          sanctionsStatus: true,
          riskScore: true,
          riskBand: true,
          needsEnhancedDueDiligence: true,
          currency: true,
          createdAt: true,
          updatedAt: true,
          onboardingCompletedAt: true,
          branch: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              matters: true,
              invoices: true,
            },
          },
        },
      }),
      clientDb.client.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getById(
    db: TenantClientDbClient,
    tenantId: string,
    clientId: string,
  ) {
    return db.client.findFirst({
      where: {
        tenantId,
        id: clientId,
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
        portalUser: {
          select: {
            id: true,
            email: true,
            name: true,
            status: true,
          },
        },
        _count: {
          select: {
            contacts: true,
            matters: true,
            invoices: true,
            paymentReceipts: true,
            clientTrustLedgers: true,
          },
        },
      },
    });
  }

  static async getOverview(
    db: TenantClientDbClient,
    tenantId: string,
    clientId: string,
  ) {
    return db.client.findFirst({
      where: {
        tenantId,
        id: clientId,
      },
      select: {
        id: true,
        tenantId: true,
        branchId: true,
        clientCode: true,
        name: true,
        type: true,
        email: true,
        phoneNumber: true,
        registrationNumber: true,
        kraPin: true,
        status: true,
        kycStatus: true,
        pepStatus: true,
        sanctionsStatus: true,
        riskScore: true,
        riskBand: true,
        needsEnhancedDueDiligence: true,
        onboardingCompletedAt: true,
        currency: true,
        createdAt: true,
        updatedAt: true,
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            matters: true,
            invoices: true,
          },
        },
        matters: {
          orderBy: {
            updatedAt: 'desc',
          },
          take: 5,
          select: {
            id: true,
            matterCode: true,
            caseNumber: true,
            title: true,
            status: true,
            category: true,
            openedDate: true,
            closedDate: true,
            updatedAt: true,
          },
        },
        invoices: {
          orderBy: {
            issuedDate: 'desc',
          },
          take: 5,
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            total: true,
            paidAmount: true,
            balanceDue: true,
            currency: true,
            issuedDate: true,
            dueDate: true,
          },
        },
      },
    });
  }
}
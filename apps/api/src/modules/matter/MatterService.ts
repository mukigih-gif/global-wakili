// apps/api/src/modules/matter/MatterService.ts

import { Prisma } from '@global-wakili/database';
import type {
  MatterInput,
  MatterValidationIssue,
  MatterValidationResult,
  TenantMatterDbClient,
} from './matter.types';

type MatterMetadataRecord = Record<string, unknown>;

type MatterUserRole =
  | 'partner'
  | 'assignee'
  | 'originator'
  | 'leadAdvocate'
  | 'assignedLawyer';

type UserValidationResult = {
  role: MatterUserRole;
  id: string | null | undefined;
  found: boolean;
};

type ExistingMatterForUpdate = {
  id: string;
  clientId: string;
  branchId: string;
  category: string;
  leadAdvocateId: string;
  openedDate: Date;
  closedDate: Date | null;
  archivedDate: Date | null;
  statuteOfLimitationsDate: Date | null;
  metadata: Prisma.JsonValue | null;
};

function normalizeString(value?: string | null): string | null {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();

  if (!trimmed) return null;
  if (trimmed.toLowerCase() === 'undefined') return null;
  if (trimmed.toLowerCase() === 'null') return null;

  return trimmed;
}

function requiredNormalizedString(
  value: string | null | undefined,
  label: string,
  code: MatterValidationIssue['code'],
): string {
  const normalized = normalizeString(value);

  if (!normalized) {
    throw Object.assign(new Error(`${label} is required`), {
      statusCode: 422,
      code,
    });
  }

  return normalized;
}

function normalizePercent(value?: number | null): number | null {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value)) return null;

  if (value < 0) return 0;
  if (value > 100) return 100;

  return value;
}

function toDecimal(
  value: Prisma.Decimal | string | number | null | undefined,
): Prisma.Decimal | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return new Prisma.Decimal(value);
}

function toJsonScalar(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
  }

  if (value instanceof Prisma.Decimal) {
    return value.toString();
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  return value;
}

function pruneUndefinedDeep(value: unknown): unknown {
  const scalar = toJsonScalar(value);

  if (scalar !== value) {
    return scalar;
  }

  if (Array.isArray(value)) {
    return value
      .map(pruneUndefinedDeep)
      .filter((item) => item !== undefined);
  }

  if (value && typeof value === 'object') {
    const result: MatterMetadataRecord = {};

    for (const [key, nestedValue] of Object.entries(value as MatterMetadataRecord)) {
      const normalized = pruneUndefinedDeep(nestedValue);

      if (normalized !== undefined) {
        result[key] = normalized;
      }
    }

    return result;
  }

  return value === undefined ? undefined : value;
}

function asMetadataRecord(value: unknown): MatterMetadataRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return pruneUndefinedDeep(value) as MatterMetadataRecord;
}

function toJsonInput(
  value: MatterMetadataRecord | null,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (!value || !Object.keys(value).length) {
    return Prisma.JsonNull;
  }

  return pruneUndefinedDeep(value) as Prisma.InputJsonValue;
}

function resolveAssignedLawyerId(
  input: Pick<MatterInput, 'assignedLawyerId' | 'assigneeId'>,
): string | null {
  return normalizeString(input.assignedLawyerId) ?? normalizeString(input.assigneeId);
}

/**
 * Metadata is the preservation layer for business-critical fields that are not
 * currently physical columns on Matter.
 *
 * Physical Matter columns remain authoritative for:
 * matterCode, caseNumber, title, description, category, riskLevel, status,
 * openedDate, closedDate, archivedDate, statuteOfLimitationsDate, clientId,
 * branchId, leadAdvocateId, tenantId, trustBalance, wipValue, and metadata.
 *
 * Metadata preserves operational/business capabilities such as:
 * partnerId, assignedLawyerId, assigneeId, originatorId, billingModel,
 * closeDate/target close date, currency, estimatedValue, matterReference,
 * progress state, document/calendar/invoice/report configs, and billing config.
 */
function buildMatterMetadataForCreate(input: MatterInput): MatterMetadataRecord | null {
  const base = asMetadataRecord(input.metadata);

  const operationalContext: MatterMetadataRecord = {
    matterReference: normalizeString(input.matterReference),

    originatorId: normalizeString(input.originatorId),
    assigneeId: normalizeString(input.assigneeId),
    partnerId: normalizeString(input.partnerId),
    assignedLawyerId: resolveAssignedLawyerId({
      assignedLawyerId: input.assignedLawyerId,
      assigneeId: input.assigneeId,
    }),

    billingModel: input.billingModel ?? null,
    currency: normalizeString(input.currency)?.toUpperCase() ?? null,
    estimatedValue:
      input.estimatedValue === null ||
      input.estimatedValue === undefined ||
      input.estimatedValue === ''
        ? null
        : toDecimal(input.estimatedValue)?.toString() ?? null,

    /**
     * closeDate is preserved as an operational/target close date.
     * The physical schema-backed actual closure field is closedDate.
     */
    closeDate: input.closeDate instanceof Date ? input.closeDate.toISOString() : null,

    progressPercent: normalizePercent(input.progressPercent),
    progressStage: input.progressStage ?? null,

    billing: input.billing ?? null,
    documents: input.documents ?? null,
    calendar: input.calendar ?? null,
    invoice: input.invoice ?? null,
    reports: input.reports ?? null,
  };

  const merged = pruneUndefinedDeep({
    ...base,
    ...operationalContext,
  }) as MatterMetadataRecord;

  return Object.keys(merged).length ? merged : null;
}

function shouldUpdateMetadata(input: Partial<MatterInput>): boolean {
  return (
    input.metadata !== undefined ||
    input.matterReference !== undefined ||
    input.originatorId !== undefined ||
    input.assigneeId !== undefined ||
    input.partnerId !== undefined ||
    input.assignedLawyerId !== undefined ||
    input.billingModel !== undefined ||
    input.currency !== undefined ||
    input.estimatedValue !== undefined ||
    input.closeDate !== undefined ||
    input.progressPercent !== undefined ||
    input.progressStage !== undefined ||
    input.billing !== undefined ||
    input.documents !== undefined ||
    input.calendar !== undefined ||
    input.invoice !== undefined ||
    input.reports !== undefined
  );
}

function buildMatterMetadataForUpdate(
  existingMetadata: unknown,
  input: Partial<MatterInput>,
): MatterMetadataRecord | null {
  const existing = asMetadataRecord(existingMetadata);
  const explicitMetadata = input.metadata === undefined ? {} : asMetadataRecord(input.metadata);

  const operationalContext: MatterMetadataRecord = {};

  if (input.matterReference !== undefined) {
    operationalContext.matterReference = normalizeString(input.matterReference);
  }

  if (input.originatorId !== undefined) {
    operationalContext.originatorId = normalizeString(input.originatorId);
  }

  if (input.assigneeId !== undefined) {
    operationalContext.assigneeId = normalizeString(input.assigneeId);
  }

  if (input.partnerId !== undefined) {
    operationalContext.partnerId = normalizeString(input.partnerId);
  }

  if (input.assignedLawyerId !== undefined || input.assigneeId !== undefined) {
    operationalContext.assignedLawyerId = resolveAssignedLawyerId({
      assignedLawyerId: input.assignedLawyerId,
      assigneeId: input.assigneeId,
    });
  }

  if (input.billingModel !== undefined) {
    operationalContext.billingModel = input.billingModel ?? null;
  }

  if (input.currency !== undefined) {
    operationalContext.currency = normalizeString(input.currency)?.toUpperCase() ?? null;
  }

  if (input.estimatedValue !== undefined) {
    operationalContext.estimatedValue =
      input.estimatedValue === null || input.estimatedValue === ''
        ? null
        : toDecimal(input.estimatedValue)?.toString() ?? null;
  }

  if (input.closeDate !== undefined) {
    operationalContext.closeDate =
      input.closeDate instanceof Date ? input.closeDate.toISOString() : null;
  }

  if (input.progressPercent !== undefined) {
    operationalContext.progressPercent = normalizePercent(input.progressPercent);
  }

  if (input.progressStage !== undefined) {
    operationalContext.progressStage = input.progressStage ?? null;
  }

  if (input.billing !== undefined) {
    operationalContext.billing = input.billing ?? null;
  }

  if (input.documents !== undefined) {
    operationalContext.documents = input.documents ?? null;
  }

  if (input.calendar !== undefined) {
    operationalContext.calendar = input.calendar ?? null;
  }

  if (input.invoice !== undefined) {
    operationalContext.invoice = input.invoice ?? null;
  }

  if (input.reports !== undefined) {
    operationalContext.reports = input.reports ?? null;
  }

  const merged = pruneUndefinedDeep({
    ...existing,
    ...explicitMetadata,
    ...operationalContext,
  }) as MatterMetadataRecord;

  return Object.keys(merged).length ? merged : null;
}

function userIssueFor(role: MatterUserRole): MatterValidationIssue {
  switch (role) {
    case 'partner':
      return {
        code: 'INVALID_PARTNER',
        message: 'Partner not found for tenant or inactive.',
      };

    case 'assignee':
      return {
        code: 'INVALID_ASSIGNEE',
        message: 'Assignee not found for tenant or inactive.',
      };

    case 'originator':
      return {
        code: 'INVALID_ORIGINATOR',
        message: 'Originator not found for tenant or inactive.',
      };

    case 'leadAdvocate':
      return {
        code: 'INVALID_LEAD_ADVOCATE',
        message: 'Lead advocate not found for tenant or inactive.',
      };

    case 'assignedLawyer':
      return {
        code: 'INVALID_ASSIGNED_LAWYER',
        message: 'Assigned lawyer not found for tenant or inactive.',
      };
  }
}

async function validateMatterUsers(
  db: TenantMatterDbClient,
  tenantId: string,
  input: Pick<
    MatterInput,
    'partnerId' | 'assigneeId' | 'originatorId' | 'leadAdvocateId' | 'assignedLawyerId'
  >,
): Promise<UserValidationResult[]> {
  const partnerId = normalizeString(input.partnerId);
  const assigneeId = normalizeString(input.assigneeId);
  const originatorId = normalizeString(input.originatorId);
  const leadAdvocateId = normalizeString(input.leadAdvocateId);
  const assignedLawyerId = resolveAssignedLawyerId(input);

  const distinctUserIds = Array.from(
    new Set(
      [
        partnerId,
        assigneeId,
        originatorId,
        leadAdvocateId,
        assignedLawyerId,
      ].filter((id): id is string => Boolean(id)),
    ),
  );

  const foundUsers = distinctUserIds.length
    ? await db.user.findMany({
        where: {
          tenantId,
          id: {
            in: distinctUserIds,
          },
          status: 'ACTIVE',
        },
        select: {
          id: true,
        },
      })
    : [];

  const foundUserIds = new Set(foundUsers.map((user) => user.id));

  return [
    {
      role: 'partner',
      id: partnerId,
      found: !partnerId || foundUserIds.has(partnerId),
    },
    {
      role: 'assignee',
      id: assigneeId,
      found: !assigneeId || foundUserIds.has(assigneeId),
    },
    {
      role: 'originator',
      id: originatorId,
      found: !originatorId || foundUserIds.has(originatorId),
    },
    {
      role: 'leadAdvocate',
      id: leadAdvocateId,
      found: !leadAdvocateId || foundUserIds.has(leadAdvocateId),
    },
    {
      role: 'assignedLawyer',
      id: assignedLawyerId,
      found: !assignedLawyerId || foundUserIds.has(assignedLawyerId),
    },
  ];
}

function validateDateOrder(input: {
  openedDate?: Date | null;
  closeDate?: Date | null;
  closedDate?: Date | null;
  archivedDate?: Date | null;
  statuteOfLimitationsDate?: Date | null;
}): MatterValidationIssue[] {
  const issues: MatterValidationIssue[] = [];

  if (input.closeDate && input.openedDate && input.closeDate < input.openedDate) {
    issues.push({
      code: 'INVALID_DATES',
      message: 'Target close date cannot be before opened date.',
      meta: {
        field: 'closeDate',
      },
    });
  }

  if (input.closedDate && input.openedDate && input.closedDate < input.openedDate) {
    issues.push({
      code: 'INVALID_DATES',
      message: 'Closed date cannot be before opened date.',
      meta: {
        field: 'closedDate',
      },
    });
  }

  if (input.archivedDate && input.openedDate && input.archivedDate < input.openedDate) {
    issues.push({
      code: 'INVALID_DATES',
      message: 'Archived date cannot be before opened date.',
      meta: {
        field: 'archivedDate',
      },
    });
  }

  if (
    input.statuteOfLimitationsDate &&
    input.openedDate &&
    input.statuteOfLimitationsDate < input.openedDate
  ) {
    issues.push({
      code: 'INVALID_DATES',
      message: 'Statute of limitations date cannot be before opened date.',
      meta: {
        field: 'statuteOfLimitationsDate',
      },
    });
  }

  return issues;
}

function buildMatterSearchWhere(
  tenantId: string,
  search: string,
  branchId?: string | null,
): Prisma.MatterWhereInput {
  return {
    tenantId,
    ...(branchId ? { branchId } : {}),
    status: {
      in: ['ACTIVE', 'ON_HOLD'],
    },
    ...(search
      ? {
          OR: [
            { title:      { contains: search, mode: Prisma.QueryMode.insensitive } },
            { matterCode: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { caseNumber: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { client: { name: { contains: search, mode: Prisma.QueryMode.insensitive } } },
            { client: { clientCode: { contains: search, mode: Prisma.QueryMode.insensitive } } },
          ],
        }
      : {}),
  };
}

export class MatterService {
  static async validateCreate(
    db: TenantMatterDbClient,
    tenantId: string,
    input: MatterInput,
  ): Promise<MatterValidationResult> {
    const issues: MatterValidationIssue[] = [];

    const matterCode = normalizeString(input.matterCode);
    const caseNumber = normalizeString(input.caseNumber);
    const branchId = normalizeString(input.branchId);
    const category = normalizeString(input.category);
    const leadAdvocateId = normalizeString(input.leadAdvocateId);

    const [client, branch, existingCode, existingCaseNumber, userResults] = await Promise.all([
      db.client.findFirst({
        where: {
          tenantId,
          id: input.clientId,
        },
        select: {
          id: true,
          tenantId: true,
          branchId: true,
        },
      }),

      branchId
        ? db.branch.findFirst({
            where: {
              tenantId,
              id: branchId,
            },
            select: {
              id: true,
              tenantId: true,
            },
          })
        : Promise.resolve(null),

      matterCode
        ? db.matter.findFirst({
            where: {
              tenantId,
              matterCode,
            },
            select: {
              id: true,
            },
          })
        : Promise.resolve(null),

      caseNumber
        ? db.matter.findFirst({
            where: {
              tenantId,
              caseNumber,
            },
            select: {
              id: true,
            },
          })
        : Promise.resolve(null),

      validateMatterUsers(db, tenantId, input),
    ]);

    if (!branchId) {
      issues.push({
        code: 'MISSING_BRANCH',
        message: 'Matter branch is required.',
      });
    }

    if (!category) {
      issues.push({
        code: 'MISSING_CATEGORY',
        message: 'Matter category is required.',
      });
    }

    if (!leadAdvocateId) {
      issues.push({
        code: 'MISSING_LEAD_ADVOCATE',
        message: 'Lead advocate is required.',
      });
    }

    if (!client) {
      issues.push({
        code: 'MISSING_CLIENT',
        message: 'Client not found for tenant.',
      });
    }

    if (branchId && !branch) {
      issues.push({
        code: 'INVALID_BRANCH',
        message: 'Branch not found for tenant.',
      });
    }

    if (existingCode) {
      issues.push({
        code: 'DUPLICATE_MATTER_CODE',
        message: 'Matter code already exists.',
      });
    }

    if (existingCaseNumber) {
      issues.push({
        code: 'POLICY_VIOLATION',
        message: 'Case number already exists for this tenant.',
        meta: {
          field: 'caseNumber',
          caseNumber,
        },
      });
    }

    for (const result of userResults) {
      if (result.id && !result.found) {
        issues.push(userIssueFor(result.role));
      }
    }

    issues.push(...validateDateOrder(input));

    if (branchId && branch && branch.tenantId !== tenantId) {
      issues.push({
        code: 'TENANT_BRANCH_CONFLICT',
        message: 'Branch does not belong to the current tenant.',
      });
    }

    if (client && branchId && client.branchId && client.branchId !== branchId) {
      issues.push({
        code: 'CLIENT_BRANCH_CONFLICT',
        message: 'Matter branch conflicts with the client branch.',
        meta: {
          clientBranchId: client.branchId,
          matterBranchId: branchId,
        },
      });
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  static async create(
    db: TenantMatterDbClient,
    tenantId: string,
    input: MatterInput,
  ) {
    const validation = await this.validateCreate(db, tenantId, input);

    if (!validation.valid) {
      throw Object.assign(new Error('Matter validation failed'), {
        statusCode: 422,
        code: 'MATTER_VALIDATION_FAILED',
        details: validation.issues,
      });
    }

    const matterCode = normalizeString(input.matterCode);
    const caseNumber = normalizeString(input.caseNumber);
    const branchId = requiredNormalizedString(input.branchId, 'Matter branch', 'MISSING_BRANCH');
    const category = requiredNormalizedString(input.category, 'Matter category', 'MISSING_CATEGORY');
    const leadAdvocateId = requiredNormalizedString(
      input.leadAdvocateId,
      'Lead advocate',
      'MISSING_LEAD_ADVOCATE',
    );

    return db.matter.create({
      data: {
        tenantId,

        matterCode,
        caseNumber,

        title: input.title.trim(),
        description: normalizeString(input.description),

        clientId: input.clientId,
        branchId,

        category,
        riskLevel: normalizeString(input.riskLevel) ?? 'LOW',
        status: input.status ?? 'ACTIVE',

        openedDate: input.openedDate ?? new Date(),
        closedDate: input.closedDate ?? null,
        archivedDate: input.archivedDate ?? null,
        statuteOfLimitationsDate: input.statuteOfLimitationsDate ?? null,

        leadAdvocateId,

        metadata: toJsonInput(buildMatterMetadataForCreate(input)),
      },
    });
  }

  static async update(
    db: TenantMatterDbClient,
    tenantId: string,
    matterId: string,
    input: Partial<MatterInput>,
  ) {
    const existing = (await db.matter.findFirst({
      where: {
        tenantId,
        id: matterId,
      },
      select: {
        id: true,
        clientId: true,
        branchId: true,
        category: true,
        leadAdvocateId: true,
        openedDate: true,
        closedDate: true,
        archivedDate: true,
        statuteOfLimitationsDate: true,
        metadata: true,
      },
    })) as ExistingMatterForUpdate | null;

    if (!existing) {
      throw Object.assign(new Error('Matter not found'), {
        statusCode: 404,
        code: 'MISSING_MATTER',
      });
    }

    const effectiveClientId = input.clientId ?? existing.clientId;
    const matterCode = normalizeString(input.matterCode);
    const caseNumber = normalizeString(input.caseNumber);

    const effectiveBranchId =
      input.branchId !== undefined
        ? normalizeString(input.branchId)
        : existing.branchId;

    const effectiveCategory =
      input.category !== undefined
        ? normalizeString(input.category)
        : existing.category;

    const effectiveLeadAdvocateId =
      input.leadAdvocateId !== undefined
        ? normalizeString(input.leadAdvocateId)
        : existing.leadAdvocateId;

    const effectiveOpenedDate =
      input.openedDate !== undefined ? input.openedDate ?? new Date() : existing.openedDate;

    const effectiveClosedDate =
      input.closedDate !== undefined ? input.closedDate ?? null : existing.closedDate;

    const effectiveArchivedDate =
      input.archivedDate !== undefined ? input.archivedDate ?? null : existing.archivedDate;

    const effectiveStatuteDate =
      input.statuteOfLimitationsDate !== undefined
        ? input.statuteOfLimitationsDate ?? null
        : existing.statuteOfLimitationsDate;

    const [client, branch, duplicateCode, duplicateCaseNumber, userResults] = await Promise.all([
      db.client.findFirst({
        where: {
          tenantId,
          id: effectiveClientId,
        },
        select: {
          id: true,
          tenantId: true,
          branchId: true,
        },
      }),

      input.branchId !== undefined && effectiveBranchId
        ? db.branch.findFirst({
            where: {
              tenantId,
              id: effectiveBranchId,
            },
            select: {
              id: true,
              tenantId: true,
            },
          })
        : Promise.resolve(null),

      input.matterCode !== undefined && matterCode
        ? db.matter.findFirst({
            where: {
              tenantId,
              matterCode,
              id: {
                not: matterId,
              },
            },
            select: {
              id: true,
            },
          })
        : Promise.resolve(null),

      input.caseNumber !== undefined && caseNumber
        ? db.matter.findFirst({
            where: {
              tenantId,
              caseNumber,
              id: {
                not: matterId,
              },
            },
            select: {
              id: true,
            },
          })
        : Promise.resolve(null),

      validateMatterUsers(db, tenantId, {
        partnerId: input.partnerId,
        assigneeId: input.assigneeId,
        originatorId: input.originatorId,
        leadAdvocateId:
          input.leadAdvocateId !== undefined
            ? effectiveLeadAdvocateId
            : undefined,
        assignedLawyerId: input.assignedLawyerId,
      }),
    ]);

    const issues: MatterValidationIssue[] = [];

    if (!effectiveBranchId) {
      issues.push({
        code: 'MISSING_BRANCH',
        message: 'Matter branch is required.',
      });
    }

    if (!effectiveCategory) {
      issues.push({
        code: 'MISSING_CATEGORY',
        message: 'Matter category is required.',
      });
    }

    if (!effectiveLeadAdvocateId) {
      issues.push({
        code: 'MISSING_LEAD_ADVOCATE',
        message: 'Lead advocate is required.',
      });
    }

    if (!client) {
      issues.push({
        code: 'MISSING_CLIENT',
        message: 'Client not found for tenant.',
      });
    }

    if (input.branchId !== undefined && effectiveBranchId && !branch) {
      issues.push({
        code: 'INVALID_BRANCH',
        message: 'Branch not found for tenant.',
      });
    }

    if (duplicateCode) {
      issues.push({
        code: 'DUPLICATE_MATTER_CODE',
        message: 'Matter code already exists.',
      });
    }

    if (duplicateCaseNumber) {
      issues.push({
        code: 'POLICY_VIOLATION',
        message: 'Case number already exists for this tenant.',
        meta: {
          field: 'caseNumber',
          caseNumber,
        },
      });
    }

    for (const result of userResults) {
      if (result.id && !result.found) {
        issues.push(userIssueFor(result.role));
      }
    }

    issues.push(
      ...validateDateOrder({
        openedDate: effectiveOpenedDate,
        closeDate: input.closeDate,
        closedDate: effectiveClosedDate,
        archivedDate: effectiveArchivedDate,
        statuteOfLimitationsDate: effectiveStatuteDate,
      }),
    );

    if (
      input.branchId !== undefined &&
      effectiveBranchId &&
      branch &&
      branch.tenantId !== tenantId
    ) {
      issues.push({
        code: 'TENANT_BRANCH_CONFLICT',
        message: 'Branch does not belong to the current tenant.',
      });
    }

    if (
      client &&
      effectiveBranchId &&
      client.branchId &&
      client.branchId !== effectiveBranchId
    ) {
      issues.push({
        code: 'CLIENT_BRANCH_CONFLICT',
        message: 'Matter branch conflicts with the client branch.',
        meta: {
          clientBranchId: client.branchId,
          matterBranchId: effectiveBranchId,
        },
      });
    }

    if (issues.length) {
      throw Object.assign(new Error('Matter update validation failed'), {
        statusCode: 422,
        code: 'MATTER_VALIDATION_FAILED',
        details: issues,
      });
    }

    return db.matter.update({
      where: {
        id: matterId,
      },
      data: {
        ...(input.matterCode !== undefined
          ? {
              matterCode,
            }
          : {}),

        ...(input.caseNumber !== undefined
          ? {
              caseNumber,
            }
          : {}),

        ...(input.title !== undefined
          ? {
              title: input.title.trim(),
            }
          : {}),

        ...(input.description !== undefined
          ? {
              description: normalizeString(input.description),
            }
          : {}),

        ...(input.clientId !== undefined
          ? {
              clientId: input.clientId,
            }
          : {}),

        ...(input.branchId !== undefined
          ? {
              branchId: requiredNormalizedString(
                effectiveBranchId,
                'Matter branch',
                'MISSING_BRANCH',
              ),
            }
          : {}),

        ...(input.category !== undefined
          ? {
              category: requiredNormalizedString(
                effectiveCategory,
                'Matter category',
                'MISSING_CATEGORY',
              ),
            }
          : {}),

        ...(input.riskLevel !== undefined
          ? {
              riskLevel: normalizeString(input.riskLevel) ?? 'LOW',
            }
          : {}),

        ...(input.status !== undefined
          ? {
              status: input.status,
            }
          : {}),

        ...(input.openedDate !== undefined
          ? {
              openedDate: effectiveOpenedDate,
            }
          : {}),

        ...(input.closedDate !== undefined
          ? {
              closedDate: effectiveClosedDate,
            }
          : {}),

        ...(input.archivedDate !== undefined
          ? {
              archivedDate: effectiveArchivedDate,
            }
          : {}),

        ...(input.statuteOfLimitationsDate !== undefined
          ? {
              statuteOfLimitationsDate: effectiveStatuteDate,
            }
          : {}),

        ...(input.leadAdvocateId !== undefined
          ? {
              leadAdvocateId: requiredNormalizedString(
                effectiveLeadAdvocateId,
                'Lead advocate',
                'MISSING_LEAD_ADVOCATE',
              ),
            }
          : {}),

        ...(shouldUpdateMetadata(input)
          ? {
              metadata: toJsonInput(buildMatterMetadataForUpdate(existing.metadata, input)),
            }
          : {}),
      },
    });
  }

  static async listOpen(
    db: TenantMatterDbClient,
    tenantId: string,
    params?: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      branchId?: string | null;
      clientId?: string | null;
    },
  ) {
    const page = params?.page && params.page > 0 ? params.page : 1;
    const limit = params?.limit && params.limit > 0 ? Math.min(params.limit, 100) : 50;
    const skip = (page - 1) * limit;
    const search = params?.search?.trim() ?? '';

    let where = buildMatterSearchWhere(tenantId, search, params?.branchId);

    // Scope to a specific client (e.g. the client profile Matters tab).
    if (params?.clientId) {
      where = { ...where, clientId: params.clientId };
      // Option B: when viewing one client, show their FULL matter history,
      // not just ACTIVE/ON_HOLD. Drop the default status restriction unless
      // an explicit status filter is requested below.
      delete (where as any).status;
    }

    // Allow overriding status filter (e.g. 'CLOSED', 'PENDING')
    if (params?.status && params.status !== 'ALL') {
      where = { ...where, status: params.status as any };
    }

    const [data, total] = await Promise.all([
      db.matter.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              clientCode: true,
              type: true,
              email: true,
              phoneNumber: true,
              kraPin: true,
            },
          },
          leadAdvocate: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: [
          {
            openedDate: 'desc',
          },
        ],
      }),
      db.matter.count({
        where,
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
      },
    };
  }

  static async getById(
    db: TenantMatterDbClient,
    tenantId: string,
    matterId: string,
  ) {
    return db.matter.findFirst({
      where: {
        tenantId,
        id: matterId,
      },
      include: {
        client: true,
        leadAdvocate: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        invoices: {
          orderBy: [
            {
              issuedDate: 'desc',
            },
          ],
        },
        trustTransactions: {
          orderBy: [
            {
              transactionDate: 'desc',
            },
          ],
        },
      },
    });
  }

  static async getOverview(
    db: TenantMatterDbClient,
    tenantId: string,
    matterId: string,
  ) {
    return db.matter.findFirst({
      where: {
        tenantId,
        id: matterId,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            clientCode: true,
            type: true,
            email: true,
            phoneNumber: true,
            kraPin: true,
          },
        },
        leadAdvocate: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        invoices: {
          take: 5,
          orderBy: [
            {
              createdAt: 'desc',
            },
          ],
          select: {
            id: true,
            invoiceNumber: true,
            total: true,
            paidAmount: true,
            status: true,
          },
        },
        trustTransactions: {
          take: 5,
          orderBy: [
            {
              transactionDate: 'desc',
            },
          ],
          select: {
            id: true,
            amount: true,
            transactionType: true,
            transactionDate: true,
            reference: true,
            description: true,
            debit: true,
            credit: true,
            isReconciled: true,
          },
        },
        expenseEntries: {
          take: 5,
          orderBy: [
            {
              createdAt: 'desc',
            },
          ],
          select: {
            id: true,
            amount: true,
            description: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            invoices: true,
            trustTransactions: true,
            expenseEntries: true,
            documents: true,
            tasks: true,
            courtHearings: true,
          },
        },
      },
    });
  }
}

export default MatterService;
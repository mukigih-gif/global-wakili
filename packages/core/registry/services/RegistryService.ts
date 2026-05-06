import { MatterStatus } from '@prisma/client';
import { prisma } from '../../../database/src/prisma';
import { HttpError } from '../../../../packages/core/exceptions/ErrorHandler';

/**
 * Registry Matter Input with Strict Typing
 */
type CreateRegistryMatterInput = {
  title: string;
  description?: string | null;
  category?: string | null;
  practiceArea?: string | null;
  clientId: string;
  branchId: string;
  leadAdvocateId?: string | null;
  riskLevel?: string | null;
  openedDate?: Date | string | null;
};

type ListMattersOptions = {
  limit?: number;
  offset?: number;
  status?: MatterStatus;
  clientId?: string;
  branchId?: string;
};

/**
 * Validation Utilities
 */
function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(422, `${fieldName} is required`);
  }
  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function parseOptionalDate(
  value: Date | string | null | undefined,
  fieldName: string,
): Date | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new HttpError(422, `${fieldName} is invalid`);
  }
  return date;
}

function normalizePagination(
  value: number | undefined,
  fallback: number,
  max: number,
): number {
  if (value === undefined || value === null) {
    return fallback;
  }
  if (!Number.isInteger(value) || value < 0) {
    throw new HttpError(422, 'Invalid pagination value');
  }
  return Math.min(value, max);
}

export class RegistryService {
  /**
   * Fetch a status summary of matters for the tenant registry dashboard.
   */
  static async getRegistryStats(tenantId: string) {
    const resolvedTenantId = requireString(tenantId, 'tenantId');

    try {
      const counts = await prisma.matter.groupBy({
        by: ['status'],
        where: {
          tenantId: resolvedTenantId,
          deletedAt: null,
        },
        _count: {
          _all: true,
        },
      });

      return counts.map((stat) => ({
        status: stat.status,
        count: stat._count._all,
      }));
    } catch (error: unknown) {
      console.error('[REGISTRY_SERVICE] getRegistryStats error', error);
      throw new HttpError(500, 'Failed to fetch registry statistics');
    }
  }

  /**
   * Create a new legal matter from the registry flow.
   */
  static async createNewMatter(
    tenantId: string,
    advocateId: string,
    data: CreateRegistryMatterInput,
  ) {
    const resolvedTenantId = requireString(tenantId, 'tenantId');
    const resolvedAdvocateId = requireString(advocateId, 'advocateId');
    const title = requireString(data?.title, 'title');
    const clientId = requireString(data?.clientId, 'clientId');
    const branchId = requireString(data?.branchId, 'branchId');

    const category =
      optionalString(data.category) ??
      optionalString(data.practiceArea) ??
      'GENERAL';

    const leadAdvocateId = optionalString(data.leadAdvocateId) ?? resolvedAdvocateId;

    try {
      const [branch, client, leadAdvocate] = await Promise.all([
        prisma.branch.findFirst({
          where: {
            id: branchId,
            tenantId: resolvedTenantId,
          },
          select: { id: true },
        }),
        prisma.client.findFirst({
          where: {
            id: clientId,
            tenantId: resolvedTenantId,
          },
          select: { id: true },
        }),
        prisma.user.findFirst({
          where: {
            id: leadAdvocateId,
            tenantId: resolvedTenantId,
            status: 'ACTIVE',
          },
          select: { id: true },
        }),
      ]);

      if (!branch) {
        throw new HttpError(404, 'Selected branch is invalid or does not belong to this firm');
      }
      if (!client) {
        throw new HttpError(404, 'Selected client is invalid or does not belong to this firm');
      }
      if (!leadAdvocate) {
        throw new HttpError(404, 'Assigned lead advocate is invalid or inactive');
      }

      return await prisma.matter.create({
        data: {
          tenantId: resolvedTenantId,
          branchId: branch.id,
          clientId: client.id,
          leadAdvocateId: leadAdvocate.id,
          title,
          description: optionalString(data.description) ?? null,
          category,
          status: MatterStatus.ACTIVE,
          riskLevel: optionalString(data.riskLevel) ?? 'LOW',
          openedDate: parseOptionalDate(data.openedDate, 'openedDate') ?? new Date(),
        },
      });
    } catch (error: unknown) {
      if (error instanceof HttpError) throw error;
      console.error('[REGISTRY_SERVICE] createNewMatter error', error);
      throw new HttpError(500, 'Failed to create matter');
    }
  }

  /**
   * List matters for the tenant registry with soft-delete filtering.
   */
  static async listMatters(tenantId: string, opts?: ListMattersOptions) {
    const resolvedTenantId = requireString(tenantId, 'tenantId');
    const take = normalizePagination(opts?.limit, 50, 100);
    const skip = normalizePagination(opts?.offset, 0, Number.MAX_SAFE_INTEGER);

    try {
      return await prisma.matter.findMany({
        where: {
          tenantId: resolvedTenantId,
          deletedAt: null,
          ...(opts?.status ? { status: opts.status } : {}),
          ...(opts?.clientId ? { clientId: opts.clientId } : {}),
          ...(opts?.branchId ? { branchId: opts.branchId } : {}),
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
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
        orderBy: {
          createdAt: 'desc',
        },
        take,
        skip,
      });
    } catch (error: unknown) {
      console.error('[REGISTRY_SERVICE] listMatters error', error);
      throw new HttpError(500, 'Failed to list matters');
    }
  }
}

export default RegistryService;
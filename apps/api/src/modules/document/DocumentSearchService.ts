import { sanitizeDocumentTags } from './document.validators';

export interface DocumentSearchFilters {
  matterId?: string | null;
  uploadedBy?: string | null;
  mimeType?: string | null;
  status?: string | null;
  version?: number | null;
  createdFrom?: Date | string | null;
  createdTo?: Date | string | null;
  expiryFrom?: Date | string | null;
  expiryTo?: Date | string | null;
  category?: string | null;
  isRestricted?: boolean | null;
  isConfidential?: boolean | null;
  tags?: string[] | null;
}

function normalizeDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export class DocumentSearchService {
  /**
   * Searches all main document fields.
   *
   * Direct fields:
   * - title
   * - description
   * - mimeType
   * - fileHash
   * - fileUrl
   * - status
   * - uploadedBy
   * - version
   *
   * Related fields:
   * - matter.title
   * - matter.matterCode
   * - uploader.name
   * - uploader.email
   *
   * Metadata filters:
   * - category
   * - tags
   * - isRestricted
   * - isConfidential
   */
  static async search(
    db: any,
    params: {
      tenantId: string;
      query?: string | null;
      filters?: DocumentSearchFilters | null;
      page?: number;
      limit?: number;
    },
  ) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? Math.min(params.limit, 100) : 50;
    const skip = (page - 1) * limit;

    const query = params.query?.trim() ?? '';
    const filters = params.filters ?? {};

    const createdFrom = normalizeDate(filters.createdFrom);
    const createdTo = normalizeDate(filters.createdTo);
    const expiryFrom = normalizeDate(filters.expiryFrom);
    const expiryTo = normalizeDate(filters.expiryTo);
    const tags = sanitizeDocumentTags(filters.tags);

    const where: Record<string, unknown> = {
      tenantId: params.tenantId,
      deletedAt: null,
    };

    const andClauses: Record<string, unknown>[] = [];

    if (query) {
      const parsedVersion = Number(query);
      andClauses.push({
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { mimeType: { contains: query, mode: 'insensitive' } },
          { fileHash: { contains: query, mode: 'insensitive' } },
          { fileUrl: { contains: query, mode: 'insensitive' } },
          { status: { equals: query } },
          { uploadedBy: { equals: query } },
          ...(Number.isInteger(parsedVersion) ? [{ version: { equals: parsedVersion } }] : []),
          {
            matter: {
              is: {
                OR: [
                  { title: { contains: query, mode: 'insensitive' } },
                  { matterCode: { contains: query, mode: 'insensitive' } },
                ],
              },
            },
          },
          {
            uploader: {
              is: {
                OR: [
                  { name: { contains: query, mode: 'insensitive' } },
                  { email: { contains: query, mode: 'insensitive' } },
                ],
              },
            },
          },
        ],
      });
    }

    if (filters.matterId) {
      andClauses.push({ matterId: filters.matterId });
    }

    if (filters.uploadedBy) {
      andClauses.push({ uploadedBy: filters.uploadedBy });
    }

    if (filters.mimeType) {
      andClauses.push({ mimeType: filters.mimeType });
    }

    if (filters.status) {
      andClauses.push({ status: filters.status });
    }

    if (filters.version !== null && filters.version !== undefined) {
      andClauses.push({ version: filters.version });
    }

    if (createdFrom || createdTo) {
      andClauses.push({
        createdAt: {
          ...(createdFrom ? { gte: createdFrom } : {}),
          ...(createdTo ? { lte: createdTo } : {}),
        },
      });
    }

    if (expiryFrom || expiryTo) {
      andClauses.push({
        expiryDate: {
          ...(expiryFrom ? { gte: expiryFrom } : {}),
          ...(expiryTo ? { lte: expiryTo } : {}),
        },
      });
    }

    if (filters.category) {
      andClauses.push({
        metadata: {
          path: ['category'],
          equals: filters.category,
        },
      });
    }

    if (filters.isRestricted !== null && filters.isRestricted !== undefined) {
      andClauses.push({
        metadata: {
          path: ['isRestricted'],
          equals: filters.isRestricted,
        },
      });
    }

    if (filters.isConfidential !== null && filters.isConfidential !== undefined) {
      andClauses.push({
        metadata: {
          path: ['isConfidential'],
          equals: filters.isConfidential,
        },
      });
    }

    if (tags.length > 0) {
      for (const tag of tags) {
        andClauses.push({
          metadata: {
            path: ['tags'],
            array_contains: [tag],
          },
        });
      }
    }

    if (andClauses.length > 0) {
      where.AND = andClauses;
    }

    const [data, total] = await Promise.all([
      db.document.findMany({
        where,
        include: {
          matter: {
            select: {
              id: true,
              title: true,
              matterCode: true,
            },
          },
          uploader: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      db.document.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        query,
      },
    };
  }
}
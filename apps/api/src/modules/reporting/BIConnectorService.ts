// apps/api/src/modules/reporting/BIConnectorService.ts

import type {
  BIConnectorConfigInput,
  ReportingDbClient,
  ReportingSearchFilters,
} from './reporting.types';

function assertTenant(tenantId: string): void {
  if (!tenantId?.trim()) {
    throw Object.assign(new Error('Tenant ID is required for BI connectors'), {
      statusCode: 400,
      code: 'BI_CONNECTOR_TENANT_REQUIRED',
    });
  }
}

function normalizeDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error('Invalid BI connector date'), {
      statusCode: 422,
      code: 'BI_CONNECTOR_DATE_INVALID',
    });
  }
  return parsed;
}

function pageParams(page?: number, limit?: number) {
  const safePage = page && page > 0 ? page : 1;
  const safeLimit = limit && limit > 0 ? Math.min(limit, 100) : 50;
  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
}

function validateConnector(input: BIConnectorConfigInput) {
  if (input.endpointUrl && !input.endpointUrl.startsWith('https://')) {
    throw Object.assign(new Error('BI connector endpointUrl must use HTTPS'), {
      statusCode: 422,
      code: 'BI_CONNECTOR_HTTPS_REQUIRED',
    });
  }
}

export class BIConnectorService {
  static async upsertConnector(
    db: ReportingDbClient,
    input: BIConnectorConfigInput,
  ) {
    assertTenant(input.tenantId);
    validateConnector(input);

    const existing = await db.bIConnectorConfig.findFirst({
      where: {
        tenantId: input.tenantId,
        name: input.name.trim(),
      },
    });

    const payload = {
      tenantId: input.tenantId,
      connectorType: input.connectorType,
      name: input.name.trim(),
      isEnabled: input.isEnabled ?? false,
      endpointUrl: input.endpointUrl?.trim() || null,
      workspaceId: input.workspaceId?.trim() || null,
      datasetId: input.datasetId?.trim() || null,
      credentialsRef: input.credentialsRef?.trim() || null,
      config: {
        accessMode: 'READ_ONLY',
        scoped: true,
        anonymizationSupported: true,
        ...(input.config ?? {}),
      },
      metadata: {
        deliverySurface: 'SECURE_REPORTING_BRIDGE',
        ...(input.metadata ?? {}),
      },
    };

    if (existing) {
      return db.bIConnectorConfig.update({
        where: { id: existing.id },
        data: payload,
      });
    }

    return db.bIConnectorConfig.create({
      data: payload,
    });
  }

  static async searchConnectors(
    db: ReportingDbClient,
    params: {
      tenantId: string;
      filters?: ReportingSearchFilters | null;
      page?: number;
      limit?: number;
    },
  ) {
    assertTenant(params.tenantId);

    const { page, limit, skip } = pageParams(params.page, params.limit);
    const createdFrom = normalizeDate(params.filters?.createdFrom);
    const createdTo = normalizeDate(params.filters?.createdTo);

    const where = {
      tenantId: params.tenantId,
      ...(params.filters?.connectorType
        ? { connectorType: params.filters.connectorType }
        : {}),
      ...(params.filters?.name
        ? {
            name: { contains: params.filters.name, mode: 'insensitive' },
          }
        : {}),
      ...(typeof params.filters?.isEnabled === 'boolean'
        ? { isEnabled: params.filters.isEnabled }
        : {}),
      ...(createdFrom || createdTo
        ? {
            createdAt: {
              ...(createdFrom ? { gte: createdFrom } : {}),
              ...(createdTo ? { lte: createdTo } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      db.bIConnectorConfig.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      db.bIConnectorConfig.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      deliveryModel: {
        accessMode: 'READ_ONLY',
        note: 'Designed as a scoped reporting bridge for Power BI, Tableau-style pipelines, or secure API delivery.',
      },
    };
  }
}

export default BIConnectorService;
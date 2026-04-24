// apps/api/src/modules/reporting/ExportService.ts

import type {
  ReportExportInput,
  ReportExportFormat,
  ReportingDbClient,
  ReportingSearchFilters,
} from './reporting.types';

function assertTenant(tenantId: string): void {
  if (!tenantId?.trim()) {
    throw Object.assign(new Error('Tenant ID is required for report exports'), {
      statusCode: 400,
      code: 'REPORT_EXPORT_TENANT_REQUIRED',
    });
  }
}

function normalizeDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error('Invalid report export date'), {
      statusCode: 422,
      code: 'REPORT_EXPORT_DATE_INVALID',
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

function extensionForFormat(format: ReportExportFormat): string {
  switch (format) {
    case 'CSV':
      return 'csv';
    case 'XLSX':
      return 'xlsx';
    case 'PDF':
      return 'pdf';
    case 'POWER_BI':
      return 'json';
    default:
      return 'json';
  }
}

function mimeForFormat(format: ReportExportFormat): string {
  switch (format) {
    case 'CSV':
      return 'text/csv';
    case 'XLSX':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'PDF':
      return 'application/pdf';
    default:
      return 'application/json';
  }
}

async function assertReportDefinitionExists(
  db: ReportingDbClient,
  params: {
    tenantId: string;
    reportDefinitionId: string;
  },
) {
  const definition = await db.reportDefinition.findFirst({
    where: {
      id: params.reportDefinitionId,
      tenantId: params.tenantId,
    },
    select: { id: true, key: true, name: true, metadata: true },
  });

  if (!definition) {
    throw Object.assign(new Error('Report definition not found for export'), {
      statusCode: 404,
      code: 'REPORT_EXPORT_DEFINITION_NOT_FOUND',
    });
  }

  return definition;
}

async function assertReportRunIfProvided(
  db: ReportingDbClient,
  params: {
    tenantId: string;
    reportRunId?: string | null;
  },
) {
  if (!params.reportRunId?.trim()) return;

  const run = await db.reportRun.findFirst({
    where: {
      id: params.reportRunId,
      tenantId: params.tenantId,
    },
    select: { id: true },
  });

  if (!run) {
    throw Object.assign(new Error('Report run not found for export'), {
      statusCode: 404,
      code: 'REPORT_EXPORT_RUN_NOT_FOUND',
    });
  }
}

function validateFormatAgainstDefinitionMetadata(
  definition: any,
  format: ReportExportFormat,
) {
  const supportedFormats = Array.isArray(definition?.metadata?.supportedFormats)
    ? definition.metadata.supportedFormats.map((item: unknown) => String(item))
    : [];

  if (supportedFormats.length > 0 && !supportedFormats.includes(format)) {
    throw Object.assign(new Error(`Format ${format} is not allowed for this report`), {
      statusCode: 409,
      code: 'REPORT_EXPORT_FORMAT_NOT_ALLOWED',
    });
  }
}

export class ExportService {
  static async createExport(db: ReportingDbClient, input: ReportExportInput) {
    assertTenant(input.tenantId);

    const definition = await assertReportDefinitionExists(db, {
      tenantId: input.tenantId,
      reportDefinitionId: input.reportDefinitionId,
    });
    await assertReportRunIfProvided(db, {
      tenantId: input.tenantId,
      reportRunId: input.reportRunId ?? null,
    });

    const format = input.format ?? 'JSON';
    validateFormatAgainstDefinitionMetadata(definition, format);

    const fileName =
      input.fileName?.trim() ||
      `${definition.key}-${new Date().toISOString().slice(0, 10)}.${extensionForFormat(format)}`;

    return db.reportExport.create({
      data: {
        tenantId: input.tenantId,
        reportDefinitionId: input.reportDefinitionId,
        reportRunId: input.reportRunId ?? null,
        status: 'PENDING',
        format,
        deliveryChannel: input.deliveryChannel ?? 'DOWNLOAD',
        fileName,
        mimeType: input.mimeType?.trim() || mimeForFormat(format),
        expiresAt: normalizeDate(input.expiresAt),
        metadata: {
          reportKey: definition.key,
          reportName: definition.name,
          ...(input.metadata ?? {}),
        },
      },
    });
  }

  static async searchExports(
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
      ...(params.filters?.reportDefinitionId
        ? { reportDefinitionId: params.filters.reportDefinitionId }
        : {}),
      ...(params.filters?.status ? { status: params.filters.status } : {}),
      ...(params.filters?.format ? { format: params.filters.format } : {}),
      ...(params.filters?.deliveryChannel
        ? { deliveryChannel: params.filters.deliveryChannel }
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
      db.reportExport.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      db.reportExport.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      exportPolicy: {
        supportedFormats: ['JSON', 'CSV', 'XLSX', 'PDF', 'POWER_BI'],
        note: 'Actual file generation workers can be wired later without changing this contract.',
      },
    };
  }
}

export default ExportService;
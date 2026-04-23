// apps/api/src/modules/reporting/ScheduleService.ts

import type {
  ReportingDbClient,
  ReportingSearchFilters,
  ScheduledReportInput,
} from './reporting.types';

function assertTenant(tenantId: string): void {
  if (!tenantId?.trim()) {
    throw Object.assign(new Error('Tenant ID is required for scheduled reports'), {
      statusCode: 400,
      code: 'SCHEDULED_REPORT_TENANT_REQUIRED',
    });
  }
}

function normalizeDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error('Invalid scheduled report date'), {
      statusCode: 422,
      code: 'SCHEDULED_REPORT_DATE_INVALID',
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

function validateScheduleInput(input: ScheduledReportInput) {
  if (input.frequency === 'CUSTOM' && !input.cronExpression?.trim()) {
    throw Object.assign(new Error('cronExpression is required for CUSTOM schedules'), {
      statusCode: 422,
      code: 'SCHEDULED_REPORT_CRON_REQUIRED',
    });
  }

  if ((input.deliveryChannel ?? 'DOWNLOAD') === 'EMAIL' && (!input.recipients || input.recipients.length === 0)) {
    throw Object.assign(new Error('Email delivery requires at least one recipient'), {
      statusCode: 422,
      code: 'SCHEDULED_REPORT_RECIPIENTS_REQUIRED',
    });
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
    select: { id: true, key: true, name: true },
  });

  if (!definition) {
    throw Object.assign(new Error('Report definition not found for schedule'), {
      statusCode: 404,
      code: 'SCHEDULED_REPORT_DEFINITION_NOT_FOUND',
    });
  }

  return definition;
}

export class ScheduleService {
  static getRecommendedSchedules() {
    return [
      {
        key: 'finance.weekly_cash_flow_summary',
        name: 'Weekly Cash Flow Summary',
        frequency: 'WEEKLY',
        cronExpression: '0 8 * * 1',
        timezone: 'Africa/Nairobi',
        deliveryChannel: 'EMAIL',
        note: 'Every Monday at 08:00 AM for partners.',
      },
    ];
  }

  static async upsertSchedule(
    db: ReportingDbClient,
    input: ScheduledReportInput,
  ) {
    assertTenant(input.tenantId);
    validateScheduleInput(input);

    const definition = await assertReportDefinitionExists(db, {
      tenantId: input.tenantId,
      reportDefinitionId: input.reportDefinitionId,
    });

    const existing = await db.scheduledReport.findFirst({
      where: {
        tenantId: input.tenantId,
        name: input.name.trim(),
      },
    });

    const payload = {
      tenantId: input.tenantId,
      reportDefinitionId: input.reportDefinitionId,
      name: input.name.trim(),
      frequency: input.frequency,
      cronExpression: input.cronExpression?.trim() || null,
      timezone: input.timezone?.trim() || 'Africa/Nairobi',
      format: input.format ?? 'JSON',
      deliveryChannel: input.deliveryChannel ?? 'DOWNLOAD',
      isEnabled: input.isEnabled ?? true,
      recipients: input.recipients ?? [],
      parameters: input.parameters ?? {},
      nextRunAt: normalizeDate(input.nextRunAt),
      createdByUserId: input.createdByUserId ?? null,
      metadata: {
        reportKey: definition.key,
        reportName: definition.name,
        ...(input.metadata ?? {}),
      },
    };

    if (existing) {
      return db.scheduledReport.update({
        where: { id: existing.id },
        data: payload,
      });
    }

    return db.scheduledReport.create({
      data: payload,
    });
  }

  static async searchSchedules(
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
      ...(params.filters?.frequency ? { frequency: params.filters.frequency } : {}),
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
      db.scheduledReport.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      db.scheduledReport.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      recommendedSchedules: this.getRecommendedSchedules(),
    };
  }
}

export default ScheduleService;
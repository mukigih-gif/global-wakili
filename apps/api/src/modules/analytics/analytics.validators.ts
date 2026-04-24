// apps/api/src/modules/analytics/analytics.validators.ts

import { z } from 'zod';
import {
  ANALYTICS_INSIGHT_SEVERITIES,
  ANALYTICS_INSIGHT_STATUSES,
  ANALYTICS_METRIC_SCOPES,
  ANALYTICS_METRIC_VALUE_TYPES,
  ANALYTICS_MODULES,
  ANALYTICS_SNAPSHOT_STATUSES,
} from './analytics.types';

const isoDateTime = z.string().datetime();

const analyticsPeriodQuerySchemaBase = z
  .object({
    from: isoDateTime.optional(),
    to: isoDateTime.optional(),
  })
  .strict();

function refineDateRange<T extends { from?: string; to?: string }>(value: T): boolean {
  if (!value.from || !value.to) return true;
  return new Date(value.to).getTime() >= new Date(value.from).getTime();
}

function nullableDateField() {
  return z
    .preprocess((value) => {
      if (value === undefined || value === null || value === '') return null;
      if (value instanceof Date) return value;
      return new Date(String(value));
    }, z.date().nullable())
    .optional();
}

const safeJsonObject = z.record(z.string(), z.unknown());

export const analyticsModuleSchema = z.enum(ANALYTICS_MODULES);

export const analyticsMetricScopeSchema = z.enum(ANALYTICS_METRIC_SCOPES);

export const analyticsMetricValueTypeSchema = z.enum(
  ANALYTICS_METRIC_VALUE_TYPES,
);

export const analyticsInsightSeveritySchema = z.enum(
  ANALYTICS_INSIGHT_SEVERITIES,
);

export const analyticsInsightStatusSchema = z.enum(
  ANALYTICS_INSIGHT_STATUSES,
);

export const analyticsSnapshotStatusSchema = z.enum(
  ANALYTICS_SNAPSHOT_STATUSES,
);

export const analyticsPeriodQuerySchema = analyticsPeriodQuerySchemaBase.refine(
  refineDateRange,
  {
    message: 'Analytics period end must be after or equal to start',
    path: ['to'],
  },
);

export const analyticsModulePeriodQuerySchema =
  analyticsPeriodQuerySchemaBase
    .extend({
      module: analyticsModuleSchema.optional(),
    })
    .refine(refineDateRange, {
      message: 'Analytics period end must be after or equal to start',
      path: ['to'],
    });

export const analyticsMetricCreateSchema = z
  .object({
    module: analyticsModuleSchema,
    scope: analyticsMetricScopeSchema.optional(),
    metricKey: z.string().trim().min(1).max(150),
    metricName: z.string().trim().min(1).max(255),
    value: z.union([z.number().finite(), z.string().trim().min(1).max(100)]),
    valueType: analyticsMetricValueTypeSchema.optional(),
    unit: z.string().trim().max(50).nullable().optional(),
    periodStart: nullableDateField(),
    periodEnd: nullableDateField(),
    sourceEntityType: z.string().trim().max(100).nullable().optional(),
    sourceEntityId: z.string().trim().max(150).nullable().optional(),
    dimensions: safeJsonObject.nullable().optional(),
    metadata: safeJsonObject.nullable().optional(),
  })
  .strict()
  .refine(
    (value) => {
      if (!value.periodStart || !value.periodEnd) return true;
      return value.periodEnd.getTime() >= value.periodStart.getTime();
    },
    {
      message: 'Metric period end must be after or equal to period start',
      path: ['periodEnd'],
    },
  );

export const analyticsSnapshotCreateSchema = z
  .object({
    module: analyticsModuleSchema,
    snapshotKey: z.string().trim().min(1).max(150),
    title: z.string().trim().min(1).max(255),
    description: z.string().trim().max(2000).nullable().optional(),
    periodStart: nullableDateField(),
    periodEnd: nullableDateField(),
    payload: safeJsonObject,
    metrics: safeJsonObject.nullable().optional(),
    metadata: safeJsonObject.nullable().optional(),
  })
  .strict()
  .refine(
    (value) => {
      if (!value.periodStart || !value.periodEnd) return true;
      return value.periodEnd.getTime() >= value.periodStart.getTime();
    },
    {
      message: 'Snapshot period end must be after or equal to period start',
      path: ['periodEnd'],
    },
  );

export const analyticsInsightCreateSchema = z
  .object({
    module: analyticsModuleSchema,
    insightKey: z.string().trim().min(1).max(150),
    title: z.string().trim().min(1).max(255),
    summary: z.string().trim().min(1).max(5000),
    severity: analyticsInsightSeveritySchema.optional(),
    status: analyticsInsightStatusSchema.optional(),
    entityType: z.string().trim().max(100).nullable().optional(),
    entityId: z.string().trim().max(150).nullable().optional(),
    score: z.coerce.number().int().min(0).max(100).nullable().optional(),
    payload: safeJsonObject.nullable().optional(),
    metadata: safeJsonObject.nullable().optional(),
  })
  .strict();

export const analyticsMetricSearchQuerySchema = z
  .object({
    module: analyticsModuleSchema.optional(),
    metricKey: z.string().trim().max(150).optional(),
    scope: analyticsMetricScopeSchema.optional(),
    sourceEntityType: z.string().trim().max(100).optional(),
    sourceEntityId: z.string().trim().max(150).optional(),
    periodStartFrom: isoDateTime.optional(),
    periodStartTo: isoDateTime.optional(),
    periodEndFrom: isoDateTime.optional(),
    periodEndTo: isoDateTime.optional(),
    createdFrom: isoDateTime.optional(),
    createdTo: isoDateTime.optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

export const analyticsSnapshotSearchQuerySchema = z
  .object({
    module: analyticsModuleSchema.optional(),
    snapshotKey: z.string().trim().max(150).optional(),
    status: analyticsSnapshotStatusSchema.optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

export const analyticsInsightSearchQuerySchema = z
  .object({
    module: analyticsModuleSchema.optional(),
    insightKey: z.string().trim().max(150).optional(),
    severity: analyticsInsightSeveritySchema.optional(),
    status: analyticsInsightStatusSchema.optional(),
    entityType: z.string().trim().max(100).optional(),
    entityId: z.string().trim().max(150).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

export type AnalyticsMetricCreateDto = z.infer<
  typeof analyticsMetricCreateSchema
>;

export type AnalyticsSnapshotCreateDto = z.infer<
  typeof analyticsSnapshotCreateSchema
>;

export type AnalyticsInsightCreateDto = z.infer<
  typeof analyticsInsightCreateSchema
>;
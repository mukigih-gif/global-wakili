// apps/api/src/modules/reporting/reporting.validators.ts

import { z } from 'zod';
import {
  BI_CONNECTOR_TYPES,
  DASHBOARD_VISIBILITIES,
  REPORT_DEFINITION_TYPES,
  REPORT_DELIVERY_CHANNELS,
  REPORT_EXPORT_FORMATS,
  REPORT_EXPORT_STATUSES,
  REPORT_RUN_STATUSES,
  REPORT_SOURCE_LAYERS,
  SCHEDULE_FREQUENCIES,
} from './reporting.types';

const safeJsonObject = z.record(z.string(), z.unknown());
const isoDateTime = z.string().datetime();

function nullableDateField() {
  return z
    .preprocess((value) => {
      if (value === undefined || value === null || value === '') return null;
      if (value instanceof Date) return value;
      return new Date(String(value));
    }, z.date().nullable())
    .optional();
}

export const reportDefinitionTypeSchema = z.enum(REPORT_DEFINITION_TYPES);
export const reportSourceLayerSchema = z.enum(REPORT_SOURCE_LAYERS);
export const reportRunStatusSchema = z.enum(REPORT_RUN_STATUSES);
export const reportExportFormatSchema = z.enum(REPORT_EXPORT_FORMATS);
export const reportExportStatusSchema = z.enum(REPORT_EXPORT_STATUSES);
export const reportDeliveryChannelSchema = z.enum(REPORT_DELIVERY_CHANNELS);
export const dashboardVisibilitySchema = z.enum(DASHBOARD_VISIBILITIES);
export const biConnectorTypeSchema = z.enum(BI_CONNECTOR_TYPES);
export const scheduleFrequencySchema = z.enum(SCHEDULE_FREQUENCIES);

export const reportDefinitionUpsertSchema = z
  .object({
    key: z.string().trim().min(1).max(150),
    name: z.string().trim().min(1).max(255),
    description: z.string().trim().max(5000).nullable().optional(),
    type: reportDefinitionTypeSchema.optional(),
    sourceLayer: reportSourceLayerSchema.optional(),
    defaultFormat: reportExportFormatSchema.optional(),
    isSystem: z.boolean().optional(),
    isActive: z.boolean().optional(),
    config: safeJsonObject.nullable().optional(),
    filterSchema: safeJsonObject.nullable().optional(),
    columnSchema: safeJsonObject.nullable().optional(),
    tags: z.array(z.string().trim().max(100)).nullable().optional(),
    metadata: safeJsonObject.nullable().optional(),
  })
  .strict();

export const reportDefinitionSearchQuerySchema = z
  .object({
    key: z.string().trim().max(150).optional(),
    name: z.string().trim().max(255).optional(),
    type: reportDefinitionTypeSchema.optional(),
    sourceLayer: reportSourceLayerSchema.optional(),
    isActive: z.coerce.boolean().optional(),
    createdFrom: isoDateTime.optional(),
    createdTo: isoDateTime.optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

export const reportRunCreateSchema = z
  .object({
    reportDefinitionId: z.string().trim().min(1).max(150),
    triggeredByUserId: z.string().trim().max(150).nullable().optional(),
    sourceLayer: reportSourceLayerSchema.nullable().optional(),
    parameters: safeJsonObject.nullable().optional(),
    snapshotRefType: z.string().trim().max(100).nullable().optional(),
    snapshotRefId: z.string().trim().max(150).nullable().optional(),
    metadata: safeJsonObject.nullable().optional(),
  })
  .strict();

export const reportRunSearchQuerySchema = z
  .object({
    reportDefinitionId: z.string().trim().max(150).optional(),
    status: reportRunStatusSchema.optional(),
    sourceLayer: reportSourceLayerSchema.optional(),
    createdFrom: isoDateTime.optional(),
    createdTo: isoDateTime.optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

export const reportExportCreateSchema = z
  .object({
    reportDefinitionId: z.string().trim().min(1).max(150),
    reportRunId: z.string().trim().max(150).nullable().optional(),
    format: reportExportFormatSchema.optional(),
    deliveryChannel: reportDeliveryChannelSchema.optional(),
    fileName: z.string().trim().max(255).nullable().optional(),
    mimeType: z.string().trim().max(255).nullable().optional(),
    expiresAt: nullableDateField(),
    metadata: safeJsonObject.nullable().optional(),
  })
  .strict();

export const reportExportSearchQuerySchema = z
  .object({
    reportDefinitionId: z.string().trim().max(150).optional(),
    status: reportExportStatusSchema.optional(),
    format: reportExportFormatSchema.optional(),
    deliveryChannel: reportDeliveryChannelSchema.optional(),
    createdFrom: isoDateTime.optional(),
    createdTo: isoDateTime.optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

export const dashboardDefinitionUpsertSchema = z
  .object({
    key: z.string().trim().min(1).max(150),
    name: z.string().trim().min(1).max(255),
    description: z.string().trim().max(5000).nullable().optional(),
    visibility: dashboardVisibilitySchema.optional(),
    isSystem: z.boolean().optional(),
    isActive: z.boolean().optional(),
    layout: safeJsonObject.nullable().optional(),
    filters: safeJsonObject.nullable().optional(),
    metadata: safeJsonObject.nullable().optional(),
  })
  .strict();

export const dashboardDefinitionSearchQuerySchema = z
  .object({
    key: z.string().trim().max(150).optional(),
    name: z.string().trim().max(255).optional(),
    visibility: dashboardVisibilitySchema.optional(),
    isActive: z.coerce.boolean().optional(),
    createdFrom: isoDateTime.optional(),
    createdTo: isoDateTime.optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

export const dashboardWidgetUpsertSchema = z
  .object({
    dashboardDefinitionId: z.string().trim().min(1).max(150),
    key: z.string().trim().min(1).max(150),
    title: z.string().trim().min(1).max(255),
    widgetType: z.string().trim().min(1).max(100),
    dataSource: z.string().trim().max(255).nullable().optional(),
    config: safeJsonObject.nullable().optional(),
    position: safeJsonObject.nullable().optional(),
    visibilityRules: safeJsonObject.nullable().optional(),
    refreshIntervalSec: z.coerce.number().int().min(0).nullable().optional(),
    isActive: z.boolean().optional(),
    metadata: safeJsonObject.nullable().optional(),
  })
  .strict();

export const dashboardWidgetSearchQuerySchema = z
  .object({
    dashboardDefinitionId: z.string().trim().max(150).optional(),
    key: z.string().trim().max(150).optional(),
    isActive: z.coerce.boolean().optional(),
    createdFrom: isoDateTime.optional(),
    createdTo: isoDateTime.optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

export const scheduledReportUpsertSchema = z
  .object({
    reportDefinitionId: z.string().trim().min(1).max(150),
    name: z.string().trim().min(1).max(255),
    frequency: scheduleFrequencySchema,
    cronExpression: z.string().trim().max(255).nullable().optional(),
    timezone: z.string().trim().max(100).nullable().optional(),
    format: reportExportFormatSchema.optional(),
    deliveryChannel: reportDeliveryChannelSchema.optional(),
    isEnabled: z.boolean().optional(),
    recipients: z.array(z.string().trim().email()).nullable().optional(),
    parameters: safeJsonObject.nullable().optional(),
    nextRunAt: nullableDateField(),
    createdByUserId: z.string().trim().max(150).nullable().optional(),
    metadata: safeJsonObject.nullable().optional(),
  })
  .strict();

export const scheduledReportSearchQuerySchema = z
  .object({
    reportDefinitionId: z.string().trim().max(150).optional(),
    frequency: scheduleFrequencySchema.optional(),
    isEnabled: z.coerce.boolean().optional(),
    createdFrom: isoDateTime.optional(),
    createdTo: isoDateTime.optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

export const biConnectorUpsertSchema = z
  .object({
    connectorType: biConnectorTypeSchema,
    name: z.string().trim().min(1).max(255),
    isEnabled: z.boolean().optional(),
    endpointUrl: z.string().trim().url().max(2000).nullable().optional(),
    workspaceId: z.string().trim().max(255).nullable().optional(),
    datasetId: z.string().trim().max(255).nullable().optional(),
    credentialsRef: z.string().trim().max(255).nullable().optional(),
    config: safeJsonObject.nullable().optional(),
    metadata: safeJsonObject.nullable().optional(),
  })
  .strict();

export const biConnectorSearchQuerySchema = z
  .object({
    connectorType: biConnectorTypeSchema.optional(),
    name: z.string().trim().max(255).optional(),
    isEnabled: z.coerce.boolean().optional(),
    createdFrom: isoDateTime.optional(),
    createdTo: isoDateTime.optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();
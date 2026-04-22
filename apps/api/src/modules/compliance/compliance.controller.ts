// apps/api/src/modules/compliance/compliance.controller.ts

import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { ComplianceReviewService } from './ComplianceReviewService';
import { ComplianceReportService } from './ComplianceReportService';
import { ComplianceDashboardService } from './ComplianceDashboardService';
import { ComplianceCalendarService } from './ComplianceCalendarService';
import { ComplianceCapabilityService } from './ComplianceCapabilityService';
import { ComplianceGoAMLBridgeService } from './ComplianceGoAMLBridgeService';
import { ComplianceAuditService } from './ComplianceAuditService';

export const runClientComplianceReview = asyncHandler(async (req: Request, res: Response) => {
  const result = await ComplianceReviewService.runClientReview(req.db, {
    tenantId: req.tenantId!,
    clientId: req.body.clientId,
    actorId: req.user?.sub ?? null,
    performKyc: req.body.performKyc,
    performPepCheck: req.body.performPepCheck,
    performSanctionsCheck: req.body.performSanctionsCheck,
    persistResult: req.body.persistResult ?? true,
  });

  await ComplianceAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    clientId: req.body.clientId,
    action: 'CLIENT_REVIEW_RUN',
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
    metadata: {
      riskBand: result.checks.risk?.riskBand ?? null,
      riskScore: result.checks.risk?.score ?? null,
      kycStatus: result.checks.kyc?.status ?? null,
      pepStatus: result.checks.pep?.status ?? null,
      sanctionsStatus: result.checks.sanctions?.status ?? null,
    },
  });

  res.status(200).json(result);
});

export const listClientComplianceChecks = asyncHandler(async (req: Request, res: Response) => {
  const result = await ComplianceReviewService.listClientChecks(req.db, {
    tenantId: req.tenantId!,
    clientId: req.query.clientId ? String(req.query.clientId) : null,
    checkType: req.query.checkType ? String(req.query.checkType) : null,
    riskBand: req.query.riskBand ? String(req.query.riskBand) : null,
    checkedFrom: req.query.checkedFrom ? String(req.query.checkedFrom) : null,
    checkedTo: req.query.checkedTo ? String(req.query.checkedTo) : null,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  });

  await ComplianceAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    clientId: req.query.clientId ? String(req.query.clientId) : null,
    action: 'CLIENT_CHECK_HISTORY_VIEWED',
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
    metadata: {
      resultCount: result.meta.total,
    },
  });

  res.status(200).json(result);
});

export const createComplianceReport = asyncHandler(async (req: Request, res: Response) => {
  const report = await ComplianceReportService.createReport(req.db, {
    tenantId: req.tenantId!,
    reportType: req.body.reportType,
    status: req.body.status ?? 'DRAFT',
    periodStart: req.body.periodStart ?? null,
    periodEnd: req.body.periodEnd ?? null,
    referenceNumber: req.body.referenceNumber ?? null,
    regulatorAck: req.body.regulatorAck ?? null,
    submittedAt: req.body.submittedAt ?? null,
    clientId: req.body.clientId ?? null,
    createdById: req.user?.sub ?? null,
    payload: req.body.payload ?? {},
  });

  await ComplianceAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    clientId: report.clientId ?? null,
    reportId: report.id,
    action: 'REPORT_CREATED',
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
    metadata: {
      reportType: report.reportType,
      status: report.status,
    },
  });

  res.status(201).json(report);
});

export const getComplianceReport = asyncHandler(async (req: Request, res: Response) => {
  const report = await ComplianceReportService.getReport(req.db, {
    tenantId: req.tenantId!,
    reportId: req.params.reportId,
  });

  await ComplianceAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    clientId: report.clientId ?? null,
    reportId: report.id,
    action: 'REPORT_VIEWED',
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
  });

  res.status(200).json(report);
});

export const searchComplianceReports = asyncHandler(async (req: Request, res: Response) => {
  const result = await ComplianceReportService.searchReports(req.db, {
    tenantId: req.tenantId!,
    query: req.query.query ? String(req.query.query) : null,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    filters: {
      reportType: req.query.reportType ? (String(req.query.reportType) as any) : null,
      status: req.query.status ? (String(req.query.status) as any) : null,
      clientId: req.query.clientId ? String(req.query.clientId) : null,
      periodStartFrom: req.query.periodStartFrom ? String(req.query.periodStartFrom) : null,
      periodStartTo: req.query.periodStartTo ? String(req.query.periodStartTo) : null,
      periodEndFrom: req.query.periodEndFrom ? String(req.query.periodEndFrom) : null,
      periodEndTo: req.query.periodEndTo ? String(req.query.periodEndTo) : null,
      createdFrom: req.query.createdFrom ? String(req.query.createdFrom) : null,
      createdTo: req.query.createdTo ? String(req.query.createdTo) : null,
    },
  });

  await ComplianceAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    action: 'REPORT_SEARCHED',
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
    metadata: {
      query: req.query.query ?? null,
      resultCount: result.meta.total,
    },
  });

  res.status(200).json(result);
});

export const updateComplianceReport = asyncHandler(async (req: Request, res: Response) => {
  const report = await ComplianceReportService.updateReport(req.db, {
    tenantId: req.tenantId!,
    reportId: req.params.reportId,
    actorId: req.user?.sub ?? null,
    status: req.body.status,
    referenceNumber: req.body.referenceNumber,
    regulatorAck: req.body.regulatorAck,
    submittedAt: req.body.submittedAt,
    payload: req.body.payload,
  });

  await ComplianceAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    clientId: report.clientId ?? null,
    reportId: report.id,
    action: 'REPORT_STATUS_UPDATED',
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
    metadata: {
      status: report.status,
      referenceNumber: report.referenceNumber ?? null,
    },
  });

  res.status(200).json(report);
});

export const submitComplianceReportToGoAML = asyncHandler(async (req: Request, res: Response) => {
  const result = await ComplianceGoAMLBridgeService.submitReport(req.db, {
    tenantId: req.tenantId!,
    complianceReportId: req.params.reportId,
    requestId: req.id,
  });

  await ComplianceAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    reportId: req.params.reportId,
    action: 'REPORT_SUBMITTED_GOAML',
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
    metadata: {
      result,
    },
  });

  res.status(200).json(result);
});

export const syncComplianceReportGoAMLStatus = asyncHandler(async (req: Request, res: Response) => {
  const result = await ComplianceGoAMLBridgeService.syncReportStatus(req.db, {
    tenantId: req.tenantId!,
    complianceReportId: req.params.reportId,
    requestId: req.id,
  });

  await ComplianceAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    reportId: req.params.reportId,
    action: 'REPORT_GOAML_STATUS_SYNCED',
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
    metadata: {
      result,
    },
  });

  res.status(200).json(result);
});

export const getComplianceDashboard = asyncHandler(async (req: Request, res: Response) => {
  const dashboard = await ComplianceDashboardService.getDashboard(req.db, {
    tenantId: req.tenantId!,
    from: req.query.from ? String(req.query.from) : null,
    to: req.query.to ? String(req.query.to) : null,
  });

  await ComplianceAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    action: 'DASHBOARD_VIEWED',
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
  });

  res.status(200).json(dashboard);
});

export const getComplianceCalendar = asyncHandler(async (req: Request, res: Response) => {
  const calendar = await ComplianceCalendarService.getDeadlines(req.db, {
    tenantId: req.tenantId!,
    reviewWindowDays: req.query.reviewWindowDays ? Number(req.query.reviewWindowDays) : undefined,
    kycReviewAgeDays: req.query.kycReviewAgeDays ? Number(req.query.kycReviewAgeDays) : undefined,
    screeningReviewAgeDays: req.query.screeningReviewAgeDays
      ? Number(req.query.screeningReviewAgeDays)
      : undefined,
  });

  await ComplianceAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    action: 'CALENDAR_VIEWED',
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
  });

  res.status(200).json(calendar);
});

export const getComplianceCapabilities = asyncHandler(async (req: Request, res: Response) => {
  const result = ComplianceCapabilityService.getSummary();

  await ComplianceAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    action: 'CAPABILITY_VIEWED',
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
    metadata: {
      active: result.active,
      pendingSchema: result.pendingSchema,
      pendingCrossModule: result.pendingCrossModule,
      pendingProvider: result.pendingProvider,
    },
  });

  res.status(200).json(result);
});
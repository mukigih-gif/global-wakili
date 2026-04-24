// apps/api/src/modules/court/court.controller.ts

import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { CourtHearingService } from './CourtHearingService';
import { CourtDashboardService } from './CourtDashboardService';
import { CourtCapabilityService } from './CourtCapabilityService';
import { CourtFilingBridgeService } from './CourtFilingBridgeService';
import { CourtAuditService } from './CourtAuditService';

export const createCourtHearing = asyncHandler(async (req: Request, res: Response) => {
  const hearing = await CourtHearingService.createHearing(req.db, {
    tenantId: req.tenantId!,
    matterId: req.body.matterId,
    calendarEventId: req.body.calendarEventId ?? null,
    title: req.body.title,
    caseNumber: req.body.caseNumber ?? null,
    courtName: req.body.courtName ?? null,
    courtStation: req.body.courtStation ?? null,
    courtroom: req.body.courtroom ?? null,
    judge: req.body.judge ?? null,
    hearingType: req.body.hearingType ?? 'OTHER',
    status: req.body.status ?? 'SCHEDULED',
    hearingDate: req.body.hearingDate,
    startTime: req.body.startTime ?? null,
    endTime: req.body.endTime ?? null,
    outcome: req.body.outcome ?? null,
    notes: req.body.notes ?? null,
    createdById: req.user?.sub ?? null,
    metadata: req.body.metadata ?? {},
  });

  await CourtAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    hearingId: hearing.id,
    matterId: hearing.matterId,
    action: 'HEARING_CREATED',
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
    metadata: {
      status: hearing.status,
      hearingType: hearing.hearingType,
      hearingDate: hearing.hearingDate,
      calendarEventId: hearing.calendarEventId ?? null,
    },
  });

  res.status(201).json(hearing);
});

export const getCourtHearing = asyncHandler(async (req: Request, res: Response) => {
  const hearing = await CourtHearingService.getHearing(req.db, {
    tenantId: req.tenantId!,
    hearingId: req.params.hearingId,
  });

  await CourtAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    hearingId: hearing.id,
    matterId: hearing.matterId,
    action: 'HEARING_VIEWED',
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
  });

  res.status(200).json(hearing);
});

export const searchCourtHearings = asyncHandler(async (req: Request, res: Response) => {
  const result = await CourtHearingService.searchHearings(req.db, {
    tenantId: req.tenantId!,
    query: req.query.query ? String(req.query.query) : null,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    filters: {
      matterId: req.query.matterId ? String(req.query.matterId) : null,
      calendarEventId: req.query.calendarEventId ? String(req.query.calendarEventId) : null,
      caseNumber: req.query.caseNumber ? String(req.query.caseNumber) : null,
      courtName: req.query.courtName ? String(req.query.courtName) : null,
      courtStation: req.query.courtStation ? String(req.query.courtStation) : null,
      judge: req.query.judge ? String(req.query.judge) : null,
      hearingType: req.query.hearingType ? (String(req.query.hearingType) as any) : null,
      status: req.query.status ? (String(req.query.status) as any) : null,
      hearingFrom: req.query.hearingFrom ? String(req.query.hearingFrom) : null,
      hearingTo: req.query.hearingTo ? String(req.query.hearingTo) : null,
      upcomingOnly:
        req.query.upcomingOnly !== undefined ? String(req.query.upcomingOnly) === 'true' : null,
      overdueOnly:
        req.query.overdueOnly !== undefined ? String(req.query.overdueOnly) === 'true' : null,
    },
  });

  await CourtAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    action: 'HEARING_SEARCHED',
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

export const updateCourtHearing = asyncHandler(async (req: Request, res: Response) => {
  const hearing = await CourtHearingService.updateHearing(req.db, {
    tenantId: req.tenantId!,
    hearingId: req.params.hearingId,
    actorId: req.user!.sub,
    calendarEventId: req.body.calendarEventId,
    title: req.body.title,
    caseNumber: req.body.caseNumber,
    courtName: req.body.courtName,
    courtStation: req.body.courtStation,
    courtroom: req.body.courtroom,
    judge: req.body.judge,
    hearingType: req.body.hearingType,
    status: req.body.status,
    hearingDate: req.body.hearingDate,
    startTime: req.body.startTime,
    endTime: req.body.endTime,
    outcome: req.body.outcome,
    notes: req.body.notes,
    metadata: req.body.metadata,
  });

  await CourtAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    hearingId: hearing.id,
    matterId: hearing.matterId,
    action: 'HEARING_UPDATED',
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
    metadata: {
      status: hearing.status,
      hearingType: hearing.hearingType,
      hearingDate: hearing.hearingDate,
      calendarEventId: hearing.calendarEventId ?? null,
    },
  });

  res.status(200).json(hearing);
});

export const updateCourtHearingStatus = asyncHandler(async (req: Request, res: Response) => {
  const hearing = await CourtHearingService.setStatus(req.db, {
    tenantId: req.tenantId!,
    hearingId: req.params.hearingId,
    actorId: req.user!.sub,
    status: req.body.status,
    outcome: req.body.outcome ?? null,
    notes: req.body.notes ?? null,
  });

  const action =
    hearing.status === 'ADJOURNED'
      ? 'HEARING_ADJOURNED'
      : hearing.status === 'COMPLETED'
        ? 'HEARING_COMPLETED'
        : hearing.status === 'CANCELLED'
          ? 'HEARING_CANCELLED'
          : hearing.status === 'MISSED'
            ? 'HEARING_MISSED'
            : 'HEARING_STATUS_CHANGED';

  await CourtAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    hearingId: hearing.id,
    matterId: hearing.matterId,
    action,
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
    metadata: {
      status: hearing.status,
      reason: req.body.reason ?? null,
      outcome: hearing.outcome ?? null,
    },
  });

  res.status(200).json(hearing);
});

export const recordCourtOutcome = asyncHandler(async (req: Request, res: Response) => {
  const hearing = await CourtHearingService.recordOutcome(req.db, {
    tenantId: req.tenantId!,
    hearingId: req.params.hearingId,
    actorId: req.user!.sub,
    outcome: req.body.outcome,
    notes: req.body.notes ?? null,
  });

  await CourtAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    hearingId: hearing.id,
    matterId: hearing.matterId,
    action: 'OUTCOME_RECORDED',
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
  });

  res.status(200).json(hearing);
});

export const getCourtDashboard = asyncHandler(async (req: Request, res: Response) => {
  const dashboard = await CourtDashboardService.getDashboard(req.db, {
    tenantId: req.tenantId!,
    matterId: req.query.matterId ? String(req.query.matterId) : null,
    from: req.query.from ? String(req.query.from) : null,
    to: req.query.to ? String(req.query.to) : null,
  });

  await CourtAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    action: 'DASHBOARD_VIEWED',
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
  });

  res.status(200).json(dashboard);
});

export const getCourtCapabilities = asyncHandler(async (req: Request, res: Response) => {
  const result = CourtCapabilityService.getSummary();

  await CourtAuditService.logAction(req.db, {
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

export const requestCourtBridge = asyncHandler(async (req: Request, res: Response) => {
  await CourtFilingBridgeService.requestBridge(req.db, {
    tenantId: req.tenantId!,
    hearingId: req.params.hearingId,
    actorId: req.user!.sub,
    type: req.params.type as any,
    reason: req.body.reason ?? null,
    notes: req.body.notes ?? null,
    requestId: req.id,
  });

  res.status(202).json({ success: true });
});
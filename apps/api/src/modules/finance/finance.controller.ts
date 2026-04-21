// apps/api/src/modules/finance/finance.controller.ts

import type { Request, Response } from 'express';
import { Prisma, prisma } from '@global-wakili/database';

import { asyncHandler } from '../../utils/async-handler';

import AccountService from './account.service';
import JournalService from './journal.service';
import { GeneralLedgerService } from './GeneralLedgerService';
import { ReportingService } from './ReportingService';
import { PeriodCloseService } from './PeriodCloseService';
import { ReportExporter } from './report.exporter';
import ReconciliationService from './ReconciliationService';
import ETimsService from './ETimsService';
import VATService from './VATService';
import WHTService from './WHTService';
import FinancePostingService from './FinancePostingService';

function getTenantId(req: Request): string {
  const tenantId =
    req.tenantId ??
    (req as any).tenantId ??
    req.body?.tenantId ??
    req.query?.tenantId ??
    req.headers['x-tenant-id'] ??
    (req as any).user?.tenantId;

  if (!tenantId || Array.isArray(tenantId)) {
    throw Object.assign(new Error('Tenant context is required'), {
      statusCode: 400,
      code: 'TENANT_REQUIRED',
    });
  }

  return String(tenantId);
}

function getActorId(req: Request): string {
  const actorId =
    req.user?.id ??
    (req as any).user?.id ??
    req.body?.userId ??
    req.body?.actorId ??
    req.headers['x-user-id'] ??
    'system';

  if (Array.isArray(actorId)) {
    throw Object.assign(new Error('Invalid actor context'), {
      statusCode: 401,
      code: 'ACTOR_INVALID',
    });
  }

  return String(actorId);
}

function getDb(req: Request): any {
  return (req as any).db ?? prisma;
}

function parseOptionalDate(value: unknown, fieldName: string): Date | undefined {
  if (value === undefined || value === null || value === '') return undefined;

  const date = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    throw Object.assign(new Error(`${fieldName} is invalid`), {
      statusCode: 400,
      code: 'INVALID_DATE',
      details: { fieldName, value },
    });
  }

  return date;
}

function parseRequiredDate(value: unknown, fieldName: string): Date {
  const date = parseOptionalDate(value, fieldName);

  if (!date) {
    throw Object.assign(new Error(`${fieldName} is required`), {
      statusCode: 400,
      code: 'DATE_REQUIRED',
      details: { fieldName },
    });
  }

  return date;
}

function normalizeFormat(value: unknown, fallback = 'json') {
  return String(value ?? fallback).trim().toLowerCase();
}

function decimalToString(value: unknown) {
  if (value instanceof Prisma.Decimal) return value.toString();
  if (value && typeof (value as any).toString === 'function') return (value as any).toString();
  return value;
}

function responseOk(res: Response, data: unknown, status = 200) {
  res.status(status).json({
    success: true,
    module: 'finance',
    data,
  });
}

export const listAccounts = asyncHandler(async (req: Request, res: Response) => {
  const service = new AccountService(getDb(req));

  const data = await service.listAccounts({
    tenantId: getTenantId(req),
    type: req.query.type as any,
    subtype: req.query.subtype as any,
    isActive:
      req.query.isActive !== undefined
        ? String(req.query.isActive).toLowerCase() === 'true'
        : undefined,
    search: req.query.search ? String(req.query.search) : undefined,
    take: req.query.take ? Number(req.query.take) : undefined,
    skip: req.query.skip ? Number(req.query.skip) : undefined,
  });

  responseOk(res, data);
});

export const createAccount = asyncHandler(async (req: Request, res: Response) => {
  const service = new AccountService(getDb(req));

  const data = await service.createAccount({
    tenantId: getTenantId(req),
    code: req.body.code,
    name: req.body.name,
    type: req.body.type,
    subtype: req.body.subtype ?? null,
    description: req.body.description ?? null,
    currency: req.body.currency ?? 'KES',
    allowManualPosting: req.body.allowManualPosting,
    isSystem: req.body.isSystem,
  });

  responseOk(res, data, 201);
});

export const getAccount = asyncHandler(async (req: Request, res: Response) => {
  const service = new AccountService(getDb(req));

  const data = await service.getAccountById(getTenantId(req), req.params.id);

  responseOk(res, data);
});

export const updateAccount = asyncHandler(async (req: Request, res: Response) => {
  const service = new AccountService(getDb(req));

  const data = await service.updateAccount({
    tenantId: getTenantId(req),
    accountId: req.params.id,
    code: req.body.code,
    name: req.body.name,
    type: req.body.type,
    subtype: req.body.subtype,
    description: req.body.description,
    currency: req.body.currency,
    allowManualPosting: req.body.allowManualPosting,
    isSystem: req.body.isSystem,
    isActive: req.body.isActive,
  });

  responseOk(res, data);
});

export const listJournals = asyncHandler(async (req: Request, res: Response) => {
  const service = new JournalService(getDb(req));

  const data = await service.listJournals({
    tenantId: getTenantId(req),
    startDate: parseOptionalDate(req.query.startDate ?? req.query.start, 'startDate'),
    endDate: parseOptionalDate(req.query.endDate ?? req.query.end, 'endDate'),
    matterId: req.query.matterId ? String(req.query.matterId) : undefined,
    clientId: req.query.clientId ? String(req.query.clientId) : undefined,
    sourceModule: req.query.sourceModule ? String(req.query.sourceModule) : undefined,
    sourceEntityType: req.query.sourceEntityType ? String(req.query.sourceEntityType) : undefined,
    sourceEntityId: req.query.sourceEntityId ? String(req.query.sourceEntityId) : undefined,
    reference: req.query.reference ? String(req.query.reference) : undefined,
    take: req.query.take ? Number(req.query.take) : undefined,
    skip: req.query.skip ? Number(req.query.skip) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  });

  responseOk(res, data);
});

export const postJournal = asyncHandler(async (req: Request, res: Response) => {
  const data = await GeneralLedgerService.postJournal(req, {
    ...req.body,
    tenantId: getTenantId(req),
    actorId: getActorId(req),
  });

  responseOk(res, data, 201);
});

export const getJournal = asyncHandler(async (req: Request, res: Response) => {
  const service = new JournalService(getDb(req));

  const data = await service.getJournalById(getTenantId(req), req.params.id);

  responseOk(res, data);
});

export const getTrialBalance = asyncHandler(async (req: Request, res: Response) => {
  const asOf = parseOptionalDate(req.query.asOf, 'asOf');

  const data = await ReportingService.getTrialBalanceReport(req, asOf);

  responseOk(res, data);
});

export const getCurrentTrialBalance = getTrialBalance;

export const getHistoricalTrialBalance = asyncHandler(async (req: Request, res: Response) => {
  const asOf = parseRequiredDate(req.query.asOf, 'asOf');

  const data = await ReportingService.getTrialBalanceReport(req, asOf);

  responseOk(res, data);
});

export const getBalanceSheet = asyncHandler(async (req: Request, res: Response) => {
  const asOf = parseOptionalDate(req.query.asOf, 'asOf') ?? new Date();

  const data = await ReportingService.getBalanceSheetReport(req, asOf);

  responseOk(res, data);
});

export const getCashflowStatement = asyncHandler(async (req: Request, res: Response) => {
  const start = parseRequiredDate(req.query.start ?? req.query.startDate, 'start');
  const end = parseRequiredDate(req.query.end ?? req.query.endDate, 'end');

  const data = await ReportingService.getCashflowReport(req, { start, end });

  responseOk(res, data);
});

export const getCashflow = getCashflowStatement;

export const getStatement = asyncHandler(async (req: Request, res: Response) => {
  const db = getDb(req);
  const tenantId = getTenantId(req);

  const from = parseOptionalDate(req.query.from ?? req.query.start, 'from');
  const to = parseOptionalDate(req.query.to ?? req.query.end, 'to');
  const accountId = req.query.accountId ? String(req.query.accountId) : undefined;
  const clientId = req.query.clientId ? String(req.query.clientId) : undefined;
  const matterId = req.query.matterId ? String(req.query.matterId) : undefined;

  if (!db.journalLine) {
    responseOk(res, {
      tenantId,
      accountId: accountId ?? null,
      clientId: clientId ?? null,
      matterId: matterId ?? null,
      lines: [],
      totals: {
        debit: '0.00',
        credit: '0.00',
      },
      warning: 'journalLine delegate is unavailable; statement returned as empty derived result.',
      generatedAt: new Date(),
    });
    return;
  }

  const lines = await db.journalLine.findMany({
    where: {
      tenantId,
      ...(accountId ? { accountId } : {}),
      ...(clientId ? { clientId } : {}),
      ...(matterId ? { matterId } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    },
    include: {
      account: true,
      journalEntry: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
    take: Math.min(req.query.take ? Number(req.query.take) : 500, 1000),
    skip: req.query.skip ? Number(req.query.skip) : 0,
  });

  const totals = lines.reduce(
    (acc: { debit: Prisma.Decimal; credit: Prisma.Decimal }, line: any) => ({
      debit: acc.debit.plus(new Prisma.Decimal(line.debit ?? 0)),
      credit: acc.credit.plus(new Prisma.Decimal(line.credit ?? 0)),
    }),
    {
      debit: new Prisma.Decimal(0),
      credit: new Prisma.Decimal(0),
    },
  );

  responseOk(res, {
    tenantId,
    accountId: accountId ?? null,
    clientId: clientId ?? null,
    matterId: matterId ?? null,
    from: from ?? null,
    to: to ?? null,
    lines,
    totals: {
      debit: totals.debit.toDecimalPlaces(2).toString(),
      credit: totals.credit.toDecimalPlaces(2).toString(),
      net: totals.debit.minus(totals.credit).toDecimalPlaces(2).toString(),
    },
    generatedAt: new Date(),
  });
});

export const getFinanceDashboard = asyncHandler(async (req: Request, res: Response) => {
  const db = getDb(req);
  const tenantId = getTenantId(req);

  const [
    accountCount,
    journalCount,
    recentJournals,
  ] = await Promise.all([
    db.chartOfAccount?.count
      ? db.chartOfAccount.count({ where: { tenantId } })
      : Promise.resolve(0),

    db.journalEntry?.count
      ? db.journalEntry.count({ where: { tenantId } })
      : Promise.resolve(0),

    db.journalEntry?.findMany
      ? db.journalEntry.findMany({
          where: { tenantId },
          include: {
            lines: {
              include: { account: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        })
      : Promise.resolve([]),
  ]);

  responseOk(res, {
    tenantId,
    accountCount,
    journalCount,
    recentJournals,
    generatedAt: new Date(),
  });
});

export const closePeriod = asyncHandler(async (req: Request, res: Response) => {
  const data = await PeriodCloseService.closePeriod(req, {
    ...req.body,
    tenantId: getTenantId(req),
    actorId: getActorId(req),
  });

  responseOk(res, data);
});

export const closeAccountingPeriod = closePeriod;

export const listAccountingPeriods = asyncHandler(async (req: Request, res: Response) => {
  const data = await PeriodCloseService.listPeriods(req);

  responseOk(res, data);
});

export const exportReport = asyncHandler(async (req: Request, res: Response) => {
  const reportType = String(req.body?.reportType ?? req.query.reportType ?? 'trial-balance');
  const format = normalizeFormat(req.body?.format ?? req.query.format, 'csv');

  let data: any;

  if (reportType === 'balance-sheet') {
    const asOf = parseOptionalDate(req.query.asOf ?? req.body?.asOf, 'asOf') ?? new Date();
    data = await ReportingService.getBalanceSheetReport(req, asOf);
  } else if (reportType === 'cashflow' || reportType === 'cash-flow') {
    const start = parseRequiredDate(req.query.start ?? req.body?.start, 'start');
    const end = parseRequiredDate(req.query.end ?? req.body?.end, 'end');
    data = await ReportingService.getCashflowReport(req, { start, end });
  } else {
    const asOf = parseOptionalDate(req.query.asOf ?? req.body?.asOf, 'asOf');
    data = await ReportingService.getTrialBalanceReport(req, asOf);
  }

  const filename = ReportExporter.makeFilename(reportType, format === 'json' ? 'json' : 'csv');

  if (format === 'json') {
    const body = ReportExporter.toJson(data);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(body);
    return;
  }

  const rows = Array.isArray(data)
    ? data
    : [data];

  const csv = ReportExporter.toCsv(
    rows.map((row: any) => {
      const normalized: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(row)) {
        normalized[key] = decimalToString(value);
      }

      return normalized;
    }),
  );

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(csv);
});

export const exportTrialBalance = asyncHandler(async (req: Request, res: Response) => {
  req.query.reportType = 'trial-balance';
  await exportReport(req, res, (() => undefined) as any);
});

export const exportBalanceSheet = asyncHandler(async (req: Request, res: Response) => {
  req.query.reportType = 'balance-sheet';
  await exportReport(req, res, (() => undefined) as any);
});
export const getMonthlyVatSummary = asyncHandler(async (req: Request, res: Response) => {
  const service = new VATService();

  const data = await service.getMonthlyVatSummary({
    tenantId: getTenantId(req),
    actorId: getActorId(req),
    year: Number(req.query.year),
    month: Number(req.query.month),
  });

  responseOk(res, data);
});

export const getVatSummary = asyncHandler(async (req: Request, res: Response) => {
  const service = new VATService();

  const data = await service.getVatSummary({
    tenantId: getTenantId(req),
    actorId: getActorId(req),
    from: parseRequiredDate(req.query.from, 'from'),
    to: parseRequiredDate(req.query.to, 'to'),
  });

  responseOk(res, data);
});

export const getInvoiceVatExposure = asyncHandler(async (req: Request, res: Response) => {
  const service = new VATService();

  const data = await service.getInvoiceVatExposure({
    tenantId: getTenantId(req),
    invoiceId: req.params.invoiceId,
  });

  responseOk(res, data);
});

export const recordVatAdjustment = asyncHandler(async (req: Request, res: Response) => {
  const service = new VATService();

  const data = await service.recordVatAdjustment({
    tenantId: getTenantId(req),
    actorId: getActorId(req),
    adjustmentDate: parseRequiredDate(req.body.adjustmentDate, 'adjustmentDate'),
    type: req.body.type,
    amount: req.body.amount,
    reason: req.body.reason,
    reference: req.body.reference ?? null,
    metadata: req.body.metadata,
  });

  responseOk(res, data, 201);
});

export const voidVatAdjustment = asyncHandler(async (req: Request, res: Response) => {
  const service = new VATService();

  const data = await service.voidVatAdjustment({
    tenantId: getTenantId(req),
    actorId: getActorId(req),
    adjustmentId: req.params.adjustmentId,
    reason: req.body.reason,
  });

  responseOk(res, data);
});

export const listVatAdjustments = asyncHandler(async (req: Request, res: Response) => {
  const service = new VATService();

  const data = await service.listVatAdjustments({
    tenantId: getTenantId(req),
    from: parseOptionalDate(req.query.from, 'from'),
    to: parseOptionalDate(req.query.to, 'to'),
    type: req.query.type ? String(req.query.type) : undefined,
    status: req.query.status ? String(req.query.status) : undefined,
    take: req.query.take ? Number(req.query.take) : undefined,
    skip: req.query.skip ? Number(req.query.skip) : undefined,
  });

  responseOk(res, data);
});

export const calculateWht = asyncHandler(async (req: Request, res: Response) => {
  const service = new WHTService();

  const data = await service.calculate({
    tenantId: getTenantId(req),
    actorId: getActorId(req),
    invoiceId: req.body.invoiceId,
    vendorBillId: req.body.vendorBillId,
    baseAmount: req.body.baseAmount,
    rate: req.body.rate,
    rateCode: req.body.rateCode,
    partyResident: req.body.partyResident,
    category: req.body.category,
  });

  responseOk(res, data);
});

export const recordWhtCertificate = asyncHandler(async (req: Request, res: Response) => {
  const service = new WHTService();

  const data = await service.recordCertificate({
    tenantId: getTenantId(req),
    actorId: getActorId(req),
    invoiceId: req.body.invoiceId ?? null,
    vendorBillId: req.body.vendorBillId ?? null,
    paymentReceiptId: req.body.paymentReceiptId ?? null,
    supplierId: req.body.supplierId ?? null,
    clientId: req.body.clientId ?? null,
    certificateNumber: req.body.certificateNumber ?? null,
    certificateDate: parseRequiredDate(req.body.certificateDate, 'certificateDate'),
    baseAmount: req.body.baseAmount,
    withholdingRate: req.body.withholdingRate,
    withholdingAmount: req.body.withholdingAmount ?? null,
    reference: req.body.reference ?? null,
    metadata: req.body.metadata,
  });

  responseOk(res, data, 201);
});

export const getWhtReport = asyncHandler(async (req: Request, res: Response) => {
  const service = new WHTService();

  const data = await service.getWhtReport({
    tenantId: getTenantId(req),
    from: parseRequiredDate(req.query.from, 'from'),
    to: parseRequiredDate(req.query.to, 'to'),
    take: req.query.take ? Number(req.query.take) : undefined,
    skip: req.query.skip ? Number(req.query.skip) : undefined,
  });

  responseOk(res, data);
});

export const voidWhtCertificate = asyncHandler(async (req: Request, res: Response) => {
  const service = new WHTService();

  const data = await service.voidCertificate({
    tenantId: getTenantId(req),
    actorId: getActorId(req),
    certificateId: req.params.certificateId,
    reason: req.body.reason,
  });

  responseOk(res, data);
});

export const runFinanceReconciliation = asyncHandler(async (req: Request, res: Response) => {
  const service = new ReconciliationService();

  const type = req.body.type ?? 'FULL';

  const baseInput = {
    tenantId: getTenantId(req),
    actorId: getActorId(req),
    type,
    periodStart: parseOptionalDate(req.body.periodStart, 'periodStart') ?? null,
    periodEnd: parseOptionalDate(req.body.periodEnd, 'periodEnd') ?? null,
    bankAccountId: req.body.bankAccountId ?? null,
    trustAccountId: req.body.trustAccountId ?? null,
    matterId: req.body.matterId ?? null,
    metadata: req.body.metadata,
  };

  const data =
    type === 'TRUST'
      ? await service.runTrustReconciliation(baseInput)
      : type === 'THREE_WAY'
        ? await service.runThreeWayReconciliation(baseInput)
        : await service.runFullReconciliation(baseInput);

  responseOk(res, data, 201);
});

export const listFinanceReconciliations = asyncHandler(async (req: Request, res: Response) => {
  const service = new ReconciliationService();

  const data = await service.listReconciliations({
    tenantId: getTenantId(req),
    type: req.query.type ? String(req.query.type) : undefined,
    status: req.query.status ? String(req.query.status) : undefined,
    take: req.query.take ? Number(req.query.take) : undefined,
    skip: req.query.skip ? Number(req.query.skip) : undefined,
  });

  responseOk(res, data);
});

export const getFinanceReconciliationById = asyncHandler(async (req: Request, res: Response) => {
  const service = new ReconciliationService();

  const data = await service.getReconciliationById(
    getTenantId(req),
    req.params.reconciliationId,
  );

  responseOk(res, data);
});

export const fiscalizeInvoiceEtims = asyncHandler(async (req: Request, res: Response) => {
  const service = new ETimsService();

  const data = await service.fiscalizeInvoice({
    tenantId: getTenantId(req),
    actorId: getActorId(req),
    invoiceId: req.params.invoiceId,
    force: req.body?.force === true,
  });

  responseOk(res, data, 201);
});

export const postFinanceSource = asyncHandler(async (req: Request, res: Response) => {
  const service = new FinancePostingService();

  const data = await service.post({
    tenantId: getTenantId(req),
    actorId: getActorId(req),
    source: req.body.source,
    sourceId: req.body.sourceId,
    force: req.body.force === true,
    req,
    metadata: req.body.metadata,
  });

  responseOk(res, data, 201);
});
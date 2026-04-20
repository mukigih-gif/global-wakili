import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { GeneralLedgerService } from './GeneralLedgerService';
import { ReportingService } from './ReportingService';
import { PeriodCloseService } from './PeriodCloseService';
import { ReportExporter } from './report.exporter';

function parseDateOrThrow(value: unknown, fieldName: string): Date {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw Object.assign(new Error(`${fieldName} is invalid`), {
      statusCode: 400,
      code: 'INVALID_DATE',
      details: { fieldName, value },
    });
  }
  return date;
}

export const postJournal = asyncHandler(async (req: Request, res: Response) => {
  const journal = await GeneralLedgerService.postJournal(req, req.body);
  res.status(201).json(journal);
});

export const getCurrentTrialBalance = asyncHandler(async (req: Request, res: Response) => {
  const report = await ReportingService.getTrialBalanceReport(req);
  res.status(200).json(report);
});

export const getHistoricalTrialBalance = asyncHandler(async (req: Request, res: Response) => {
  const asOf = parseDateOrThrow(req.query.asOf, 'asOf');
  const report = await ReportingService.getTrialBalanceReport(req, asOf);
  res.status(200).json(report);
});

export const getBalanceSheet = asyncHandler(async (req: Request, res: Response) => {
  const asOf = req.query.asOf ? parseDateOrThrow(req.query.asOf, 'asOf') : new Date();
  const report = await ReportingService.getBalanceSheetReport(req, asOf);
  res.status(200).json(report);
});

export const getCashflow = asyncHandler(async (req: Request, res: Response) => {
  const start = parseDateOrThrow(req.query.start, 'start');
  const end = parseDateOrThrow(req.query.end, 'end');

  const report = await ReportingService.getCashflowReport(req, { start, end });
  res.status(200).json(report);
});

export const closeAccountingPeriod = asyncHandler(async (req: Request, res: Response) => {
  const period = await PeriodCloseService.closePeriod(req, req.body);
  res.status(200).json(period);
});

export const listAccountingPeriods = asyncHandler(async (req: Request, res: Response) => {
  const periods = await PeriodCloseService.listPeriods(req);
  res.status(200).json(periods);
});

export const exportTrialBalance = asyncHandler(async (req: Request, res: Response) => {
  const asOf = req.query.asOf ? parseDateOrThrow(req.query.asOf, 'asOf') : undefined;
  const format = String(req.query.format ?? 'csv').toLowerCase();

  const data = await ReportingService.getTrialBalanceReport(req, asOf);

  if (format === 'json') {
    const body = ReportExporter.toJson(data);
    const filename = ReportExporter.makeFilename('trial-balance', 'json');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(body);
    return;
  }

  const csv = ReportExporter.toCsv(
    data.map((row: any) => ({
      accountId: row.id,
      code: row.code,
      name: row.name,
      type: row.type,
      subtype: row.subtype,
      debit: row.debit?.toString?.() ?? row.debit,
      credit: row.credit?.toString?.() ?? row.credit,
      netBalance: row.netBalance?.toString?.() ?? row.netBalance,
    })),
  );

  const filename = ReportExporter.makeFilename('trial-balance', 'csv');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(csv);
});

export const exportBalanceSheet = asyncHandler(async (req: Request, res: Response) => {
  const asOf = req.query.asOf ? parseDateOrThrow(req.query.asOf, 'asOf') : new Date();
  const format = String(req.query.format ?? 'json').toLowerCase();

  const data = await ReportingService.getBalanceSheetReport(req, asOf);

  if (format === 'csv') {
    const csv = ReportExporter.toCsv([
      {
        asOfDate: asOf,
        assets: data.assets?.toString?.() ?? data.assets,
        liabilities: data.liabilities?.toString?.() ?? data.liabilities,
        equity: data.equity?.toString?.() ?? data.equity,
        isBalanced: data.isBalanced,
      },
    ]);
    const filename = ReportExporter.makeFilename('balance-sheet', 'csv');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
    return;
  }

  const body = ReportExporter.toJson(data);
  const filename = ReportExporter.makeFilename('balance-sheet', 'json');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(body);
});
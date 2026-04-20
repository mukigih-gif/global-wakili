import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { TrustTransactionService } from './TrustTransactionService';
import { TrustTransferService } from './TrustTransferService';
import { TrustReconciliationService } from './TrustReconciliationService';
import { ThreeWayReconciliationService } from './ThreeWayReconciliationService';
import { TrustViolationService } from './TrustViolationService';
import { TrustDashboardService } from './trust.dashboard';
import { TrustStatementService } from './trust.statement.service';
import { TrustReportExporter } from './trust.reporter';
import { TrustInterestService } from './TrustInterestService';
import { TrustAlertService } from './TrustAlertService';
import { TrustService } from './TrustService';
import { ReconciliationMatchService } from './reconciliation-match.service';

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

export const createTrustTransaction = asyncHandler(async (req: Request, res: Response) => {
  const transaction = await TrustTransactionService.create(req, req.body);
  res.status(201).json(transaction);
});

export const transferTrustToOffice = asyncHandler(async (req: Request, res: Response) => {
  const result = await TrustTransferService.transferToOffice(req, req.body);
  res.status(201).json(result);
});

export const postTrustInterest = asyncHandler(async (req: Request, res: Response) => {
  const result = await TrustInterestService.postInterest(req, {
    trustAccountId: req.body.trustAccountId,
    clientId: req.body.clientId,
    matterId: req.body.matterId ?? null,
    amount: req.body.amount,
    transactionDate: parseDateOrThrow(req.body.transactionDate, 'transactionDate'),
    reference: req.body.reference,
    description: req.body.description ?? null,
  });

  res.status(201).json(result);
});

export const getTrustAccountSnapshot = asyncHandler(async (req: Request, res: Response) => {
  const snapshot = await TrustReconciliationService.getTrustAccountSnapshot(req, {
    trustAccountId: req.params.trustAccountId,
    statementDate: parseDateOrThrow(req.query.statementDate, 'statementDate'),
  });

  res.status(200).json(snapshot);
});

export const recordTrustReconciliation = asyncHandler(async (req: Request, res: Response) => {
  const result = await TrustReconciliationService.recordReconciliation(req, {
    trustAccountId: req.body.trustAccountId,
    statementDate: parseDateOrThrow(req.body.statementDate, 'statementDate'),
    notes: req.body.notes ?? null,
  });

  res.status(201).json(result);
});

export const listTrustReconciliations = asyncHandler(async (req: Request, res: Response) => {
  const result = await TrustReconciliationService.listReconciliations(
    req,
    req.query.trustAccountId ? String(req.query.trustAccountId) : undefined,
  );

  res.status(200).json(result);
});

export const runThreeWayReconciliation = asyncHandler(async (req: Request, res: Response) => {
  const result = await ThreeWayReconciliationService.run(req, {
    trustAccountId: req.body.trustAccountId,
    statementDate: parseDateOrThrow(req.body.statementDate, 'statementDate'),
    tolerance: req.body.tolerance ?? 0,
    notes: req.body.notes ?? null,
  });

  res.status(201).json(result);
});

export const getReconciliationMatches = asyncHandler(async (req: Request, res: Response) => {
  const result = await ReconciliationMatchService.listByRun(
    req.db,
    req.tenantId!,
    req.params.runId,
  );

  res.status(200).json(result);
});

export const getTrustViolations = asyncHandler(async (req: Request, res: Response) => {
  const result = await TrustViolationService.getAllViolations(req);
  res.status(200).json(result);
});

export const getTrustAlerts = asyncHandler(async (req: Request, res: Response) => {
  const result = await TrustAlertService.getAlertSummary(req);
  res.status(200).json(result);
});

export const emitTrustAlerts = asyncHandler(async (req: Request, res: Response) => {
  const result = await TrustAlertService.emitViolationAlerts(req);
  res.status(200).json(result);
});

export const getTrustDashboard = asyncHandler(async (req: Request, res: Response) => {
  const dashboard = await TrustDashboardService.getDashboard(req);
  res.status(200).json(dashboard);
});

export const getTrustOverview = asyncHandler(async (req: Request, res: Response) => {
  const overview = await TrustService.getOverview(req);
  res.status(200).json(overview);
});

export const getTrustAccountView = asyncHandler(async (req: Request, res: Response) => {
  const view = await TrustService.getTrustAccountView(req, {
    trustAccountId: req.params.trustAccountId,
    statementDate: req.query.statementDate
      ? parseDateOrThrow(req.query.statementDate, 'statementDate')
      : undefined,
    start: req.query.start ? parseDateOrThrow(req.query.start, 'start') : undefined,
    end: req.query.end ? parseDateOrThrow(req.query.end, 'end') : undefined,
  });

  res.status(200).json(view);
});

export const getTrustStatement = asyncHandler(async (req: Request, res: Response) => {
  const statement = await TrustStatementService.getTrustAccountStatement(req, {
    trustAccountId: req.params.trustAccountId,
    start: req.query.start ? parseDateOrThrow(req.query.start, 'start') : undefined,
    end: req.query.end ? parseDateOrThrow(req.query.end, 'end') : undefined,
  });

  if (String(req.query.format ?? '').toLowerCase() === 'csv') {
    const csv = TrustReportExporter.toCsv(
      statement.rows.map((row) => ({
        trustTransactionId: row.trustTransactionId,
        transactionDate: row.transactionDate,
        reference: row.reference,
        transactionType: row.transactionType,
        description: row.description,
        debit: row.debit?.toString?.() ?? row.debit,
        credit: row.credit?.toString?.() ?? row.credit,
        runningBalance: row.runningBalance?.toString?.() ?? row.runningBalance,
        clientId: row.clientId,
        matterId: row.matterId,
        invoiceId: row.invoiceId,
        drnId: row.drnId,
      })),
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${TrustReportExporter.makeFilename('trust-statement', 'csv')}"`,
    );
    res.status(200).send(csv);
    return;
  }

  res.status(200).json(statement);
});
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
import { reconciliationMatchService } from './reconciliation-match.service';


type TrustInterestDbClient = ConstructorParameters<typeof TrustInterestService>[0];
type TrustAlertDbClient = ConstructorParameters<typeof TrustAlertService>[0];

function trustInterestDb(req: Request): TrustInterestDbClient {
  return req.db as unknown as TrustInterestDbClient;
}

function trustAlertDb(req: Request): TrustAlertDbClient {
  return req.db as unknown as TrustAlertDbClient;
}
function requireTenantId(req: Request): string {
  if (!req.tenantId?.trim()) {
    throw Object.assign(new Error('Tenant context is required for trust operations'), {
      statusCode: 400,
      code: 'TRUST_TENANT_REQUIRED',
    });
  }

  return req.tenantId;
}

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
  const tenantId = requireTenantId(req);
  const service = new TrustInterestService(trustInterestDb(req));

  const result = await service.postInterest({
    tenantId,
    trustAccountId: req.body.trustAccountId,
    totalInterestAmount: req.body.amount,
    transactionDate: parseDateOrThrow(req.body.transactionDate, 'transactionDate'),
    postedById: req.user?.sub ?? undefined,
    reference: req.body.reference,
    description: req.body.description ?? undefined,
    allocationBasis: 'MANUAL',
    allocations: [
      {
        clientId: req.body.clientId,
        matterId: req.body.matterId ?? undefined,
        amount: req.body.amount,
        description: req.body.description ?? undefined,
      },
    ],
    metadata: {
      source: 'TRUST_CONTROLLER',
      postingMode: 'SINGLE_MANUAL_INTEREST_ALLOCATION',
    },
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
  const result = await reconciliationMatchService.list({
    tenantId: requireTenantId(req),
    runId: req.params.runId,
  });

  res.status(200).json(result);
});

export const getTrustViolations = asyncHandler(async (req: Request, res: Response) => {
  const result = await TrustViolationService.getAllViolations(req);
  res.status(200).json(result);
});

export const getTrustAlerts = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  const service = new TrustAlertService(trustAlertDb(req));

  const [summary, alerts] = await Promise.all([
    service.getTrustBalanceSummary(tenantId),
    service.scanTenant({ tenantId, emitNotifications: false }),
  ]);

  res.status(200).json({
    generatedAt: new Date(),
    summary,
    alertCount: alerts.length,
    criticalCount: alerts.filter((alert) => alert.severity === 'CRITICAL').length,
    warningCount: alerts.filter((alert) => alert.severity === 'WARNING').length,
    alerts,
  });
});

export const emitTrustAlerts = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  const service = new TrustAlertService(trustAlertDb(req));
  const alerts = await service.scanTenant({ tenantId, emitNotifications: true });

  res.status(200).json({
    emitted: true,
    alertCount: alerts.length,
    alerts,
  });
});

export const getTrustDashboard = asyncHandler(async (req: Request, res: Response) => {
  const dashboard = await TrustDashboardService.getDashboard(req);
  res.status(200).json(dashboard);
});

export const getTrustOverview = asyncHandler(async (req: Request, res: Response) => {
  const overview = await new TrustService().getOverview(req);
  res.status(200).json(overview);
});

export const getTrustAccountView = asyncHandler(async (req: Request, res: Response) => {
  const view = await new TrustService().getTrustAccountView(req, {
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
        transactionId: row.transactionId,
        transactionDate: row.transactionDate,
        reference: row.reference,
        transactionType: row.transactionType,
        description: row.description,
        debit: row.debit,
        credit: row.credit,
        runningBalance: row.runningBalance,
        clientId: row.clientId,
        matterId: row.matterId,
        invoiceId: row.invoiceId,
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

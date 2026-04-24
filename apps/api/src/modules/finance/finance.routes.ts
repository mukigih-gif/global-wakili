// apps/api/src/modules/finance/finance.routes.ts

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { bindPlatformModuleEnforcement } from '../../middleware/platform';
import { platformFeatureFlag } from '../../middleware/platform-feature-flag.middleware';
import { PLATFORM_FEATURE_KEYS } from '../platform/PlatformFeatureKeys';
import { validate } from '../../middleware/validate';

import {
  FINANCE_PERMISSIONS,
  requireFinancePermission,
} from './FinancePermissionMap';

import {
  closePeriod,
  createAccount,
  exportReport,
  getAccount,
  getBalanceSheet,
  getCashflowStatement,
  getFinanceDashboard,
  getJournal,
  getStatement,
  getTrialBalance,
  listAccounts,
  listAccountingPeriods,
  listJournals,
  postJournal,
  updateAccount,
  calculateWht,
  fiscalizeInvoiceEtims,
  getFinanceReconciliationById,
  getInvoiceVatExposure,
  getMonthlyVatSummary,
  getVatSummary,
  getWhtReport,
  listFinanceReconciliations,
  listVatAdjustments,
  postFinanceSource,
  recordVatAdjustment,
  recordWhtCertificate,
  runFinanceReconciliation,
  voidVatAdjustment,
  voidWhtCertificate,
} from './finance.controller';

const router = Router();

bindPlatformModuleEnforcement(router, {
  moduleKey: 'finance',
  metricType: 'API_REQUESTS',
});

const financeExportFeature = platformFeatureFlag(
  PLATFORM_FEATURE_KEYS.FINANCE_REPORT_EXPORTS,
  'finance',
);

const idParamSchema = z.object({
  id: z.string().trim().min(1),
});

const decimalLike = z.union([
  z.string().trim().regex(/^-?\d+(\.\d{1,6})?$/),
  z.number().finite(),
]);

const accountQuerySchema = z.object({
  type: z.string().trim().max(100).optional(),
  subtype: z.string().trim().max(100).optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().trim().max(200).optional(),
  take: z.coerce.number().int().min(1).max(100).optional(),
  skip: z.coerce.number().int().min(0).optional(),
});

const accountBodySchema = z.object({
  code: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(255),
  type: z.string().trim().min(1).max(100),
  subtype: z.string().trim().max(100).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  currency: z.string().trim().min(3).max(8).optional().nullable(),
  allowManualPosting: z.boolean().optional(),
  isSystem: z.boolean().optional(),
});

const accountUpdateSchema = accountBodySchema.partial().extend({
  isActive: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: 'At least one account field is required for update',
});

const journalLineSchema = z.object({
  accountId: z.string().trim().min(1),
  debit: decimalLike.optional().default(0),
  credit: decimalLike.optional().default(0),
  description: z.string().trim().max(2000).optional().nullable(),
  clientId: z.string().trim().min(1).optional().nullable(),
  matterId: z.string().trim().min(1).optional().nullable(),
  branchId: z.string().trim().min(1).optional().nullable(),
  reference: z.string().trim().max(255).optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

const journalBodySchema = z.object({
  reference: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1).max(2000),
  date: z.coerce.date().optional(),
  currency: z.string().trim().min(3).max(8).optional().nullable(),
  exchangeRate: decimalLike.optional().nullable(),
  sourceModule: z.string().trim().max(100).optional().nullable(),
  sourceEntityType: z.string().trim().max(100).optional().nullable(),
  sourceEntityId: z.string().trim().max(255).optional().nullable(),
  reversalOfId: z.string().trim().max(255).optional().nullable(),
  lines: z.array(journalLineSchema).min(2).max(500),
  metadata: z.record(z.unknown()).optional(),
});

const journalQuerySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  start: z.coerce.date().optional(),
  end: z.coerce.date().optional(),
  matterId: z.string().trim().min(1).optional(),
  clientId: z.string().trim().min(1).optional(),
  sourceModule: z.string().trim().max(100).optional(),
  sourceEntityType: z.string().trim().max(100).optional(),
  sourceEntityId: z.string().trim().max(255).optional(),
  reference: z.string().trim().max(255).optional(),
  take: z.coerce.number().int().min(1).max(100).optional(),
  skip: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const asOfQuerySchema = z.object({
  asOf: z.coerce.date().optional(),
});

const cashflowQuerySchema = z.object({
  start: z.coerce.date().optional(),
  end: z.coerce.date().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
}).refine(
  (value) => (value.start || value.startDate) && (value.end || value.endDate),
  {
    message: 'start/startDate and end/endDate are required',
  },
);

const statementQuerySchema = z.object({
  accountId: z.string().trim().min(1).optional(),
  clientId: z.string().trim().min(1).optional(),
  matterId: z.string().trim().min(1).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  start: z.coerce.date().optional(),
  end: z.coerce.date().optional(),
  take: z.coerce.number().int().min(1).max(1000).optional(),
  skip: z.coerce.number().int().min(0).optional(),
});

const exportReportSchema = z.object({
  reportType: z.enum(['trial-balance', 'balance-sheet', 'cashflow', 'cash-flow']).optional(),
  format: z.enum(['csv', 'json']).optional(),
  asOf: z.coerce.date().optional(),
  start: z.coerce.date().optional(),
  end: z.coerce.date().optional(),
});

const vatMonthlyQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

const vatRangeQuerySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
}).refine((value) => value.to > value.from, {
  message: 'to must be after from',
  path: ['to'],
});

const vatAdjustmentBodySchema = z.object({
  adjustmentDate: z.coerce.date(),
  type: z.enum(['OUTPUT_VAT', 'INPUT_VAT', 'VAT_PAYABLE', 'VAT_REFUND', 'OTHER']),
  amount: decimalLike,
  reason: z.string().trim().min(1).max(2000),
  reference: z.string().trim().max(255).optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

const whtCalculationBodySchema = z.object({
  invoiceId: z.string().trim().min(1).optional(),
  vendorBillId: z.string().trim().min(1).optional(),
  baseAmount: decimalLike.optional().nullable(),
  rate: decimalLike.optional().nullable(),
  rateCode: z.string().trim().max(100).optional().nullable(),
  partyResident: z.boolean().optional().nullable(),
  category: z.string().trim().max(100).optional().nullable(),
}).refine((value) => value.invoiceId || value.vendorBillId || value.baseAmount, {
  message: 'invoiceId, vendorBillId, or baseAmount is required',
});

const whtCertificateBodySchema = z.object({
  invoiceId: z.string().trim().min(1).optional().nullable(),
  vendorBillId: z.string().trim().min(1).optional().nullable(),
  paymentReceiptId: z.string().trim().min(1).optional().nullable(),
  supplierId: z.string().trim().min(1).optional().nullable(),
  clientId: z.string().trim().min(1).optional().nullable(),
  certificateNumber: z.string().trim().max(100).optional().nullable(),
  certificateDate: z.coerce.date(),
  baseAmount: decimalLike,
  withholdingRate: decimalLike,
  withholdingAmount: decimalLike.optional().nullable(),
  reference: z.string().trim().max(255).optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

const whtReportQuerySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  take: z.coerce.number().int().min(1).max(500).optional(),
  skip: z.coerce.number().int().min(0).optional(),
}).refine((value) => value.to > value.from, {
  message: 'to must be after from',
  path: ['to'],
});

const reconciliationBodySchema = z.object({
  type: z.enum(['BANK', 'TRUST', 'OFFICE', 'FULL', 'THREE_WAY']).optional(),
  periodStart: z.coerce.date().optional().nullable(),
  periodEnd: z.coerce.date().optional().nullable(),
  bankAccountId: z.string().trim().min(1).optional().nullable(),
  trustAccountId: z.string().trim().min(1).optional().nullable(),
  matterId: z.string().trim().min(1).optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

const reconciliationQuerySchema = z.object({
  type: z.string().trim().max(100).optional(),
  status: z.string().trim().max(100).optional(),
  take: z.coerce.number().int().min(1).max(100).optional(),
  skip: z.coerce.number().int().min(0).optional(),
});

const etimsFiscalizeBodySchema = z.object({
  force: z.boolean().optional(),
});

const financePostingBodySchema = z.object({
  source: z.enum([
    'BILLING_INVOICE',
    'PAYMENT_RECEIPT',
    'CREDIT_NOTE',
    'RETAINER_RECEIPT',
    'RETAINER_APPLICATION',
    'PAYROLL_BATCH',
    'VENDOR_BILL',
    'VENDOR_PAYMENT',
    'VAT_ADJUSTMENT',
    'WHT_CERTIFICATE',
  ]),
  sourceId: z.string().trim().min(1),
  force: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const reasonBodySchema = z.object({
  reason: z.string().trim().min(1).max(2000),
});
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    module: 'finance',
    status: 'mounted',
    service: 'global-wakili-api',
    lifecycle: 'production-finance-routes-mounted',
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
const vatMonthlyQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

const vatRangeQuerySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
}).refine((value) => value.to > value.from, {
  message: 'to must be after from',
  path: ['to'],
});

const vatAdjustmentBodySchema = z.object({
  adjustmentDate: z.coerce.date(),
  type: z.enum(['OUTPUT_VAT', 'INPUT_VAT', 'VAT_PAYABLE', 'VAT_REFUND', 'OTHER']),
  amount: decimalLike,
  reason: z.string().trim().min(1).max(2000),
  reference: z.string().trim().max(255).optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

const whtCalculationBodySchema = z.object({
  invoiceId: z.string().trim().min(1).optional(),
  vendorBillId: z.string().trim().min(1).optional(),
  baseAmount: decimalLike.optional().nullable(),
  rate: decimalLike.optional().nullable(),
  rateCode: z.string().trim().max(100).optional().nullable(),
  partyResident: z.boolean().optional().nullable(),
  category: z.string().trim().max(100).optional().nullable(),
}).refine((value) => value.invoiceId || value.vendorBillId || value.baseAmount, {
  message: 'invoiceId, vendorBillId, or baseAmount is required',
});

const whtCertificateBodySchema = z.object({
  invoiceId: z.string().trim().min(1).optional().nullable(),
  vendorBillId: z.string().trim().min(1).optional().nullable(),
  paymentReceiptId: z.string().trim().min(1).optional().nullable(),
  supplierId: z.string().trim().min(1).optional().nullable(),
  clientId: z.string().trim().min(1).optional().nullable(),
  certificateNumber: z.string().trim().max(100).optional().nullable(),
  certificateDate: z.coerce.date(),
  baseAmount: decimalLike,
  withholdingRate: decimalLike,
  withholdingAmount: decimalLike.optional().nullable(),
  reference: z.string().trim().max(255).optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

const whtReportQuerySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  take: z.coerce.number().int().min(1).max(500).optional(),
  skip: z.coerce.number().int().min(0).optional(),
}).refine((value) => value.to > value.from, {
  message: 'to must be after from',
  path: ['to'],
});

const reconciliationBodySchema = z.object({
  type: z.enum(['BANK', 'TRUST', 'OFFICE', 'FULL', 'THREE_WAY']).optional(),
  periodStart: z.coerce.date().optional().nullable(),
  periodEnd: z.coerce.date().optional().nullable(),
  bankAccountId: z.string().trim().min(1).optional().nullable(),
  trustAccountId: z.string().trim().min(1).optional().nullable(),
  matterId: z.string().trim().min(1).optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

const reconciliationQuerySchema = z.object({
  type: z.string().trim().max(100).optional(),
  status: z.string().trim().max(100).optional(),
  take: z.coerce.number().int().min(1).max(100).optional(),
  skip: z.coerce.number().int().min(0).optional(),
});

const etimsFiscalizeBodySchema = z.object({
  force: z.boolean().optional(),
});

const financePostingBodySchema = z.object({
  source: z.enum([
    'BILLING_INVOICE',
    'PAYMENT_RECEIPT',
    'CREDIT_NOTE',
    'RETAINER_RECEIPT',
    'RETAINER_APPLICATION',
    'PAYROLL_BATCH',
    'VENDOR_BILL',
    'VENDOR_PAYMENT',
    'VAT_ADJUSTMENT',
    'WHT_CERTIFICATE',
  ]),
  sourceId: z.string().trim().min(1),
  force: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const reasonBodySchema = z.object({
  reason: z.string().trim().min(1).max(2000),
});
});

router.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    module: 'finance',
    message: 'Finance module route mounted successfully',
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Accounts / COA
 */
router.get(
  '/accounts',
  requireFinancePermission(FINANCE_PERMISSIONS.viewAccount),
  validate({ query: accountQuerySchema }),
  listAccounts,
);

router.post(
  '/accounts',
  requireFinancePermission(FINANCE_PERMISSIONS.createAccount),
  validate({ body: accountBodySchema }),
  createAccount,
);

router.get(
  '/accounts/:id',
  requireFinancePermission(FINANCE_PERMISSIONS.viewAccount),
  validate({ params: idParamSchema }),
  getAccount,
);

router.patch(
  '/accounts/:id',
  requireFinancePermission(FINANCE_PERMISSIONS.updateAccount),
  validate({ params: idParamSchema, body: accountUpdateSchema }),
  updateAccount,
);

/**
 * Journals
 */
router.get(
  '/journals',
  requireFinancePermission(FINANCE_PERMISSIONS.viewJournal),
  validate({ query: journalQuerySchema }),
  listJournals,
);

router.post(
  '/journals',
  requireFinancePermission(FINANCE_PERMISSIONS.postJournal),
  validate({ body: journalBodySchema }),
  postJournal,
);

router.get(
  '/journals/:id',
  requireFinancePermission(FINANCE_PERMISSIONS.viewJournal),
  validate({ params: idParamSchema }),
  getJournal,
);

/**
 * Reports
 */
router.get(
  '/trial-balance',
  requireFinancePermission(FINANCE_PERMISSIONS.viewTrialBalance),
  validate({ query: asOfQuerySchema }),
  getTrialBalance,
);

router.get(
  '/balance-sheet',
  requireFinancePermission(FINANCE_PERMISSIONS.viewBalanceSheet),
  validate({ query: asOfQuerySchema }),
  getBalanceSheet,
);

router.get(
  '/cashflow',
  requireFinancePermission(FINANCE_PERMISSIONS.viewCashflow),
  validate({ query: cashflowQuerySchema }),
  getCashflowStatement,
);

router.get(
  '/statements',
  requireFinancePermission(FINANCE_PERMISSIONS.viewStatement),
  validate({ query: statementQuerySchema }),
  getStatement,
);

router.get(
  '/dashboard',
  requireFinancePermission(FINANCE_PERMISSIONS.viewDashboard),
  getFinanceDashboard,
);

/**
 * Period close / exports
 */
router.get(
  '/periods',
  requireFinancePermission(FINANCE_PERMISSIONS.viewPeriod),
  listAccountingPeriods,
);

router.post(
  '/period-close',
  requireFinancePermission(FINANCE_PERMISSIONS.closePeriod),
  closePeriod,
);

router.post(
  '/reports/export',
  financeExportFeature,
  requireFinancePermission(FINANCE_PERMISSIONS.exportReports),
  validate({ body: exportReportSchema }),
  exportReport,
);

/**
 * VAT / Tax
 */
router.get(
  '/tax/vat/monthly',
  requireFinancePermission(FINANCE_PERMISSIONS.viewTax),
  validate({ query: vatMonthlyQuerySchema }),
  getMonthlyVatSummary,
);

router.get(
  '/tax/vat/summary',
  requireFinancePermission(FINANCE_PERMISSIONS.viewTax),
  validate({ query: vatRangeQuerySchema }),
  getVatSummary,
);

router.get(
  '/tax/vat/invoices/:invoiceId/exposure',
  requireFinancePermission(FINANCE_PERMISSIONS.viewTax),
  validate({ params: z.object({ invoiceId: z.string().trim().min(1) }) }),
  getInvoiceVatExposure,
);

router.get(
  '/tax/vat/adjustments',
  requireFinancePermission(FINANCE_PERMISSIONS.viewTax),
  listVatAdjustments,
);

router.post(
  '/tax/vat/adjustments',
  requireFinancePermission(FINANCE_PERMISSIONS.manageTax),
  validate({ body: vatAdjustmentBodySchema }),
  recordVatAdjustment,
);

router.post(
  '/tax/vat/adjustments/:adjustmentId/void',
  requireFinancePermission(FINANCE_PERMISSIONS.manageTax),
  validate({
    params: z.object({ adjustmentId: z.string().trim().min(1) }),
    body: reasonBodySchema,
  }),
  voidVatAdjustment,
);

/**
 * WHT
 */
router.post(
  '/tax/wht/calculate',
  requireFinancePermission(FINANCE_PERMISSIONS.viewTax),
  validate({ body: whtCalculationBodySchema }),
  calculateWht,
);

router.get(
  '/tax/wht/report',
  requireFinancePermission(FINANCE_PERMISSIONS.viewTax),
  validate({ query: whtReportQuerySchema }),
  getWhtReport,
);

router.post(
  '/tax/wht/certificates',
  requireFinancePermission(FINANCE_PERMISSIONS.manageTax),
  validate({ body: whtCertificateBodySchema }),
  recordWhtCertificate,
);

router.post(
  '/tax/wht/certificates/:certificateId/void',
  requireFinancePermission(FINANCE_PERMISSIONS.manageTax),
  validate({
    params: z.object({ certificateId: z.string().trim().min(1) }),
    body: reasonBodySchema,
  }),
  voidWhtCertificate,
);

/**
 * Reconciliation
 */
router.get(
  '/reconciliations',
  requireFinancePermission(FINANCE_PERMISSIONS.viewReconciliation),
  validate({ query: reconciliationQuerySchema }),
  listFinanceReconciliations,
);

router.post(
  '/reconciliations/run',
  requireFinancePermission(FINANCE_PERMISSIONS.runReconciliation),
  validate({ body: reconciliationBodySchema }),
  runFinanceReconciliation,
);

router.get(
  '/reconciliations/:reconciliationId',
  requireFinancePermission(FINANCE_PERMISSIONS.viewReconciliation),
  validate({ params: z.object({ reconciliationId: z.string().trim().min(1) }) }),
  getFinanceReconciliationById,
);

/**
 * eTIMS
 */
router.post(
  '/etims/invoices/:invoiceId/fiscalize',
  requireFinancePermission(FINANCE_PERMISSIONS.fiscalizeEtims),
  validate({
    params: z.object({ invoiceId: z.string().trim().min(1) }),
    body: etimsFiscalizeBodySchema,
  }),
  fiscalizeInvoiceEtims,
);

/**
 * Posting orchestration
 */
router.post(
  '/postings',
  requireFinancePermission(FINANCE_PERMISSIONS.postJournal),
  validate({ body: financePostingBodySchema }),
  postFinanceSource,
);

router.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    module: 'finance',
    error: 'Finance route not found',
    code: 'FINANCE_ROUTE_NOT_FOUND',
    path: req.originalUrl,
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

export default router;
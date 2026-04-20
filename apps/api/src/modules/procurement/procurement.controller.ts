import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { VendorService } from './VendorService';
import { VendorBillService } from './VendorBillService';
import { ProcurementApprovalService } from './ProcurementApprovalService';
import { VendorPaymentService } from './VendorPaymentService';
import { ProcurementDashboardService } from './ProcurementDashboardService';
import { PayablesAgingService } from './PayablesAgingService';
import { ProcurementReportExporter } from './ProcurementReportExporter';
import { ProcurementNotificationService } from './ProcurementNotificationService';
import { ProcurementPostingService } from './ProcurementPostingService';

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

async function getApproverUserIds(req: Request): Promise<string[]> {
  const users = await req.db.user.findMany({
    where: {
      tenantId: req.tenantId!,
      status: 'ACTIVE',
      roles: {
        some: {
          name: {
            in: ['Partner', 'Managing Partner', 'Finance'],
          },
        },
      },
    },
    select: { id: true },
  });

  return users.map((user: any) => user.id);
}

export const createVendor = asyncHandler(async (req: Request, res: Response) => {
  const created = await VendorService.create(req.db, req.tenantId!, req.body);
  res.status(201).json(created);
});

export const updateVendor = asyncHandler(async (req: Request, res: Response) => {
  const updated = await VendorService.update(
    req.db,
    req.tenantId!,
    req.params.vendorId,
    req.body,
  );
  res.status(200).json(updated);
});

export const listActiveVendors = asyncHandler(async (req: Request, res: Response) => {
  const vendors = await VendorService.listActive(req.db, req.tenantId!);
  res.status(200).json(vendors);
});

export const createVendorBill = asyncHandler(async (req: Request, res: Response) => {
  const created = await VendorBillService.create(req.db as any, req.tenantId!, req.body);
  res.status(201).json(created);
});

export const listOpenVendorBills = asyncHandler(async (req: Request, res: Response) => {
  const bills = await VendorBillService.listOpenBills(req.db, req.tenantId!);
  res.status(200).json(bills);
});

export const submitVendorBill = asyncHandler(async (req: Request, res: Response) => {
  const updated = await ProcurementApprovalService.submitBill(
    req.db,
    req.tenantId!,
    req.params.vendorBillId,
  );

  try {
    const approverUserIds = await getApproverUserIds(req);
    await ProcurementNotificationService.notifyBillSubmitted(req, {
      vendorBillId: updated.id,
      billNumber: updated.billNumber,
      approverUserIds,
    });
  } catch (error) {
    console.error('[PROCUREMENT_SUBMIT_NOTIFY_FAIL]', error);
  }

  res.status(200).json(updated);
});

export const approveVendorBill = asyncHandler(async (req: Request, res: Response) => {
  const updated = await ProcurementApprovalService.approveBill(
    req.db,
    req.tenantId!,
    req.params.vendorBillId,
  );

  try {
    await ProcurementPostingService.postVendorBillApproval(req, {
      vendorBillId: updated.id,
    });
  } catch (error) {
    console.error('[PROCUREMENT_APPROVAL_POSTING_FAIL]', error);
    throw error;
  }

  try {
    const approverUserIds = await getApproverUserIds(req);
    await ProcurementNotificationService.notifyBillApproved(req, {
      vendorBillId: updated.id,
      billNumber: updated.billNumber,
      recipientUserIds: approverUserIds,
    });
  } catch (error) {
    console.error('[PROCUREMENT_APPROVAL_NOTIFY_FAIL]', error);
  }

  res.status(200).json(updated);
});

export const rejectVendorBill = asyncHandler(async (req: Request, res: Response) => {
  const updated = await ProcurementApprovalService.rejectBill(
    req.db,
    req.tenantId!,
    req.params.vendorBillId,
    req.body?.rejectionReason ?? null,
  );
  res.status(200).json(updated);
});

export const payVendorBill = asyncHandler(async (req: Request, res: Response) => {
  const updated = await VendorPaymentService.applyPayment(
    req.db as any,
    req.tenantId!,
    {
      vendorBillId: req.params.vendorBillId,
      amount: req.body.amount,
      paymentDate: req.body.paymentDate
        ? parseDateOrThrow(req.body.paymentDate, 'paymentDate')
        : undefined,
      reference: req.body.reference ?? null,
      notes: req.body.notes ?? null,
    },
  );

  if (req.body.bankAccountChartId) {
    await ProcurementPostingService.postVendorPayment(req, {
      vendorBillId: req.params.vendorBillId,
      amount: req.body.amount,
      paymentDate: req.body.paymentDate
        ? parseDateOrThrow(req.body.paymentDate, 'paymentDate')
        : undefined,
      bankAccountChartId: req.body.bankAccountChartId,
      reference: req.body.reference ?? null,
    });
  }

  try {
    const approverUserIds = await getApproverUserIds(req);
    await ProcurementNotificationService.notifyPaymentApplied(req, {
      vendorBillId: req.params.vendorBillId,
      billNumber: updated.billNumber,
      amount: String(req.body.amount),
      recipientUserIds: approverUserIds,
    });
  } catch (error) {
    console.error('[PROCUREMENT_PAYMENT_NOTIFY_FAIL]', error);
  }

  res.status(200).json(updated);
});

export const getProcurementDashboard = asyncHandler(async (req: Request, res: Response) => {
  const dashboard = await ProcurementDashboardService.getDashboard(req.db, {
    tenantId: req.tenantId!,
  });
  res.status(200).json(dashboard);
});

export const getPayablesAging = asyncHandler(async (req: Request, res: Response) => {
  const report = await PayablesAgingService.generate(req.db, {
    tenantId: req.tenantId!,
    asOf: req.query.asOf ? parseDateOrThrow(req.query.asOf, 'asOf') : undefined,
  });

  if (String(req.query.format ?? '').toLowerCase() === 'csv') {
    const csv = ProcurementReportExporter.toCsv(
      report.rows.map((row: any) => ({
        id: row.id,
        billNumber: row.billNumber,
        vendorId: row.vendorId,
        vendorName: row.vendorName,
        billDate: row.billDate,
        dueDate: row.dueDate,
        status: row.status,
        total: row.total?.toString?.() ?? row.total,
        paidAmount: row.paidAmount?.toString?.() ?? row.paidAmount,
        outstanding: row.outstanding?.toString?.() ?? row.outstanding,
        daysOverdue: row.daysOverdue,
        bucket: row.bucket,
      })),
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${ProcurementReportExporter.makeFilename('payables-aging', 'csv')}"`,
    );
    res.status(200).send(csv);
    return;
  }

  res.status(200).json(report);
});
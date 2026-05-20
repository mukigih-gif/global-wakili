// apps/api/src/modules/payments/payment.controller.ts

import type { NextFunction, Request, Response } from 'express';

import {
  allocatePaymentSchema,
  createPaymentReceiptSchema,
  listPaymentReceiptsQuerySchema,
  reversePaymentReceiptSchema,
} from './payment.validators';

import {
  PaymentDashboardService,
  paymentDashboardService,
} from './payment.dashboard';

import {
  PaymentReversalService,
  paymentReversalService,
} from './payment-reversal.service';

import {
  PaymentService,
  paymentService,
} from './payment.service';

import {
  RefundService,
  refundService,
} from './refund.service';

type PaymentRequestContext = Request & {
  tenantId?: string;
  user?: {
    id?: string;
    sub?: string;
  };
};

function getTenantId(req: Request): string {
  const paymentReq = req as PaymentRequestContext;
  const tenantId = paymentReq.tenantId ?? req.headers['x-tenant-id'];

  if (typeof tenantId !== 'string' || !tenantId.trim()) {
    throw Object.assign(new Error('Tenant context is required.'), {
      statusCode: 401,
      code: 'PAYMENTS_TENANT_CONTEXT_REQUIRED',
    });
  }

  return tenantId.trim();
}

function getUserId(req: Request): string | null {
  const paymentReq = req as PaymentRequestContext;
  const candidate = paymentReq.user?.id ?? paymentReq.user?.sub ?? null;

  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : null;
}

function optionalPositiveInt(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) return undefined;

  return Math.trunc(parsed);
}

function requireAuthenticatedUser(req: Request, action: string): string {
  const userId = getUserId(req);

  if (!userId) {
    throw Object.assign(new Error(`Authenticated user is required to ${action}.`), {
      statusCode: 401,
      code: 'PAYMENTS_AUTHENTICATED_USER_REQUIRED',
      details: { action },
    });
  }

  return userId;
}

export class PaymentController {
  constructor(
    private readonly payments: PaymentService = paymentService,
    private readonly reversals: PaymentReversalService = paymentReversalService,
    private readonly refunds: RefundService = refundService,
    private readonly dashboard: PaymentDashboardService = paymentDashboardService,
  ) {}

  listReceipts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = getTenantId(req);
      const query = listPaymentReceiptsQuerySchema.parse(req.query);

      const receipts = await this.payments.listReceipts({
        tenantId,
        ...query,
      });

      res.status(200).json({
        success: true,
        data: receipts,
      });
    } catch (error) {
      next(error);
    }
  };

  getReceipt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = getTenantId(req);

      const receipt = await this.payments.getReceiptById(
        tenantId,
        req.params.paymentReceiptId,
      );

      res.status(200).json({
        success: true,
        data: receipt,
      });
    } catch (error) {
      next(error);
    }
  };

  createReceipt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = getTenantId(req);
      const createdById = getUserId(req);
      const body = createPaymentReceiptSchema.parse(req.body);

      const receipt = await this.payments.createPaymentReceipt({
        tenantId,
        ...body,
        createdById,
      });

      res.status(201).json({
        success: true,
        data: receipt,
      });
    } catch (error) {
      next(error);
    }
  };

  allocateReceipt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = getTenantId(req);
      const allocatedById = getUserId(req);
      const body = allocatePaymentSchema.parse(req.body);

      const result = await this.payments.allocatePayment({
        tenantId,
        paymentReceiptId: req.params.paymentReceiptId,
        allocations: body.allocations,
        allocatedById,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  reverseReceipt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = getTenantId(req);
      const reversedById = requireAuthenticatedUser(req, 'reverse payment receipt');
      const body = reversePaymentReceiptSchema.parse(req.body);

      const receipt = await this.reversals.reversePaymentReceipt({
        tenantId,
        paymentReceiptId: req.params.paymentReceiptId,
        reversedById,
        reason: body.reason,
      });

      res.status(200).json({
        success: true,
        data: receipt,
      });
    } catch (error) {
      next(error);
    }
  };

  createRefund = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = getTenantId(req);
      const requestedById = getUserId(req);
      const { amount, reason } = req.body ?? {};

      const refund = await this.refunds.createRefund({
        tenantId,
        paymentReceiptId: req.params.paymentReceiptId,
        amount,
        reason,
        requestedById,
      });

      res.status(201).json({
        success: true,
        data: refund,
      });
    } catch (error) {
      next(error);
    }
  };

  approveRefund = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = getTenantId(req);
      const approvedById = requireAuthenticatedUser(req, 'approve refund');

      const refund = await this.refunds.approveRefund({
        tenantId,
        refundId: req.params.refundId,
        approvedById,
      });

      res.status(200).json({
        success: true,
        data: refund,
      });
    } catch (error) {
      next(error);
    }
  };

  payRefund = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = getTenantId(req);
      const paidById = requireAuthenticatedUser(req, 'pay refund');

      const refund = await this.refunds.payRefund({
        tenantId,
        refundId: req.params.refundId,
        paidById,
        bankReference: req.body?.bankReference ?? null,
      });

      res.status(200).json({
        success: true,
        data: refund,
      });
    } catch (error) {
      next(error);
    }
  };

  rejectRefund = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = getTenantId(req);
      const rejectedById = requireAuthenticatedUser(req, 'reject refund');

      const refund = await this.refunds.rejectRefund({
        tenantId,
        refundId: req.params.refundId,
        rejectedById,
        reason: req.body?.reason,
      });

      res.status(200).json({
        success: true,
        data: refund,
      });
    } catch (error) {
      next(error);
    }
  };

  dashboardSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = getTenantId(req);

      const summary = await this.dashboard.getDashboard({
        tenantId,
      });

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  };

  unallocatedReceipts = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const tenantId = getTenantId(req);

      const data = await this.dashboard.getUnallocatedReceipts({
        tenantId,
        take: optionalPositiveInt(req.query.take),
        skip: optionalPositiveInt(req.query.skip),
      });

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  whtExposure = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = getTenantId(req);

      const data = await this.dashboard.getWhtCertificateExposure({
        tenantId,
        take: optionalPositiveInt(req.query.take),
        skip: optionalPositiveInt(req.query.skip),
      });

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const paymentController = new PaymentController();

export const listReceipts = paymentController.listReceipts;
export const getReceipt = paymentController.getReceipt;
export const createReceipt = paymentController.createReceipt;
export const allocateReceipt = paymentController.allocateReceipt;
export const reverseReceipt = paymentController.reverseReceipt;

export const createRefund = paymentController.createRefund;
export const approveRefund = paymentController.approveRefund;
export const payRefund = paymentController.payRefund;
export const rejectRefund = paymentController.rejectRefund;

export const dashboardSummary = paymentController.dashboardSummary;
export const unallocatedReceipts = paymentController.unallocatedReceipts;
export const whtExposure = paymentController.whtExposure;

export default paymentController;
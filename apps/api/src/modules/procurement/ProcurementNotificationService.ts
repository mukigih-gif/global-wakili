import type { Request } from 'express';
import { NotificationService } from '../integrations/notifications/NotificationService';

export class ProcurementNotificationService {
  static async notifyBillSubmitted(
    req: Request,
    params: {
      vendorBillId: string;
      billNumber: string;
      approverUserIds: string[];
    },
  ) {
    if (!params.approverUserIds.length) return;

    const users = await req.db.user.findMany({
      where: {
        tenantId: req.tenantId!,
        id: { in: params.approverUserIds },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        name: true,
      },
    });

    if (!users.length) return;

    await NotificationService.dispatch(req.db, {
      tenantId: req.tenantId!,
      category: 'procurement',
      priority: 'normal',
      channels: ['email', 'portal'],
      recipients: users.map((user: any) => ({
        recipientId: user.id,
        email: user.email ?? null,
        phoneNumber: user.phoneNumber ?? null,
        name: user.name ?? null,
      })),
      template: {
        templateKey: 'CUSTOM',
        subject: `Vendor bill ${params.billNumber} submitted for approval`,
        textBody: `Vendor bill ${params.billNumber} is awaiting your approval.`,
        htmlBody: `<p>Vendor bill <strong>${params.billNumber}</strong> is awaiting your approval.</p>`,
        variables: {},
      },
      entityType: 'VendorBill',
      entityId: params.vendorBillId,
      requestId: req.id,
    });
  }

  static async notifyBillApproved(
    req: Request,
    params: {
      vendorBillId: string;
      billNumber: string;
      recipientUserIds: string[];
    },
  ) {
    if (!params.recipientUserIds.length) return;

    const users = await req.db.user.findMany({
      where: {
        tenantId: req.tenantId!,
        id: { in: params.recipientUserIds },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        name: true,
      },
    });

    if (!users.length) return;

    await NotificationService.dispatch(req.db, {
      tenantId: req.tenantId!,
      category: 'procurement',
      priority: 'normal',
      channels: ['email', 'portal'],
      recipients: users.map((user: any) => ({
        recipientId: user.id,
        email: user.email ?? null,
        phoneNumber: user.phoneNumber ?? null,
        name: user.name ?? null,
      })),
      template: {
        templateKey: 'CUSTOM',
        subject: `Vendor bill ${params.billNumber} approved`,
        textBody: `Vendor bill ${params.billNumber} has been approved and is ready for payment.`,
        htmlBody: `<p>Vendor bill <strong>${params.billNumber}</strong> has been approved and is ready for payment.</p>`,
        variables: {},
      },
      entityType: 'VendorBill',
      entityId: params.vendorBillId,
      requestId: req.id,
    });
  }

  static async notifyPaymentApplied(
    req: Request,
    params: {
      vendorBillId: string;
      billNumber: string;
      amount: string;
      recipientUserIds: string[];
    },
  ) {
    if (!params.recipientUserIds.length) return;

    const users = await req.db.user.findMany({
      where: {
        tenantId: req.tenantId!,
        id: { in: params.recipientUserIds },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        name: true,
      },
    });

    if (!users.length) return;

    await NotificationService.dispatch(req.db, {
      tenantId: req.tenantId!,
      category: 'procurement',
      priority: 'normal',
      channels: ['email', 'portal'],
      recipients: users.map((user: any) => ({
        recipientId: user.id,
        email: user.email ?? null,
        phoneNumber: user.phoneNumber ?? null,
        name: user.name ?? null,
      })),
      template: {
        templateKey: 'CUSTOM',
        subject: `Payment applied to vendor bill ${params.billNumber}`,
        textBody: `A payment of ${params.amount} has been applied to vendor bill ${params.billNumber}.`,
        htmlBody: `<p>A payment of <strong>${params.amount}</strong> has been applied to vendor bill <strong>${params.billNumber}</strong>.</p>`,
        variables: {},
      },
      entityType: 'VendorBill',
      entityId: params.vendorBillId,
      requestId: req.id,
    });
  }
}
import type { Request } from 'express';

import { NotificationService } from '../notifications/NotificationService';

type ProcurementNotificationUser = {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
};

type ProcurementNotificationEvent =
  | 'VENDOR_BILL_SUBMITTED'
  | 'VENDOR_BILL_APPROVED'
  | 'VENDOR_PAYMENT_APPLIED';

function requireTenantId(req: Request): string {
  const tenantId = req.tenantId;

  if (!tenantId?.trim()) {
    throw Object.assign(new Error('Tenant ID is required for procurement notifications'), {
      statusCode: 400,
      code: 'MISSING_TENANT',
    });
  }

  return tenantId;
}

function uniqueUserIds(userIds: string[]): string[] {
  return Array.from(
    new Set(
      userIds
        .map((userId) => userId?.trim())
        .filter((userId): userId is string => Boolean(userId)),
    ),
  );
}

async function findActiveTenantUsers(
  req: Request,
  userIds: string[],
): Promise<ProcurementNotificationUser[]> {
  const tenantId = requireTenantId(req);
  const ids = uniqueUserIds(userIds);

  if (!ids.length) {
    return [];
  }

  return req.db.user.findMany({
    where: {
      tenantId,
      id: { in: ids },
      status: 'ACTIVE',
    },
    select: {
      id: true,
      email: true,
      phone: true,
      name: true,
    },
  }) as Promise<ProcurementNotificationUser[]>;
}

function toNotificationRecipients(users: ProcurementNotificationUser[]) {
  return users.map((user) => ({
    userId: user.id,
    email: user.email ?? null,
    phoneNumber: user.phone ?? null,
    name: user.name ?? null,
  }));
}

function buildMetadata(
  req: Request,
  event: ProcurementNotificationEvent,
  params: {
    vendorBillId: string;
    billNumber: string;
    amount?: string;
  },
): Record<string, unknown> {
  return {
    requestId: req.id ?? null,
    module: 'procurement',
    procurementEvent: event,
    entityType: 'VendorBill',
    vendorBillId: params.vendorBillId,
    billNumber: params.billNumber,
    amount: params.amount ?? null,
    dispatchedAt: new Date().toISOString(),
  };
}

async function dispatchVendorBillNotification(
  req: Request,
  params: {
    event: ProcurementNotificationEvent;
    vendorBillId: string;
    billNumber: string;
    subject: string;
    textBody: string;
    htmlBody: string;
    recipientUserIds: string[];
    amount?: string;
  },
): Promise<void> {
  const tenantId = requireTenantId(req);
  const users = await findActiveTenantUsers(req, params.recipientUserIds);

  if (!users.length) {
    return;
  }

  await NotificationService.dispatch(req.db, {
    tenantId,
    category: 'procurement',
    priority: 'normal',
    channels: ['email', 'portal'],
    recipients: toNotificationRecipients(users),
    template: {
      templateKey: 'CUSTOM',
      subject: params.subject,
      textBody: params.textBody,
      htmlBody: params.htmlBody,
      variables: {
        vendorBillId: params.vendorBillId,
        billNumber: params.billNumber,
        amount: params.amount ?? null,
      },
    },
    entityType: 'VendorBill',
    entityId: params.vendorBillId,
    metadata: buildMetadata(req, params.event, params),
  });
}

export class ProcurementNotificationService {
  static async notifyBillSubmitted(
    req: Request,
    params: {
      vendorBillId: string;
      billNumber: string;
      approverUserIds: string[];
    },
  ): Promise<void> {
    await dispatchVendorBillNotification(req, {
      event: 'VENDOR_BILL_SUBMITTED',
      vendorBillId: params.vendorBillId,
      billNumber: params.billNumber,
      recipientUserIds: params.approverUserIds,
      subject: `Vendor bill ${params.billNumber} submitted for approval`,
      textBody: `Vendor bill ${params.billNumber} is awaiting your approval.`,
      htmlBody: `<p>Vendor bill <strong>${params.billNumber}</strong> is awaiting your approval.</p>`,
    });
  }

  static async notifyBillApproved(
    req: Request,
    params: {
      vendorBillId: string;
      billNumber: string;
      recipientUserIds: string[];
    },
  ): Promise<void> {
    await dispatchVendorBillNotification(req, {
      event: 'VENDOR_BILL_APPROVED',
      vendorBillId: params.vendorBillId,
      billNumber: params.billNumber,
      recipientUserIds: params.recipientUserIds,
      subject: `Vendor bill ${params.billNumber} approved`,
      textBody: `Vendor bill ${params.billNumber} has been approved and is ready for payment.`,
      htmlBody: `<p>Vendor bill <strong>${params.billNumber}</strong> has been approved and is ready for payment.</p>`,
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
  ): Promise<void> {
    await dispatchVendorBillNotification(req, {
      event: 'VENDOR_PAYMENT_APPLIED',
      vendorBillId: params.vendorBillId,
      billNumber: params.billNumber,
      amount: params.amount,
      recipientUserIds: params.recipientUserIds,
      subject: `Payment applied to vendor bill ${params.billNumber}`,
      textBody: `A payment of ${params.amount} has been applied to vendor bill ${params.billNumber}.`,
      htmlBody: `<p>A payment of <strong>${params.amount}</strong> has been applied to vendor bill <strong>${params.billNumber}</strong>.</p>`,
    });
  }
}

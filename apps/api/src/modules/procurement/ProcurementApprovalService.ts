// apps/api/src/modules/procurement/ProcurementApprovalService.ts

type ProcurementDbClient = {
  vendorBill: {
    findFirst: Function;
    update: Function;
  };
  procurementApprovalLog?: {
    create?: Function;
  };
  auditLog?: {
    create?: Function;
  };
  $transaction?: Function;
};

type VendorBillStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'FULLY_PAID'
  | 'CANCELLED'
  | string;

function now() {
  return new Date();
}

function getActorId(dbOrContext?: any): string | null {
  return (
    dbOrContext?.userId ??
    dbOrContext?.actorId ??
    dbOrContext?.user?.id ??
    null
  );
}

function isUnknownFieldError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes('Unknown argument') ||
    message.includes('Unknown arg') ||
    message.includes('Unknown field') ||
    message.includes('Unknown `')
  );
}

function assertTransition(
  currentStatus: VendorBillStatus,
  allowed: VendorBillStatus[],
  target: VendorBillStatus,
) {
  if (!allowed.includes(currentStatus)) {
    throw Object.assign(
      new Error(`Vendor bill cannot move from ${currentStatus} to ${target}`),
      {
        statusCode: 409,
        code: 'INVALID_STATUS_TRANSITION',
        currentStatus,
        targetStatus: target,
      },
    );
  }
}

async function updateVendorBillSafely(params: {
  db: ProcurementDbClient;
  vendorBillId: string;
  extendedData: Record<string, unknown>;
  fallbackData: Record<string, unknown>;
}) {
  try {
    return await params.db.vendorBill.update({
      where: { id: params.vendorBillId },
      data: params.extendedData,
    });
  } catch (error) {
    if (!isUnknownFieldError(error)) {
      throw error;
    }

    return params.db.vendorBill.update({
      where: { id: params.vendorBillId },
      data: params.fallbackData,
    });
  }
}

async function writeApprovalLog(params: {
  db: ProcurementDbClient;
  tenantId: string;
  vendorBillId: string;
  action: 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  actorId?: string | null;
  reason?: string | null;
}) {
  const logDelegate = params.db.procurementApprovalLog;

  if (!logDelegate?.create) return;

  try {
    await logDelegate.create({
      data: {
        tenantId: params.tenantId,
        vendorBillId: params.vendorBillId,
        action: params.action,
        actorId: params.actorId ?? null,
        reason: params.reason ?? null,
        createdAt: now(),
      },
    });
  } catch {
    // Approval logging must never break the main approval workflow.
  }
}

export class ProcurementApprovalService {
  static async submitBill(
    db: ProcurementDbClient,
    tenantId: string,
    vendorBillId: string,
    context?: {
      actorId?: string | null;
      userId?: string | null;
    },
  ) {
    const runner = async (tx: ProcurementDbClient) => {
      const bill = await tx.vendorBill.findFirst({
        where: {
          tenantId,
          id: vendorBillId,
        },
      });

      if (!bill) {
        throw Object.assign(new Error('Vendor bill not found'), {
          statusCode: 404,
          code: 'MISSING_BILL',
        });
      }

      assertTransition(String(bill.status), ['DRAFT'], 'SUBMITTED');

      const actorId = context?.actorId ?? context?.userId ?? getActorId(context);

      const updated = await updateVendorBillSafely({
        db: tx,
        vendorBillId,
        extendedData: {
          status: 'SUBMITTED',
          submittedAt: now(),
          submittedById: actorId,
        },
        fallbackData: {
          status: 'SUBMITTED',
        },
      });

      await writeApprovalLog({
        db: tx,
        tenantId,
        vendorBillId,
        action: 'SUBMITTED',
        actorId,
      });

      return updated;
    };

    if (typeof db.$transaction === 'function') {
      return db.$transaction((tx: ProcurementDbClient) => runner(tx));
    }

    return runner(db);
  }

  static async approveBill(
    db: ProcurementDbClient,
    tenantId: string,
    vendorBillId: string,
    context?: {
      actorId?: string | null;
      userId?: string | null;
    },
  ) {
    const runner = async (tx: ProcurementDbClient) => {
      const bill = await tx.vendorBill.findFirst({
        where: {
          tenantId,
          id: vendorBillId,
        },
      });

      if (!bill) {
        throw Object.assign(new Error('Vendor bill not found'), {
          statusCode: 404,
          code: 'MISSING_BILL',
        });
      }

      assertTransition(String(bill.status), ['SUBMITTED', 'DRAFT'], 'APPROVED');

      const actorId = context?.actorId ?? context?.userId ?? getActorId(context);

      const updated = await updateVendorBillSafely({
        db: tx,
        vendorBillId,
        extendedData: {
          status: 'APPROVED',
          approvedAt: now(),
          approvedById: actorId,
        },
        fallbackData: {
          status: 'APPROVED',
        },
      });

      await writeApprovalLog({
        db: tx,
        tenantId,
        vendorBillId,
        action: 'APPROVED',
        actorId,
      });

      return updated;
    };

    if (typeof db.$transaction === 'function') {
      return db.$transaction((tx: ProcurementDbClient) => runner(tx));
    }

    return runner(db);
  }

  static async rejectBill(
    db: ProcurementDbClient,
    tenantId: string,
    vendorBillId: string,
    rejectionReason?: string | null,
    context?: {
      actorId?: string | null;
      userId?: string | null;
    },
  ) {
    const reason = rejectionReason?.trim() || null;

    const runner = async (tx: ProcurementDbClient) => {
      const bill = await tx.vendorBill.findFirst({
        where: {
          tenantId,
          id: vendorBillId,
        },
      });

      if (!bill) {
        throw Object.assign(new Error('Vendor bill not found'), {
          statusCode: 404,
          code: 'MISSING_BILL',
        });
      }

      const currentStatus = String(bill.status);

      if (
        ['PARTIALLY_PAID', 'PAID', 'FULLY_PAID', 'CANCELLED'].includes(
          currentStatus,
        )
      ) {
        throw Object.assign(
          new Error(`Vendor bill cannot be rejected from ${currentStatus}`),
          {
            statusCode: 409,
            code: 'INVALID_STATUS_TRANSITION',
            currentStatus,
            targetStatus: 'REJECTED',
          },
        );
      }

      const actorId = context?.actorId ?? context?.userId ?? getActorId(context);

      const updated = await updateVendorBillSafely({
        db: tx,
        vendorBillId,
        extendedData: {
          status: 'REJECTED',
          rejectedAt: now(),
          rejectedById: actorId,
          rejectionReason: reason,
        },
        fallbackData: {
          status: 'REJECTED',
        },
      });

      await writeApprovalLog({
        db: tx,
        tenantId,
        vendorBillId,
        action: 'REJECTED',
        actorId,
        reason,
      });

      return updated;
    };

    if (typeof db.$transaction === 'function') {
      return db.$transaction((tx: ProcurementDbClient) => runner(tx));
    }

    return runner(db);
  }
}

export default ProcurementApprovalService;
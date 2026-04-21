import type { TenantProcurementDbClient } from './procurement.types';
import { ProcurementPolicyService } from './ProcurementPolicyService';

export class ProcurementApprovalService {
  static async submitBill(
    db: TenantProcurementDbClient,
    tenantId: string,
    vendorBillId: string,
  ) {
    const bill = await db.vendorBill.findFirst({
      where: {
        tenantId,
        id: vendorBillId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!bill) {
      throw Object.assign(new Error('Vendor bill not found'), {
        statusCode: 404,
        code: 'MISSING_BILL',
      });
    }

    if (bill.status !== 'DRAFT') {
      throw Object.assign(new Error('Only draft bills can be submitted'), {
        statusCode: 409,
        code: 'INVALID_STATUS_TRANSITION',
      });
    }

    return db.vendorBill.update({
      where: { id: vendorBillId },
      data: {
        status: 'SUBMITTED',
      },
    });
  }

  static async approveBill(
    db: TenantProcurementDbClient,
    tenantId: string,
    vendorBillId: string,
  ) {
    await ProcurementPolicyService.assertApprovalAllowed(db, tenantId, vendorBillId);

    return db.vendorBill.update({
      where: { id: vendorBillId },
      data: {
        status: 'APPROVED',
      },
    });
  }

  static async rejectBill(
    db: TenantProcurementDbClient,
    tenantId: string,
    vendorBillId: string,
    rejectionReason?: string | null,
  ) {
    const bill = await db.vendorBill.findFirst({
      where: {
        tenantId,
        id: vendorBillId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!bill) {
      throw Object.assign(new Error('Vendor bill not found'), {
        statusCode: 404,
        code: 'MISSING_BILL',
      });
    }

    if (!['SUBMITTED', 'DRAFT'].includes(bill.status)) {
      throw Object.assign(new Error('Bill cannot be rejected from current status'), {
        statusCode: 409,
        code: 'INVALID_STATUS_TRANSITION',
      });
    }

    return db.vendorBill.update({
      where: { id: vendorBillId },
      data: {
        status: 'REJECTED',
        rejectionReason: rejectionReason?.trim() ?? null,
      },
    });
  }
}
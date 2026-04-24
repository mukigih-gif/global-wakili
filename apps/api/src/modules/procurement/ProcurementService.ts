import type { Request } from 'express';
import { ProcurementDashboardService } from './ProcurementDashboardService';
import { PayablesAgingService } from './PayablesAgingService';
import { VendorService } from './VendorService';
import { VendorBillService } from './VendorBillService';

export class ProcurementService {
  static async getOverview(req: Request) {
    const [dashboard, activeVendors, openBills, aging] = await Promise.all([
      ProcurementDashboardService.getDashboard(req.db, {
        tenantId: req.tenantId!,
      }),
      VendorService.listActive(req.db, req.tenantId!),
      VendorBillService.listOpenBills(req.db, req.tenantId!),
      PayablesAgingService.generate(req.db, {
        tenantId: req.tenantId!,
      }),
    ]);

    return {
      dashboard,
      activeVendorCount: activeVendors.length,
      openBillCount: openBills.length,
      agingTotals: aging.totals,
      generatedAt: new Date(),
    };
  }
}
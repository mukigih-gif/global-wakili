import type { Request } from 'express';
import { VATService } from './VATService';
import { PAYEService } from './PAYEService';
import { WHTService } from './WHTService';
import { CorporateTaxService } from './CorporateTaxService';
import { logAdminAction } from '../../../utils/audit-logger';
import { AuditSeverity } from '../../../types/audit';

export class TaxEngineService {
  static async generateTaxDashboard(
    db: any,
    params: {
      tenantId: string;
      startDate: Date;
      endDate: Date;
      payrollBatchId?: string;
    },
  ) {
    const [vat, wht, corporateTax, paye] = await Promise.all([
      VATService.generateVATSummary(db, params),
      WHTService.generateWHTSummary(db, params),
      CorporateTaxService.generateCorporateTaxEstimate(db, params),
      params.payrollBatchId
        ? PAYEService.generatePAYEReturn(db, {
            tenantId: params.tenantId,
            payrollBatchId: params.payrollBatchId,
          })
        : null,
    ]);

    return {
      vat,
      wht,
      corporateTax,
      paye,
      generatedAt: new Date(),
    };
  }

  static async generateTaxDashboardFromRequest(
    req: Request,
    params: {
      startDate: Date;
      endDate: Date;
      payrollBatchId?: string;
    },
  ) {
    const result = await this.generateTaxDashboard(req.db, {
      tenantId: req.tenantId!,
      startDate: params.startDate,
      endDate: params.endDate,
      payrollBatchId: params.payrollBatchId,
    });

    await logAdminAction({
      req,
      tenantId: req.tenantId!,
      action: 'TAX_DASHBOARD_GENERATED',
      severity: AuditSeverity.INFO,
      payload: {
        startDate: params.startDate.toISOString(),
        endDate: params.endDate.toISOString(),
        payrollBatchId: params.payrollBatchId ?? null,
      },
    });

    return result;
  }
}
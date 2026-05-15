// apps/api/src/modules/integrations/kra/TaxEngineService.ts

import type { Request } from 'express';
import { VATService } from './VATService';
import { PAYEService } from './PAYEService';
import { WHTService } from './WHTService';
import { CorporateTaxService } from './CorporateTaxService';
import { logAdminAction } from '../../../utils/audit-logger';
import { AuditAction, AuditSeverity } from '../../../types/audit';

function requireTenantId(req: Request): string {
  if (!req.tenantId || !req.tenantId.trim()) {
    throw Object.assign(new Error('Tenant context is required for KRA tax dashboard.'), {
      statusCode: 401,
      code: 'KRA_TENANT_CONTEXT_REQUIRED',
    });
  }

  return req.tenantId.trim();
}

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
    const tenantId = requireTenantId(req);

    const result = await this.generateTaxDashboard(req.db, {
      tenantId,
      startDate: params.startDate,
      endDate: params.endDate,
      payrollBatchId: params.payrollBatchId,
    });

    await logAdminAction({
      req,
      tenantId,
      action: AuditAction.READ,
      severity: AuditSeverity.INFO,
      payload: {
        eventCode: 'TAX_DASHBOARD_GENERATED',
        startDate: params.startDate.toISOString(),
        endDate: params.endDate.toISOString(),
        payrollBatchId: params.payrollBatchId ?? null,
        requestId: req.id ?? null,
      },
    });

    return result;
  }
}

export default TaxEngineService;
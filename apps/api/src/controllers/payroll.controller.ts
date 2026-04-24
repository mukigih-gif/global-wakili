import { Request, Response } from 'express';
import { PayrollMasterService } from '../services/hr/payroll-master.service';
import { PayrollApprovalService } from '../services/hr/payroll-approval.service';
import { PayrollExportService } from '../services/hr/payroll-export.service';

export class PayrollController {
  static async generate(req: Request, res: Response) {
    const { month, year } = req.body;
    const batch = await PayrollMasterService.processBatch(
      { actor: req.user, tenantId: req.tenant.id, req },
      month, year
    );
    res.json(batch);
  }

  static async approve(req: Request, res: Response) {
    const { id } = req.params;
    const result = await PayrollApprovalService.approve(
      { actor: req.user, tenantId: req.tenant.id, req },
      id
    );
    res.json(result);
  }

  static async exportBankCSV(req: Request, res: Response) {
    const csv = await PayrollExportService.getBankCSV(
      { tenantId: req.tenant.id, req },
      req.params.id
    );
    res.attachment(`bank-transfer-${req.params.id}.csv`).send(csv);
  }
}
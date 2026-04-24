import { Request, Response } from 'express';
import { ProcurementService } from '../services/procurement/procurement.service';
import { SupplierService } from '../services/procurement/supplier.service';

export class ProcurementController {
  static async createRequest(req: Request, res: Response) {
    const request = await ProcurementService.createRequest(
      { actor: req.user, tenantId: req.tenant.id, req },
      req.body
    );
    res.status(201).json(request);
  }

  static async approve(req: Request, res: Response) {
    const request = await ProcurementService.approve(
      { actor: req.user, tenantId: req.tenant.id, req },
      req.params.id
    );
    res.json(request);
  }

  static async processPayment(req: Request, res: Response) {
    const { bankAccountId, reference } = req.body;
    const result = await ProcurementService.pay(
      { actor: req.user, tenantId: req.tenant.id, req },
      req.params.id,
      { bankAccountId, reference }
    );
    res.json(result);
  }
}
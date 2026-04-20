import { MatterKYCService } from './MatterKYCService';
import { CommissionService } from './CommissionService';

export const evaluateMatterKyc = asyncHandler(async (req: Request, res: Response) => {
  const result = await MatterKYCService.evaluate(req.db, {
    tenantId: req.tenantId!,
    matterId: req.params.matterId,
    persistResult: true,
    createdById: req.user?.sub ?? null,
    sourceOfFundsRequired:
      req.body?.sourceOfFundsRequired !== undefined
        ? Boolean(req.body.sourceOfFundsRequired)
        : true,
    sourceOfWealthRequired:
      req.body?.sourceOfWealthRequired !== undefined
        ? Boolean(req.body.sourceOfWealthRequired)
        : false,
  });

  res.status(200).json(result);
});

export const getMatterCommission = asyncHandler(async (req: Request, res: Response) => {
  const result = await CommissionService.calculateMatterCommission(req.db, {
    tenantId: req.tenantId!,
    matterId: req.params.matterId,
    periodStart: req.query.periodStart ? new Date(String(req.query.periodStart)) : null,
    periodEnd: req.query.periodEnd ? new Date(String(req.query.periodEnd)) : null,
    includeWriteOffImpact:
      req.query.includeWriteOffImpact !== undefined
        ? String(req.query.includeWriteOffImpact) === 'true'
        : true,
  });

  res.status(200).json(result);
});

export const getOriginatorPortfolioPayout = asyncHandler(async (req: Request, res: Response) => {
  const result = await CommissionService.calculateOriginatorPortfolioPayout(req.db, {
    tenantId: req.tenantId!,
    originatorId: req.params.originatorId,
    periodStart: req.query.periodStart ? new Date(String(req.query.periodStart)) : null,
    periodEnd: req.query.periodEnd ? new Date(String(req.query.periodEnd)) : null,
  });

  res.status(200).json(result);
});
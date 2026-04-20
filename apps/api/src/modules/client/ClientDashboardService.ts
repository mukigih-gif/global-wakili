import type { Request } from 'express';
import type { ClientInput } from './client.types';
import { ClientService } from './ClientService';
import { ClientKYCService } from './ClientKYCService';
import { RiskScoringService } from './RiskScoringService';
import { PEPCheckService } from './PEPCheckService';
import { SanctionsCheckService } from './SanctionsCheckService';

export class ClientOnboardingService {
  static async onboard(
    req: Request,
    input: {
      client: ClientInput;
      performKyc?: boolean;
      performPepCheck?: boolean;
      performSanctionsCheck?: boolean;
      onboardingNotes?: string | null;
      requireKraPinForBasicVerification?: boolean;
    },
  ) {
    const performKyc = input.performKyc ?? true;
    const performPepCheck = input.performPepCheck ?? true;
    const performSanctionsCheck = input.performSanctionsCheck ?? true;
    const requireKraPinForBasicVerification =
      input.requireKraPinForBasicVerification ?? true;

    return req.db.$transaction(async (tx: any) => {
      const createdClient = await ClientService.create(tx, req.tenantId!, input.client);

      const [kyc, pep, sanctions] = await Promise.all([
        performKyc
          ? ClientKYCService.evaluate(tx, {
              tenantId: req.tenantId!,
              clientId: createdClient.id,
              requireKraPinForBasicVerification,
            })
          : Promise.resolve(null),
        performPepCheck
          ? PEPCheckService.run(tx, {
              tenantId: req.tenantId!,
              clientId: createdClient.id,
            })
          : Promise.resolve(null),
        performSanctionsCheck
          ? SanctionsCheckService.run(tx, {
              tenantId: req.tenantId!,
              clientId: createdClient.id,
            })
          : Promise.resolve(null),
      ]);

      const risk = await RiskScoringService.compute(tx, {
        tenantId: req.tenantId!,
        clientId: createdClient.id,
        kyc,
        pep,
        sanctions,
      });

      const currentClient = await tx.client.findFirst({
        where: {
          tenantId: req.tenantId!,
          id: createdClient.id,
        },
        select: {
          id: true,
          metadata: true,
        },
      });

      const mergedMetadata = {
        ...(currentClient?.metadata ?? {}),
        pepMatch: pep?.status === 'MATCHED',
        sanctionsMatch: sanctions?.status === 'MATCHED',
        compliance: {
          ...(currentClient?.metadata?.compliance ?? {}),
          onboarding: {
            completedAt: new Date().toISOString(),
            notes: input.onboardingNotes ?? null,
            kycStatus: kyc?.status ?? null,
            pepStatus: pep?.status ?? null,
            sanctionsStatus: sanctions?.status ?? null,
            riskScore: risk.score,
            riskBand: risk.riskBand,
            factors: risk.factors,
          },
        },
      };

      const updatedClient = await tx.client.update({
        where: { id: createdClient.id },
        data: {
          ...(kyc?.status ? { kycStatus: kyc.status } : {}),
          metadata: mergedMetadata,
        },
      });

      return {
        client: updatedClient,
        kyc,
        pep,
        sanctions,
        risk,
      };
    });
  }
}
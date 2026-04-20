import type { Request } from 'express';
import { MatterService } from './MatterService';
import { MatterWorkflowService } from './MatterWorkflowService';
import { MatterConflictService } from './MatterConflictService';
import { MatterAuditService } from './MatterAuditService';

export class MatterOnboardingService {
  static async onboard(
    req: Request,
    input: {
      matter: Record<string, unknown>;
      runConflictCheck?: boolean;
      adversePartyNames?: string[];
      relatedEntityNames?: string[];
      onboardingNotes?: string | null;
    },
  ) {
    const runConflictCheck = input.runConflictCheck ?? true;

    return req.db.$transaction(async (tx: any) => {
      const workflowTemplate = MatterWorkflowService.resolveWorkflowTemplate(
        String((input.matter as any)?.metadata?.matterType ?? (input.matter as any)?.matterType ?? 'OTHER'),
      );

      const conflictResult = runConflictCheck
        ? await MatterConflictService.runConflictCheck(tx, {
            tenantId: req.tenantId!,
            clientId: ((input.matter as any)?.clientId as string) ?? null,
            adversePartyNames: input.adversePartyNames ?? [],
            relatedEntityNames: input.relatedEntityNames ?? [],
          })
        : null;

      if (conflictResult?.conflictLevel === 'HIGH_RISK') {
        throw Object.assign(new Error('Matter onboarding blocked by high-risk conflict result'), {
          statusCode: 409,
          code: 'MATTER_CONFLICT_HIGH_RISK',
          details: conflictResult,
        });
      }

      const normalizedMetadata = MatterWorkflowService.normalizeMetadata({
        ...(((input.matter as any)?.metadata as Record<string, unknown>) ?? {}),
        matterType:
          ((input.matter as any)?.metadata?.matterType as string | undefined) ??
          ((input.matter as any)?.matterType as string | undefined) ??
          'OTHER',
        workflowType: workflowTemplate.workflowType,
        progressStage: workflowTemplate.recommendedStages[0] ?? 'INTAKE',
        progressPercent: 0,
        onboarding: {
          completedAt: new Date().toISOString(),
          notes: input.onboardingNotes ?? null,
          recommendedStages: workflowTemplate.recommendedStages,
          requiredArtifacts: workflowTemplate.requiredArtifacts,
          conflictLevel: conflictResult?.conflictLevel ?? 'CLEAR',
        },
        originatorId:
          ((input.matter as any)?.originatorId as string | undefined) ??
          ((input.matter as any)?.metadata?.originatorId as string | undefined) ??
          null,
      });

      const createdMatter = await MatterService.create(tx, req.tenantId!, {
        ...((input.matter as any) ?? {}),
        metadata: normalizedMetadata,
      });

      await MatterAuditService.logCreate(req, createdMatter);

      if (conflictResult) {
        await MatterAuditService.logConflictCheck(req, conflictResult);
      }

      await MatterAuditService.logWorkflowResolution(req, {
        matterType: workflowTemplate.matterType,
        workflowType: workflowTemplate.workflowType,
        recommendedStages: workflowTemplate.recommendedStages,
      });

      return {
        matter: createdMatter,
        workflowTemplate,
        conflictResult,
      };
    });
  }
}
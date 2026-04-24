export type WorkflowType =
  | 'GENERAL'
  | 'LITIGATION'
  | 'CONVEYANCING'
  | 'COMMERCIAL'
  | 'FAMILY'
  | 'PROBATE'
  | 'EMPLOYMENT'
  | 'TAX'
  | 'REGULATORY'
  | 'IP'
  | 'DEBT_RECOVERY'
  | 'ARBITRATION';

export type MatterType =
  | 'COMMERCIAL'
  | 'CONVEYANCING'
  | 'LITIGATION'
  | 'DIVORCE'
  | 'PROBATE'
  | 'EMPLOYMENT'
  | 'TAX'
  | 'REGULATORY'
  | 'IP'
  | 'DEBT_RECOVERY'
  | 'ARBITRATION'
  | 'OTHER';

export class MatterWorkflowService {
  static normalizeMatterType(input?: string | null): MatterType {
    const value = String(input ?? 'OTHER').trim().toUpperCase();
    const allowed: MatterType[] = [
      'COMMERCIAL',
      'CONVEYANCING',
      'LITIGATION',
      'DIVORCE',
      'PROBATE',
      'EMPLOYMENT',
      'TAX',
      'REGULATORY',
      'IP',
      'DEBT_RECOVERY',
      'ARBITRATION',
      'OTHER',
    ];
    return allowed.includes(value as MatterType) ? (value as MatterType) : 'OTHER';
  }

  static resolveWorkflowType(matterType?: string | null): WorkflowType {
    switch (this.normalizeMatterType(matterType)) {
      case 'LITIGATION':
        return 'LITIGATION';
      case 'CONVEYANCING':
        return 'CONVEYANCING';
      case 'COMMERCIAL':
        return 'COMMERCIAL';
      case 'DIVORCE':
        return 'FAMILY';
      case 'PROBATE':
        return 'PROBATE';
      case 'EMPLOYMENT':
        return 'EMPLOYMENT';
      case 'TAX':
        return 'TAX';
      case 'REGULATORY':
        return 'REGULATORY';
      case 'IP':
        return 'IP';
      case 'DEBT_RECOVERY':
        return 'DEBT_RECOVERY';
      case 'ARBITRATION':
        return 'ARBITRATION';
      default:
        return 'GENERAL';
    }
  }

  static resolveWorkflowTemplate(
    matterType?: string | null,
  ): {
    matterType: MatterType;
    workflowType: WorkflowType;
    recommendedStages: string[];
    requiredArtifacts: string[];
  } {
    const normalized = this.normalizeMatterType(matterType);

    switch (normalized) {
      case 'LITIGATION':
        return {
          matterType: normalized,
          workflowType: 'LITIGATION',
          recommendedStages: [
            'INTAKE',
            'PLEADINGS',
            'PRE_TRIAL',
            'HEARING',
            'SUBMISSIONS',
            'JUDGMENT',
            'EXECUTION',
            'CLOSURE',
          ],
          requiredArtifacts: ['instructions', 'pleadings', 'court_dates', 'filings', 'orders'],
        };

      case 'CONVEYANCING':
        return {
          matterType: normalized,
          workflowType: 'CONVEYANCING',
          recommendedStages: [
            'INTAKE',
            'DUE_DILIGENCE',
            'DRAFTING',
            'EXECUTION',
            'STAMPING',
            'REGISTRATION',
            'COMPLETION',
            'CLOSURE',
          ],
          requiredArtifacts: ['title_documents', 'searches', 'sale_agreement', 'transfer_forms'],
        };

      case 'COMMERCIAL':
        return {
          matterType: normalized,
          workflowType: 'COMMERCIAL',
          recommendedStages: [
            'INTAKE',
            'STRUCTURING',
            'DRAFTING',
            'NEGOTIATION',
            'EXECUTION',
            'POST_COMPLETION',
            'CLOSURE',
          ],
          requiredArtifacts: ['term_sheet', 'drafts', 'approvals', 'signed_agreements'],
        };

      case 'DIVORCE':
        return {
          matterType: normalized,
          workflowType: 'FAMILY',
          recommendedStages: [
            'INTAKE',
            'ADVICE',
            'FILING',
            'SERVICE',
            'HEARING',
            'DECREE',
            'CLOSURE',
          ],
          requiredArtifacts: ['marriage_documents', 'petition', 'service_affidavits', 'decree'],
        };

      case 'PROBATE':
        return {
          matterType: normalized,
          workflowType: 'PROBATE',
          recommendedStages: [
            'INTAKE',
            'ASSET_REVIEW',
            'PETITION',
            'GAZETTEMENT',
            'GRANT',
            'CONFIRMATION',
            'DISTRIBUTION',
            'CLOSURE',
          ],
          requiredArtifacts: ['death_certificate', 'asset_schedule', 'petition', 'grant'],
        };

      default:
        return {
          matterType: normalized,
          workflowType: 'GENERAL',
          recommendedStages: [
            'INTAKE',
            'OPENED',
            'IN_PROGRESS',
            'BILLING',
            'COMPLETED',
            'CLOSED',
          ],
          requiredArtifacts: ['instructions', 'engagement_terms'],
        };
    }
  }

  static normalizeMetadata(metadata?: Record<string, unknown> | null) {
    const matterType = this.normalizeMatterType(String(metadata?.matterType ?? 'OTHER'));
    const workflowType = this.resolveWorkflowType(matterType);

    return {
      ...(metadata ?? {}),
      matterType,
      workflowType,
      portalVisible: metadata?.portalVisible !== false,
      progressPercent:
        typeof metadata?.progressPercent === 'number'
          ? Math.max(0, Math.min(100, metadata.progressPercent))
          : null,
      progressStage: metadata?.progressStage ?? null,
    };
  }

  static canTransition(fromStage: string | null | undefined, toStage: string, matterType?: string | null): boolean {
    const template = this.resolveWorkflowTemplate(matterType);
    const stages = template.recommendedStages;
    const fromIndex = fromStage ? stages.indexOf(String(fromStage).toUpperCase()) : -1;
    const toIndex = stages.indexOf(String(toStage).toUpperCase());

    if (toIndex === -1) return false;
    if (fromIndex === -1) return true;
    return toIndex >= fromIndex;
  }
}
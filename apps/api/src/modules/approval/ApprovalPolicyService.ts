// apps/api/src/modules/approval/ApprovalPolicyService.ts

import type {
  ApprovalLevel,
  ApprovalModule,
  ApprovalPriority,
} from './approval.types';

type PolicyResolutionInput = {
  module: ApprovalModule;
  entityType: string;
  amount?: number | null;
  riskScore?: number | null;
  requestedLevel?: ApprovalLevel | null;
  requestedPriority?: ApprovalPriority | null;
  requestedDeadlineAt?: Date | string | null;
};

function normalizeDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error('Invalid approval policy date'), {
      statusCode: 422,
      code: 'APPROVAL_POLICY_DATE_INVALID',
    });
  }

  return parsed;
}

function plusHours(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

export class ApprovalPolicyService {
  static resolveLevel(input: PolicyResolutionInput): ApprovalLevel {
    if (input.requestedLevel) return input.requestedLevel;

    if (input.module === 'PAYROLL' && (input.amount ?? 0) >= 1_000_000) {
      return 'CFO';
    }

    if (input.module === 'TRUST' && (input.amount ?? 0) >= 500_000) {
      return 'PARTNER';
    }

    if (input.module === 'FINANCE' && input.entityType === 'WRITE_OFF') {
      return 'MANAGER';
    }

    if (input.module === 'COMPLIANCE' && (input.riskScore ?? 0) >= 75) {
      return 'COMPLIANCE_OFFICER';
    }

    if (input.module === 'PROCUREMENT' && (input.amount ?? 0) >= 250_000) {
      return 'HEAD_OF_DEPARTMENT';
    }

    return 'REVIEWER';
  }

  static resolvePriority(input: PolicyResolutionInput): ApprovalPriority {
    if (input.requestedPriority) return input.requestedPriority;

    if ((input.riskScore ?? 0) >= 85) return 'CRITICAL';
    if ((input.amount ?? 0) >= 1_000_000) return 'HIGH';
    if (input.module === 'TRUST') return 'HIGH';

    return 'NORMAL';
  }

  static resolveDeadlineAt(input: PolicyResolutionInput): Date | null {
    const explicit = normalizeDate(input.requestedDeadlineAt);
    if (explicit) return explicit;

    const priority = this.resolvePriority(input);

    if (priority === 'CRITICAL') return plusHours(4);
    if (priority === 'HIGH') return plusHours(24);
    if (priority === 'NORMAL') return plusHours(72);

    return plusHours(24 * 7);
  }
}

export default ApprovalPolicyService;
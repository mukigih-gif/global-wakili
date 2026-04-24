// apps/api/src/types/platform-enforcement.ts

export type PlatformModuleKey =
  | 'analytics'
  | 'ai'
  | 'approval'
  | 'billing'
  | 'calendar'
  | 'client'
  | 'compliance'
  | 'document'
  | 'finance'
  | 'integrations'
  | 'matter'
  | 'notifications'
  | 'payroll'
  | 'platform'
  | 'procurement'
  | 'queues'
  | 'reporting'
  | 'trust';

export type PlatformAccessDecisionCode =
  | 'ALLOWED'
  | 'MODULE_UNKNOWN'
  | 'TENANT_CONTEXT_REQUIRED'
  | 'TENANT_ACCESS_DENIED'
  | 'TENANT_READ_ONLY'
  | 'FEATURE_FLAG_DISABLED'
  | 'MAINTENANCE_ACTIVE'
  | 'MAINTENANCE_READ_ONLY'
  | 'IMPERSONATION_INVALID'
  | 'IMPERSONATION_READ_ONLY'
  | 'QUOTA_EXCEEDED';

export type PlatformAccessPolicy = {
  moduleKey: PlatformModuleKey | string;
  allowed: boolean;
  readOnly: boolean;
  plan: string | null;
  subscriptionStatus: string | null;
  lifecycleStatus: string | null;
  entitlementEnabled: boolean;
  reasons: string[];
  features: string[];
  decisionCode: PlatformAccessDecisionCode;
};

export type PlatformMaintenancePolicy = {
  active: Array<Record<string, unknown>>;
  readOnlyRequired: boolean;
  denyRequired: boolean;
  reasons: string[];
};

export type PlatformBroadcastContext = {
  activeMessages: Array<Record<string, unknown>>;
  activeMaintenance: Array<Record<string, unknown>>;
  readOnlyRequired: boolean;
};

export type PlatformImpersonationContext = {
  isImpersonated: boolean;
  sessionId: string | null;
  accessMode: 'READ_ONLY' | 'ELEVATED' | null;
  targetUserId: string | null;
  requestedByPlatformUserId: string | null;
  approvedByPlatformUserId: string | null;
  status: string | null;
  expiresAt: string | null;
  reasons: string[];
};

export type PlatformFeatureContext = {
  featureKey: string | null;
  allowed: boolean;
  matchedFlags: Array<Record<string, unknown>>;
  reasons: string[];
};

declare global {
  namespace Express {
    interface Request {
      platformAccessPolicy?: PlatformAccessPolicy;
      platformMaintenancePolicy?: PlatformMaintenancePolicy;
      platformBroadcasts?: PlatformBroadcastContext;
      platformImpersonation?: PlatformImpersonationContext;
      platformFeatureContext?: PlatformFeatureContext;
    }
  }
}

export {};
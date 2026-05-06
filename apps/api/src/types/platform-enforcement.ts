// apps/api/src/types/platform-enforcement.ts

export type PlatformModuleKey = string;
export type PlatformFeatureKey = string;
export type PlatformAccessDecisionCode = string;

export type PlatformAccessPolicy = {
  moduleKey?: PlatformModuleKey | null;
  featureKey?: PlatformFeatureKey | null;
  allowed: boolean;
  readOnly: boolean;
  plan?: string | null;
  subscriptionStatus?: string | null;
  lifecycleStatus?: string | null;
  entitlementEnabled?: boolean | null;
  reasons: unknown[];
  features?: string[];
  decisionCode: PlatformAccessDecisionCode;
  [key: string]: unknown;
};

export type PlatformMaintenancePolicy = {
  generatedAt?: Date | string;
  active?: unknown[];
  activePolicies?: unknown[];
  readOnlyRequired?: boolean;
  denyRequired?: boolean;
  reasons?: unknown[];
  [key: string]: unknown;
};

export type PlatformBroadcastContext = {
  generatedAt?: Date | string;
  activeMessages?: unknown[];
  activeMaintenance?: unknown[];
  readOnlyRequired?: boolean;
  [key: string]: unknown;
};

export type PlatformFeatureContext = {
  tenantId?: string | null;
  moduleKey?: PlatformModuleKey | null;
  featureKey?: PlatformFeatureKey | null;
  allowed?: boolean;
  enabled?: boolean;
  isEnabled?: boolean;
  featureEnabled?: boolean;
  source?: string | null;
  reasons?: unknown[];
  [key: string]: unknown;
};

export type PlatformImpersonationContext = {
  isImpersonated: boolean;
  sessionId: string | null;
  accessMode: string | null;
  targetUserId: string | null;
  requestedByPlatformUserId: string | null;
  approvedByPlatformUserId: string | null;
  status: string | null;
  expiresAt: string | null;
  reasons: string[];
  [key: string]: unknown;
};
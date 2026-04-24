// apps/api/src/services/platform/PlatformModuleRegistry.ts

import type { Request } from 'express';
import type { PlatformModuleKey } from '../../types/platform-enforcement';

export type PlatformModuleDefinition = {
  moduleKey: PlatformModuleKey;
  displayName: string;
  routePrefixes: string[];
  aliases?: string[];
  featureNamespace: string;
  supportsImpersonation: boolean;
  supportsMaintenance: boolean;
  writeProtected: boolean;
};

const MODULES: PlatformModuleDefinition[] = [
  {
    moduleKey: 'finance',
    displayName: 'Finance',
    routePrefixes: ['/finance'],
    aliases: ['general-ledger', 'accounting'],
    featureNamespace: 'finance',
    supportsImpersonation: true,
    supportsMaintenance: true,
    writeProtected: true,
  },
  {
    moduleKey: 'trust',
    displayName: 'Trust',
    routePrefixes: ['/trust'],
    aliases: ['client-trust'],
    featureNamespace: 'trust',
    supportsImpersonation: true,
    supportsMaintenance: true,
    writeProtected: true,
  },
  {
    moduleKey: 'payroll',
    displayName: 'Payroll / HR',
    routePrefixes: ['/payroll', '/hr', '/human-resources'],
    aliases: ['human-resources'],
    featureNamespace: 'payroll',
    supportsImpersonation: true,
    supportsMaintenance: true,
    writeProtected: true,
  },
  {
    moduleKey: 'reporting',
    displayName: 'Reporting / BI',
    routePrefixes: ['/reporting', '/reports'],
    featureNamespace: 'reporting',
    supportsImpersonation: true,
    supportsMaintenance: true,
    writeProtected: true,
  },
  {
    moduleKey: 'document',
    displayName: 'Document',
    routePrefixes: ['/document', '/documents'],
    featureNamespace: 'document',
    supportsImpersonation: true,
    supportsMaintenance: true,
    writeProtected: true,
  },
  {
    moduleKey: 'integrations',
    displayName: 'Integrations',
    routePrefixes: ['/integrations'],
    featureNamespace: 'integrations',
    supportsImpersonation: false,
    supportsMaintenance: true,
    writeProtected: true,
  },
  {
    moduleKey: 'queues',
    displayName: 'Queues',
    routePrefixes: ['/queues', '/queue'],
    featureNamespace: 'queues',
    supportsImpersonation: false,
    supportsMaintenance: true,
    writeProtected: true,
  },
  {
    moduleKey: 'compliance',
    displayName: 'Compliance',
    routePrefixes: ['/compliance'],
    featureNamespace: 'compliance',
    supportsImpersonation: true,
    supportsMaintenance: true,
    writeProtected: true,
  },
  {
    moduleKey: 'ai',
    displayName: 'AI',
    routePrefixes: ['/ai'],
    featureNamespace: 'ai',
    supportsImpersonation: true,
    supportsMaintenance: true,
    writeProtected: true,
  },
  {
    moduleKey: 'approval',
    displayName: 'Approval',
    routePrefixes: ['/approval', '/approvals'],
    featureNamespace: 'approval',
    supportsImpersonation: true,
    supportsMaintenance: true,
    writeProtected: true,
  },
  {
    moduleKey: 'billing',
    displayName: 'Billing',
    routePrefixes: ['/billing'],
    featureNamespace: 'billing',
    supportsImpersonation: true,
    supportsMaintenance: true,
    writeProtected: true,
  },
  {
    moduleKey: 'procurement',
    displayName: 'Procurement',
    routePrefixes: ['/procurement', '/vendor', '/vendors', '/supplier', '/suppliers'],
    featureNamespace: 'procurement',
    supportsImpersonation: true,
    supportsMaintenance: true,
    writeProtected: true,
  },
  {
    moduleKey: 'client',
    displayName: 'Client',
    routePrefixes: ['/client', '/clients'],
    featureNamespace: 'client',
    supportsImpersonation: true,
    supportsMaintenance: true,
    writeProtected: true,
  },
  {
    moduleKey: 'matter',
    displayName: 'Matter',
    routePrefixes: ['/matter', '/matters'],
    featureNamespace: 'matter',
    supportsImpersonation: true,
    supportsMaintenance: true,
    writeProtected: true,
  },
  {
    moduleKey: 'calendar',
    displayName: 'Calendar',
    routePrefixes: ['/calendar'],
    featureNamespace: 'calendar',
    supportsImpersonation: true,
    supportsMaintenance: true,
    writeProtected: true,
  },
  {
    moduleKey: 'analytics',
    displayName: 'Analytics',
    routePrefixes: ['/analytics'],
    featureNamespace: 'analytics',
    supportsImpersonation: true,
    supportsMaintenance: true,
    writeProtected: false,
  },
  {
    moduleKey: 'notifications',
    displayName: 'Notifications',
    routePrefixes: ['/notifications'],
    featureNamespace: 'notifications',
    supportsImpersonation: false,
    supportsMaintenance: true,
    writeProtected: true,
  },
  {
    moduleKey: 'platform',
    displayName: 'Platform',
    routePrefixes: ['/platform'],
    featureNamespace: 'platform',
    supportsImpersonation: false,
    supportsMaintenance: false,
    writeProtected: true,
  },
];

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export class PlatformModuleRegistry {
  static list(): PlatformModuleDefinition[] {
    return [...MODULES];
  }

  static get(moduleKey: string): PlatformModuleDefinition | null {
    const target = normalize(moduleKey);

    return (
      MODULES.find((item) => item.moduleKey === target) ??
      MODULES.find((item) => item.aliases?.map(normalize).includes(target)) ??
      null
    );
  }

  static resolveFromRequest(req: Request): PlatformModuleDefinition | null {
    const path = `${req.baseUrl ?? ''} ${req.originalUrl ?? ''} ${req.path ?? ''}`.toLowerCase();

    for (const moduleDef of MODULES) {
      if (moduleDef.routePrefixes.some((prefix) => path.includes(prefix.toLowerCase()))) {
        return moduleDef;
      }
    }

    return null;
  }

  static resolveModuleKey(moduleKeyOrReq?: string | Request | null): PlatformModuleKey | null {
    if (!moduleKeyOrReq) return null;

    if (typeof moduleKeyOrReq === 'string') {
      return (this.get(moduleKeyOrReq)?.moduleKey ?? null) as PlatformModuleKey | null;
    }

    return (this.resolveFromRequest(moduleKeyOrReq)?.moduleKey ?? null) as PlatformModuleKey | null;
  }

  static isWriteMethod(method?: string | null): boolean {
    const normalized = normalize(String(method ?? 'GET'));
    return ['post', 'put', 'patch', 'delete'].includes(normalized);
  }
}

export default PlatformModuleRegistry;
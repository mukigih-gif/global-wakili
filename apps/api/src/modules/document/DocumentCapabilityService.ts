// apps/api/src/modules/document/DocumentCapabilityService.ts

type CapabilityStatus =
  | 'ACTIVE'
  | 'FAIL_CLOSED'
  | 'PENDING_PROVIDER'
  | 'PENDING_SCHEMA'
  | 'PENDING_CROSS_MODULE';

type CapabilityRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

type DocumentCapability = {
  key: string;
  status: CapabilityStatus;
  risk: CapabilityRisk;
  description: string;
  requiredForCloseout: boolean;
  notes?: string[];
};

function envEnabled(key: string): boolean {
  return process.env[key] === 'true';
}

function hasEnv(key: string): boolean {
  return Boolean(process.env[key]?.trim());
}

function storageStatus(): CapabilityStatus {
  const provider = (process.env.DOCUMENT_STORAGE_PROVIDER ?? 'LOCAL').toUpperCase();

  if (provider === 'LOCAL') {
    return process.env.NODE_ENV === 'production' ? 'FAIL_CLOSED' : 'ACTIVE';
  }

  if (provider === 'S3') {
    return hasEnv('DOCUMENT_S3_BUCKET') ? 'PENDING_PROVIDER' : 'FAIL_CLOSED';
  }

  if (provider === 'AZURE') {
    return hasEnv('DOCUMENT_AZURE_CONTAINER') ? 'PENDING_PROVIDER' : 'FAIL_CLOSED';
  }

  if (provider === 'GCS') {
    return hasEnv('DOCUMENT_GCS_BUCKET') ? 'PENDING_PROVIDER' : 'FAIL_CLOSED';
  }

  return 'FAIL_CLOSED';
}

export class DocumentCapabilityService {
  static getCapabilities(): DocumentCapability[] {
    return [
      {
        key: 'document.upload',
        status: 'ACTIVE',
        risk: 'CRITICAL',
        requiredForCloseout: true,
        description:
          'Tenant-scoped document upload with MIME/file-size validation, malware guard, versioning, and audit logging.',
      },
      {
        key: 'document.access_control',
        status: 'ACTIVE',
        risk: 'CRITICAL',
        requiredForCloseout: true,
        description:
          'Document-level access control with restricted/confidential metadata and matter-team checks.',
      },
      {
        key: 'document.audit',
        status: 'ACTIVE',
        risk: 'CRITICAL',
        requiredForCloseout: true,
        description:
          'Document actions are written to audit logs with request, user, matter, version, hash, and metadata context.',
      },
      {
        key: 'document.versioning',
        status: 'ACTIVE',
        risk: 'HIGH',
        requiredForCloseout: true,
        description:
          'Document version chain support through previousId and version sequencing.',
      },
      {
        key: 'document.search',
        status: 'ACTIVE',
        risk: 'HIGH',
        requiredForCloseout: true,
        description:
          'Document search is tenant-scoped and user access-aware to reduce restricted/confidential leakage.',
      },
      {
        key: 'document.dashboard',
        status: 'ACTIVE',
        risk: 'HIGH',
        requiredForCloseout: true,
        description:
          'Document dashboard is access-aware and filters restricted/confidential documents through policy controls.',
      },
      {
        key: 'document.retention',
        status: 'ACTIVE',
        risk: 'HIGH',
        requiredForCloseout: true,
        description:
          'Retention and disposal review foundations exist for expired and archived documents.',
      },
      {
        key: 'document.storage',
        status: storageStatus(),
        risk: 'CRITICAL',
        requiredForCloseout: true,
        description:
          'Local development storage is available outside production. Production fails closed unless a real provider is configured.',
        notes: [
          'S3/Azure/GCS provider adapters remain a future provider-integration patch.',
          'Production LOCAL storage is blocked.',
        ],
      },
      {
        key: 'document.malware_scan',
        status:
          envEnabled('DOCUMENT_MALWARE_SCAN_REQUIRED') ||
          process.env.NODE_ENV === 'production'
            ? hasEnv('DOCUMENT_MALWARE_SCANNER_PROVIDER')
              ? 'PENDING_PROVIDER'
              : 'FAIL_CLOSED'
            : 'ACTIVE',
        risk: 'CRITICAL',
        requiredForCloseout: true,
        description:
          'Upload-time malware/security guard exists. Production requires an external scanner provider.',
      },
      {
        key: 'document.pdf',
        status: envEnabled('DOCUMENT_PDF_RENDERER_ENABLED')
          ? 'PENDING_PROVIDER'
          : 'FAIL_CLOSED',
        risk: 'HIGH',
        requiredForCloseout: false,
        description:
          'PDF rendering/watermark/flattening is fail-closed until a real renderer/provider is configured.',
      },
      {
        key: 'document.external_editing.google_workspace',
        status:
          hasEnv('GOOGLE_CLIENT_ID') && hasEnv('GOOGLE_CLIENT_SECRET')
            ? 'PENDING_PROVIDER'
            : 'FAIL_CLOSED',
        risk: 'HIGH',
        requiredForCloseout: false,
        description:
          'Google Workspace OAuth token exchange is real-gated. Edit session adapter remains inactive until provider wiring is completed.',
      },
      {
        key: 'document.external_editing.office365',
        status:
          hasEnv('MS365_CLIENT_ID') && hasEnv('MS365_CLIENT_SECRET')
            ? 'PENDING_PROVIDER'
            : 'FAIL_CLOSED',
        risk: 'HIGH',
        requiredForCloseout: false,
        description:
          'Office 365 OAuth token exchange is real-gated. WOPI/edit session adapter remains inactive until provider wiring is completed.',
      },
      {
        key: 'document.sharing',
        status: 'PENDING_SCHEMA',
        risk: 'CRITICAL',
        requiredForCloseout: false,
        description:
          'Document sharing requires a dedicated share/access-grant model, expiry, revocation, and audit controls before activation.',
      },
      {
        key: 'document.e_signature',
        status: 'PENDING_PROVIDER',
        risk: 'CRITICAL',
        requiredForCloseout: false,
        description:
          'E-signature requires signer identity verification, provider integration, immutable audit trail, and certificate storage.',
      },
      {
        key: 'document.approvals',
        status: 'PENDING_CROSS_MODULE',
        risk: 'HIGH',
        requiredForCloseout: false,
        description:
          'Document approval should integrate with the future Central Approval Workflow module.',
      },
      {
        key: 'document.ocr_ai',
        status: 'PENDING_PROVIDER',
        risk: 'HIGH',
        requiredForCloseout: false,
        description:
          'OCR/AI document intelligence must be tenant-safe, audit-logged, and disabled until the AI layer is governed.',
      },
    ];
  }

  static getSummary() {
    const capabilities = this.getCapabilities();

    return {
      module: 'document',
      generatedAt: new Date(),
      status: 'FOUNDATION_HARDENED_PENDING_ENTERPRISE_EXTENSIONS',
      active: capabilities.filter((item) => item.status === 'ACTIVE').length,
      failClosed: capabilities.filter((item) => item.status === 'FAIL_CLOSED').length,
      pendingProvider: capabilities.filter((item) => item.status === 'PENDING_PROVIDER').length,
      pendingSchema: capabilities.filter((item) => item.status === 'PENDING_SCHEMA').length,
      pendingCrossModule: capabilities.filter((item) => item.status === 'PENDING_CROSS_MODULE')
        .length,
      requiredForCloseoutRemaining: capabilities.filter(
        (item) => item.requiredForCloseout && item.status !== 'ACTIVE',
      ),
      capabilities,
    };
  }
}

export default DocumentCapabilityService;
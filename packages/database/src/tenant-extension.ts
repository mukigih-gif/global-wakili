import { Prisma } from '@prisma/client';

export const TENANT_SCOPED_MODELS = new Set<string>([
  'TenantMembership',
  'Workspace',
  'Branch',
  'User',
  'Role',
  'Permission',
  'Device',
  'Session',
  'MfaSecret',

  'Client',
  'ClientComplianceCheck',
  'ClientKycProfile',
  'ClientTrustLedger',
  'Matter',
  'MatterOriginator',
  'MatterParty',
  'MatterLien',
  'MatterTask',
  'TaskComment',
  'StatuteOfLimitations',

  'Document',
  'EvidenceItem',
  'Contract',
  'ContractVersion',

  'CalendarEvent',
  'CalendarReminder',
  'CalendarRecurrenceRule',
  'CalendarSubscription',
  'ExternalCalendarAccount',
  'CalendarSyncCursor',

  'Invoice',
  'InvoiceLine',
  'PaymentReceipt',
  'PaymentReceiptAllocation',
  'CreditNote',

  'ChartOfAccount',
  'AccountBalance',
  'JournalEntry',
  'JournalLine',
  'TrustAccount',
  'OfficeAccount',
  'TrustTransaction',
  'OfficeTransaction',
  'TrustReconciliation',
  'ReconciliationRun',
  'ReconciliationMatch',
  'BankTransaction',

  'EmployeeProfile',
  'Attendance',
  'LeaveRequest',
  'LeaveBalance',
  'EmployeePerformance',
  'EmployeeGoal',
  'EmployeeDocument',
  'PayrollBatch',
  'Payslip',
  'PayrollRecord',
  'StatutoryDeductionRecord',
  'CommissionPayout',

  'Supplier',
  'VendorBill',
  'RequestForQuotation',
  'RequestForQuotationItem',
  'RequestForQuotationSupplier',
  'Quotation',
  'QuotationLine',
  'PurchaseOrder',
  'PurchaseOrderLine',
  'PurchaseOrderReceipt',
  'PurchaseOrderReceiptLine',
  'ExpenseEntry',

  'AuditLog',
  'AuditAlert',
  'AuditLogArchive',
  'ConsentRecord',
  'FieldEncryption',
  'FieldAccessPolicy',
  'ComplianceReport',
  'Notification',
  'NotificationDeliveryAttempt',
  'NotificationProviderConfig',
  'NotificationWebhookEvent',
  'NotificationTemplate',
  'NotificationPreference',
  'ExternalJobQueue',

  'DataLineage',
  'OwnershipRecord',

  'BankStatement',
  'BillingRun',
  'TimerSession',
  'PassiveCaptureEvent',
  'Disbursement',
  'DisbursementRequestNote',
  'RecurringExpenseTemplate',
  'WithholdingTaxCertificate',
  'PaymentRefund',

  'RateCard',
  'WriteOff',
  'CourtHearing',
  'MatterProfitabilitySnapshot',

  'AIProviderConfig',
  'AIPromptAudit',
  'AIUsageLog',
  'AIArtifact',
  'AIReviewTask',
  'AIRecommendation',

  'ExchangeRate',
  'InvoiceSequence',

  'ClientIssue',
  'ClientIssueComment',
  'ClientProspect',
  'ProspectActivity',

  'CourtFiling',

  'TenderRecord',
  'TenderActivity',
  'TenderDocument',
]);

const READ_OPERATIONS = new Set([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
]);

const WRITE_MANY_OPERATIONS = new Set([
  'updateMany',
  'deleteMany',
]);

const CREATE_OPERATIONS = new Set([
  'create',
  'createMany',
]);

const UNSAFE_UNIQUE_OPERATIONS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'update',
  'delete',
  'upsert',
]);

export function isTenantScopedModel(model?: string): boolean {
  return Boolean(model && TENANT_SCOPED_MODELS.has(model));
}

export function addTenantWhere(where: unknown, tenantId: string) {
  if (!where || typeof where !== 'object') {
    return { tenantId };
  }

  return {
    AND: [
      where,
      { tenantId },
    ],
  };
}

export function addTenantToData(data: unknown, tenantId: string): unknown {
  if (Array.isArray(data)) {
    return data.map((item) => addTenantToData(item, tenantId));
  }

  if (!data || typeof data !== 'object') {
    return data;
  }

  return {
    ...(data as Record<string, unknown>),
    tenantId,
  };
}

export function hasTenantWhere(where: unknown, tenantId?: string): boolean {
  if (!where || typeof where !== 'object') {
    return false;
  }

  const w = where as Record<string, unknown>;

  // Top-level tenantId. When the real request tenantId is supplied, require an exact
  // match (prevents spoofing a different tenant); without it (legacy callers/tests),
  // fall back to presence — preserving prior behavior.
  if (Object.prototype.hasOwnProperty.call(w, 'tenantId')) {
    return tenantId === undefined ? true : w.tenantId === tenantId;
  }

  // Compound/composite unique key (e.g. { tenantId_reference: { tenantId, reference } }):
  // accept ONLY when a nested key object carries a tenantId that EXACTLY matches the real
  // request tenant. Never a substring/loose check; never a non-matching literal.
  if (tenantId !== undefined) {
    for (const value of Object.values(w)) {
      if (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        (value as Record<string, unknown>).tenantId === tenantId
      ) {
        return true;
      }
    }
  }

  return false;
}

export function createTenantExtension(tenantId: string) {
  return Prisma.defineExtension({
    name: 'global-wakili-tenant-isolation',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!isTenantScopedModel(model)) {
            return query(args);
          }

          const mutableArgs = {
            ...(args as Record<string, unknown> | undefined),
          };

          if (READ_OPERATIONS.has(operation)) {
            mutableArgs.where = addTenantWhere(mutableArgs.where, tenantId);
            return query(mutableArgs);
          }

          if (WRITE_MANY_OPERATIONS.has(operation)) {
            mutableArgs.where = addTenantWhere(mutableArgs.where, tenantId);
            return query(mutableArgs);
          }

          if (CREATE_OPERATIONS.has(operation)) {
            mutableArgs.data = addTenantToData(mutableArgs.data, tenantId);
            return query(mutableArgs);
          }

          if (UNSAFE_UNIQUE_OPERATIONS.has(operation)) {
            if (!hasTenantWhere(mutableArgs.where, tenantId)) {
              throw new Error(
                `Unsafe tenant-scoped ${model}.${operation} blocked: include tenantId in where clause or use a tenant-safe query.`,
              );
            }

            return query(mutableArgs);
          }

          return query(args);
        },
      },
    },
  });
}
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
  'BankAccount',
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
  'Vendor',
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
  'RecurringExpense',

  'AuditLog',
  'AuditAlert',
  'AuditLogArchive',
  'ConsentRecord',
  'FieldEncryption',
  'FieldAccessPolicy',
  'ComplianceReport',
  'Notification',
  'ExternalJobQueue',

  'RateCard',
  'WriteOff',
  'CourtHearing',
  'MatterProfitabilitySnapshot',
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

function addTenantWhere(where: unknown, tenantId: string) {
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

function addTenantToData(data: unknown, tenantId: string): unknown {
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

function hasTenantWhere(where: unknown): boolean {
  if (!where || typeof where !== 'object') {
    return false;
  }

  return Object.prototype.hasOwnProperty.call(where, 'tenantId');
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
            if (!hasTenantWhere(mutableArgs.where)) {
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
export type VendorStatus = 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED';

export const VENDOR_STATUSES: readonly VendorStatus[] = [
  'ACTIVE',
  'INACTIVE',
  'BLACKLISTED',
] as const;

export type VendorValidationIssueCode =
  | 'MISSING_TENANT'
  | 'MISSING_VENDOR'
  | 'MISSING_NAME'
  | 'MISSING_KRA_PIN'
  | 'DUPLICATE_VENDOR_PIN'
  | 'DUPLICATE_VENDOR_EMAIL'
  | 'INVALID_PAYMENT_TERMS'
  | 'INVALID_STATUS';

export type VendorValidationIssue = {
  code: VendorValidationIssueCode;
  message: string;
  meta?: Record<string, unknown>;
};

export type VendorValidationResult = {
  valid: boolean;
  issues: VendorValidationIssue[];
};

export type VendorInput = {
  name: string;
  kraPin: string;
  etimsId?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  contactPerson?: string | null;
  address?: string | null;
  status?: VendorStatus;
  currency?: string | null;
  paymentTermsDays?: number | null;
  metadata?: Record<string, unknown> | null;
};

export type VendorUpdateInput = Partial<VendorInput>;

export type VendorListQuery = {
  page?: number;
  limit?: number;
  search?: string | null;
  status?: VendorStatus | null;
};

export type VendorView = {
  id: string;
  vendorId: string;
  supplierId: string;
  tenantId: string;
  name: string;
  kraPin: string;
  etimsId: string | null;
  email: string | null;
  phoneNumber: string | null;
  contactPerson: string | null;
  address: string | null;
  status: VendorStatus;
  currency: string;
  paymentTermsDays: number;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export type VendorListResult = {
  data: VendorView[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
};

export type SupplierDelegate = {
  findFirst: (args: unknown) => Promise<any>;
  findMany: (args: unknown) => Promise<any[]>;
  create: (args: unknown) => Promise<any>;
  update: (args: unknown) => Promise<any>;
  count: (args: unknown) => Promise<number>;
};

export type VendorDbClient = {
  supplier: SupplierDelegate;
};

import type { Prisma } from '@global-wakili/database';

export type DecimalLike = Prisma.Decimal | string | number;

export type ClientStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'PROSPECT'
  | 'BLACKLISTED';

export type ClientType =
  | 'INDIVIDUAL'
  | 'CORPORATE'
  | 'STATE_AGENCY'
  | 'OTHER';

export type ClientValidationIssueCode =
  | 'DUPLICATE_CLIENT_CODE'
  | 'DUPLICATE_EMAIL'
  | 'DUPLICATE_PHONE'
  | 'DUPLICATE_KRA_PIN'
  | 'INVALID_BRANCH'
  | 'INVALID_PORTAL_USER'
  | 'TENANT_BRANCH_CONFLICT'
  | 'MISSING_CLIENT'
  | 'POLICY_VIOLATION';

export type ClientValidationIssue = {
  code: ClientValidationIssueCode;
  message: string;
  meta?: Record<string, unknown>;
};

export type ClientValidationResult = {
  valid: boolean;
  issues: ClientValidationIssue[];
};

export type ClientInput = {
  clientCode?: string | null;
  type?: ClientType;
  status?: ClientStatus;
  name: string;
  email?: string | null;
  phoneNumber?: string | null;
  kraPin?: string | null;
  idNumber?: string | null;
  registrationNumber?: string | null;
  taxExempt?: boolean;
  address?: string | null;
  postalAddress?: string | null;
  currency?: string | null;
  branchId?: string | null;

  primaryContactName?: string | null;
  primaryContactEmail?: string | null;
  primaryContactPhone?: string | null;
  portalUserId?: string | null;

  metadata?: Record<string, unknown> | null;
};

export type TenantClientDbClient = {
  client: {
    findFirst: Function;
    findMany: Function;
    create: Function;
    update: Function;
  };
  branch: {
    findFirst: Function;
  };
  user: {
    findFirst: Function;
  };
};
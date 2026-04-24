import type { ContractStatus } from '@global-wakili/database';

export interface ContractInput {
  tenantId: string;
  matterId: string;
  contractNumber: string;
  title: string;
  description?: string | null;
  status?: ContractStatus | string;
  executionDate?: Date | string | null;
  effectiveDate?: Date | string | null;
  expiryDate?: Date | string | null;
  counterpartyName?: string | null;
  counterpartyEmail?: string | null;
  counterpartyPhone?: string | null;
  createdById?: string | null;
}

export interface ContractUpdateInput {
  contractNumber?: string;
  title?: string;
  description?: string | null;
  status?: ContractStatus | string;
  executionDate?: Date | string | null;
  effectiveDate?: Date | string | null;
  expiryDate?: Date | string | null;
  counterpartyName?: string | null;
  counterpartyEmail?: string | null;
  counterpartyPhone?: string | null;
}

export interface ContractVersionInput {
  tenantId: string;
  contractId: string;
  fileUrl: string;
  changesSummary?: string | null;
  createdById?: string | null;
}

export type TenantContractDbClient = {
  contract: {
    create: Function;
    update: Function;
    findFirst: Function;
    findMany: Function;
    count?: Function;
  };
  contractVersion: {
    create: Function;
    findFirst: Function;
    findMany: Function;
  };
  matter: {
    findFirst: Function;
  };
  user: {
    findFirst: Function;
  };
};
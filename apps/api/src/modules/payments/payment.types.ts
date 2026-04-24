// apps/api/src/modules/payments/payment.types.ts

import {
  PaymentMethod,
  PaymentReceiptStatus,
  Prisma,
} from '@global-wakili/database';

export type DecimalInput = string | Prisma.Decimal;

export type PaymentCurrency = 'KES' | 'USD' | 'EUR' | 'GBP' | string;

export type PaymentAllocationType = 'CASH' | 'WHT_CERTIFICATE';

export type PaymentActor = {
  tenantId: string;
  userId: string;
  branchId?: string | null;
  permissions?: string[];
};

export type PaymentAllocationInput = {
  invoiceId: string;
  amountApplied: DecimalInput;
  allocationType?: PaymentAllocationType;
  withholdingTaxCertificateId?: string | null;
};

export type CreatePaymentReceiptInput = {
  tenantId: string;
  clientId?: string | null;
  matterId?: string | null;
  invoiceId?: string | null;
  amount: DecimalInput;
  currency?: PaymentCurrency;
  exchangeRate?: DecimalInput;
  method: PaymentMethod;
  reference?: string | null;
  description?: string | null;
  receivedAt?: Date;
  createdById?: string | null;
  allocations?: PaymentAllocationInput[];
};

export type AllocatePaymentInput = {
  tenantId: string;
  paymentReceiptId: string;
  allocations: PaymentAllocationInput[];
  allocatedById?: string | null;
};

export type ReversePaymentReceiptInput = {
  tenantId: string;
  paymentReceiptId: string;
  reversedById: string;
  reason: string;
};

export type ListPaymentReceiptsInput = {
  tenantId: string;
  clientId?: string;
  matterId?: string;
  invoiceId?: string;
  status?: PaymentReceiptStatus;
  method?: PaymentMethod;
  receivedFrom?: Date;
  receivedTo?: Date;
  search?: string;
  take?: number;
  skip?: number;
};

export type PaymentReceiptWithRelations = Prisma.PaymentReceiptGetPayload<{
  include: {
    client: {
      select: {
        id: true;
        name: true;
        kraPin: true;
        email: true;
      };
    };
    matter: {
      select: {
        id: true;
        title: true;
        caseNumber: true;
      };
    };
    invoice: {
      select: {
        id: true;
        invoiceNumber: true;
        total: true;
        balanceDue: true;
        paidAmount: true;
        status: true;
        currency: true;
        exchangeRate: true;
      };
    };
    allocations: {
      include: {
        invoice: {
          select: {
            id: true;
            invoiceNumber: true;
            total: true;
            balanceDue: true;
            paidAmount: true;
            status: true;
            currency: true;
            exchangeRate: true;
          };
        };
      };
    };
  };
}>;

export type PaymentReceiptNumberContext = {
  tenantId: string;
  receivedAt?: Date;
  prefix?: string;
};

export type PaymentReceiptNumberAllocation = {
  receiptNumber: string;
  prefix: string;
  year: number;
  sequenceValue: number;
};

export type PaymentAllocationResult = {
  paymentReceiptId: string;
  totalReceiptAmount: Prisma.Decimal;
  totalAllocatedAmount: Prisma.Decimal;
  unallocatedAmount: Prisma.Decimal;
  allocationCount: number;
  status: PaymentReceiptStatus;
};

export type PaymentPostingInput = {
  tenantId: string;
  paymentReceiptId: string;
  postedById?: string | null;
};

export type PaymentReversalPostingInput = {
  tenantId: string;
  paymentReceiptId: string;
  reason: string;
  reversedById?: string | null;
  reversalDate?: Date;
};

export type PaymentReclassificationInput = {
  tenantId: string;
  paymentReceiptId: string;
  amount: Prisma.Decimal;
  invoiceId: string;
  allocatedById?: string | null;
};

export type PaymentDashboardSummary = {
  receiptCount: number;
  receivedTotal: Prisma.Decimal;
  allocatedTotal: Prisma.Decimal;
  unallocatedTotal: Prisma.Decimal;
  reversedTotal: Prisma.Decimal;
};

export const PAYMENT_DEFAULTS = {
  currency: 'KES',
  exchangeRate: '1',
  receiptPrefix: 'RCT',
  maxPaymentPageSize: 100,
  maxAllocationsPerReceipt: 100,
} as const;
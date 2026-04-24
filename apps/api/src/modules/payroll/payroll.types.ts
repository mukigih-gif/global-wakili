// apps/api/src/modules/payroll/payroll.types.ts

import { Prisma } from '@global-wakili/database';

export type DecimalInput = string | number | Prisma.Decimal;

export type PayrollCurrency = 'KES' | string;

export type PayrollFrequency =
  | 'MONTHLY'
  | 'SEMI_MONTHLY'
  | 'BI_WEEKLY'
  | 'WEEKLY'
  | 'DAILY'
  | 'CUSTOM';

export type PayrollBatchStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'POSTED'
  | 'PAID'
  | 'CANCELLED';

export type PayrollRecordStatus =
  | 'DRAFT'
  | 'CALCULATED'
  | 'APPROVED'
  | 'POSTED'
  | 'PAID'
  | 'CANCELLED';

export type PayslipStatus =
  | 'DRAFT'
  | 'GENERATED'
  | 'PUBLISHED'
  | 'REVOKED';

export type PayrollApprovalDecision = 'APPROVE' | 'REJECT';

export type EmployeePayrollStatus =
  | 'ACTIVE'
  | 'ON_LEAVE'
  | 'SUSPENDED'
  | 'TERMINATED'
  | 'INACTIVE';

export type PayItemKind =
  | 'BASIC_PAY'
  | 'ALLOWANCE'
  | 'BENEFIT'
  | 'OVERTIME'
  | 'BONUS'
  | 'COMMISSION'
  | 'REIMBURSEMENT'
  | 'DEDUCTION'
  | 'STATUTORY'
  | 'LOAN'
  | 'ADVANCE'
  | 'OTHER';

export type PayrollDeductionKind =
  | 'PAYE'
  | 'NSSF_EMPLOYEE'
  | 'SHA_SHIF'
  | 'AFFORDABLE_HOUSING_LEVY'
  | 'PENSION'
  | 'SACCO'
  | 'LOAN'
  | 'ADVANCE'
  | 'INSURANCE'
  | 'OTHER';

export type EmployerContributionKind =
  | 'NSSF_EMPLOYER'
  | 'AFFORDABLE_HOUSING_LEVY_EMPLOYER'
  | 'NITA'
  | 'PENSION_EMPLOYER'
  | 'INSURANCE_EMPLOYER'
  | 'OTHER';

export type PayrollActor = {
  tenantId: string;
  userId: string;
  branchId?: string | null;
  permissions?: string[];
};

export type PayrollPeriod = {
  year: number;
  month: number;
  periodStart: Date;
  periodEnd: Date;
  paymentDate?: Date | null;
  frequency?: PayrollFrequency;
};

export type PayrollEmployeeRef = {
  employeeId: string;
  userId?: string | null;
  staffNumber?: string | null;
  displayName?: string | null;
  kraPin?: string | null;
  nssfNumber?: string | null;
  shaNumber?: string | null;
  branchId?: string | null;
  departmentId?: string | null;
  roleId?: string | null;
  status?: EmployeePayrollStatus | string | null;
};

export type PayrollEarningInput = {
  kind: PayItemKind;
  code?: string | null;
  label: string;
  amount: DecimalInput;
  taxable?: boolean;
  pensionable?: boolean;
  cash?: boolean;
  metadata?: Record<string, unknown>;
};

export type PayrollDeductionInput = {
  kind: PayrollDeductionKind;
  code?: string | null;
  label: string;
  amount: DecimalInput;
  preTax?: boolean;
  metadata?: Record<string, unknown>;
};

export type EmployerContributionInput = {
  kind: EmployerContributionKind;
  code?: string | null;
  label: string;
  amount: DecimalInput;
  metadata?: Record<string, unknown>;
};

export type PayrollCalculationInput = {
  tenantId: string;
  employeeId: string;
  currency?: PayrollCurrency;
  basicPay: DecimalInput;
  allowances?: PayrollEarningInput[];
  benefits?: PayrollEarningInput[];
  overtime?: PayrollEarningInput[];
  bonuses?: PayrollEarningInput[];
  commissions?: PayrollEarningInput[];
  reimbursements?: PayrollEarningInput[];
  manualDeductions?: PayrollDeductionInput[];
  pensionEmployeeContribution?: DecimalInput;
  pensionEmployerContribution?: DecimalInput;
  applyPaye?: boolean;
  applyNssf?: boolean;
  applySha?: boolean;
  applyHousingLevy?: boolean;
  applyNita?: boolean;
  residentForTax?: boolean;
  disabledExemptionAmount?: DecimalInput;
  insuranceReliefAmount?: DecimalInput;
  metadata?: Record<string, unknown>;
};

export type StatutoryBreakdown = {
  taxablePay: Prisma.Decimal;
  pensionablePay: Prisma.Decimal;
  grossPay: Prisma.Decimal;

  payeGrossTax: Prisma.Decimal;
  personalRelief: Prisma.Decimal;
  insuranceRelief: Prisma.Decimal;
  paye: Prisma.Decimal;

  nssfTier1Employee: Prisma.Decimal;
  nssfTier2Employee: Prisma.Decimal;
  nssfEmployee: Prisma.Decimal;
  nssfTier1Employer: Prisma.Decimal;
  nssfTier2Employer: Prisma.Decimal;
  nssfEmployer: Prisma.Decimal;

  sha: Prisma.Decimal;

  housingLevyEmployee: Prisma.Decimal;
  housingLevyEmployer: Prisma.Decimal;

  nitaEmployer: Prisma.Decimal;

  totalEmployeeStatutoryDeductions: Prisma.Decimal;
  totalEmployerContributions: Prisma.Decimal;

  appliedRates: Record<string, string>;
};

export type PayrollCalculationResult = {
  tenantId: string;
  employeeId: string;
  currency: PayrollCurrency;

  basicPay: Prisma.Decimal;
  grossPay: Prisma.Decimal;
  taxablePay: Prisma.Decimal;
  pensionablePay: Prisma.Decimal;

  earnings: PayrollEarningInput[];
  manualDeductions: PayrollDeductionInput[];
  employerContributions: EmployerContributionInput[];

  statutory: StatutoryBreakdown;

  totalEarnings: Prisma.Decimal;
  totalTaxableEarnings: Prisma.Decimal;
  totalManualDeductions: Prisma.Decimal;
  totalDeductions: Prisma.Decimal;
  netPay: Prisma.Decimal;
  employerCost: Prisma.Decimal;

  metadata?: Record<string, unknown>;
};

export type CreatePayrollBatchInput = PayrollActor &
  PayrollPeriod & {
    title?: string | null;
    description?: string | null;
    currency?: PayrollCurrency;
    employeeIds?: string[];
    branchId?: string | null;
    departmentId?: string | null;
    metadata?: Record<string, unknown>;
  };

export type CreatePayrollRecordInput = PayrollCalculationInput & {
  payrollBatchId?: string | null;
  periodStart: Date;
  periodEnd: Date;
  paymentDate?: Date | null;
  createdById?: string | null;
  branchId?: string | null;
  departmentId?: string | null;
};

export type PayrollBatchListInput = {
  tenantId: string;
  status?: PayrollBatchStatus | string;
  year?: number;
  month?: number;
  branchId?: string;
  departmentId?: string;
  take?: number;
  skip?: number;
};

export type PayrollRecordListInput = {
  tenantId: string;
  payrollBatchId?: string;
  employeeId?: string;
  status?: PayrollRecordStatus | string;
  year?: number;
  month?: number;
  take?: number;
  skip?: number;
};

export type PayrollBatchSummary = {
  payrollBatchId: string;
  tenantId: string;
  status: PayrollBatchStatus | string;
  employeeCount: number;
  grossPay: Prisma.Decimal;
  taxablePay: Prisma.Decimal;
  paye: Prisma.Decimal;
  nssfEmployee: Prisma.Decimal;
  sha: Prisma.Decimal;
  housingLevyEmployee: Prisma.Decimal;
  totalDeductions: Prisma.Decimal;
  netPay: Prisma.Decimal;
  employerCost: Prisma.Decimal;
};

export const PAYROLL_DEFAULTS = {
  currency: 'KES',
  maxPayrollPageSize: 100,
  maxBatchEmployees: 1000,
  defaultFrequency: 'MONTHLY',
  defaultPaymentDay: 28,
} as const;
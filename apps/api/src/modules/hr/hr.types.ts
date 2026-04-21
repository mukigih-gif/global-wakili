// apps/api/src/modules/hr/hr.types.ts

import { Prisma } from '@global-wakili/database';

export type DecimalInput = string | number | Prisma.Decimal;

export type HrActor = {
  tenantId: string;
  userId: string;
  branchId?: string | null;
  permissions?: string[];
};

export type EmployeeStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'ON_PROBATION'
  | 'ON_LEAVE'
  | 'SUSPENDED'
  | 'TERMINATED'
  | 'INACTIVE';

export type EmploymentType =
  | 'PERMANENT'
  | 'FIXED_TERM'
  | 'PROBATION'
  | 'CASUAL'
  | 'CONSULTANT'
  | 'INTERN'
  | 'SECONDMENT'
  | 'OTHER';

export type EmploymentContractStatus =
  | 'DRAFT'
  | 'PENDING_SIGNATURE'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'TERMINATED'
  | 'SUPERSEDED'
  | 'CANCELLED';

export type EmployeeGender =
  | 'MALE'
  | 'FEMALE'
  | 'OTHER'
  | 'UNDISCLOSED';

export type EmployeeMaritalStatus =
  | 'SINGLE'
  | 'MARRIED'
  | 'DIVORCED'
  | 'WIDOWED'
  | 'UNDISCLOSED';

export type DepartmentStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export type CreateDepartmentInput = HrActor & {
  name: string;
  code?: string | null;
  description?: string | null;
  parentDepartmentId?: string | null;
  managerEmployeeId?: string | null;
  branchId?: string | null;
  costCenterCode?: string | null;
  metadata?: Record<string, unknown>;
};

export type UpdateDepartmentInput = HrActor & {
  departmentId: string;
  name?: string;
  code?: string | null;
  description?: string | null;
  parentDepartmentId?: string | null;
  managerEmployeeId?: string | null;
  branchId?: string | null;
  costCenterCode?: string | null;
  status?: DepartmentStatus;
  metadata?: Record<string, unknown>;
};

export type DepartmentListInput = {
  tenantId: string;
  branchId?: string | null;
  status?: DepartmentStatus | string;
  search?: string;
  take?: number;
  skip?: number;
};

export type CreateEmployeeInput = HrActor & {
  staffNumber?: string | null;
  userId?: string | null;

  firstName: string;
  middleName?: string | null;
  lastName: string;
  displayName?: string | null;

  email?: string | null;
  phone?: string | null;
  personalEmail?: string | null;

  gender?: EmployeeGender | string | null;
  maritalStatus?: EmployeeMaritalStatus | string | null;
  dateOfBirth?: Date | null;

  nationalId?: string | null;
  passportNumber?: string | null;
  kraPin?: string | null;
  nssfNumber?: string | null;
  shaNumber?: string | null;
  nhifNumber?: string | null;

  branchId?: string | null;
  departmentId?: string | null;
  roleId?: string | null;
  jobTitle?: string | null;
  employmentType?: EmploymentType | string;
  status?: EmployeeStatus | string;

  startDate?: Date | null;
  probationEndDate?: Date | null;
  reportingManagerId?: string | null;

  basicPay?: DecimalInput | null;
  salary?: DecimalInput | null;
  currency?: string | null;
  payrollEligible?: boolean;

  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelationship?: string | null;

  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  county?: string | null;
  country?: string | null;
  postalCode?: string | null;

  metadata?: Record<string, unknown>;
};

export type UpdateEmployeeInput = HrActor & {
  employeeId: string;
} & Partial<Omit<CreateEmployeeInput, keyof HrActor>>;

export type EmployeeListInput = {
  tenantId: string;
  branchId?: string | null;
  departmentId?: string | null;
  status?: EmployeeStatus | string;
  employmentType?: EmploymentType | string;
  payrollEligible?: boolean;
  search?: string;
  take?: number;
  skip?: number;
};

export type EmployeeStatusChangeInput = HrActor & {
  employeeId: string;
  status: EmployeeStatus;
  reason: string;
  effectiveDate?: Date | null;
  metadata?: Record<string, unknown>;
};

export type TerminateEmployeeInput = HrActor & {
  employeeId: string;
  reason: string;
  terminationDate: Date;
  eligibleForRehire?: boolean;
  finalPayNotes?: string | null;
  metadata?: Record<string, unknown>;
};

export type CreateEmployeeContractInput = HrActor & {
  employeeId: string;
  contractNumber?: string | null;
  title: string;
  employmentType: EmploymentType | string;
  status?: EmploymentContractStatus | string;
  startDate: Date;
  endDate?: Date | null;
  probationEndDate?: Date | null;

  jobTitle?: string | null;
  departmentId?: string | null;
  branchId?: string | null;
  reportingManagerId?: string | null;

  basicPay?: DecimalInput | null;
  currency?: string | null;
  workingHoursPerWeek?: DecimalInput | null;
  leaveDaysPerYear?: DecimalInput | null;

  noticePeriodDays?: number | null;
  confidentialityRequired?: boolean;
  nonCompeteRequired?: boolean;

  documentId?: string | null;
  signedByEmployeeAt?: Date | null;
  signedByEmployerAt?: Date | null;

  terms?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type UpdateEmployeeContractInput = HrActor & {
  contractId: string;
} & Partial<Omit<CreateEmployeeContractInput, keyof HrActor | 'employeeId'>>;

export type EmployeeContractListInput = {
  tenantId: string;
  employeeId?: string;
  status?: EmploymentContractStatus | string;
  employmentType?: EmploymentType | string;
  take?: number;
  skip?: number;
};

export type EmployeeLifecycleEvent = {
  action:
    | 'CREATED'
    | 'UPDATED'
    | 'STATUS_CHANGED'
    | 'TERMINATED'
    | 'DEPARTMENT_ASSIGNED'
    | 'CONTRACT_CREATED'
    | 'CONTRACT_UPDATED'
    | 'CONTRACT_ACTIVATED'
    | 'CONTRACT_TERMINATED';
  actorId: string;
  reason?: string | null;
  effectiveDate?: string | null;
  at: string;
  metadata?: Record<string, unknown>;
};

export const HR_DEFAULTS = {
  country: 'Kenya',
  currency: 'KES',
  maxPageSize: 100,
  defaultEmployeeStatus: 'ACTIVE',
  defaultEmploymentType: 'PERMANENT',
  defaultContractStatus: 'DRAFT',
  defaultLeaveDaysPerYear: '21',
  defaultWorkingHoursPerWeek: '45',
} as const;
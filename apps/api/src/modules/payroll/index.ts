// apps/api/src/modules/payroll/index.ts

export * from './payroll.types';
export * from './payroll.validators';
export * from './payroll-permission.map';

export * from './StatutoryService';
export * from './PayrollService';
export * from './PayrollBatchService';
export * from './PayrollApprovalService';
export * from './PayrollPostingService';
export * from './PayslipService';
export * from './payroll-record.service';
export * from './statutory-filing.service';
export * from './LeaveService';
export * from './BenefitsService';
export * from './CommissionService';
export * from './P9ReportService';
export * from './P10ReportService';
export * from './payroll.dashboard';

export * from './payroll.controller';

export { default as StatutoryService } from './StatutoryService';
export { default as PayrollService } from './PayrollService';
export { default as PayrollBatchService } from './PayrollBatchService';
export { default as PayrollApprovalService } from './PayrollApprovalService';
export { default as PayrollPostingService } from './PayrollPostingService';
export { default as PayslipService } from './PayslipService';
export { default as PayrollRecordService } from './payroll-record.service';
export { default as StatutoryFilingService } from './statutory-filing.service';
export { default as LeaveService } from './LeaveService';
export { default as BenefitsService } from './BenefitsService';
export { default as CommissionService } from './CommissionService';
export { default as P9ReportService } from './P9ReportService';
export { default as P10ReportService } from './P10ReportService';
export { default as PayrollDashboardService } from './payroll.dashboard';

export { default as payrollRoutes } from './payroll.routes';
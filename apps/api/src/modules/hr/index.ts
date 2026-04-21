// apps/api/src/modules/hr/index.ts

export * from './hr.types';
export * from './hr.validators';
export * from './hr-permission.map';

export * from './employee.service';
export * from './department.service';
export * from './employee-contract.service';
export * from './leave-policy.service';
export * from './attendance.service';
export * from './performance.service';
export * from './disciplinary.service';
export * from './hr-document.service';
export * from './hr-dashboard.service';

export * from './hr.controller';

export { default as EmployeeService } from './employee.service';
export { default as DepartmentService } from './department.service';
export { default as EmployeeContractService } from './employee-contract.service';
export { default as LeavePolicyService } from './leave-policy.service';
export { default as AttendanceService } from './attendance.service';
export { default as PerformanceService } from './performance.service';
export { default as DisciplinaryService } from './disciplinary.service';
export { default as HrDocumentService } from './hr-document.service';
export { default as HrDashboardService } from './hr-dashboard.service';

export { default as hrRoutes } from './hr.routes';
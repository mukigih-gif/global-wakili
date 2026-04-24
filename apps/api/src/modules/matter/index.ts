// apps/api/src/modules/matter/index.ts

export * from './matter.types';
export * from './matter.validators';

export * from './MatterService';
export * from './MatterOnboardingService';
export * from './MatterConflictService';
export * from './MatterWorkflowService';
export * from './MatterAuditService';
export * from './MatterQueryService';
export * from './MatterKYCService';

export * from './CommissionService';

export * from './TimeTrackingService';
export * from './TimerService';
export * from './TimeApprovalService';
export * from './RateCardService';
export * from './WriteOffService';

export * from './MatterProfitabilityService';

export * from './CourtService';
export * from './court-hearing.service';
export * from './statute-limit.service';

export * from './MatterDashboardService';
export * from './matter.dashboard';

export * from './matter.controller';
export * from './matter.dashboard.controller';

export { default as matterRoutes } from './matter.routes';
export type PermissionDefinition = {
  resource: string;
  action: string;
  description: string;
};

function define(resource: string, action: string, description: string): PermissionDefinition {
  return {
    resource: resource.trim().toLowerCase(),
    action: action.trim().toLowerCase(),
    description,
  };
}

export const PERMISSIONS = {
  finance: {
    viewDashboard: define('finance', 'view_dashboard', 'View finance dashboard'),

    viewAccount: define('finance', 'view_account', 'View chart of accounts'),
    createAccount: define('finance', 'create_account', 'Create chart of accounts'),
    updateAccount: define('finance', 'update_account', 'Update chart of accounts'),

    viewJournal: define('finance', 'view_journal', 'View journal entries'),
    createJournal: define('finance', 'create_journal', 'Create journal entries'),
    postJournal: define('finance', 'post_journal', 'Post journal entries'),
    approveJournal: define('finance', 'approve_journal', 'Approve journal entries'),
    reverseJournal: define('finance', 'reverse_journal', 'Reverse journal entries'),

    viewReports: define('finance', 'view_reports', 'View finance reports'),
    exportReport: define('finance', 'export_report', 'Export finance reports'),

    viewTrialBalance: define('finance', 'view_trial_balance', 'View trial balance'),
    viewBalanceSheet: define('finance', 'view_balance_sheet', 'View balance sheet'),
    viewCashflow: define('finance', 'view_cashflow', 'View cashflow reports'),
    viewStatement: define('finance', 'view_statement', 'View finance statements'),

    viewPeriod: define('finance', 'view_period', 'View accounting periods'),
    closePeriod: define('finance', 'close_period', 'Close accounting periods'),

    runReconciliation: define('finance', 'run_reconciliation', 'Run finance reconciliations'),
    viewReconciliation: define('finance', 'view_reconciliation', 'View finance reconciliations'),

    fiscalizeEtims: define('finance', 'fiscalize_etims', 'Fiscalize invoices through eTIMS'),
    viewTax: define('finance', 'view_tax', 'View finance tax records and reports'),
    manageTax: define('finance', 'manage_tax', 'Manage finance tax records and filings'),
  },

  queues: {
    createJob: define('queues', 'create_job', 'Create queue jobs'),
    enqueueJob: define('queues', 'enqueue_job', 'Enqueue queue jobs'),
    viewJob: define('queues', 'view_job', 'View queue jobs'),
    searchJobs: define('queues', 'search_jobs', 'Search queue jobs'),
    manageJobs: define('queues', 'manage_jobs', 'Manage queue job state'),
    retryJob: define('queues', 'retry_job', 'Retry queue jobs'),
    viewDashboard: define('queues', 'view_dashboard', 'View queue dashboard'),
    viewReports: define('queues', 'view_reports', 'View queue reports'),
  },

  approval: {
    createRequest: define('approval', 'create_request', 'Create approval requests'),
    viewRequest: define('approval', 'view_request', 'View approval requests'),
    searchRequests: define('approval', 'search_requests', 'Search approval requests'),
    approveRequest: define('approval', 'approve_request', 'Approve requests'),
    rejectRequest: define('approval', 'reject_request', 'Reject requests'),
    requestChanges: define('approval', 'request_changes', 'Request changes on approval requests'),
    escalateRequest: define('approval', 'escalate_request', 'Escalate approval requests'),
    delegateRequest: define('approval', 'delegate_request', 'Delegate approval requests'),
    reassignRequest: define('approval', 'reassign_request', 'Reassign approval requests'),
    cancelRequest: define('approval', 'cancel_request', 'Cancel approval requests'),
    expireRequest: define('approval', 'expire_request', 'Expire overdue approval requests'),
    viewDashboard: define('approval', 'view_dashboard', 'View approval dashboard'),
  },

  ai: {
    viewHub: define('ai', 'view_hub', 'View AI hub and capabilities'),
    viewUsage: define('ai', 'view_usage', 'View AI usage logs and artifacts'),
    manageProviders: define('ai', 'manage_providers', 'Manage AI provider configuration'),
    reviewOutputs: define('ai', 'review_outputs', 'Review AI-generated outputs'),
    executeLegalResearch: define('ai', 'execute_legal_research', 'Execute legal research AI workflows'),
    executeDocumentAnalysis: define('ai', 'execute_document_analysis', 'Execute document analysis AI workflows'),
    executeContractReview: define('ai', 'execute_contract_review', 'Execute contract review AI workflows'),
    executeMatterRisk: define('ai', 'execute_matter_risk', 'Execute matter risk AI workflows'),
    executeDeadlineIntelligence: define('ai', 'execute_deadline_intelligence', 'Execute deadline intelligence AI workflows'),
    executeBillingInsights: define('ai', 'execute_billing_insights', 'Execute billing insight AI workflows'),
    executeTrustComplianceAlerts: define('ai', 'execute_trust_compliance_alerts', 'Execute trust and compliance AI alert workflows'),
    executeClientIntakeAssistant: define('ai', 'execute_client_intake_assistant', 'Execute client intake assistant AI workflows'),
    executeDraftingAssistant: define('ai', 'execute_drafting_assistant', 'Execute drafting assistant AI workflows'),
    executeKnowledgeBase: define('ai', 'execute_knowledge_base', 'Execute AI knowledge-base workflows'),
  },

  billing: {
    viewInvoice: define('billing', 'view_invoice', 'View billing invoices'),
    createInvoice: define('billing', 'create_invoice', 'Create billing invoices'),
    updateInvoice: define('billing', 'update_invoice', 'Update billing invoices'),
    cancelInvoice: define('billing', 'cancel_invoice', 'Cancel billing invoices'),
    createProforma: define('billing', 'create_proforma', 'Create proforma invoices'),
    convertProforma: define('billing', 'convert_proforma', 'Convert proforma invoices to invoices'),
    createCreditNote: define('billing', 'create_credit_note', 'Create credit notes'),
    approveCreditNote: define('billing', 'approve_credit_note', 'Approve credit notes'),
    manageRetainer: define('billing', 'manage_retainer', 'Manage retainers'),
    viewDashboard: define('billing', 'view_dashboard', 'View billing dashboard'),
    sendReminder: define('billing', 'send_reminder', 'Send billing payment reminders'),
    exportBilling: define('billing', 'export_billing', 'Export billing data'),
    syncEtims: define('billing', 'sync_etims', 'Manually sync invoices to KRA eTIMS'),
    bypassVat: define('billing', 'bypass_vat', 'Allow privileged VAT treatment override'),
    overrideWht: define('billing', 'override_wht', 'Override withholding tax treatment'),
    voidFiscalInvoice: define(
      'billing',
      'void_fiscal_invoice',
      'Void fiscalized invoices through controlled credit-note workflow',),
  },
 
 trust: {
    createTransaction: define('trust', 'create_transaction', 'Create trust transactions'),
    transferToOffice: define('trust', 'transfer_to_office', 'Transfer trust funds to office'),
    postInterest: define('trust', 'post_interest', 'Post trust interest'),
    viewStatement: define('trust', 'view_statement', 'View trust statements'),
    viewDashboard: define('trust', 'view_dashboard', 'View trust dashboard'),
    viewViolations: define('trust', 'view_violations', 'View trust violations'),
    viewReconciliation: define('trust', 'view_reconciliation', 'View trust reconciliations'),
    recordReconciliation: define('trust', 'record_reconciliation', 'Record trust reconciliations'),
    runThreeWayReconciliation: define(
      'trust',
      'run_three_way_reconciliation',
      'Run trust three-way reconciliation',
    ),
    viewAlerts: define('trust', 'view_alerts', 'View trust alerts'),
    emitAlerts: define('trust', 'emit_alerts', 'Emit trust alerts'),
  },

  procurement: {
    createVendor: define('procurement', 'create_vendor', 'Create vendors'),
    updateVendor: define('procurement', 'update_vendor', 'Update vendors'),
    viewVendor: define('procurement', 'view_vendor', 'View vendors'),
    createBill: define('procurement', 'create_bill', 'Create vendor bills'),
    viewBill: define('procurement', 'view_bill', 'View vendor bills'),
    submitBill: define('procurement', 'submit_bill', 'Submit vendor bills for approval'),
    approveBill: define('procurement', 'approve_bill', 'Approve vendor bills'),
    rejectBill: define('procurement', 'reject_bill', 'Reject vendor bills'),
    payBill: define('procurement', 'pay_bill', 'Pay vendor bills'),
    viewDashboard: define('procurement', 'view_dashboard', 'View procurement dashboard'),
  },

  payroll: {
    // Legacy coarse keys (retained; granted via { module: 'payroll' }).
    viewPayroll: define('payroll', 'view_payroll', 'View payroll'),
    generatePayroll: define('payroll', 'generate_payroll', 'Generate payroll'),
    approvePayroll: define('payroll', 'approve_payroll', 'Approve payroll'),
    exportPayslip: define('payroll', 'export_payslip', 'Export payslips'),
    // FINDING-007-011 step (b): granular keys mirroring payroll-permission.map.ts.
    viewDashboard: define('payroll', 'view_dashboard', 'View payroll dashboard'),
    viewBatch: define('payroll', 'view_batch', 'View payroll batches'),
    createBatch: define('payroll', 'create_batch', 'Create payroll batches'),
    submitBatch: define('payroll', 'submit_batch', 'Submit payroll batches for approval'),
    approveBatch: define('payroll', 'approve_batch', 'Approve payroll batches'),
    rejectBatch: define('payroll', 'reject_batch', 'Reject payroll batches'),
    cancelBatch: define('payroll', 'cancel_batch', 'Cancel payroll batches'),
    postBatch: define('payroll', 'post_batch', 'Post payroll batches to the ledger'),
    viewRecord: define('payroll', 'view_record', 'View payroll records'),
    createRecord: define('payroll', 'create_record', 'Create payroll records'),
    recalculateRecord: define('payroll', 'recalculate_record', 'Recalculate payroll records'),
    cancelRecord: define('payroll', 'cancel_record', 'Cancel payroll records'),
    viewPayslip: define('payroll', 'view_payslip', 'View payslips'),
    generatePayslip: define('payroll', 'generate_payslip', 'Generate payslips'),
    publishPayslip: define('payroll', 'publish_payslip', 'Publish payslips'),
    revokePayslip: define('payroll', 'revoke_payslip', 'Revoke payslips'),
    viewStatutory: define('payroll', 'view_statutory', 'View statutory deductions and filings'),
    createStatutoryFiling: define('payroll', 'create_statutory_filing', 'Create statutory filings'),
    markStatutoryFiled: define('payroll', 'mark_statutory_filed', 'Mark statutory filings as filed'),
    viewReports: define('payroll', 'view_reports', 'View payroll reports'),
    exportReports: define('payroll', 'export_reports', 'Export payroll reports'),
  },

  payments: {
    viewReceipt: define('payments', 'view_receipt', 'View payment receipts'),
    createReceipt: define('payments', 'create_receipt', 'Create payment receipts'),
    allocatePayment: define('payments', 'allocate_payment', 'Allocate payments to invoices'),
    reverseReceipt: define('payments', 'reverse_receipt', 'Reverse payment receipts'),
    viewDashboard: define('payments', 'view_dashboard', 'View payments dashboard'),
    exportPayments: define('payments', 'export_payments', 'Export payments data'),
    manageOverpayment: define('payments', 'manage_overpayment', 'Manage payment overpayments'),
  },

  hr: {
    viewDashboard: define('hr', 'view_dashboard', 'View HR dashboard'),
    viewEmployee: define('hr', 'view_employee', 'View employees'),
    createEmployee: define('hr', 'create_employee', 'Create employees'),
    updateEmployee: define('hr', 'update_employee', 'Update employees'),
    changeEmployeeStatus: define('hr', 'change_employee_status', 'Change employee status'),
    terminateEmployee: define('hr', 'terminate_employee', 'Terminate employees'),
    viewDepartment: define('hr', 'view_department', 'View departments'),
    createDepartment: define('hr', 'create_department', 'Create departments'),
    updateDepartment: define('hr', 'update_department', 'Update departments'),
    archiveDepartment: define('hr', 'archive_department', 'Archive departments'),
    viewContract: define('hr', 'view_contract', 'View employment contracts'),
    createContract: define('hr', 'create_contract', 'Create employment contracts'),
    updateContract: define('hr', 'update_contract', 'Update employment contracts'),
    activateContract: define('hr', 'activate_contract', 'Activate employment contracts'),
    terminateContract: define('hr', 'terminate_contract', 'Terminate employment contracts'),
    viewLeavePolicy: define('hr', 'view_leave_policy', 'View leave policies'),
    manageLeavePolicy: define('hr', 'manage_leave_policy', 'Manage leave policies'),
    accrueLeave: define('hr', 'accrue_leave', 'Accrue employee leave'),
    viewAttendance: define('hr', 'view_attendance', 'View attendance records'),
    clockAttendance: define('hr', 'clock_attendance', 'Clock attendance'),
    manageAttendance: define('hr', 'manage_attendance', 'Manage attendance records'),
    manageGeoFence: define('hr', 'manage_geofence', 'Manage attendance geo-fences'),
    viewPerformance: define('hr', 'view_performance', 'View performance reviews'),
    managePerformance: define('hr', 'manage_performance', 'Manage performance reviews'),
    submitPerformance: define('hr', 'submit_performance', 'Submit performance self-reviews'),
    viewDisciplinary: define('hr', 'view_disciplinary', 'View disciplinary cases'),
    manageDisciplinary: define('hr', 'manage_disciplinary', 'Manage disciplinary cases'),
    viewDocument: define('hr', 'view_document', 'View HR documents'),
    createDocument: define('hr', 'create_document', 'Create HR documents'),
    requestSignature: define('hr', 'request_signature', 'Request HR document signatures'),
    signDocument: define('hr', 'sign_document', 'Sign HR documents'),
    revokeDocument: define('hr', 'revoke_document', 'Revoke HR documents'),
  },

  client: {
    createClient: define('client', 'create_client', 'Create clients'),
    updateClient: define('client', 'update_client', 'Update clients'),
    viewClient: define('client', 'view_client', 'View clients'),
    onboardClient: define('client', 'onboard_client', 'Run client onboarding'),
    evaluateKyc: define('client', 'evaluate_kyc', 'Evaluate client KYC'),
    runPepCheck: define('client', 'run_pep_check', 'Run client PEP screening'),
    runSanctionsCheck: define('client', 'run_sanctions_check', 'Run client sanctions screening'),
    assessRisk: define('client', 'assess_risk', 'Assess client AML risk'),
    viewLedger: define('client', 'view_ledger', 'View client ledger'),
    viewDashboard: define('client', 'view_dashboard', 'View client dashboard'),
    viewPortal: define('client', 'view_portal', 'View client portal data'),
  },

  matter: {
    createMatter: define('matter', 'create_matter', 'Create matters'),
    updateMatter: define('matter', 'update_matter', 'Update matters'),
    viewMatter: define('matter', 'view_matter', 'View matters'),
    onboardMatter: define('matter', 'onboard_matter', 'Run matter onboarding'),
    runConflictCheck: define('matter', 'run_conflict_check', 'Run matter conflict checks'),
    viewDashboard: define('matter', 'view_dashboard', 'View matter dashboard'),
    viewPortfolioSummary: define('matter', 'view_portfolio_summary', 'View matter portfolio summary'),
    resolveWorkflow: define('matter', 'resolve_workflow', 'Resolve matter workflow templates'),
    evaluateKyc: define('matter', 'evaluate_kyc', 'Evaluate matter KYC'),
    viewCommission: define('matter', 'view_commission', 'View matter commissions'),
    viewOriginatorPayout: define(
      'matter',
      'view_originator_payout',
      'View originator portfolio payouts',
    ),
    createTimeEntry: define('matter', 'create_time_entry', 'Create time entries'),
    approveTimeEntry: define('matter', 'approve_time_entry', 'Approve time entries'),
    manageRateCard: define('matter', 'manage_rate_card', 'Manage matter rate cards'),
    recordWriteOff: define('matter', 'record_write_off', 'Record matter write-offs'),
    viewProfitability: define('matter', 'view_profitability', 'View matter profitability'),
    manageCourtSchedule: define(
      'matter',
      'manage_court_schedule',
      'Manage court hearings and schedules',
    ),
    manageLimitation: define(
      'matter',
      'manage_limitation',
      'Manage statute limitation tracking',
    ),
  },

 document: {
  uploadDocument: define('document', 'upload_document', 'Upload documents'),
  viewDocument: define('document', 'view_document', 'View documents'),
  downloadDocument: define('document', 'download_document', 'Download documents'),
  searchDocument: define('document', 'search_document', 'Search documents'),
  archiveDocument: define('document', 'archive_document', 'Archive documents'),
  restoreDocument: define('document', 'restore_document', 'Restore archived documents'),
  viewDashboard: define('document', 'view_dashboard', 'View document dashboard'),
  manageTemplates: define('document', 'manage_templates', 'Manage document templates'),
  launchExternalEditor: define(
    'document',
    'launch_external_editor',
    'Launch Office 365 or Google Workspace editing sessions',
  ),
  createContract: define('document', 'create_contract', 'Create contracts'),
  updateContract: define('document', 'update_contract', 'Update contracts'),
  viewContract: define('document', 'view_contract', 'View contracts'),
  versionContract: define('document', 'version_contract', 'Create contract versions'),
},

  calendar: {
    createEvent: define('calendar', 'create_event', 'Create calendar events'),
    updateEvent: define('calendar', 'update_event', 'Update calendar events'),
    viewEvent: define('calendar', 'view_event', 'View calendar events'),
    deleteEvent: define('calendar', 'delete_event', 'Delete calendar events'),
    manageReminder: define('calendar', 'manage_reminder', 'Manage calendar reminders'),
    syncExternalCalendar: define('calendar', 'sync_external_calendar', 'Sync external calendars'),
    manageSubscription: define('calendar', 'manage_subscription', 'Manage calendar subscriptions'),
    manageAttendees: define('calendar', 'manage_attendees', 'Manage event attendees'),
    checkAvailability: define('calendar', 'check_availability', 'Check calendar availability'),
    viewDashboard: define('calendar', 'view_dashboard', 'View calendar dashboard'),
  },

  task: {
    createTask: define('task', 'create_task', 'Create tasks'),
    updateTask: define('task', 'update_task', 'Update tasks'),
    viewTask: define('task', 'view_task', 'View tasks'),
    searchTask: define('task', 'search_task', 'Search tasks'),
    assignTask: define('task', 'assign_task', 'Assign tasks'),
    completeTask: define('task', 'complete_task', 'Complete tasks'),
    cancelTask: define('task', 'cancel_task', 'Cancel tasks'),
    deleteTask: define('task', 'delete_task', 'Delete tasks'),
    commentTask: define('task', 'comment_task', 'Add task comments and notes'),
    viewDashboard: define('task', 'view_dashboard', 'View task dashboard'),
    manageReminders: define('task', 'manage_reminders', 'Manage task reminders'),
    linkCalendar: define('task', 'link_calendar', 'Link tasks to calendar events'),
  },

  court: {
    createHearing: define('court', 'create_hearing', 'Create court hearings'),
    updateHearing: define('court', 'update_hearing', 'Update court hearings'),
    viewHearing: define('court', 'view_hearing', 'View court hearings'),
    searchHearing: define('court', 'search_hearing', 'Search court hearings'),
    manageCalendarLink: define('court', 'manage_calendar_link', 'Manage court calendar linkage'),
    recordOutcome: define('court', 'record_outcome', 'Record court hearing outcomes'),
    viewDashboard: define('court', 'view_dashboard', 'View court dashboard'),
    manageFiling: define('court', 'manage_filing', 'Manage court filings'),
    manageHandoff: define('court', 'manage_handoff', 'Manage court handoffs'),
  },

  reception: {
    createVisitorLog: define('reception', 'create_visitor_log', 'Create visitor and walk-in logs'),
    createCallLog: define('reception', 'create_call_log', 'Create reception call logs'),
    receiveFile: define('reception', 'receive_file', 'Receive and log delivered files or documents'),
    viewLog: define('reception', 'view_log', 'View reception logs'),
    searchLog: define('reception', 'search_log', 'Search reception logs'),
    viewDashboard: define('reception', 'view_dashboard', 'View reception dashboard'),
    manageHandoff: define('reception', 'manage_handoff', 'Manage reception handoffs'),
  },

  compliance: {
    runClientReview: define('compliance', 'run_client_review', 'Run client AML/KYC compliance review'),
    viewClientChecks: define('compliance', 'view_client_checks', 'View client compliance check history'),
    createReport: define('compliance', 'create_report', 'Create compliance and AML reports'),
    updateReport: define('compliance', 'update_report', 'Update compliance and AML reports'),
    viewReport: define('compliance', 'view_report', 'View compliance and AML reports'),
    searchReport: define('compliance', 'search_report', 'Search compliance and AML reports'),
    submitGoaml: define('compliance', 'submit_goaml', 'Submit STR reports to goAML'),
    syncGoaml: define('compliance', 'sync_goaml', 'Sync goAML report status'),
    viewDashboard: define('compliance', 'view_dashboard', 'View compliance dashboard'),
    viewCalendar: define('compliance', 'view_calendar', 'View compliance calendar'),
  },

  notifications: {
    sendNotification: define('notifications', 'send_notification', 'Send notifications'),
    queueNotification: define('notifications', 'queue_notification', 'Queue notifications'),
    viewNotification: define('notifications', 'view_notification', 'View notifications'),
    searchNotification: define('notifications', 'search_notification', 'Search notifications'),
    markRead: define('notifications', 'mark_read', 'Mark notifications as read'),
    viewDashboard: define('notifications', 'view_dashboard', 'View notifications dashboard'),
    viewReports: define('notifications', 'view_reports', 'View notification delivery reports'),
    manageWebhooks: define('notifications', 'manage_webhooks', 'Manage notification provider webhooks'),
  },

  integrations: {
    runBankSync: define('integrations', 'run_bank_sync', 'Run bank synchronization'),
    submitEtims: define('integrations', 'submit_etims', 'Submit eTIMS documents'),
    syncEtims: define('integrations', 'sync_etims', 'Sync eTIMS status'),
    submitGoaml: define('integrations', 'submit_goaml', 'Submit goAML reports'),
    syncGoaml: define('integrations', 'sync_goaml', 'Sync goAML status'),
    viewTax: define('integrations', 'view_tax', 'View tax dashboards and summaries'),
    sendNotification: define('integrations', 'send_notification', 'Send system notifications'),
    manageExternalDocumentEditing: define(
      'integrations',
      'manage_external_document_editing',
      'Manage Office 365 and Google Workspace document integrations',
    ),
    manageExternalCalendarSync: define(
      'integrations',
      'manage_external_calendar_sync',
      'Manage Outlook and Google calendar sync',
    ),
  },

    analytics: {
    viewOverview: define('analytics', 'view_overview', 'View analytics overview'),
    viewClientAnalytics: define('analytics', 'view_client_analytics', 'View client analytics'),
    viewMatterAnalytics: define('analytics', 'view_matter_analytics', 'View matter analytics'),
    viewBillingAnalytics: define('analytics', 'view_billing_analytics', 'View billing analytics'),
    viewTrustAnalytics: define('analytics', 'view_trust_analytics', 'View trust analytics'),
    viewProductivityAnalytics: define('analytics', 'view_productivity_analytics', 'View productivity analytics'),
    viewComplianceAnalytics: define('analytics', 'view_compliance_analytics', 'View compliance analytics'),
    viewOperationsAnalytics: define('analytics', 'view_operations_analytics', 'View operations analytics'),
    viewKpis: define('analytics', 'view_kpis', 'View analytics KPIs and persisted analytics data'),
    manageMetrics: define('analytics', 'manage_metrics', 'Create and manage analytics metrics'),
    manageSnapshots: define('analytics', 'manage_snapshots', 'Create and manage analytics snapshots'),
    manageInsights: define('analytics', 'manage_insights', 'Create and manage analytics insights'),
  },

  reporting: {
    viewOverview: define('reporting', 'view_overview', 'View reporting overview'),
    viewDefinitions: define('reporting', 'view_definitions', 'View report definitions'),
    manageDefinitions: define('reporting', 'manage_definitions', 'Manage report definitions'),
    viewDashboards: define('reporting', 'view_dashboards', 'View reporting dashboards'),
    manageDashboards: define('reporting', 'manage_dashboards', 'Manage reporting dashboards'),
    viewRuns: define('reporting', 'view_runs', 'View report runs'),
    runReports: define('reporting', 'run_reports', 'Run reports'),
    viewExports: define('reporting', 'view_exports', 'View report exports'),
    exportReports: define('reporting', 'export_reports', 'Create report exports'),
    viewSchedules: define('reporting', 'view_schedules', 'View scheduled reports'),
    manageSchedules: define('reporting', 'manage_schedules', 'Manage scheduled reports'),
    viewBIConnectors: define('reporting', 'view_bi_connectors', 'View BI connector configurations'),
    manageBIConnectors: define('reporting', 'manage_bi_connectors', 'Manage BI connector configurations'),
  },

  platform: {
    viewOverview: define('platform', 'view_overview', 'View platform overview'),
    manageUsers: define('platform', 'manage_users', 'Manage platform users and role assignment'),
    viewUsers: define('platform', 'view_users', 'View platform users and RBAC metadata'),
    manageTenantLifecycle: define('platform', 'manage_tenant_lifecycle', 'Manage tenant lifecycle and provisioning metadata'),
    viewTenantLifecycle: define('platform', 'view_tenant_lifecycle', 'View tenant lifecycle and provisioning metadata'),
    manageBilling: define('platform', 'manage_billing', 'Manage tenant subscriptions, billing, and entitlements'),
    viewBilling: define('platform', 'view_billing', 'View tenant subscriptions, billing, and entitlements'),
    manageQuotas: define('platform', 'manage_quotas', 'Manage tenant quotas and usage metrics'),
    viewQuotas: define('platform', 'view_quotas', 'View tenant quotas and usage metrics'),
    manageFlags: define('platform', 'manage_flags', 'Manage platform feature flags'),
    viewFlags: define('platform', 'view_flags', 'View platform feature flags'),
    manageSettings: define('platform', 'manage_settings', 'Manage global platform settings and config versions'),
    viewSettings: define('platform', 'view_settings', 'View global platform settings and config versions'),
    manageImpersonation: define('platform', 'manage_impersonation', 'Manage support impersonation sessions'),
    viewImpersonation: define('platform', 'view_impersonation', 'View support impersonation sessions'),
    manageIncidents: define('platform', 'manage_incidents', 'Manage incidents and maintenance windows'),
    viewIncidents: define('platform', 'view_incidents', 'View incidents and maintenance windows'),
    manageBackups: define('platform', 'manage_backups', 'Create and manage platform backup jobs'),
    viewBackups: define('platform', 'view_backups', 'View platform backup jobs'),
    viewWebhooks: define('platform', 'view_webhooks', 'View platform webhook logs'),
    manageHealth: define('platform', 'manage_health', 'Manage tenant health snapshots'),
    viewHealth: define('platform', 'view_health', 'View tenant health snapshots'),
    manageTickets: define('platform', 'manage_tickets', 'Manage platform support tickets and comments'),
    viewTickets: define('platform', 'view_tickets', 'View platform support tickets and comments'),
    manageMessaging: define('platform', 'manage_messaging', 'Manage global platform messaging'),
    viewMessaging: define('platform', 'view_messaging', 'View global platform messaging'),
    managePatches: define('platform', 'manage_patches', 'Manage platform patch deployments'),
    viewPatches: define('platform', 'view_patches', 'View platform patch deployments'),
    manageQueueOps: define('platform', 'manage_queue_ops', 'Manage queue operations from the platform control plane'),
    viewQueueOps: define('platform', 'view_queue_ops', 'View queue operations from the platform control plane'),
  },

  admin: {
    manageUsers: define('admin', 'manage_users', 'Manage users'),
    manageRoles: define('admin', 'manage_roles', 'Manage roles'),
    managePermissions: define('admin', 'manage_permissions', 'Manage permissions'),
    viewAudit: define('admin', 'view_audit', 'View audit logs'),
    manageSettings: define('admin', 'manage_settings', 'Manage tenant settings'),
  },
} as const;

export const ALL_PERMISSION_DEFINITIONS: PermissionDefinition[] = Object.values(PERMISSIONS)
  .flatMap((group) => Object.values(group));

export function permissionKey(permission: PermissionDefinition): string {
  return `${permission.resource}.${permission.action}`;
}

export function toPermissionString(permission: PermissionDefinition): string {
  return permissionKey(permission);
}

export function toPermissionStrings(permissions: PermissionDefinition[]): string[] {
  return permissions.map(toPermissionString);
}

export function listPermissionKeys(): string[] {
  return ALL_PERMISSION_DEFINITIONS.map(permissionKey);
}

export function findPermission(resource: string, action: string): PermissionDefinition | undefined {
  const normalizedResource = resource.trim().toLowerCase();
  const normalizedAction = action.trim().toLowerCase();

  return ALL_PERMISSION_DEFINITIONS.find(
    (permission) =>
      permission.resource === normalizedResource &&
      permission.action === normalizedAction,
  );
}
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
    viewStatement: define('finance', 'view_statement', 'View finance statements'),
    createJournal: define('finance', 'create_journal', 'Create journal entries'),
    approveJournal: define('finance', 'approve_journal', 'Approve journal entries'),
    reverseJournal: define('finance', 'reverse_journal', 'Reverse journal entries'),
    closePeriod: define('finance', 'close_period', 'Close accounting periods'),
    exportReport: define('finance', 'export_report', 'Export finance reports'),
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
    viewPayroll: define('payroll', 'view_payroll', 'View payroll'),
    generatePayroll: define('payroll', 'generate_payroll', 'Generate payroll'),
    approvePayroll: define('payroll', 'approve_payroll', 'Approve payroll'),
    exportPayslip: define('payroll', 'export_payslip', 'Export payslips'),
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

  reception: {
    createVisitorLog: define('reception', 'create_visitor_log', 'Create visitor and walk-in logs'),
    createCallLog: define('reception', 'create_call_log', 'Create reception call logs'),
    receiveFile: define('reception', 'receive_file', 'Receive and log delivered files or documents'),
    viewLog: define('reception', 'view_log', 'View reception logs'),
    searchLog: define('reception', 'search_log', 'Search reception logs'),
    viewDashboard: define('reception', 'view_dashboard', 'View reception dashboard'),
    manageHandoff: define('reception', 'manage_handoff', 'Manage reception handoffs'),
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
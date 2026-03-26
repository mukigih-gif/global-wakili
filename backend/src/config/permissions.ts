// src/config/permissions.ts

export type Permission = 
  | "*" 
  | "view_all_financials" | "reconcile_mpesa" | "submit_etims" | "approve_disbursements"
  | "manage_users" | "manage_inventory"
  | "view_all_matters" | "view_own_matters" | "view_boss_matters" | "view_litigation_files"
  | "create_matter" | "update_status" | "upload_court_stamps" | "upload_docs"
  | "create_invoice" | "draft_invoice" | "approve_invoice"
  | "log_time" | "log_time_for_boss" | "log_travel_expenses" | "log_office_expenses"
  | "view_calendar" | "schedule_meetings" | "generate_reports";

export const PERMISSION_MATRIX: Record<string, Permission[]> = {
  SUPER_ADMIN: ["*"],
  
  MANAGING_PARTNER: [
    "view_all_financials",
    "approve_disbursements",
    "manage_users",
    "view_all_matters",
    "approve_invoice",
    "generate_reports"
  ],

  ADVOCATE: [
    "create_matter",
    "view_own_matters",
    "upload_docs",
    "log_time",
    "create_invoice",
    "view_calendar"
  ],

  SECRETARY_PA: [
    "draft_invoice",
    "view_boss_matters",
    "schedule_meetings",
    "log_time_for_boss",
    "create_client",
    "view_calendar"
  ],

  ACCOUNTANT: [
    "reconcile_mpesa",
    "submit_etims",
    "view_all_financials",
    "generate_reports"
  ],

  CLERK: [
    "view_litigation_files",
    "upload_court_stamps",
    "log_travel_expenses",
    "view_calendar"
  ],

  OFFICE_ADMIN: [
    "manage_inventory",
    "log_office_expenses",
    "view_calendar"
  ]
};
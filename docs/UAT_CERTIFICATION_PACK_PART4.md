# GLOBAL WAKILI LEGAL ENTERPRISE
## Enterprise UAT Certification Pack — Part 4 of 4
### Walk-In Services · Reception · Tax Compliance · Settings · Platform Health · Disaster Recovery · End-to-End Scenarios · Sign-Off Matrix

---

# MODULE 50: WALK-IN CLIENTS (EXPRESS SERVICES)

## 50.1 Smoke Tests

### GW-WI-SMK-001
**Objective:** Walk-In Clients page accessible  
**Preconditions:** Firm admin authenticated  
**Steps:**
1. Navigate to `/app/reception`
2. Click "Walk-In Clients" button
3. Confirm navigation to `/app/reception/walk-ins`
4. Confirm page loads with daily summary cards

**Expected Result:** Walk-In Clients module renders  
**Pass Criteria:** Page loads; today's count and revenue cards visible  
**Risk Rating:** HIGH

---

## 50.2 Functional Tests

### GW-WI-FNC-001
**Objective:** Walk-in service recorded for Commissioner for Oaths  
**Preconditions:** Receptionist authenticated; express-services endpoint live  
**Steps:**
1. Navigate to `/app/reception/walk-ins`
2. Click "Record Service"
3. Enter: clientName = "James Mwangi", serviceType = COMMISSIONER_FOR_OATHS, amount = 500, paymentMethod = MPESA, mpesaRef = "QK4X2AB123"
4. Click "Record & Issue Receipt"
5. Confirm success toast: "Service recorded — James Mwangi"
6. Confirm daily revenue card updated (+500)
7. Confirm entry visible in today's log table

**Expected Result:** Service recorded; revenue updated; entry visible  
**Pass Criteria:** POST `/api/v1/reception/express-services` returns 201; entry in list  
**Risk Rating:** HIGH

---

### GW-WI-FNC-002
**Objective:** Walk-in service default fee pre-populated per type  
**Preconditions:** Walk-in form accessible  
**Steps:**
1. Open Record Service form
2. Select COMMISSIONER_FOR_OATHS — confirm fee pre-filled = 500
3. Select NOTARIZATION — confirm fee = 2500
4. Select QUICK_CONSULTATION — confirm fee = 3000
5. Manually override fee to 1000

**Expected Result:** Default fees pre-populate; manual override works  
**Pass Criteria:** Correct defaults per service type; override accepted  
**Risk Rating:** MEDIUM

---

### GW-WI-FNC-003
**Objective:** Daily revenue summary correct  
**Preconditions:** 5 walk-in services recorded today (3 × 500 + 2 × 3000 = KES 7,500)  
**Steps:**
1. Navigate to `/app/reception/walk-ins`
2. Confirm "Today's Revenue" card = KES 7,500.00
3. Confirm "Today's Walk-ins" = 5
4. Confirm "Avg. Per Service" = KES 1,500.00

**Expected Result:** Accurate daily summary calculations  
**Pass Criteria:** Revenue sums correct; average calculated correctly  
**Risk Rating:** HIGH

---

### GW-WI-FNC-004
**Objective:** Receipt printable for walk-in service  
**Preconditions:** Walk-in service recorded  
**Steps:**
1. Click "Receipt" on any recorded service row
2. Confirm browser print dialog opens

**Expected Result:** Print dialog triggered  
**Pass Criteria:** Print button works; receipt visible in print preview  
**Risk Rating:** LOW

---

## 50.3 Negative Tests

### GW-WI-NEG-001
**Objective:** Walk-in service without client name rejected  
**Preconditions:** Walk-in form open  
**Steps:**
1. Leave clientName field empty
2. Click Record & Issue Receipt
3. Confirm error: "Client name is required"

**Expected Result:** Validation error shown; form not submitted  
**Pass Criteria:** Required field validation enforced  
**Risk Rating:** MEDIUM

---

### GW-WI-NEG-002
**Objective:** Zero-amount service rejected  
**Preconditions:** Walk-in form open  
**Steps:**
1. Set fee to 0
2. Submit form
3. Confirm error or warning

**Expected Result:** Zero-amount rejected or warned  
**Pass Criteria:** Business rule: service fee must be > 0  
**Risk Rating:** MEDIUM

---

## 50.4 Multi-Tenant Isolation Tests

### GW-WI-MTI-001
**Objective:** Walk-in services isolated per tenant  
**Preconditions:** Tenant A and Tenant B both have walk-in records  
**Steps:**
1. Login as Tenant B
2. GET `/api/v1/reception/express-services?date=today`
3. Confirm only Tenant B's services in response

**Expected Result:** Express services tenant-isolated  
**Pass Criteria:** tenantId filter applied to all express service queries  
**Risk Rating:** CRITICAL

---

## 50.5 Audit Trail Tests

### GW-WI-AUD-001
**Objective:** Walk-in service creation audited  
**Preconditions:** Audit logging active  
**Steps:**
1. Record walk-in service
2. Query AuditLog: `WHERE action = 'EXPRESS_SERVICE_CREATED'`
3. Confirm: actorUserId, serviceType, amount, clientName, paymentMethod, tenantId

**Expected Result:** Walk-in service audit entry  
**Pass Criteria:** All service details captured in audit  
**Risk Rating:** HIGH

---

## 50.6 Performance Tests

### GW-WI-PRF-001
**Objective:** Daily walk-in list loads quickly even with 100 services  
**Preconditions:** 100 walk-in services recorded today  
**Steps:**
1. GET `/api/v1/reception/express-services?date=today&limit=100`
2. Record response time

**Expected Result:** Response < 300ms  
**Pass Criteria:** Index on (tenantId, createdAt) ensures fast daily query  
**Risk Rating:** MEDIUM

---

---

# MODULE 51: RECEPTION

## 51.1 Smoke Tests

### GW-RC2-SMK-001
**Objective:** Reception module accessible with all tabs  
**Preconditions:** Receptionist or firm admin authenticated  
**Steps:**
1. Navigate to `/app/reception`
2. Confirm 4 tabs: Visitor Log, Call Log, Documents In, Documents Out
3. Confirm "Walk-In Clients" button visible in header

**Expected Result:** Full reception module renders  
**Pass Criteria:** All tabs navigable; no 404  
**Risk Rating:** MEDIUM

---

## 51.2 Functional Tests

### GW-RC2-FNC-001
**Objective:** Visitor log entry created  
**Preconditions:** Receptionist authenticated  
**Steps:**
1. Click "Log Visitor" button
2. POST `/api/v1/reception/visitors` with `{ subject: "Visitor: John Doe", description: "Meeting with Advocate Mwangi", personMeeting: "Advocate Mwangi", isUrgent: false }`
3. Confirm HTTP 201
4. Navigate to Visitor Log tab — confirm entry visible

**Expected Result:** Visitor logged and visible  
**Pass Criteria:** Entry appears in visitor log with timestamp  
**Risk Rating:** HIGH

---

### GW-RC2-FNC-002
**Objective:** Incoming document logged and assigned  
**Preconditions:** Receptionist authenticated; matter exists  
**Steps:**
1. Click "Record Incoming Doc"
2. POST `/api/v1/reception/documents` with `{ direction: "IN", documentTitle: "Court Order — Doe v Smith", from: "Nairobi High Court", matterId, receivedAt: now }`
3. Confirm HTTP 201
4. Navigate to Documents In tab — confirm document visible with "Assign" action

**Expected Result:** Incoming document logged; assignable  
**Pass Criteria:** Document appears in Documents In; assignment workflow present  
**Risk Rating:** HIGH

---

### GW-RC2-FNC-003
**Objective:** Outgoing document logged  
**Preconditions:** Receptionist authenticated  
**Steps:**
1. Record outgoing document
2. POST `/api/v1/reception/documents` with `{ direction: "OUT", documentTitle: "Amended Plaint", to: "Alpha Advocates LLP", deliveredBy: "Dispatch Rider", matterId }`
3. Confirm entry in Documents Out tab

**Expected Result:** Outgoing document tracked  
**Pass Criteria:** Document dispatch recorded; matter linked  
**Risk Rating:** HIGH

---

---

# MODULE 52: TAX COMPLIANCE

## 52.1 Smoke Tests

### GW-TC-SMK-001
**Objective:** Tax Compliance module accessible with all 5 tabs  
**Preconditions:** Firm admin or CFO authenticated  
**Steps:**
1. Navigate to `/app/tax`
2. Confirm 5 tabs: VAT, WHT, eTIMS/KRA, Payroll Deductions, Tax Returns
3. Confirm VAT KPI cards visible: Output VAT, Input VAT, Net Payable, Unfiled

**Expected Result:** Tax module fully renders  
**Pass Criteria:** All 5 tabs accessible; KPI cards load  
**Risk Rating:** HIGH

---

## 52.2 Functional Tests

### GW-TC-FNC-001
**Objective:** Monthly VAT summary loads for selected year  
**Preconditions:** Invoices with VAT amounts exist  
**Steps:**
1. Navigate to VAT tab
2. Select year 2026
3. Confirm monthly summary table loads
4. Confirm Output VAT = sum of vatAmount from ISSUED invoices for 2026

**Expected Result:** VAT summary accurate  
**Pass Criteria:** Output VAT calculation matches invoice data  
**Risk Rating:** HIGH

---

### GW-TC-FNC-002
**Objective:** WHT certificate recorded correctly  
**Preconditions:** CFO authenticated; invoice exists  
**Steps:**
1. Navigate to WHT tab
2. Click "Record WHT Certificate"
3. Enter: certificateNumber = "WHT/2026/001234", date = today, amount = 5000, payerName = "ABC Holdings Ltd", payerPin = "P052312345J", invoiceId = existing_invoice
4. Submit
5. Confirm certificate in WHT ledger

**Expected Result:** WHT certificate recorded  
**Pass Criteria:** Certificate visible; payer PIN validated (format check)  
**Risk Rating:** HIGH

---

### GW-TC-FNC-003
**Objective:** eTIMS fiscalization works  
**Preconditions:** Invoice exists; eTIMS configured  
**Steps:**
1. Navigate to eTIMS tab
2. Find unfiscalized invoice
3. Click "Fiscalize →"
4. Confirm POST `/api/v1/finance/etims/invoices/{id}/fiscalize` called
5. Confirm `etimsReference` and `etimsReceiptNumber` populated

**Expected Result:** Invoice fiscalized with KRA reference  
**Pass Criteria:** eTIMS fields populated; invoice marked as fiscalized  
**Risk Rating:** HIGH

---

### GW-TC-FNC-004
**Objective:** Payroll deductions breakdown correct for selected period  
**Preconditions:** Payroll run completed for June 2026  
**Steps:**
1. Navigate to Payroll Deductions tab
2. Select period 2026-06
3. Confirm: PAYE, SHIF (2.75%), NSSF (6%), Housing Levy (1.5%) amounts
4. Confirm: Net = Gross - PAYE - SHIF - NSSF - HousingLevy

**Expected Result:** Correct Kenya statutory deduction breakdown  
**Pass Criteria:** Each deduction within 1% of expected amount  
**Risk Rating:** CRITICAL

---

### GW-TC-FNC-005
**Objective:** Tax Returns calendar complete  
**Preconditions:** Tax module accessible  
**Steps:**
1. Navigate to Tax Returns tab
2. Confirm 8 return types listed: VAT3, WHT, PAYE/P10, NSSF, SHIF, Housing Levy, Corp Tax, Annual Return
3. Confirm each has: description, frequency, due day, portal link
4. Click "File on portal" for VAT3 — confirm link to KRA iTax

**Expected Result:** Complete statutory tax calendar  
**Pass Criteria:** All 8 return types present; portal links correct  
**Risk Rating:** HIGH

---

## 52.3 Compliance Tests

### GW-TC-CMP-001
**Objective:** VAT return readiness verified  
**Preconditions:** Month with posted invoices  
**Steps:**
1. Run VAT summary for completed month
2. Confirm: all issued invoices have taxAmount
3. Confirm: no invoices missing taxRate or taxMode
4. Confirm: Net VAT Payable calculated correctly

**Expected Result:** VAT return data complete and correct  
**Pass Criteria:** No invoices with missing VAT data; calculation verified  
**Risk Rating:** CRITICAL

---

---

# MODULE 53: SETTINGS (COMPLETE)

## 53.1 Functional Tests — All Settings Sub-Pages

### GW-ST-FNC-001
**Objective:** All settings navigation links work  
**Preconditions:** Firm admin authenticated  
**Steps:**
1. Navigate to `/app/settings`
2. Click each of 6 cards: Users & Roles, Notifications, Security, Integrations, Billing & Subscription, Firm Settings
3. Confirm each navigates to correct sub-page without 404

**Expected Result:** All 6 settings cards navigate correctly  
**Pass Criteria:** Zero 404 errors; each sub-page renders  
**Risk Rating:** HIGH

---

### GW-ST-FNC-002
**Objective:** Integration settings show all 8 integrations  
**Preconditions:** Firm admin authenticated  
**Steps:**
1. Navigate to `/app/settings/integrations`
2. Confirm 8 integrations listed: Google Calendar, Microsoft Outlook, SendGrid, M-PESA, eTIMS, QuickBooks, Africa's Talking, Firebase
3. Confirm each shows status and "Docs" link

**Expected Result:** All integrations listed with status  
**Pass Criteria:** 8 integration cards visible; status badges correct  
**Risk Rating:** MEDIUM

---

### GW-ST-FNC-003
**Objective:** Notification preferences matrix fully functional  
**Preconditions:** Firm admin authenticated  
**Steps:**
1. Navigate to `/app/settings/notifications`
2. Confirm 10 event types × 4 channels matrix
3. Toggle "Email" for "Task Assigned to Me" ON
4. Click Save Preferences
5. Confirm preference persisted

**Expected Result:** Notification preferences saved and retrievable  
**Pass Criteria:** 40 checkboxes (10×4) all functional; save works  
**Risk Rating:** MEDIUM

---

---

# MODULE 54: PLATFORM HEALTH DASHBOARD

## 54.1 Functional Tests

### GW-PH-FNC-001
**Objective:** Platform Health page shows accurate execution status  
**Preconditions:** Super admin or firm admin authenticated  
**Steps:**
1. Navigate to `/admin/health`
2. Confirm Production Readiness Score displayed as percentage
3. Confirm all 10 Test Layers listed with PASS/WARN/PENDING status
4. Confirm all 12 Seed Modules listed with COMPLETE/PARTIAL/PENDING
5. Confirm all 8 Validation Suites listed with results

**Expected Result:** Complete execution status dashboard  
**Pass Criteria:** All sections render; statuses reflect actual completed work  
**Risk Rating:** HIGH

---

### GW-PH-FNC-002
**Objective:** Live platform health metrics display  
**Preconditions:** API and DB running  
**Steps:**
1. Navigate to `/admin/health`
2. Confirm KPI cards: API status, DB status, Tenant count, Audit log count, Matter count
3. Click Refresh button
4. Confirm metrics update

**Expected Result:** Live metrics shown; refresh works  
**Pass Criteria:** API = UP; DB = UP; counts match actual DB counts  
**Risk Rating:** HIGH

---

---

# MODULE 55: END-TO-END SCENARIOS

## 55.1 Complete Matter Lifecycle Test

### GW-E2E-001
**Objective:** Full matter lifecycle from client intake to invoice payment  
**Preconditions:** Firm admin authenticated; no existing data for this scenario  
**Steps:**
1. **Client Creation:** Create client "Beta Holdings Ltd" with KRA PIN, ID number; run conflict check
2. **Matter Opening:** Create matter "Beta Holdings — Supply Contract", link to client; run conflict check; set estimated value = KES 2,000,000
3. **Task Assignment:** Create 3 tasks (Draft contract, Review, Sign); assign to advocate
4. **Document Upload:** Upload draft contract PDF; link to matter
5. **Court Hearing:** Create hearing for 15 July 2026; confirm calendar event created
6. **Time Entry:** Log 8 hours at KES 20,000/hr = KES 160,000; approve
7. **Invoice:** Generate invoice for KES 160,000 + 16% VAT = KES 185,600
8. **Fiscalize:** Submit invoice to eTIMS; confirm reference number
9. **Payment:** Record M-PESA payment; confirm invoice status = PAID
10. **Close Matter:** Update matter status = COMPLETED; confirm audit trail

**Expected Result:** All 10 steps complete without error  
**Pass Criteria:** All entities correctly linked; audit trail continuous; invoice paid  
**Risk Rating:** CRITICAL

---

## 55.2 Trust Accounting Scenario

### GW-E2E-002
**Objective:** Trust accounting full cycle: deposit, allocate, transfer, reconcile  
**Preconditions:** Trust account, client, matter exist  
**Steps:**
1. **Deposit:** Client deposits KES 500,000 to trust account; reference = "BKRF2026001"
2. **Allocation:** Allocate KES 500,000 to matter in client trust ledger
3. **Transfer:** Transfer KES 150,000 to office account for professional fees
4. **Balance Check:** Confirm trust account balance = KES 350,000
5. **Reconciliation:** Run three-way reconciliation; confirm BALANCED
6. **Refund:** Matter closed; refund KES 350,000 to client; confirm balance = 0
7. **Audit:** Confirm all 5 transactions in audit trail

**Expected Result:** All trust operations succeed; reconciliation balanced; audit complete  
**Pass Criteria:** No negative balances at any step; three-way reconciliation passes  
**Risk Rating:** CRITICAL

---

## 55.3 Multi-Tenant Security Scenario

### GW-E2E-003
**Objective:** Prove absolute cross-tenant isolation across all modules  
**Preconditions:** Demo Law Firm and Alpha Advocates both have data  
**Steps:**
1. Login as Demo Law Firm admin
2. Note client IDs, matter IDs, invoice IDs, document IDs
3. Login as Alpha Advocates admin
4. Attempt to access all Demo Law Firm entity IDs
5. Confirm: 0 successful cross-tenant accesses

**Expected Result:** Zero cross-tenant data leakage  
**Pass Criteria:** All cross-tenant attempts return 404 or 403  
**Risk Rating:** CRITICAL

---

## 55.4 Permission Boundary Scenario

### GW-E2E-004
**Objective:** Each role can only perform permitted actions  
**Preconditions:** Users with all roles: SUPER_ADMIN, FIRM_ADMIN, MANAGING_PARTNER, PARTNER, ASSOCIATE, PUPIL, CLERK, OFFICE_ADMIN, HR, CFO, ACCOUNTANT  
**Steps:**
1. Login as CLERK — confirm: can view matters, cannot create invoices, cannot access trust
2. Login as ASSOCIATE — confirm: can create time entries, cannot approve own time, cannot manage HR
3. Login as PARTNER — confirm: can approve time entries, cannot access platform admin
4. Login as CFO — confirm: can view financial reports, cannot delete matters
5. Login as SUPER_ADMIN — confirm: can access platform admin, cannot access Tenant A's client data without tenant context

**Expected Result:** Each role correctly bounded  
**Pass Criteria:** 0 permission violations across all role tests  
**Risk Rating:** CRITICAL

---

## 55.5 Payroll Compliance Scenario

### GW-E2E-005
**Objective:** Payroll generated with correct Kenya statutory deductions  
**Preconditions:** Employee with gross salary KES 150,000  
**Steps:**
1. **Generate Payroll:** Run June 2026 payroll for employee
2. **PAYE Calculation:** Gross = 150,000; PAYE per KRA progressive rates (approx KES 35,000)
3. **SHIF:** 2.75% × 150,000 = 4,125
4. **NSSF:** Tier I (6% of 6,000 = 360) + Tier II (6% of 18,000 = 1,080) = 1,440
5. **Housing Levy:** 1.5% × 150,000 = 2,250
6. **Net Salary:** 150,000 - 35,000 - 4,125 - 1,440 - 2,250 = KES 107,185
7. **Payslip:** Generate and confirm all deductions line items match calculations
8. **P10 Return:** Generate PAYE return for KRA

**Expected Result:** Payroll calculations correct; P10 generated  
**Pass Criteria:** All deductions within KES 10 of expected; net salary correct  
**Risk Rating:** CRITICAL

---

## 55.6 Walk-In Client Service Scenario

### GW-E2E-006
**Objective:** Walk-in client served without opening a full matter  
**Preconditions:** Receptionist authenticated  
**Steps:**
1. Client walks in for Commissioner for Oaths service
2. Record: clientName = "Sarah Wanjiku", serviceType = COMMISSIONER_FOR_OATHS
3. Collect KES 500 via M-PESA; enter mpesaRef
4. Issue receipt
5. Confirm: service in today's log; daily revenue updated; no matter created
6. At day end: confirm total walk-in revenue for day

**Expected Result:** Quick service without full matter workflow  
**Pass Criteria:** Service recorded; receipt issued; revenue tracked; no matter created  
**Risk Rating:** HIGH

---

---

# APPENDIX A: UAT SIGN-OFF MATRIX

## A.1 Module Certification Sign-Off

| Module | Test Cases | Pass Criteria | QA Lead | Business Owner | Date | Status |
|---|---|---|---|---|---|---|
| Platform Administration | 20 | All SMK pass; 0 FAIL | | | | PENDING |
| Tenant Administration | 15 | All SMK pass; 0 FAIL | | | | PENDING |
| User Management | 18 | All SMK pass; 0 FAIL | | | | PENDING |
| Role Management | 10 | 0 FAIL; all critical PASS | | | | PENDING |
| Permissions | 8 | RBAC working; 0 bypass | | | | PENDING |
| Branches | 6 | 0 FAIL | | | | PENDING |
| Clients | 25 | 0 FAIL; conflict check works | | | | PENDING |
| Contacts | 5 | 0 FAIL | | | | PENDING |
| Matters | 28 | 0 FAIL; originator works | | | | PENDING |
| Matter Tasks | 15 | 0 FAIL; assignment notifies | | | | PENDING |
| Matter Workflows | 8 | Start button functional | | | | PENDING |
| Court Hearings | 8 | Calendar sync works | | | | PENDING |
| Contracts | 5 | Version history works | | | | PENDING |
| Documents | 12 | Upload/download/preview | | | | PENDING |
| Document Versions | 4 | Version history | | | | PENDING |
| Time Tracking | 12 | Approval workflow correct | | | | PENDING |
| Billing | 15 | Quote→Invoice works | | | | PENDING |
| Payments | 8 | M-PESA flow works | | | | PENDING |
| Accounts Receivable | 5 | AR aging correct | | | | PENDING |
| Accounts Payable | 5 | Bill approval works | | | | PENDING |
| Procurement | 8 | PR→PO workflow | | | | PENDING |
| Vendors | 5 | 0 FAIL | | | | PENDING |
| General Ledger | 5 | Accounts accessible | | | | PENDING |
| Journal Entries | 5 | Double-entry balanced | | | | PENDING |
| Trial Balance | 3 | DR = CR | | | | PENDING |
| **Trust Accounting** | **25** | **0 FAIL; no overdraft** | | | | **PENDING** |
| Trust Ledgers | 4 | Client balances correct | | | | PENDING |
| Trust Reconciliation | 3 | 3-way passes | | | | PENDING |
| HR | 4 | Module accessible | | | | PENDING |
| Employees | 5 | Profile + docs | | | | PENDING |
| Leave | 5 | Approval workflow | | | | PENDING |
| Payroll | 8 | Kenya deductions correct | | | | PENDING |
| Reporting | 6 | Reports generate | | | | PENDING |
| Analytics | 6 | Live charts with data | | | | PENDING |
| Dashboards | 5 | Role-based views | | | | PENDING |
| Notifications | 6 | In-app + email | | | | PENDING |
| Email Notifications | 4 | SMTP/SendGrid works | | | | PENDING |
| AI Platform | 5 | Artifacts with review | | | | PENDING |
| AI Prompt Auditing | 4 | Injection blocked | | | | PENDING |
| Client Portal | 8 | Isolation enforced | | | | PENDING |
| Authentication | 8 | JWT; rate limit | | | | PENDING |
| Authorization | 5 | RBAC correct | | | | PENDING |
| **Audit Framework** | **12** | **Hash chain intact** | | | | **PENDING** |
| Walk-In Clients | 8 | Service records | | | | PENDING |
| Tax Compliance | 8 | VAT/WHT/eTIMS | | | | PENDING |
| E2E Scenarios | 6 | All lifecycle tests | | | | PENDING |

---

## A.2 Critical Go/No-Go Criteria

The following are absolute blockers for production deployment:

| # | Criterion | Test Reference | Status |
|---|---|---|---|
| 1 | Zero cross-tenant data leakage | GW-PA-MTI-001, GW-CL-MTI-001, GW-TR-MTI-001 | PENDING |
| 2 | Trust overdraft prevention absolute | GW-TR-NEG-001 | PENDING |
| 3 | Audit hash chain unbroken | GW-PA-AUD-002, GW-AF-FNC-001 | PENDING |
| 4 | RBAC blocks all unauthorized access | GW-PA-PRM-001, GW-AZ-NEG-001 | PENDING |
| 5 | Password never stored in plaintext | GW-UM-CMP-001 | PENDING |
| 6 | Double-entry journal entries balance | GW-JE-FNC-001, GW-JE-NEG-001 | PENDING |
| 7 | Kenya payroll deductions correct | GW-PL-CMP-001, GW-E2E-005 | PENDING |
| 8 | AI prompt injection blocked | GW-PA2-FNC-002 | PENDING |
| 9 | Client portal isolation enforced | GW-CP-NEG-001, GW-CP-MTI-001 | PENDING |
| 10 | SQL injection prevented | GW-AU-NEG-003 | PENDING |

---

## A.3 Risk Register

| Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Email delivery not configured (SendGrid placeholder) | HIGH | MEDIUM | Set real SENDGRID_API_KEY on Render before UAT | DevOps |
| eTIMS endpoint not connected to real KRA API | HIGH | HIGH | Use KRA sandbox for testing; document production switch | Finance |
| M-PESA integration in test mode only | MEDIUM | HIGH | Configure Daraja sandbox credentials | Finance |
| Trust reconciliation API endpoint may need wiring | MEDIUM | CRITICAL | Verify /finance/trust/reconcile endpoint returns data | DevOps |
| Performance under load not tested at scale | HIGH | MEDIUM | Load test with 1,000 concurrent users before go-live | QA |
| AI provider API key not configured | MEDIUM | MEDIUM | Configure at least one AI provider for testing | Tech Lead |
| Google/Microsoft OAuth not configured | MEDIUM | MEDIUM | Add OAuth credentials for SSO testing | DevOps |
| Neon DB connection limits under production load | MEDIUM | HIGH | Configure connection pooling via PgBouncer | DevOps |

---

## A.4 Test Environment Requirements

| Component | Requirement | Current State |
|---|---|---|
| API | Render (global-wakili-api.onrender.com) | LIVE |
| Frontend | Vercel (web-five-rust-44.vercel.app) | LIVE |
| Database | Neon PostgreSQL (neondb) | LIVE |
| Email | SENDGRID_API_KEY | SIMULATION ONLY |
| M-PESA | Daraja API credentials | NOT CONFIGURED |
| eTIMS | KRA eTIMS credentials | NOT CONFIGURED |
| Google OAuth | Client ID + Secret | NOT CONFIGURED |
| Microsoft OAuth | Azure AD App credentials | NOT CONFIGURED |
| Africa's Talking | API Key | NOT CONFIGURED |
| Firebase FCM | Service Account | NOT CONFIGURED |
| Seed Data | 3 tenants, 7 clients, 4 matters, 8 trust transactions | PRESENT |

---

## A.5 UAT Execution Sign-Off

### Business Stakeholder Approval

| Role | Name | Signature | Date | Decision |
|---|---|---|---|---|
| Managing Partner | | | | ☐ APPROVED ☐ CONDITIONAL ☐ REJECTED |
| Chief Financial Officer | | | | ☐ APPROVED ☐ CONDITIONAL ☐ REJECTED |
| Head of HR | | | | ☐ APPROVED ☐ CONDITIONAL ☐ REJECTED |
| IT/Operations Lead | | | | ☐ APPROVED ☐ CONDITIONAL ☐ REJECTED |
| Compliance Officer | | | | ☐ APPROVED ☐ CONDITIONAL ☐ REJECTED |

### Technical Sign-Off

| Role | Name | Signature | Date | Decision |
|---|---|---|---|---|
| QA Director | | | | ☐ PASS ☐ CONDITIONAL PASS ☐ FAIL |
| Lead Developer | | | | ☐ PASS ☐ CONDITIONAL PASS ☐ FAIL |
| Security Reviewer | | | | ☐ PASS ☐ CONDITIONAL PASS ☐ FAIL |
| Database Administrator | | | | ☐ PASS ☐ CONDITIONAL PASS ☐ FAIL |

### Production Go-Live Authorization

**System:** Global Wakili Legal Enterprise v1.0  
**Decision:** ☐ APPROVED FOR PRODUCTION ☐ CONDITIONAL APPROVAL ☐ NOT APPROVED  
**Conditions (if conditional):** _______________________________________________  
**Authorized by:** _______________________________________________  
**Designation:** _______________________________________________  
**Date:** _______________________________________________  
**Signature:** _______________________________________________

---

## A.6 Defect Classification

| Severity | Definition | Resolution Required Before Go-Live |
|---|---|---|
| P1 — Showstopper | System crash, data loss, security breach, trust accounting failure | YES — Mandatory |
| P2 — Critical | Feature non-functional, incorrect calculation, access control bypass | YES — Mandatory |
| P3 — Major | Feature degraded, workflow incomplete, UX blocking | YES — Recommended |
| P4 — Minor | Cosmetic defect, non-blocking, workaround available | NO — Post go-live |
| P5 — Enhancement | New feature request, improvement | NO — Backlog |

---

## A.7 Validation Summary (Post-Execution)

*To be completed after UAT execution*

| Category | Total Tests | Passed | Failed | Deferred | Pass Rate |
|---|---|---|---|---|---|
| Smoke Tests | | | | | |
| Functional Tests | | | | | |
| Negative Tests | | | | | |
| Permission Tests | | | | | |
| Multi-Tenant Isolation | | | | | |
| Audit Trail Tests | | | | | |
| Compliance Tests | | | | | |
| Performance Tests | | | | | |
| Integration Tests | | | | | |
| Disaster Recovery | | | | | |
| **TOTAL** | **1,000+** | | | | |

**UAT Certification Status:** ☐ CERTIFIED ☐ CONDITIONALLY CERTIFIED ☐ NOT CERTIFIED

---

*End of UAT Certification Pack — Global Wakili Legal Enterprise v1.0*  
*Document Classification: Confidential — Internal QA Use Only*  
*© 2026 Global Wakili Limited. All rights reserved.*


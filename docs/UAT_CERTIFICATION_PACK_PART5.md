# GLOBAL WAKILI LEGAL ENTERPRISE
## Enterprise UAT Certification Pack — Part 5 of 5
### Litigation · Document Sharing · Document Storage · Financial Statements · Budgeting · HR Goals · Performance Reviews · Performance Back-fill · Integration Back-fill · DR Back-fill

---

# MODULE 56: LITIGATION

## 56.1 Smoke Tests

### GW-LT-SMK-001
**Objective:** Litigation matters accessible and distinguishable from commercial  
**Preconditions:** Firm admin authenticated; matter with matterType=LITIGATION exists  
**Steps:**
1. GET `/api/v1/matters?matterType=LITIGATION&limit=20`
2. Confirm HTTP 200
3. Confirm all returned matters have `matterType: "LITIGATION"` or `category: "CIVIL"`
4. Navigate to `/app/matters` — confirm filter by LITIGATION works

**Expected Result:** Litigation matters filterable and distinguishable  
**Pass Criteria:** Filter returns only litigation matters; court hearing links visible  
**Risk Rating:** HIGH

---

### GW-LT-SMK-002
**Objective:** Litigation workflow template accessible  
**Preconditions:** Firm admin authenticated  
**Steps:**
1. Navigate to `/app/workflows` → Templates tab
2. Confirm "Civil Suit" template visible under Litigation category
3. Confirm steps: Plaint → Service → Defence → Directions → Hearing → Judgment → Execution

**Expected Result:** Civil Suit workflow template present with all 7 steps  
**Pass Criteria:** Template renders; step pipeline displays  
**Risk Rating:** HIGH

---

## 56.2 Functional Tests

### GW-LT-FNC-001
**Objective:** Litigation matter opened with cause of action and parties  
**Preconditions:** Client exists; firm admin authenticated  
**Steps:**
1. POST `/api/v1/matters` with: `{ title: "Doe v Smith — Land Dispute", category: "CIVIL", clientId, branchId, leadAdvocateId, riskLevel: "HIGH" }`
2. POST `/api/v1/matters/{matterId}/parties` with: `{ name: "John Smith", role: "DEFENDANT", address: "Mombasa Road" }`
3. GET matter — confirm client (PLAINTIFF) and party (DEFENDANT) listed

**Expected Result:** Litigation matter with parties created  
**Pass Criteria:** Both claimant and defendant recorded; matter category correct  
**Risk Rating:** HIGH

---

### GW-LT-FNC-002
**Objective:** Plaint filing tracked through court filings  
**Preconditions:** Litigation matter exists  
**Steps:**
1. POST `/api/v1/court/filings` with: `{ matterId, filingType: "PLAINT", description: "Original Plaint — Doe v Smith", dueDate, courtRef: "ELC 001/2026" }`
2. Confirm HTTP 201
3. GET filings — confirm plaint with status FILED and courtRef

**Expected Result:** Plaint recorded as first filing  
**Pass Criteria:** Filing visible; court reference number captured  
**Risk Rating:** HIGH

---

### GW-LT-FNC-003
**Objective:** Court hearing scheduled with case reference  
**Preconditions:** Litigation matter with filed plaint  
**Steps:**
1. POST `/api/v1/court/hearings` with: `{ matterId, title: "Mention — Doe v Smith", hearingDate: "2026-07-20T09:00", court: "Milimani High Court — ELC", courtRoom: "Room 12", caseNumber: "ELC 001/2026" }`
2. Confirm HTTP 201
3. Confirm calendar event created with type COURT_HEARING
4. Confirm red ring on calendar cell for hearing date

**Expected Result:** Hearing scheduled; calendar highlighted; case number captured  
**Pass Criteria:** Hearing linked to matter; calendar event created automatically  
**Risk Rating:** HIGH

---

### GW-LT-FNC-004
**Objective:** Judgment recorded with outcome  
**Preconditions:** Case heard; advocate ready to record judgment  
**Steps:**
1. PATCH `/api/v1/court/hearings/{hearingId}` with: `{ status: "COMPLETED", outcome: "Judgment for Plaintiff — KES 500,000 awarded", nextHearingDate: null }`
2. Confirm HTTP 200
3. GET hearing — confirm outcome recorded with timestamp

**Expected Result:** Judgment outcome captured  
**Pass Criteria:** Outcome searchable; judgment date recorded; matter can proceed to execution  
**Risk Rating:** HIGH

---

### GW-LT-FNC-005
**Objective:** Decree execution workflow initiated  
**Preconditions:** Judgment entered; execution permitted  
**Steps:**
1. Start "Civil Suit" workflow, advance to "Execution" step
2. POST execution filing with `{ filingType: "EXECUTION", description: "Notice to Show Cause" }`
3. Confirm workflow status = IN_PROGRESS at Execution step

**Expected Result:** Execution stage tracked in workflow  
**Pass Criteria:** Workflow advances to Execution; filing created  
**Risk Rating:** HIGH

---

### GW-LT-FNC-006
**Objective:** Statute of limitations date tracked  
**Preconditions:** Litigation matter exists  
**Steps:**
1. PATCH matter with `{ statuteOfLimitationsDate: "2029-06-05" }`
2. GET matter — confirm `statuteOfLimitationsDate` populated
3. Confirm compliance calendar shows limitation date approaching alert before deadline

**Expected Result:** Limitation date recorded; approaching alert triggered  
**Pass Criteria:** Date tracked; calendar compliance date visible  
**Risk Rating:** CRITICAL

---

### GW-LT-FNC-007
**Objective:** Evidence items linked to litigation matter  
**Preconditions:** Litigation matter; evidence document uploaded  
**Steps:**
1. POST `/api/v1/matters/{matterId}/evidence` with: `{ title: "Title Deed — Parcel 123", evidenceType: "DOCUMENTARY", documentId, description: "Original title deed" }`
2. Confirm HTTP 201
3. GET evidence for matter — confirm evidence visible

**Expected Result:** Evidence item created and linked  
**Pass Criteria:** Evidence linked to matter; type categorized  
**Risk Rating:** HIGH

---

## 56.3 Negative Tests

### GW-LT-NEG-001
**Objective:** Hearing cannot be created without valid matterId  
**Preconditions:** Firm admin authenticated  
**Steps:**
1. POST court hearing without `matterId`
2. Record response

**Expected Result:** HTTP 400 — matterId required  
**Pass Criteria:** Hearing must be linked to a matter  
**Risk Rating:** HIGH

---

### GW-LT-NEG-002
**Objective:** Duplicate court reference rejected per matter  
**Preconditions:** Hearing with caseNumber "ELC 001/2026" exists  
**Steps:**
1. POST another hearing for same matter with same caseNumber
2. Record response

**Expected Result:** HTTP 409 or business warning — duplicate case number  
**Pass Criteria:** Unique case reference per matter enforced  
**Risk Rating:** MEDIUM

---

## 56.4 Permission Tests

### GW-LT-PRM-001
**Objective:** Only advocates can record court outcomes  
**Preconditions:** OFFICE_ADMIN authenticated  
**Steps:**
1. PATCH court hearing outcome as OFFICE_ADMIN
2. Record response

**Expected Result:** HTTP 403 — `court.record_outcome` permission required  
**Pass Criteria:** Court outcome recording restricted to advocates  
**Risk Rating:** HIGH

---

### GW-LT-PRM-002
**Objective:** PUPIL can view hearings but not manage filings  
**Preconditions:** PUPIL authenticated  
**Steps:**
1. GET `/api/v1/court/hearings` — expect 200
2. POST court filing as PUPIL — expect 403

**Expected Result:** View permitted; filing management blocked  
**Pass Criteria:** `court.manage_filing` required for filing creation  
**Risk Rating:** HIGH

---

## 56.5 Multi-Tenant Isolation Tests

### GW-LT-MTI-001
**Objective:** Court hearings isolated per tenant  
**Preconditions:** Tenant A has court hearings  
**Steps:**
1. Login as Tenant B
2. GET `/api/v1/court/hearings`
3. Confirm zero Tenant A hearings in response

**Expected Result:** Hearing list tenant-isolated  
**Pass Criteria:** tenantId filter on all court queries  
**Risk Rating:** CRITICAL

---

## 56.6 Audit Trail Tests

### GW-LT-AUD-001
**Objective:** Judgment entry audited  
**Preconditions:** Audit logging active  
**Steps:**
1. Record court hearing outcome
2. Query AuditLog: `WHERE action = 'COURT_OUTCOME_RECORDED'`
3. Confirm: actorUserId, hearingId, matterId, outcome, timestamp

**Expected Result:** Judgment event in audit log  
**Pass Criteria:** Immutable record of judicial outcome  
**Risk Rating:** HIGH

---

## 56.7 Compliance Tests

### GW-LT-CMP-001
**Objective:** Statute of limitations compliance monitored  
**Preconditions:** Matter with limitation date within 30 days  
**Steps:**
1. Set `statuteOfLimitationsDate` = 30 days from today
2. Confirm calendar shows compliance date
3. Confirm notification triggered with COMPLIANCE_DATE type
4. Confirm amber/red cell highlight on calendar

**Expected Result:** Limitation date compliance alert working  
**Pass Criteria:** Alert triggered 30 days before limitation; cannot be dismissed without acknowledgement  
**Risk Rating:** CRITICAL

---

### GW-LT-CMP-002
**Objective:** Court filings meet deadlines  
**Preconditions:** Filing with dueDate = 3 days from today  
**Steps:**
1. Create court filing with upcoming dueDate
2. Confirm deadline appears in calendar as DEADLINE type
3. Confirm notification scheduled

**Expected Result:** Filing deadline tracked and alerted  
**Pass Criteria:** Deadline visible; reminder triggered  
**Risk Rating:** HIGH

---

## 56.8 Performance Tests

### GW-LT-PRF-001
**Objective:** Litigation matter with 100+ hearings loads quickly  
**Preconditions:** Matter with 100 court hearings  
**Steps:**
1. GET `/api/v1/court/hearings?matterId={matterId}&limit=50`
2. Record response time

**Expected Result:** Response < 500ms  
**Pass Criteria:** Index on (tenantId, matterId, hearingDate) ensures performance  
**Risk Rating:** MEDIUM

---

## 56.9 Integration Tests

### GW-LT-INT-001
**Objective:** Court hearing auto-creates calendar event  
**Preconditions:** Calendar module active  
**Steps:**
1. Create court hearing
2. GET `/api/v1/calendar/events?matterId={matterId}&type=COURT_HEARING`
3. Confirm event with same date/time created automatically

**Expected Result:** Calendar-court integration working  
**Pass Criteria:** Zero manual calendar entry needed; auto-sync on hearing creation  
**Risk Rating:** HIGH

---

## 56.10 Disaster Recovery Tests

### GW-LT-DRV-001
**Objective:** Litigation matter data survives DB restart  
**Preconditions:** Litigation matter with hearings, filings, evidence  
**Steps:**
1. Note matter ID and hearing dates
2. Trigger Render API restart
3. GET all matter-related data after restart
4. Confirm zero data loss

**Expected Result:** All litigation data persists  
**Pass Criteria:** PostgreSQL persistence; no data loss  
**Risk Rating:** CRITICAL

---

---

# MODULE 57: DOCUMENT SHARING

## 57.1 Smoke Tests

### GW-DS2-SMK-001
**Objective:** Document sharing API accessible  
**Preconditions:** Document exists; firm admin authenticated  
**Steps:**
1. GET `/api/v1/documents/{documentId}/shares`
2. Confirm HTTP 200 (empty array if no shares)

**Expected Result:** Sharing endpoint accessible  
**Pass Criteria:** No 404; endpoint responds  
**Risk Rating:** MEDIUM

---

## 57.2 Functional Tests

### GW-DS2-FNC-001
**Objective:** Document shared with internal user  
**Preconditions:** Document and recipient user exist  
**Steps:**
1. POST `/api/v1/documents/{documentId}/shares` with `{ userId: recipient_id, accessLevel: "VIEW", expiresAt: "2026-12-31" }`
2. Confirm HTTP 201
3. Login as recipient user
4. GET document — confirm access granted

**Expected Result:** Recipient can view shared document  
**Pass Criteria:** Access granted; expiry enforced  
**Risk Rating:** HIGH

---

### GW-DS2-FNC-002
**Objective:** Document shared via link with expiry  
**Preconditions:** Document exists  
**Steps:**
1. POST `/api/v1/documents/{documentId}/share-link` with `{ accessLevel: "VIEW", expiresAt: "2026-07-01T00:00" }`
2. Confirm HTTP 201; shareLink URL returned
3. Access shareLink — confirm document viewable
4. After expiry — confirm 403

**Expected Result:** Time-limited share link works; expires correctly  
**Pass Criteria:** Link accessible before expiry; blocked after  
**Risk Rating:** HIGH

---

### GW-DS2-FNC-003
**Objective:** Document shared with client portal user  
**Preconditions:** Client portal activated; document exists  
**Steps:**
1. Share document with portal client
2. Login as client portal user
3. Navigate to portal — confirm shared document visible
4. Download document as portal user

**Expected Result:** Client can access document via portal  
**Pass Criteria:** Portal user sees only their shared documents  
**Risk Rating:** HIGH

---

### GW-DS2-FNC-004
**Objective:** Document share revoked  
**Preconditions:** Existing document share  
**Steps:**
1. DELETE `/api/v1/documents/{documentId}/shares/{shareId}`
2. Confirm HTTP 200
3. Login as previously-shared user
4. GET document — confirm 403

**Expected Result:** Access revoked immediately  
**Pass Criteria:** Revocation immediate; no cached access  
**Risk Rating:** HIGH

---

## 57.3 Negative Tests

### GW-DS2-NEG-001
**Objective:** Cannot share document across tenants  
**Preconditions:** Tenant A document; Tenant B user ID  
**Steps:**
1. POST share with Tenant B user ID as recipient
2. Record response

**Expected Result:** HTTP 400 or 404 — cannot share across tenant boundary  
**Pass Criteria:** Sharing strictly within same tenant  
**Risk Rating:** CRITICAL

---

### GW-DS2-NEG-002
**Objective:** Expired share link rejected  
**Preconditions:** Share link created with past expiry  
**Steps:**
1. Access share link with `expiresAt` in the past
2. Record response

**Expected Result:** HTTP 403 — link expired  
**Pass Criteria:** Expiry enforced; no grace period  
**Risk Rating:** HIGH

---

## 57.4 Permission Tests

### GW-DS2-PRM-001
**Objective:** Only document owner or admin can create shares  
**Preconditions:** PUPIL authenticated; document owned by PARTNER  
**Steps:**
1. POST share on another user's document as PUPIL
2. Record response

**Expected Result:** HTTP 403 — cannot share document you don't own  
**Pass Criteria:** Share creation restricted to owner and admins  
**Risk Rating:** HIGH

---

## 57.5 Multi-Tenant Isolation Tests

### GW-DS2-MTI-001
**Objective:** Shares isolated per tenant  
**Preconditions:** Document shares exist in two tenants  
**Steps:**
1. Login as Tenant B
2. GET document shares for Tenant A document ID
3. Confirm 404 or empty

**Expected Result:** Zero cross-tenant share leakage  
**Pass Criteria:** tenantId on all share queries  
**Risk Rating:** CRITICAL

---

## 57.6 Audit Trail Tests

### GW-DS2-AUD-001
**Objective:** Document share creation audited  
**Preconditions:** Audit logging active  
**Steps:**
1. Create document share
2. Query AuditLog: `WHERE action = 'DOCUMENT_SHARED'`
3. Confirm: actorUserId, documentId, recipientUserId/email, accessLevel, expiresAt

**Expected Result:** Share event fully audited  
**Pass Criteria:** All share details captured; revocation also audited  
**Risk Rating:** HIGH

---

## 57.7 Compliance Tests

### GW-DS2-CMP-001
**Objective:** Shared documents retain legal professional privilege tracking  
**Preconditions:** Document with privilege marking  
**Steps:**
1. Upload document marked as PRIVILEGED
2. Share with non-legal recipient
3. Confirm system warns: "This document is subject to legal privilege"

**Expected Result:** Privilege warning on sharing privileged documents  
**Pass Criteria:** Privilege status visible; sharing logged  
**Risk Rating:** HIGH

---

---

# MODULE 58: DOCUMENT STORAGE

## 58.1 Smoke Tests

### GW-DT-SMK-001
**Objective:** Document storage backend accessible  
**Preconditions:** Storage configured (local or cloud)  
**Steps:**
1. Upload test document
2. GET `/api/v1/documents/{id}` — confirm signedUrl present
3. Access signedUrl — confirm file retrievable
4. DELETE document — confirm removal

**Expected Result:** Full CRUD on document storage  
**Pass Criteria:** Upload, retrieve, delete all functional  
**Risk Rating:** HIGH

---

## 58.2 Functional Tests

### GW-DT-FNC-001
**Objective:** Retention policy applied to archived documents  
**Preconditions:** Document with archive date  
**Steps:**
1. Set document `status: "ARCHIVED"`
2. Confirm document still retrievable (not deleted)
3. Check retention policy: archived documents retained for 7 years minimum

**Expected Result:** Archived documents retained per policy  
**Pass Criteria:** Archived ≠ deleted; retention period enforced  
**Risk Rating:** HIGH

---

### GW-DT-FNC-002
**Objective:** Document storage quota tracked  
**Preconditions:** Tenant with storage quota set  
**Steps:**
1. GET `/api/v1/tenant/storage/usage`
2. Confirm: used_bytes, quota_bytes, percentage_used
3. Upload large document — confirm usage increases

**Expected Result:** Storage usage tracked accurately  
**Pass Criteria:** Usage updates on upload; quota enforced  
**Risk Rating:** MEDIUM

---

### GW-DT-FNC-003
**Objective:** Document scan/malware check on upload  
**Preconditions:** Document scanning configured  
**Steps:**
1. Upload clean document — confirm upload succeeds; scan result = CLEAN
2. Upload EICAR test file (simulated malware) — confirm upload blocked
3. Confirm audit entry: scan result recorded

**Expected Result:** Malware scanning functional  
**Pass Criteria:** Clean files accepted; malicious files blocked  
**Risk Rating:** CRITICAL

---

### GW-DT-FNC-004
**Objective:** Document restore from archive  
**Preconditions:** Document in ARCHIVED status  
**Steps:**
1. PATCH document `{ status: "ACTIVE" }`
2. Confirm document accessible again
3. Confirm restore audit entry created

**Expected Result:** Document restored from archive  
**Pass Criteria:** Restore works; audit trail complete  
**Risk Rating:** MEDIUM

---

## 58.3 Negative Tests

### GW-DT-NEG-001
**Objective:** Storage quota exceeded blocks upload  
**Preconditions:** Tenant at 100% storage quota  
**Steps:**
1. Attempt to upload additional document
2. Record response

**Expected Result:** HTTP 507 Insufficient Storage or 400  
**Pass Criteria:** Quota enforcement prevents overage  
**Risk Rating:** MEDIUM

---

## 58.4 Compliance Tests

### GW-DT-CMP-001
**Objective:** Documents retained for statutory minimum period  
**Preconditions:** Documents older than 7 years exist  
**Steps:**
1. Query documents created 7+ years ago
2. Confirm documents still present and accessible
3. Confirm deletion blocked for documents within retention period

**Expected Result:** Retention policy prevents premature deletion  
**Pass Criteria:** Documents within retention period cannot be permanently deleted  
**Risk Rating:** CRITICAL

---

### GW-DT-CMP-002
**Objective:** GDPR document deletion on erasure request  
**Preconditions:** Data erasure request submitted  
**Steps:**
1. Submit data erasure request for client
2. Confirm client documents flagged for deletion
3. After processing period, confirm personal data documents removed
4. Confirm audit trail of deletion preserved (metadata only)

**Expected Result:** Documents deleted on valid erasure request  
**Pass Criteria:** Personal data removed; audit of deletion retained  
**Risk Rating:** HIGH

---

## 58.5 Disaster Recovery Tests

### GW-DT-DRV-001
**Objective:** Document storage survives service interruption  
**Preconditions:** Documents stored in cloud storage  
**Steps:**
1. Note document signedUrls
2. Restart API service
3. GET documents after restart — confirm signedUrls regeneratable
4. Access document content — confirm files intact

**Expected Result:** Document storage independent of API process  
**Pass Criteria:** Files in storage survive API restart; URLs regeneratable  
**Risk Rating:** CRITICAL

---

---

# MODULE 59: FINANCIAL STATEMENTS

## 59.1 Smoke Tests

### GW-FS-SMK-001
**Objective:** Financial statements accessible via Finance module  
**Preconditions:** CFO or ACCOUNTANT authenticated; posted journal entries exist  
**Steps:**
1. GET `/api/v1/finance/reports/trial-balance`
2. GET `/api/v1/finance/reports/profit-loss`
3. GET `/api/v1/finance/reports/balance-sheet`
4. Confirm HTTP 200 for each

**Expected Result:** All three core financial statements accessible  
**Pass Criteria:** Trial Balance, P&L, Balance Sheet endpoints respond  
**Risk Rating:** CRITICAL

---

## 59.2 Functional Tests

### GW-FS-FNC-001
**Objective:** Profit & Loss Statement generated correctly  
**Preconditions:** Revenue and expense journal entries posted for period  
**Steps:**
1. GET `/api/v1/finance/reports/profit-loss?period=2026-06`
2. Confirm: Revenue accounts total, Expense accounts total
3. Confirm: Net Profit = Revenue - Expenses
4. Confirm: All income/expense accounts listed with period movements

**Expected Result:** Accurate P&L for period  
**Pass Criteria:** Net Profit mathematically correct; all accounts included  
**Risk Rating:** CRITICAL

---

### GW-FS-FNC-002
**Objective:** Balance Sheet satisfies accounting equation  
**Preconditions:** Posted journal entries across asset, liability, equity accounts  
**Steps:**
1. GET `/api/v1/finance/reports/balance-sheet?date=2026-06-30`
2. Confirm: Total Assets total
3. Confirm: Total Liabilities + Equity total
4. Confirm: Assets = Liabilities + Equity (balance sheet equation)

**Expected Result:** Balance sheet equation satisfied: A = L + E  
**Pass Criteria:** Assets equal Liabilities + Equity to the cent  
**Risk Rating:** CRITICAL

---

### GW-FS-FNC-003
**Objective:** Cash Flow Statement generated  
**Preconditions:** Cash receipts and payments recorded  
**Steps:**
1. GET `/api/v1/finance/reports/cash-flow?period=2026-06`
2. Confirm: Operating activities, Investing activities, Financing activities
3. Confirm: Net change in cash = opening cash + net flows

**Expected Result:** Cash flow statement with all three sections  
**Pass Criteria:** Net cash position correct; three-section structure present  
**Risk Rating:** HIGH

---

### GW-FS-FNC-004
**Objective:** Financial statements exportable to PDF/Excel  
**Preconditions:** Financial statements generated  
**Steps:**
1. POST `/api/v1/finance/reports/export` with `{ reportType: "PROFIT_LOSS", format: "PDF", period: "2026-06" }`
2. Confirm HTTP 200 with downloadable file URL
3. Access file — confirm professional statement format

**Expected Result:** Financial statement exported in professional format  
**Pass Criteria:** Export functional; format readable by accountants  
**Risk Rating:** HIGH

---

### GW-FS-FNC-005
**Objective:** Comparative period financial statements  
**Preconditions:** Two periods of data  
**Steps:**
1. GET P&L with `{ period: "2026-06", comparePeriod: "2025-06" }`
2. Confirm: current period and prior period columns
3. Confirm: variance column (absolute and percentage)

**Expected Result:** Comparative statements with variance analysis  
**Pass Criteria:** Variance = Current - Prior; percentages correct  
**Risk Rating:** HIGH

---

## 59.3 Negative Tests

### GW-FS-NEG-001
**Objective:** Financial statement with unbalanced journals rejected  
**Preconditions:** Unposted journal with debit ≠ credit  
**Steps:**
1. Attempt to generate trial balance including unposted unbalanced journal
2. Confirm system excludes unposted entries OR reports imbalance

**Expected Result:** Only posted, balanced journals in financial statements  
**Pass Criteria:** Unbalanced entries never reach financial statements  
**Risk Rating:** CRITICAL

---

## 59.4 Permission Tests

### GW-FS-PRM-001
**Objective:** Only CFO/Accountant/Managing Partner can view financial statements  
**Preconditions:** ASSOCIATE authenticated  
**Steps:**
1. GET `/api/v1/finance/reports/profit-loss` as ASSOCIATE
2. Record response

**Expected Result:** HTTP 403 — financial statements restricted  
**Pass Criteria:** `finance.view_reports` permission required  
**Risk Rating:** HIGH

---

## 59.5 Compliance Tests

### GW-FS-CMP-001
**Objective:** Financial statements compliant with IFRS/IAS 1  
**Preconditions:** Chart of accounts configured per IFRS  
**Steps:**
1. Generate Balance Sheet
2. Confirm: Non-current assets, Current assets, Non-current liabilities, Current liabilities, Equity sections present
3. Confirm: Liquidity order (assets ordered most-to-least liquid)

**Expected Result:** Balance Sheet structure compliant with IAS 1  
**Pass Criteria:** All required IAS 1 sections present; presentation correct  
**Risk Rating:** HIGH

---

### GW-FS-CMP-002
**Objective:** Corporation tax provision calculable from P&L  
**Preconditions:** P&L with net profit  
**Steps:**
1. Get net profit from P&L
2. Confirm: Taxable income calculable (with adjustments)
3. Confirm: Corporation tax at 30% of taxable income (Kenya standard rate)

**Expected Result:** Tax provision derivable from financial statements  
**Pass Criteria:** Tax calculation basis present in P&L  
**Risk Rating:** HIGH

---

---

# MODULE 60: BUDGETING

## 60.1 Smoke Tests

### GW-BG-SMK-001
**Objective:** Budgeting module accessible  
**Preconditions:** CFO or FIRM_ADMIN authenticated  
**Steps:**
1. GET `/api/v1/finance/budgets`
2. Confirm HTTP 200

**Expected Result:** Budget endpoint accessible  
**Pass Criteria:** No 404; response returned  
**Risk Rating:** MEDIUM

---

## 60.2 Functional Tests

### GW-BG-FNC-001
**Objective:** Annual budget created per account  
**Preconditions:** Chart of accounts configured  
**Steps:**
1. POST `/api/v1/finance/budgets` with: `{ year: 2026, accountId, amount: 500000, currency: "KES", period: "ANNUAL" }`
2. Confirm HTTP 201
3. GET budgets — confirm entry visible

**Expected Result:** Budget created for account  
**Pass Criteria:** Budget persists; linked to GL account  
**Risk Rating:** HIGH

---

### GW-BG-FNC-002
**Objective:** Budget vs actuals variance report  
**Preconditions:** Budget set; actual transactions posted  
**Steps:**
1. GET `/api/v1/finance/budgets/variance?year=2026&period=2026-06`
2. Confirm: budget amount, actual amount, variance (absolute), variance (percentage) per account
3. Confirm: accounts over budget flagged

**Expected Result:** Budget vs actuals variance report accurate  
**Pass Criteria:** Variance = Budget - Actual; over-budget accounts identified  
**Risk Rating:** HIGH

---

### GW-BG-FNC-003
**Objective:** Budget period breakdown (monthly) accessible  
**Preconditions:** Annual budget set  
**Steps:**
1. GET monthly budget breakdown for FY 2026
2. Confirm: 12 months × accounts matrix
3. Confirm: monthly total = annual total ÷ 12 (for evenly distributed budgets)

**Expected Result:** Monthly budget distribution available  
**Pass Criteria:** All 12 months present; totals sum to annual budget  
**Risk Rating:** MEDIUM

---

## 60.3 Negative Tests

### GW-BG-NEG-001
**Objective:** Duplicate budget for same account/period rejected  
**Preconditions:** Budget for account A, year 2026 already exists  
**Steps:**
1. POST another budget for same account, year 2026
2. Record response

**Expected Result:** HTTP 409 — budget already exists for period  
**Pass Criteria:** Unique constraint on (tenantId, accountId, year, period)  
**Risk Rating:** MEDIUM

---

## 60.4 Permission Tests

### GW-BG-PRM-001
**Objective:** Only CFO and FIRM_ADMIN can create/modify budgets  
**Preconditions:** PARTNER authenticated  
**Steps:**
1. POST budget as PARTNER
2. Record response

**Expected Result:** HTTP 403 — budget management restricted  
**Pass Criteria:** Budget creation requires finance management permission  
**Risk Rating:** HIGH

---

## 60.5 Compliance Tests

### GW-BG-CMP-001
**Objective:** Budget approval workflow required  
**Preconditions:** Budget in draft status  
**Steps:**
1. Create budget in DRAFT
2. Submit for approval: PATCH `{ status: "PENDING_APPROVAL" }`
3. Approve as MANAGING_PARTNER: PATCH `{ status: "APPROVED" }`
4. Confirm: approved budget cannot be modified without re-approval

**Expected Result:** Budget approval workflow enforced  
**Pass Criteria:** Budget requires sign-off before use as control  
**Risk Rating:** HIGH

---

---

# MODULE 61: HR GOALS

## 61.1 Smoke Tests

### GW-GL2-SMK-001
**Objective:** Goals module accessible within HR  
**Preconditions:** HR Manager authenticated  
**Steps:**
1. GET `/api/v1/hr/goals?limit=20`
2. Confirm HTTP 200

**Expected Result:** Goals endpoint accessible  
**Pass Criteria:** Response returned; no 404  
**Risk Rating:** MEDIUM

---

## 61.2 Functional Tests

### GW-GL2-FNC-001
**Objective:** Employee goal set for performance period  
**Preconditions:** Employee record exists; HR Manager authenticated  
**Steps:**
1. POST `/api/v1/hr/goals` with: `{ employeeId, title: "Increase billable hours to 120h/month", targetValue: 120, unit: "hours/month", dueDate: "2026-12-31", status: "ACTIVE" }`
2. Confirm HTTP 201
3. GET employee goals — confirm goal visible

**Expected Result:** Goal created and linked to employee  
**Pass Criteria:** Goal persists; measurable target captured  
**Risk Rating:** HIGH

---

### GW-GL2-FNC-002
**Objective:** Goal progress updated  
**Preconditions:** Active goal exists  
**Steps:**
1. PATCH `/api/v1/hr/goals/{goalId}` with `{ currentValue: 85, progressNote: "On track — 85 hours billed in June" }`
2. Confirm HTTP 200
3. GET goal — confirm progress = 70.8% (85/120)

**Expected Result:** Goal progress tracked with notes  
**Pass Criteria:** Progress percentage calculated correctly  
**Risk Rating:** HIGH

---

### GW-GL2-FNC-003
**Objective:** Firm-level goals cascaded to departments  
**Preconditions:** Firm admin authenticated  
**Steps:**
1. POST firm goal: `{ title: "Achieve KES 50M revenue in FY 2026", level: "FIRM", targetValue: 50000000 }`
2. POST department goal linked to firm goal: `{ title: "Litigation department: KES 20M", parentGoalId, department: "LITIGATION" }`
3. Confirm cascading structure visible

**Expected Result:** Goal hierarchy: Firm → Department → Individual  
**Pass Criteria:** Parent-child goal linkage maintained  
**Risk Rating:** HIGH

---

## 61.3 Negative Tests

### GW-GL2-NEG-001
**Objective:** Goal with past due date rejected  
**Preconditions:** HR Manager authenticated  
**Steps:**
1. POST goal with `dueDate: "2020-01-01"` (past)
2. Record response

**Expected Result:** HTTP 400 — due date cannot be in the past  
**Pass Criteria:** Future due date enforced for new goals  
**Risk Rating:** MEDIUM

---

## 61.4 Permission Tests

### GW-GL2-PRM-001
**Objective:** Employee can view but not modify others' goals  
**Preconditions:** ASSOCIATE authenticated  
**Steps:**
1. GET own goals as ASSOCIATE — expect 200
2. PATCH another employee's goal — expect 403

**Expected Result:** Goal management restricted  
**Pass Criteria:** Employees can view; managers can modify  
**Risk Rating:** HIGH

---

## 61.5 Multi-Tenant Isolation Tests

### GW-GL2-MTI-001
**Objective:** Goals isolated per tenant  
**Preconditions:** Goals in two tenants  
**Steps:**
1. Login as Tenant B
2. GET `/api/v1/hr/goals`
3. Confirm Tenant A goals not visible

**Expected Result:** Goal list tenant-isolated  
**Pass Criteria:** tenantId filter on all goal queries  
**Risk Rating:** CRITICAL

---

## 61.6 Audit Trail Tests

### GW-GL2-AUD-001
**Objective:** Goal modification audited  
**Preconditions:** Audit logging active  
**Steps:**
1. Update goal progress
2. Query AuditLog: `WHERE action = 'GOAL_UPDATED'`
3. Confirm: actorUserId, goalId, previousValue, newValue, progressNote

**Expected Result:** Goal update audit entry  
**Pass Criteria:** Full change history for performance management  
**Risk Rating:** MEDIUM

---

---

# MODULE 62: PERFORMANCE REVIEWS

## 62.1 Smoke Tests

### GW-PR2-SMK-001
**Objective:** Performance reviews accessible  
**Preconditions:** HR Manager authenticated  
**Steps:**
1. GET `/api/v1/hr/performance-reviews?limit=10`
2. Confirm HTTP 200

**Expected Result:** Performance review endpoint accessible  
**Pass Criteria:** No 404; response returned  
**Risk Rating:** MEDIUM

---

## 62.2 Functional Tests

### GW-PR2-FNC-001
**Objective:** Performance review cycle initiated  
**Preconditions:** Employees and goals exist; HR Manager authenticated  
**Steps:**
1. POST `/api/v1/hr/performance-reviews/cycles` with: `{ title: "Mid-Year Review 2026", startDate: "2026-07-01", endDate: "2026-07-31", reviewType: "MID_YEAR" }`
2. Confirm HTTP 201
3. Confirm review cycle created for all active employees

**Expected Result:** Review cycle created  
**Pass Criteria:** Cycle covers all active employees; timeline set  
**Risk Rating:** HIGH

---

### GW-PR2-FNC-002
**Objective:** Self-assessment completed by employee  
**Preconditions:** Active review cycle; employee authenticated  
**Steps:**
1. POST `/api/v1/hr/performance-reviews/{cycleId}/self-assessment` with: `{ rating: 4, comments: "Exceeded billing targets; led 3 successful litigations", goalAchievement: 85 }`
2. Confirm HTTP 201
3. Confirm self-assessment locked after submission

**Expected Result:** Self-assessment recorded and locked  
**Pass Criteria:** Assessment locked on submission; cannot be re-submitted  
**Risk Rating:** HIGH

---

### GW-PR2-FNC-003
**Objective:** Manager review completed with rating  
**Preconditions:** Employee self-assessment submitted; manager authenticated  
**Steps:**
1. POST manager review: `{ employeeId, rating: 4, overallRating: "EXCEEDS_EXPECTATIONS", comments: "Strong performer", developmentPlan: "Mentoring junior associates" }`
2. Confirm HTTP 201
3. GET review — confirm both self and manager assessments present

**Expected Result:** Manager review recorded  
**Pass Criteria:** Both assessments visible; final rating set  
**Risk Rating:** HIGH

---

### GW-PR2-FNC-004
**Objective:** Review linked to salary increment  
**Preconditions:** Completed performance review with rating EXCEEDS_EXPECTATIONS  
**Steps:**
1. GET review with rating EXCEEDS_EXPECTATIONS
2. POST salary increment: `{ employeeId, incrementType: "MERIT", amount: 15000, effectiveDate: "2026-08-01", reviewId }`
3. Confirm salary increment linked to review

**Expected Result:** Salary increment tied to performance outcome  
**Pass Criteria:** Pay change traceable to review; audit trail  
**Risk Rating:** HIGH

---

## 62.3 Negative Tests

### GW-PR2-NEG-001
**Objective:** Review cannot be completed before self-assessment  
**Preconditions:** Review cycle active; self-assessment not submitted  
**Steps:**
1. Attempt to submit manager review before employee self-assessment
2. Record response

**Expected Result:** HTTP 400 — self-assessment required first  
**Pass Criteria:** Workflow sequence enforced  
**Risk Rating:** MEDIUM

---

## 62.4 Permission Tests

### GW-PR2-PRM-001
**Objective:** Manager cannot see peer employees' reviews  
**Preconditions:** Two separate managers with separate direct reports  
**Steps:**
1. Manager A attempts to GET reviews of Manager B's direct reports
2. Record response

**Expected Result:** HTTP 403 or empty result — access restricted to own team  
**Pass Criteria:** Review access scoped to manager's direct reports  
**Risk Rating:** HIGH

---

## 62.5 Compliance Tests

### GW-PR2-CMP-001
**Objective:** Performance data retained per HR records obligation  
**Preconditions:** Completed review from 3 years ago  
**Steps:**
1. Query reviews from 3 years ago
2. Confirm records still present
3. Confirm deletion blocked within retention period

**Expected Result:** Historical performance records retained  
**Pass Criteria:** HR records retained for minimum statutory period  
**Risk Rating:** HIGH

---

---

# BACKFILL: PERFORMANCE TESTS (ALL MODULES)

## 63.1 API Response Time Tests

### GW-PRF-ALL-001
**Objective:** All core list endpoints respond within SLA  
**Preconditions:** Seeded data; API running on Render  
**Steps:**
1. Test each endpoint with timing:
   - GET /clients?limit=50 → target < 400ms
   - GET /matters?limit=50 → target < 400ms
   - GET /billing/invoices?limit=50 → target < 400ms
   - GET /tasks/search?limit=50 → target < 400ms
   - GET /finance/trust/accounts → target < 300ms
   - GET /notifications?limit=20 → target < 300ms
   - GET /analytics (multi-source) → target < 2000ms
2. Record p50, p95, p99 for each

**Expected Result:** All endpoints within stated targets  
**Pass Criteria:** p95 within SLA for all endpoints  
**Risk Rating:** HIGH

---

### GW-PRF-ALL-002
**Objective:** Authentication endpoint performance  
**Preconditions:** Valid credentials available  
**Steps:**
1. Send 10 consecutive login requests
2. Record response times
3. Target: p95 < 500ms (bcrypt adds ~100ms)

**Expected Result:** Login < 500ms at p95  
**Pass Criteria:** bcrypt 12 rounds ≈ 100ms; JWT generation < 50ms; total < 500ms  
**Risk Rating:** HIGH

---

### GW-PRF-ALL-003
**Objective:** Trust transaction creation performance  
**Preconditions:** Trust account and client exist  
**Steps:**
1. Create 10 trust transactions in sequence
2. Record response times
3. Target: < 300ms each

**Expected Result:** Trust transactions processed quickly  
**Pass Criteria:** < 300ms per transaction; no deadlocks  
**Risk Rating:** MEDIUM

---

### GW-PRF-ALL-004
**Objective:** Document upload performance  
**Preconditions:** Storage configured  
**Steps:**
1. Upload 1MB document
2. Upload 5MB document
3. Upload 10MB document
4. Record upload times

**Expected Result:** Upload times proportional to file size  
**Pass Criteria:** 1MB < 5s; 5MB < 15s; 10MB < 30s  
**Risk Rating:** MEDIUM

---

### GW-PRF-ALL-005
**Objective:** Dashboard analytics load time  
**Preconditions:** Analytics page with 6 parallel API calls  
**Steps:**
1. Navigate to /app/analytics
2. Measure time from navigation to all charts rendered
3. Target: < 4 seconds total

**Expected Result:** Analytics loads with real data in < 4 seconds  
**Pass Criteria:** All 6 parallel fetch calls complete; charts render  
**Risk Rating:** HIGH

---

### GW-PRF-ALL-006
**Objective:** Trust three-way reconciliation performance  
**Preconditions:** Trust account with 1000+ transactions  
**Steps:**
1. POST /finance/trust/reconcile
2. Record response time

**Expected Result:** Reconciliation < 5 seconds for 1000 transactions  
**Pass Criteria:** Aggregation query optimized; no timeout  
**Risk Rating:** HIGH

---

---

# BACKFILL: INTEGRATION TESTS (KEY MODULES)

## 64.1 Billing ↔ Finance Integration

### GW-INT-BF-001
**Objective:** Invoice posting creates GL journal entries  
**Preconditions:** Posted invoice with tax  
**Steps:**
1. Issue invoice for KES 100,000 + 16% VAT = KES 116,000
2. POST `/api/v1/finance/postings` with `{ sourceType: "INVOICE", sourceId: invoiceId }`
3. Confirm journal created: DR Accounts Receivable 116,000 / CR Revenue 100,000 / CR VAT Payable 16,000
4. Confirm debits = credits = 116,000

**Expected Result:** Invoice correctly journalized  
**Pass Criteria:** Accounts Receivable, Revenue, VAT Payable all affected  
**Risk Rating:** CRITICAL

---

### GW-INT-BF-002
**Objective:** Payment receipt closes AR and debits bank  
**Preconditions:** Issued invoice and bank account GL exist  
**Steps:**
1. Record payment receipt for full invoice amount
2. POST financial posting for receipt
3. Confirm: DR Bank Account 116,000 / CR Accounts Receivable 116,000
4. Confirm: Invoice status = PAID; AR account balance reduced

**Expected Result:** Payment posting closes AR  
**Pass Criteria:** Double-entry correct; invoice closed  
**Risk Rating:** CRITICAL

---

## 64.2 Trust ↔ Finance Integration

### GW-INT-TF-001
**Objective:** Trust transfer to office creates finance journal  
**Preconditions:** Trust account, office account, and GL chart exist  
**Steps:**
1. Execute TRANSFER_TO_OFFICE for KES 150,000
2. Confirm GL journal: DR Trust Liability / CR Professional Fees Revenue
3. Confirm trust account balance reduced; revenue account increased

**Expected Result:** Trust-to-office transfer triggers GL posting  
**Pass Criteria:** Double-entry accounting maintained for trust movements  
**Risk Rating:** CRITICAL

---

## 64.3 Payroll ↔ Finance Integration

### GW-INT-PF-001
**Objective:** Payroll run creates salary expense journal entries  
**Preconditions:** Payroll run approved; GL accounts for salary, PAYE, SHIF, NSSF exist  
**Steps:**
1. Approve payroll run
2. POST payroll financial posting
3. Confirm: DR Salary Expense 100,000 / CR Bank 85,000 / CR PAYE Payable 10,000 / CR SHIF Payable 2,750 / CR NSSF Payable 1,440 / CR Housing Levy Payable 810
4. Confirm: Debits = Credits = 100,000

**Expected Result:** Payroll fully journalized with all deductions  
**Pass Criteria:** All payroll expense and liability accounts affected  
**Risk Rating:** CRITICAL

---

## 64.4 Notifications ↔ All Modules Integration

### GW-INT-NM-001
**Objective:** Notification triggers work across all modules  
**Preconditions:** Notification system active  
**Steps:**
1. Create task → confirm task-assigned notification
2. Schedule calendar event → confirm event-created notification
3. Invoice overdue → confirm overdue notification
4. Trust deposit → confirm deposit notification
5. Court hearing tomorrow → confirm hearing-reminder notification

**Expected Result:** All module events trigger notifications  
**Pass Criteria:** 5/5 notification triggers working  
**Risk Rating:** HIGH

---

## 64.5 AI ↔ Documents Integration

### GW-INT-AI-001
**Objective:** AI contract analysis accesses document storage  
**Preconditions:** Contract document uploaded; AI provider active  
**Steps:**
1. POST AI artifact with `{ taskType: "CONTRACT_REVIEW", documentId }`
2. Confirm AI service can access document content via signedUrl
3. Confirm AI analysis output based on actual document content

**Expected Result:** AI reads from document storage correctly  
**Pass Criteria:** AI output references specific clauses from the document  
**Risk Rating:** HIGH

---

---

# BACKFILL: DISASTER RECOVERY TESTS (KEY MODULES)

## 65.1 Database Recovery

### GW-DRV-ALL-001
**Objective:** All module data survives API restart  
**Preconditions:** Data across all modules present  
**Steps:**
1. Note counts: clients, matters, invoices, trust transactions, payroll records
2. Trigger API restart
3. GET each endpoint after restart
4. Confirm counts match pre-restart

**Expected Result:** Zero data loss across all modules  
**Pass Criteria:** All data persists; counts identical  
**Risk Rating:** CRITICAL

---

### GW-DRV-ALL-002
**Objective:** Neon DB point-in-time recovery works  
**Preconditions:** Neon DB with PITR enabled  
**Steps:**
1. Note current DB state (record counts)
2. Simulate data loss scenario
3. Restore to point-in-time backup
4. Confirm data restored correctly

**Expected Result:** PITR restores to pre-loss state  
**Pass Criteria:** Data integrity after restore; no corruption  
**Risk Rating:** CRITICAL

---

### GW-DRV-ALL-003
**Objective:** Trust accounting data survives Render crash  
**Preconditions:** Trust transactions present  
**Steps:**
1. Note trust account balances
2. Simulate Render crash (kill API process)
3. Allow auto-restart
4. GET trust accounts after restart
5. Confirm balances unchanged

**Expected Result:** Trust data fully persistent  
**Pass Criteria:** No balance modification during crash/restart  
**Risk Rating:** CRITICAL

---

### GW-DRV-ALL-004
**Objective:** Audit log continuity after restart  
**Preconditions:** 100+ audit entries with intact hash chain  
**Steps:**
1. Note last hash and sequenceNumber
2. Restart API
3. Perform action to generate new audit entry
4. Confirm: new entry's previousHash = pre-restart last hash
5. Confirm: hash chain unbroken

**Expected Result:** Audit chain continuous across restarts  
**Pass Criteria:** Hash chain never breaks regardless of restart  
**Risk Rating:** CRITICAL

---

### GW-DRV-ALL-005
**Objective:** Session recovery after API restart  
**Preconditions:** Active user sessions  
**Steps:**
1. Login and obtain JWT token
2. Restart API
3. Use existing JWT for API request
4. Confirm: JWT still valid (JWT is stateless; API validates without session store)

**Expected Result:** JWT sessions survive restart  
**Pass Criteria:** Stateless JWT means no session re-login needed  
**Risk Rating:** HIGH

---

### GW-DRV-ALL-006
**Objective:** Database backup restoration verified  
**Preconditions:** Neon automatic backup enabled  
**Steps:**
1. Confirm Neon backup schedule is set (daily minimum)
2. List available restore points
3. Test restore to staging environment (not production)
4. Confirm all tables and data present in restored instance

**Expected Result:** Backup restorable to full system state  
**Pass Criteria:** Restore completes; all 175 models present; data consistent  
**Risk Rating:** CRITICAL

---


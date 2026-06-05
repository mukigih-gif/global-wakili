# GLOBAL WAKILI LEGAL ENTERPRISE
## Enterprise UAT Certification Pack — Part 2 of 4
### Matter Tasks · Matter Workflows · Court Hearings · Contracts · Documents · Document Versions · Document Security · Time Tracking · Billing · Invoicing · Payments · Accounts Receivable · Accounts Payable · Procurement · Vendors

---

# MODULE 10: MATTER TASKS

## 10.1 Smoke Tests

### GW-MK-SMK-001
**Objective:** Task list loads for a matter  
**Preconditions:** Matter with 5 seeded tasks exists  
**Steps:**
1. GET `/api/v1/tasks/search?matterId={matterId}&limit=20`
2. Confirm HTTP 200
3. Confirm 5 tasks returned with id, title, status, priority, assignedTo

**Expected Result:** All matter tasks returned  
**Pass Criteria:** Task list correct; required fields present  
**Risk Rating:** HIGH

---

### GW-MK-SMK-002
**Objective:** Task detail accessible  
**Preconditions:** Task ID known  
**Steps:**
1. GET `/api/v1/tasks/{taskId}`
2. Confirm HTTP 200
3. Confirm title, status, priority, dueDate, assignee, matter, comments

**Expected Result:** Full task detail returned  
**Pass Criteria:** All fields populated including related matter  
**Risk Rating:** HIGH

---

## 10.2 Functional Tests

### GW-MK-FNC-001
**Objective:** Task created with due date and time  
**Preconditions:** Firm admin authenticated; matter exists  
**Steps:**
1. POST `/api/v1/tasks` with `{ title, matterId, priority: "HIGH", status: "TODO", dueDate: "2026-06-06T12:00", assignedTo: userId }`
2. Confirm HTTP 201
3. GET task — confirm dueDate = "2026-06-06T12:00" (datetime preserved)

**Expected Result:** Task created with exact datetime  
**Pass Criteria:** Due time (not just date) preserved in database  
**Risk Rating:** HIGH

---

### GW-MK-FNC-002
**Objective:** Task status transitions correctly  
**Preconditions:** Task in TODO status  
**Steps:**
1. PATCH `/api/v1/tasks/{taskId}` with `{ status: "IN_PROGRESS" }` → expect 200
2. PATCH with `{ status: "DONE" }` → expect 200
3. Confirm completedAt automatically set when status = DONE

**Expected Result:** Status transitions persist; completedAt auto-populated  
**Pass Criteria:** All valid transitions succeed; invalid transitions rejected  
**Risk Rating:** HIGH

---

### GW-MK-FNC-003
**Objective:** Task comment thread works  
**Preconditions:** Task exists; user authenticated  
**Steps:**
1. POST `/api/v1/tasks/{taskId}/comments` with `{ message: "Updated pleadings draft" }`
2. Confirm HTTP 201
3. GET `/api/v1/tasks/{taskId}/comments`
4. Confirm comment with sender name and timestamp

**Expected Result:** Comment created and retrievable  
**Pass Criteria:** Comment thread functional; sender identified  
**Risk Rating:** MEDIUM

---

### GW-MK-FNC-004
**Objective:** Task assignment notification sent  
**Preconditions:** SMTP/SendGrid configured or simulation mode active  
**Steps:**
1. Create task with `assignedTo: userId` (different from creator)
2. Confirm in-app notification created for assignee
3. If email configured, confirm email dispatched

**Expected Result:** Notification sent on task assignment  
**Pass Criteria:** In-app notification exists; email sent if configured  
**Risk Rating:** HIGH

---

### GW-MK-FNC-005
**Objective:** Overdue task highlighted correctly  
**Preconditions:** Task with dueDate in the past and status = TODO  
**Steps:**
1. GET `/api/v1/tasks/search?status=TODO`
2. Confirm overdue tasks identifiable (dueDate < now)
3. Check frontend task list — confirm red highlighting for overdue tasks

**Expected Result:** Overdue tasks visually distinguished  
**Pass Criteria:** isOverdue correctly computed on frontend  
**Risk Rating:** MEDIUM

---

### GW-MK-FNC-006
**Objective:** Managing partner can see all firm tasks  
**Preconditions:** MANAGING_PARTNER authenticated; 10+ tasks across firm  
**Steps:**
1. Login as MANAGING_PARTNER
2. GET `/api/v1/tasks/search?limit=100` (no assignedToMe filter)
3. Confirm tasks from all advocates returned

**Expected Result:** Full firm task visibility for managing partner  
**Pass Criteria:** All tasks in tenant returned regardless of assignment  
**Risk Rating:** HIGH

---

## 10.3 Negative Tests

### GW-MK-NEG-001
**Objective:** Past due date cannot be set as future enforcement  
**Preconditions:** Task form with dueDate  
**Steps:**
1. Submit task with `dueDate: "2020-01-01T09:00"` (past datetime)
2. Confirm API accepts or frontend blocks

**Expected Result:** Past due dates allowed for data integrity; frontend warns  
**Pass Criteria:** No hard block on past dates; UI shows warning  
**Risk Rating:** LOW

---

### GW-MK-NEG-002
**Objective:** Task cannot be created without matterId  
**Preconditions:** Firm admin authenticated  
**Steps:**
1. POST `/api/v1/tasks` without `matterId` field
2. Record response

**Expected Result:** HTTP 400 — matterId required (schema constraint)  
**Pass Criteria:** Zod/Prisma validation enforces matterId as required  
**Risk Rating:** HIGH

---

## 10.4 Permission Tests

### GW-MK-PRM-001
**Objective:** CLERK can view but not approve time entries  
**Preconditions:** CLERK authenticated  
**Steps:**
1. GET `/api/v1/tasks/search` as CLERK — expect 200
2. PATCH task to approve time — expect 403

**Expected Result:** CLERK view access granted; approval blocked  
**Pass Criteria:** Permission boundaries enforced per role  
**Risk Rating:** HIGH

---

## 10.5 Multi-Tenant Isolation Tests

### GW-MK-MTI-001
**Objective:** Tasks from Tenant A not visible in Tenant B  
**Preconditions:** Tenant A tasks exist  
**Steps:**
1. Login as Tenant B
2. GET `/api/v1/tasks/search`
3. Confirm zero Tenant A tasks in results

**Expected Result:** Task list fully tenant-isolated  
**Pass Criteria:** WHERE tenantId applied to all task queries  
**Risk Rating:** CRITICAL

---

## 10.6 Audit Trail Tests

### GW-MK-AUD-001
**Objective:** Task completion audited with timestamp  
**Preconditions:** Task in TODO status  
**Steps:**
1. Mark task as DONE
2. Query AuditLog: `WHERE action = 'TASK_COMPLETED'`
3. Confirm: actorUserId, taskId, matterId, completedAt

**Expected Result:** Task completion audit entry with all context  
**Pass Criteria:** Proof of completion captured in audit trail  
**Risk Rating:** HIGH

---

---

# MODULE 11: MATTER WORKFLOWS

## 11.1 Smoke Tests

### GW-WF-SMK-001
**Objective:** Workflow templates list accessible  
**Preconditions:** Firm admin authenticated  
**Steps:**
1. Navigate to `/app/workflows`
2. Click Templates tab
3. Confirm Commercial and Litigation workflow templates visible

**Expected Result:** 8 workflow templates displayed (4 Commercial, 4 Litigation)  
**Pass Criteria:** Templates render with steps pipeline  
**Risk Rating:** MEDIUM

---

## 11.2 Functional Tests

### GW-WF-FNC-001
**Objective:** Starting a workflow creates active instance  
**Preconditions:** Firm admin authenticated  
**Steps:**
1. Navigate to Workflows → Templates
2. Click Start on "Contract Review & Execution"
3. Confirm workflow created
4. Navigate to Active tab — confirm workflow visible with status IN_PROGRESS

**Expected Result:** Workflow instance created and tracked  
**Pass Criteria:** POST `/api/v1/workflows` returns 201; instance in Active list  
**Risk Rating:** HIGH

---

### GW-WF-FNC-002
**Objective:** Workflow step progression tracked  
**Preconditions:** Active workflow in "Receive" step  
**Steps:**
1. PATCH `/api/v1/workflows/{workflowId}` with `{ currentStep: "Review", status: "IN_PROGRESS" }`
2. Confirm HTTP 200
3. GET workflow — confirm currentStep = "Review"

**Expected Result:** Step advancement recorded  
**Pass Criteria:** Step history maintained; no step skipping  
**Risk Rating:** HIGH

---

### GW-WF-FNC-003
**Objective:** Workflow linked to matter  
**Preconditions:** Active matter and workflow template exist  
**Steps:**
1. Create workflow with `matterId` = existing matter ID
2. GET workflow — confirm matter nested in response
3. GET matter — confirm associated workflows visible

**Expected Result:** Bidirectional workflow-matter relationship  
**Pass Criteria:** Matter and workflow correctly linked  
**Risk Rating:** MEDIUM

---

## 11.3 Negative Tests

### GW-WF-NEG-001
**Objective:** Invalid workflow type rejected  
**Preconditions:** Firm admin authenticated  
**Steps:**
1. POST `/api/v1/workflows` with `{ workflowType: "NONEXISTENT_TYPE" }`
2. Record response

**Expected Result:** HTTP 400 — invalid workflowType enum value  
**Pass Criteria:** Zod enum validation enforces valid workflow types  
**Risk Rating:** MEDIUM

---

## 11.4 Multi-Tenant Isolation Tests

### GW-WF-MTI-001
**Objective:** Workflows not shared across tenants  
**Preconditions:** Tenant A has active workflows  
**Steps:**
1. Login as Tenant B
2. GET `/api/v1/workflows`
3. Confirm Tenant A workflows not visible

**Expected Result:** Workflow list tenant-isolated  
**Pass Criteria:** tenantId filter applied to workflow queries  
**Risk Rating:** CRITICAL

---

---

# MODULE 12: COURT HEARINGS

## 12.1 Smoke Tests

### GW-CH-SMK-001
**Objective:** Court filings page accessible  
**Preconditions:** Firm admin authenticated  
**Steps:**
1. Navigate to `/app/court/filings`
2. Confirm page loads
3. Confirm hearing list or empty state visible

**Expected Result:** Court filings page renders  
**Pass Criteria:** No 404; page loads without errors  
**Risk Rating:** MEDIUM

---

## 12.2 Functional Tests

### GW-CH-FNC-001
**Objective:** Court hearing created and linked to matter  
**Preconditions:** Active matter exists  
**Steps:**
1. POST `/api/v1/court/hearings` with `{ matterId, title: "Mention — Doe v Smith", hearingDate: "2026-07-15T09:00", court: "Milimani High Court", courtRoom: "Room 3" }`
2. Confirm HTTP 201
3. GET `/api/v1/court/hearings?matterId={matterId}` — confirm hearing visible

**Expected Result:** Hearing created and linked to matter  
**Pass Criteria:** Hearing appears in matter's hearing list  
**Risk Rating:** HIGH

---

### GW-CH-FNC-002
**Objective:** Court hearing syncs to calendar  
**Preconditions:** Court hearing created  
**Steps:**
1. GET `/api/v1/calendar/events?matterId={matterId}`
2. Confirm calendar event created with type COURT_HEARING
3. Confirm hearing date matches calendar event startTime

**Expected Result:** Court hearing automatically creates calendar event  
**Pass Criteria:** Calendar event with COURT_HEARING type linked to matter  
**Risk Rating:** HIGH

---

### GW-CH-FNC-003
**Objective:** Court hearing outcome recorded  
**Preconditions:** Past hearing exists  
**Steps:**
1. PATCH `/api/v1/court/hearings/{hearingId}` with `{ outcome: "Adjourned to 2026-08-15", status: "COMPLETED" }`
2. Confirm HTTP 200
3. GET hearing — confirm outcome recorded

**Expected Result:** Hearing outcome persisted  
**Pass Criteria:** Outcome and next hearing date captured  
**Risk Rating:** HIGH

---

### GW-CH-FNC-004
**Objective:** Court filing created  
**Preconditions:** Matter with court case  
**Steps:**
1. POST `/api/v1/court/filings` with `{ matterId, filingType: "PLAINT", description, dueDate, documentId (optional) }`
2. Confirm HTTP 201
3. GET filings for matter — confirm filing visible

**Expected Result:** Court filing created and linked  
**Pass Criteria:** Filing appears in matter filing list  
**Risk Rating:** HIGH

---

## 12.3 Negative Tests

### GW-CH-NEG-001
**Objective:** Hearing in the past cannot be created without confirmation  
**Preconditions:** Firm admin authenticated  
**Steps:**
1. POST court hearing with `hearingDate: "2020-01-01T09:00"`
2. Confirm API accepts (historical data) or warns

**Expected Result:** Past hearings allowed for record-keeping; UI warns  
**Pass Criteria:** Data integrity maintained; past dates not hard-blocked  
**Risk Rating:** LOW

---

## 12.4 Permission Tests

### GW-CH-PRM-001
**Objective:** Only authorized roles can create court hearings  
**Preconditions:** CLERK authenticated  
**Steps:**
1. POST `/api/v1/court/hearings` as CLERK
2. Record response

**Expected Result:** HTTP 403 or 200 depending on clerk's court.manage_hearing permission  
**Pass Criteria:** Permission `court.manage_hearing` checked  
**Risk Rating:** HIGH

---

## 12.5 Compliance Tests

### GW-CH-CMP-001
**Objective:** Compliance dates for court filing deadlines tracked  
**Preconditions:** Court filing with deadline  
**Steps:**
1. Create court filing with `dueDate` = 7 days from now
2. Confirm calendar event created with type DEADLINE
3. Confirm amber/red highlight on calendar cell for deadline date

**Expected Result:** Compliance deadlines visible on calendar  
**Pass Criteria:** Deadline highlighted; reminder notification scheduled  
**Risk Rating:** HIGH

---

---

# MODULE 13: CONTRACTS

## 13.1 Smoke Tests

### GW-CO-SMK-001
**Objective:** Contracts tab accessible in Documents module  
**Preconditions:** Firm admin authenticated  
**Steps:**
1. Navigate to `/app/documents`
2. Click Contracts tab
3. Confirm contracts listed or empty state

**Expected Result:** Contracts tab renders  
**Pass Criteria:** Tab navigates correctly; no 404  
**Risk Rating:** MEDIUM

---

## 13.2 Functional Tests

### GW-CO-FNC-001
**Objective:** Contract document uploaded and categorized  
**Preconditions:** Firm admin authenticated  
**Steps:**
1. Navigate to Documents → Upload Document
2. Select file, set documentType = CONTRACT
3. Submit
4. Navigate to Contracts tab — confirm document appears

**Expected Result:** Contract visible in Contracts tab  
**Pass Criteria:** Document with CONTRACT type filterable  
**Risk Rating:** HIGH

---

### GW-CO-FNC-002
**Objective:** Contract linked to matter  
**Preconditions:** Contract document and matter exist  
**Steps:**
1. Upload document with `matterId` = existing matter ID and `documentType: "CONTRACT"`
2. GET `/api/v1/documents?matterId={matterId}&documentType=CONTRACT`
3. Confirm contract in results

**Expected Result:** Contract linked to matter and retrievable  
**Pass Criteria:** Contract appears in matter's document list  
**Risk Rating:** HIGH

---

## 13.3 Negative Tests

### GW-CO-NEG-001
**Objective:** Contract upload without title rejected  
**Preconditions:** Firm admin authenticated  
**Steps:**
1. Attempt document upload without `title` field
2. Record frontend validation response

**Expected Result:** Upload blocked — title required  
**Pass Criteria:** Frontend validation prevents submission without title  
**Risk Rating:** MEDIUM

---

---

# MODULE 14: DOCUMENTS

## 14.1 Smoke Tests

### GW-DC-SMK-001
**Objective:** Document list loads  
**Preconditions:** Firm admin authenticated  
**Steps:**
1. GET `/api/v1/documents?limit=20`
2. Confirm HTTP 200
3. Confirm `data` array returned

**Expected Result:** Document list loads  
**Pass Criteria:** Response includes documents with required fields  
**Risk Rating:** HIGH

---

## 14.2 Functional Tests

### GW-DC-FNC-001
**Objective:** Document uploaded via multipart form  
**Preconditions:** Firm admin authenticated; document file available  
**Steps:**
1. POST `/api/v1/documents/upload` with multipart form: file, title, documentType, matterId
2. Confirm HTTP 201
3. GET `/api/v1/documents/{documentId}` — confirm signedUrl present

**Expected Result:** Document uploaded; signed URL generated for download  
**Pass Criteria:** File stored; metadata persisted; signed URL accessible  
**Risk Rating:** HIGH

---

### GW-DC-FNC-002
**Objective:** PDF document preview works  
**Preconditions:** PDF document uploaded with signedUrl  
**Steps:**
1. Navigate to `/app/documents`
2. Click eye icon on a PDF document
3. Confirm preview panel opens with PDF iframe

**Expected Result:** PDF renders in browser preview panel  
**Pass Criteria:** PDF iframe loads from signedUrl  
**Risk Rating:** MEDIUM

---

### GW-DC-FNC-003
**Objective:** Document search returns correct results  
**Preconditions:** Multiple documents with different titles  
**Steps:**
1. GET `/api/v1/documents?search=Agreement&limit=10`
2. Confirm only documents matching "Agreement" returned

**Expected Result:** Search filters documents by title  
**Pass Criteria:** Search is case-insensitive; relevant results returned  
**Risk Rating:** MEDIUM

---

### GW-DC-FNC-004
**Objective:** Document download via signed URL works  
**Preconditions:** Document with signedUrl exists  
**Steps:**
1. GET signedUrl from document record
2. Confirm file downloads correctly
3. Confirm file content matches original upload

**Expected Result:** File downloadable from signed URL  
**Pass Criteria:** Download completes; file integrity preserved  
**Risk Rating:** HIGH

---

## 14.3 Negative Tests

### GW-DC-NEG-001
**Objective:** Oversized file upload rejected  
**Preconditions:** File > 50MB available  
**Steps:**
1. Attempt upload of 60MB file
2. Record response

**Expected Result:** HTTP 413 — file too large  
**Pass Criteria:** Size limit enforced at API level  
**Risk Rating:** MEDIUM

---

### GW-DC-NEG-002
**Objective:** Malicious file extension blocked  
**Preconditions:** File with `.exe` extension  
**Steps:**
1. Attempt upload of `.exe` file
2. Record response

**Expected Result:** Upload rejected — executable files not permitted  
**Pass Criteria:** File type validation enforced  
**Risk Rating:** HIGH

---

## 14.4 Permission Tests

### GW-DC-PRM-001
**Objective:** Only authorized users can view private documents  
**Preconditions:** Document marked isPrivate=true; non-owner authenticated  
**Steps:**
1. Create private document as user A
2. Login as user B (different role, no explicit access)
3. GET document — confirm 403 or empty

**Expected Result:** Private documents inaccessible to unauthorized users  
**Pass Criteria:** Document privacy enforced at query level  
**Risk Rating:** HIGH

---

## 14.5 Multi-Tenant Isolation Tests

### GW-DC-MTI-001
**Objective:** Documents not accessible across tenants  
**Preconditions:** Tenant A document ID known  
**Steps:**
1. Login as Tenant B
2. GET `/api/v1/documents/{tenant_a_document_id}`
3. Record response

**Expected Result:** HTTP 404 — document not found  
**Pass Criteria:** Document tenantId enforced in all queries  
**Risk Rating:** CRITICAL

---

## 14.6 Audit Trail Tests

### GW-DC-AUD-001
**Objective:** Document upload audited  
**Preconditions:** Audit logging active  
**Steps:**
1. Upload document
2. Query AuditLog: `WHERE action = 'DOCUMENT_UPLOADED'`
3. Confirm: actorUserId, documentId, matterId, tenantId

**Expected Result:** Upload event in audit log  
**Pass Criteria:** Full document audit trail functional  
**Risk Rating:** HIGH

---

### GW-DC-AUD-002
**Objective:** Document download audited  
**Preconditions:** Document exists  
**Steps:**
1. Access document download
2. Query AuditLog: `WHERE action = 'DOCUMENT_DOWNLOADED'`
3. Confirm entry with timestamp, actorUserId

**Expected Result:** Download event audited  
**Pass Criteria:** Document access trail complete  
**Risk Rating:** HIGH

---

---

# MODULE 15: DOCUMENT VERSIONS

## 15.1 Functional Tests

### GW-DV-FNC-001
**Objective:** New document version created on upload  
**Preconditions:** Existing document version 1  
**Steps:**
1. POST `/api/v1/documents/{documentId}/versions` with new file
2. Confirm HTTP 201
3. GET document — confirm `currentVersion` = 2

**Expected Result:** Version counter incremented  
**Pass Criteria:** Version history maintained; previous versions retrievable  
**Risk Rating:** HIGH

---

### GW-DV-FNC-002
**Objective:** Previous document version retrievable  
**Preconditions:** Document with 3 versions  
**Steps:**
1. GET `/api/v1/documents/{documentId}/versions`
2. Confirm 3 version entries with versionNumber, uploadedBy, createdAt, signedUrl

**Expected Result:** All versions listed with metadata  
**Pass Criteria:** Version history complete and accessible  
**Risk Rating:** HIGH

---

## 15.2 Negative Tests

### GW-DV-NEG-001
**Objective:** Cannot delete active document version if only version  
**Preconditions:** Document with single version  
**Steps:**
1. DELETE `/api/v1/documents/{documentId}/versions/1`
2. Record response

**Expected Result:** HTTP 400 — cannot delete only version  
**Pass Criteria:** At least one version must exist at all times  
**Risk Rating:** HIGH

---

---

# MODULE 16: DOCUMENT SECURITY

## 16.1 Functional Tests

### GW-DS-FNC-001
**Objective:** Document access control enforced  
**Preconditions:** Document with restricted access  
**Steps:**
1. Set document access level to RESTRICTED
2. Attempt access as non-authorized user
3. Confirm 403

**Expected Result:** Restricted document not accessible to unauthorized users  
**Pass Criteria:** Access control at document level works  
**Risk Rating:** HIGH

---

### GW-DS-FNC-002
**Objective:** Signed URL expires  
**Preconditions:** Signed URL generated  
**Steps:**
1. Generate signed URL with 5-minute expiry
2. Wait 6 minutes
3. Attempt to access URL
4. Confirm access denied (403 or 404)

**Expected Result:** Signed URL no longer valid after expiry  
**Pass Criteria:** Time-limited access enforced  
**Risk Rating:** HIGH

---

---

# MODULE 17: TIME TRACKING

## 17.1 Smoke Tests

### GW-TT-SMK-001
**Objective:** Time capture page accessible  
**Preconditions:** Firm admin authenticated  
**Steps:**
1. Navigate to `/app/time-capture`
2. Confirm page loads with WIP summary cards
3. Confirm activity source cards visible

**Expected Result:** Time capture module renders  
**Pass Criteria:** KPI cards show totals; no console errors  
**Risk Rating:** HIGH

---

## 17.2 Functional Tests

### GW-TT-FNC-001
**Objective:** Time entry created and linked to matter  
**Preconditions:** Advocate authenticated; matter exists  
**Steps:**
1. POST `/api/v1/time-entries` with: `{ matterId, advocateId, description: "Court attendance", durationHours: 4, appliedRate: 20000, billableAmount: 80000, entryDate, isBillable: true }`
2. Confirm HTTP 201
3. GET time entry — confirm all fields persisted

**Expected Result:** Time entry created  
**Pass Criteria:** billableAmount = durationHours × appliedRate  
**Risk Rating:** HIGH

---

### GW-TT-FNC-002
**Objective:** Time entry approval workflow  
**Preconditions:** Time entry in DRAFT status  
**Steps:**
1. PATCH `/api/v1/time-entries/{id}` with `{ status: "SUBMITTED" }` as advocate
2. PATCH with `{ status: "APPROVED" }` as PARTNER
3. Confirm matter wipValue increased

**Expected Result:** Approval workflow: DRAFT → SUBMITTED → APPROVED  
**Pass Criteria:** WIP updates on approval; advocate cannot self-approve  
**Risk Rating:** HIGH

---

### GW-TT-FNC-003
**Objective:** Approved time entries included in invoice  
**Preconditions:** 3 approved time entries for a matter  
**Steps:**
1. Generate invoice for matter
2. Confirm invoice line items include time entries
3. Confirm billable amounts sum correctly

**Expected Result:** All approved time entries billed in invoice  
**Pass Criteria:** Time entries converted to invoice lines accurately  
**Risk Rating:** HIGH

---

### GW-TT-FNC-004
**Objective:** Write-off of time entry recorded  
**Preconditions:** Approved time entry exists  
**Steps:**
1. POST `/api/v1/time-entries/{id}/write-off` with `{ reason: "Client dispute", amount: 20000 }`
2. Confirm HTTP 200
3. Confirm write-off record created; billableAmount reduced

**Expected Result:** Write-off recorded and matter WIP adjusted  
**Pass Criteria:** Write-off audit trail; WIP correctly reduced  
**Risk Rating:** HIGH

---

## 17.3 Negative Tests

### GW-TT-NEG-001
**Objective:** Zero-hour time entry rejected  
**Preconditions:** Advocate authenticated  
**Steps:**
1. POST time entry with `durationHours: 0`
2. Record response

**Expected Result:** HTTP 400 — duration must be greater than 0  
**Pass Criteria:** Validation rejects zero-duration entries  
**Risk Rating:** HIGH

---

### GW-TT-NEG-002
**Objective:** Advocate cannot approve own time entries  
**Preconditions:** ASSOCIATE with submitted time entry  
**Steps:**
1. PATCH `/api/v1/time-entries/{id}` with `{ status: "APPROVED" }` as same advocate
2. Record response

**Expected Result:** HTTP 403 — cannot approve own time  
**Pass Criteria:** Self-approval business rule enforced  
**Risk Rating:** HIGH

---

## 17.4 Permission Tests

### GW-TT-PRM-001
**Objective:** Only PARTNER+ can approve time entries  
**Preconditions:** ASSOCIATE authenticated; time entry in SUBMITTED status  
**Steps:**
1. PATCH time entry status to APPROVED as ASSOCIATE
2. Record response

**Expected Result:** HTTP 403 — approval requires PARTNER permission  
**Pass Criteria:** `matter.approve_time_entry` required for approval  
**Risk Rating:** HIGH

---

## 17.5 Multi-Tenant Isolation Tests

### GW-TT-MTI-001
**Objective:** Time entries not accessible across tenants  
**Preconditions:** Tenant A time entries exist  
**Steps:**
1. Login as Tenant B
2. GET `/api/v1/time-entries?limit=50`
3. Confirm zero Tenant A time entries

**Expected Result:** Time entries tenant-isolated  
**Pass Criteria:** tenantId filter enforced  
**Risk Rating:** CRITICAL

---

## 17.6 Audit Trail Tests

### GW-TT-AUD-001
**Objective:** Time entry approval audited  
**Preconditions:** Time entry exists  
**Steps:**
1. Approve time entry as PARTNER
2. Query AuditLog: `WHERE action = 'TIME_ENTRY_APPROVED'`
3. Confirm: actorUserId (approver), advocateId (submitter), matterId, amount

**Expected Result:** Full approval audit trail  
**Pass Criteria:** Who approved, who submitted, what amount captured  
**Risk Rating:** HIGH

---

---

# MODULE 18: BILLING

## 18.1 Smoke Tests

### GW-BL-SMK-001
**Objective:** Billing module accessible with quotation and invoice tabs  
**Preconditions:** Firm admin authenticated  
**Steps:**
1. Navigate to `/app/billing`
2. Confirm Quotations tab and Invoices tab visible
3. Confirm lifecycle banner: Quotation → Accepted → Invoice Issued → Paid

**Expected Result:** Billing module renders with full lifecycle view  
**Pass Criteria:** Both tabs functional; lifecycle banner displayed  
**Risk Rating:** HIGH

---

## 18.2 Functional Tests

### GW-BL-FNC-001
**Objective:** Quotation created with line items and VAT  
**Preconditions:** Client and matter exist  
**Steps:**
1. Navigate to `/app/billing/quotations/new`
2. Select client, add matter, set currency = KES
3. Add line item: "Professional legal fees", qty: 1, unitPrice: 100000, vatRate: 16
4. Confirm subtotal = 100,000, VAT = 16,000, total = 116,000
5. Submit quotation

**Expected Result:** Quotation created with correct VAT calculation  
**Pass Criteria:** subtotal + VAT = total; formatting correct (116,000.00)  
**Risk Rating:** HIGH

---

### GW-BL-FNC-002
**Objective:** Accepted quotation converts to invoice  
**Preconditions:** Quotation in ACCEPTED status  
**Steps:**
1. Click "Convert to Invoice" on ACCEPTED quotation
2. Confirm POST `/api/v1/billing/quotations/{id}/convert` returns 201
3. Navigate to Invoices tab — confirm new invoice visible
4. Confirm quotation status = CONVERTED

**Expected Result:** Invoice created from quotation; quotation marked CONVERTED  
**Pass Criteria:** Invoice number assigned; line items transferred  
**Risk Rating:** HIGH

---

### GW-BL-FNC-003
**Objective:** Invoice number auto-generated per configuration  
**Preconditions:** Invoice prefix configured as "INV", next = 1001  
**Steps:**
1. Create new invoice
2. Confirm invoice number = "INV-1001"
3. Create another invoice — confirm "INV-1002"

**Expected Result:** Invoice numbers sequential and prefix-correct  
**Pass Criteria:** Auto-increment works; no gaps or duplicates  
**Risk Rating:** HIGH

---

### GW-BL-FNC-004
**Objective:** Decimal formatting correct on all amounts  
**Preconditions:** Invoice with amount 5000  
**Steps:**
1. Create invoice with total amount 5000
2. View invoice list — confirm displayed as "KES 5,000.00"
3. Confirm no "KES 5000" without formatting

**Expected Result:** All currency amounts formatted as X,XXX.XX  
**Pass Criteria:** formatCurrency utility applied consistently  
**Risk Rating:** MEDIUM

---

### GW-BL-FNC-005
**Objective:** Overdue invoice flagged correctly  
**Preconditions:** Invoice with dueDate in the past, status = ISSUED  
**Steps:**
1. GET `/api/v1/billing/invoices?status=OVERDUE`
2. Confirm past-due invoices included
3. Confirm red highlighting in UI

**Expected Result:** Overdue invoices identified and flagged  
**Pass Criteria:** Status = OVERDUE when dueDate < today and unpaid  
**Risk Rating:** HIGH

---

## 18.3 Negative Tests

### GW-BL-NEG-001
**Objective:** Invoice cannot be created without client  
**Preconditions:** Firm admin authenticated  
**Steps:**
1. POST `/api/v1/billing/invoices` without `clientId`
2. Record response

**Expected Result:** HTTP 400 — clientId required  
**Pass Criteria:** Validation enforces client linkage  
**Risk Rating:** HIGH

---

### GW-BL-NEG-002
**Objective:** Voided invoice cannot be modified  
**Preconditions:** Invoice with status = VOID  
**Steps:**
1. PATCH `/api/v1/billing/invoices/{id}` with any field change
2. Record response

**Expected Result:** HTTP 400 or 403 — cannot modify void invoice  
**Pass Criteria:** Terminal status protection enforced  
**Risk Rating:** HIGH

---

## 18.4 Permission Tests

### GW-BL-PRM-001
**Objective:** Only CFO/Accountant/PARTNER+ can create invoices  
**Preconditions:** CLERK authenticated  
**Steps:**
1. POST `/api/v1/billing/invoices` as CLERK
2. Record response

**Expected Result:** HTTP 403 — billing.create_invoice permission required  
**Pass Criteria:** Invoice creation restricted to authorized roles  
**Risk Rating:** HIGH

---

## 18.5 Multi-Tenant Isolation Tests

### GW-BL-MTI-001
**Objective:** Invoices not accessible across tenants  
**Preconditions:** Tenant A invoice ID known  
**Steps:**
1. Login as Tenant B
2. GET `/api/v1/billing/invoices/{tenant_a_invoice_id}`
3. Record response

**Expected Result:** HTTP 404 — invoice not found  
**Pass Criteria:** Invoice tenantId enforced in all queries  
**Risk Rating:** CRITICAL

---

## 18.6 Audit Trail Tests

### GW-BL-AUD-001
**Objective:** Invoice issuance audited  
**Preconditions:** Draft invoice exists  
**Steps:**
1. Issue invoice (DRAFT → ISSUED)
2. Query AuditLog: `WHERE action = 'INVOICE_ISSUED'`
3. Confirm: actorUserId, invoiceId, clientId, totalAmount, issuedDate

**Expected Result:** Issuance event in audit log  
**Pass Criteria:** Complete billing audit trail  
**Risk Rating:** HIGH

---

## 18.7 Compliance Tests

### GW-BL-CMP-001
**Objective:** Invoice includes eTIMS fields for KRA compliance  
**Preconditions:** eTIMS configured  
**Steps:**
1. Issue invoice and fiscalize via POST `/api/v1/finance/etims/invoices/{id}/fiscalize`
2. Confirm `etimsReference`, `etimsReceiptNumber`, `etimsQrCode` populated
3. Confirm invoice marked as `etimsValidated: true`

**Expected Result:** Invoice fiscalized with KRA reference numbers  
**Pass Criteria:** All eTIMS fields populated; QR code generated  
**Risk Rating:** HIGH

---

---

# MODULE 19: PAYMENTS

## 19.1 Smoke Tests

### GW-PY-SMK-001
**Objective:** Payment receipts accessible  
**Preconditions:** Firm admin authenticated  
**Steps:**
1. GET `/api/v1/billing/receipts?limit=20`
2. Confirm HTTP 200
3. Confirm `data` array returned

**Expected Result:** Payment receipt list loads  
**Pass Criteria:** Receipts retrievable  
**Risk Rating:** HIGH

---

## 19.2 Functional Tests

### GW-PY-FNC-001
**Objective:** Payment receipt created and linked to invoice  
**Preconditions:** Issued invoice exists  
**Steps:**
1. POST `/api/v1/billing/receipts` with `{ invoiceId, clientId, amount: 116000, currency: "KES", paymentMethod: "MPESA", reference: "QK4X2ABCDE" }`
2. Confirm HTTP 201
3. GET invoice — confirm status = PAID or PARTIALLY_PAID
4. GET receipt — confirm `receiptNumber` auto-generated

**Expected Result:** Payment recorded; invoice status updated  
**Pass Criteria:** Receipt created; invoice status transitions correctly  
**Risk Rating:** CRITICAL

---

### GW-PY-FNC-002
**Objective:** Partial payment updates invoice correctly  
**Preconditions:** Invoice total = KES 116,000  
**Steps:**
1. POST receipt with amount = 50,000 against invoice
2. GET invoice — confirm status = PARTIALLY_PAID
3. Confirm `paidAmount = 50,000`, `balanceDue = 66,000`

**Expected Result:** Partial payment reflected correctly  
**Pass Criteria:** balanceDue = total - paidAmount; status = PARTIALLY_PAID  
**Risk Rating:** CRITICAL

---

### GW-PY-FNC-003
**Objective:** M-PESA STK Push payment flow simulated  
**Preconditions:** M-PESA integration configured (test mode)  
**Steps:**
1. POST `/api/v1/payments/mpesa/initiate` with `{ phoneNumber, amount, invoiceId }`
2. Confirm STK Push initiated (even in test mode)
3. Simulate callback from Safaricom Daraja API
4. Confirm receipt auto-created on successful callback

**Expected Result:** M-PESA payment flow end-to-end  
**Pass Criteria:** Receipt auto-generated on callback; invoice updated  
**Risk Rating:** HIGH

---

## 19.3 Negative Tests

### GW-PY-NEG-001
**Objective:** Payment exceeding invoice total rejected  
**Preconditions:** Invoice total = KES 100,000  
**Steps:**
1. POST receipt with amount = 200,000 against invoice
2. Record response

**Expected Result:** HTTP 400 — overpayment not allowed  
**Pass Criteria:** Business rule: payment cannot exceed invoice total  
**Risk Rating:** HIGH

---

## 19.4 Audit Trail Tests

### GW-PY-AUD-001
**Objective:** Payment receipt creation audited  
**Preconditions:** Audit logging active  
**Steps:**
1. Record payment receipt
2. Query AuditLog: `WHERE action = 'PAYMENT_RECEIVED'`
3. Confirm: receiptNumber, amount, paymentMethod, clientId, invoiceId

**Expected Result:** Complete payment audit trail  
**Pass Criteria:** All payment details in audit  
**Risk Rating:** CRITICAL

---

---

# MODULE 20: ACCOUNTS RECEIVABLE

## 20.1 Functional Tests

### GW-AR-FNC-001
**Objective:** AR aging report generated correctly  
**Preconditions:** Multiple invoices in various ages (0-30, 31-60, 61-90, 90+ days)  
**Steps:**
1. GET `/api/v1/billing/invoices?status=ISSUED,OVERDUE`
2. Group by age bucket based on dueDate vs today
3. Confirm sums for each bucket

**Expected Result:** AR aging shows correct bucket totals  
**Pass Criteria:** Current, 31-60, 61-90, 90+ buckets sum to total outstanding  
**Risk Rating:** HIGH

---

### GW-AR-FNC-002
**Objective:** Client statement generated  
**Preconditions:** Client with multiple invoices and payments  
**Steps:**
1. GET `/api/v1/clients/{clientId}/statement`
2. Confirm opening balance, transactions, closing balance
3. Confirm balance = sum of invoices - sum of payments

**Expected Result:** Accurate client account statement  
**Pass Criteria:** Closing balance = opening + invoices - payments  
**Risk Rating:** HIGH

---

## 20.2 Compliance Tests

### GW-AR-CMP-001
**Objective:** WHT certificate correctly offsets receivable  
**Preconditions:** Invoice with WHT deduction; WHT certificate received  
**Steps:**
1. Record WHT certificate: amount = 5% of KES 100,000 = KES 5,000
2. Confirm invoice balanceDue reduced by KES 5,000
3. Confirm `withholdingCertificates` linked to invoice

**Expected Result:** WHT correctly reduces balance due  
**Pass Criteria:** WHT certificate reconciles against invoice  
**Risk Rating:** HIGH

---

---

# MODULE 21: ACCOUNTS PAYABLE

## 21.1 Functional Tests

### GW-AP-FNC-001
**Objective:** Vendor bill created and approved  
**Preconditions:** Vendor exists; FIRM_ADMIN authenticated  
**Steps:**
1. POST `/api/v1/procurement/bills` with `{ vendorId, billNumber, amount, currency, dueDate, description }`
2. Confirm HTTP 201, status = PENDING
3. PATCH bill with `{ status: "APPROVED" }` as PARTNER
4. Confirm status = APPROVED

**Expected Result:** Bill created and approval workflow functional  
**Pass Criteria:** Bill approval requires authorized role  
**Risk Rating:** HIGH

---

### GW-AP-FNC-002
**Objective:** Bill payment recorded and vendor account updated  
**Preconditions:** Approved bill exists  
**Steps:**
1. PATCH bill with `{ status: "PAID" }`
2. Confirm journal entry created: DR Accounts Payable, CR Bank Account
3. Confirm vendor account updated

**Expected Result:** Payment triggers GL posting  
**Pass Criteria:** Double-entry accounting maintained  
**Risk Rating:** CRITICAL

---

---

# MODULE 22: PROCUREMENT

## 22.1 Smoke Tests

### GW-PR-SMK-001
**Objective:** Procurement dashboard accessible with all tabs  
**Preconditions:** Firm admin authenticated  
**Steps:**
1. Navigate to `/app/procurement`
2. Confirm 5 tabs: Dashboard, Purchase Requests, Purchase Orders, Vendor Register, Bills & Invoices
3. Confirm KPI cards load

**Expected Result:** Full procurement module renders  
**Pass Criteria:** All tabs functional; KPI cards show data  
**Risk Rating:** MEDIUM

---

## 22.2 Functional Tests

### GW-PR-FNC-001
**Objective:** Purchase request created and approved  
**Preconditions:** Staff member authenticated  
**Steps:**
1. POST `/api/v1/procurement/requests` with `{ title, estimatedAmount, priority: "HIGH", requestedBy }`
2. Confirm HTTP 201, status = DRAFT
3. Submit: PATCH to status = PENDING_APPROVAL
4. Approve as PARTNER: PATCH to APPROVED

**Expected Result:** PR workflow: DRAFT → PENDING_APPROVAL → APPROVED  
**Pass Criteria:** Approval chain works; notifications sent  
**Risk Rating:** HIGH

---

### GW-PR-FNC-002
**Objective:** Purchase order generated from approved PR  
**Preconditions:** Approved purchase request; vendor exists  
**Steps:**
1. POST `/api/v1/procurement/orders` with `{ vendorId, quotationId (optional), totalAmount, issueDate }`
2. Confirm HTTP 201
3. GET PO — confirm poNumber auto-generated

**Expected Result:** PO created with sequential number  
**Pass Criteria:** PO number format correct; vendor linked  
**Risk Rating:** HIGH

---

---

# MODULE 23: VENDORS

## 23.1 Smoke Tests

### GW-VD-SMK-001
**Objective:** Vendor register accessible within Procurement  
**Preconditions:** Firm admin authenticated  
**Steps:**
1. Navigate to `/app/procurement`
2. Click Vendor Register tab
3. Confirm vendor list or empty state

**Expected Result:** Vendor register tab renders  
**Pass Criteria:** No 404; vendors displayed  
**Risk Rating:** MEDIUM

---

## 23.2 Functional Tests

### GW-VD-FNC-001
**Objective:** Vendor created with full profile  
**Preconditions:** Firm admin authenticated  
**Steps:**
1. POST `/api/v1/procurement/vendors` with `{ name, vendorCode, category: "LEGAL_SERVICES", email, phone, kraPin, status: "ACTIVE" }`
2. Confirm HTTP 201
3. GET vendor list — confirm vendor visible

**Expected Result:** Vendor created and retrievable  
**Pass Criteria:** All fields persisted; vendorCode unique  
**Risk Rating:** MEDIUM

---

## 23.3 Negative Tests

### GW-VD-NEG-001
**Objective:** Blacklisted vendor cannot be issued PO  
**Preconditions:** Vendor with status = BLACKLISTED  
**Steps:**
1. Attempt to create PO for blacklisted vendor
2. Record response

**Expected Result:** HTTP 400 — vendor is blacklisted  
**Pass Criteria:** Business rule: no PO for blacklisted vendors  
**Risk Rating:** HIGH

---

---

# MODULE 24: GENERAL LEDGER

## 24.1 Smoke Tests

### GW-GL-SMK-001
**Objective:** Chart of accounts accessible  
**Preconditions:** Firm admin authenticated  
**Steps:**
1. Navigate to `/app/finance` → Chart of Accounts tab
2. GET `/api/v1/finance/accounts?limit=100`
3. Confirm HTTP 200

**Expected Result:** Chart of accounts loads  
**Pass Criteria:** Accounts retrievable; response structured correctly  
**Risk Rating:** HIGH

---

## 24.2 Functional Tests

### GW-GL-FNC-001
**Objective:** GL account created  
**Preconditions:** Firm admin authenticated  
**Steps:**
1. POST `/api/v1/finance/accounts` with `{ accountCode: "4100", accountName: "Professional Fees Revenue", accountType: "REVENUE", currency: "KES" }`
2. Confirm HTTP 201
3. GET account — confirm all fields

**Expected Result:** GL account created  
**Pass Criteria:** Account persists; code unique per tenant  
**Risk Rating:** HIGH

---

---

# MODULE 25: JOURNAL ENTRIES

## 25.1 Smoke Tests

### GW-JE-SMK-001
**Objective:** Journal entries accessible  
**Preconditions:** Firm admin authenticated  
**Steps:**
1. Navigate to `/app/finance` → Journal Entries tab
2. GET `/api/v1/finance/journals?limit=20`
3. Confirm HTTP 200

**Expected Result:** Journal entries list loads  
**Pass Criteria:** Journals retrievable; each has reference, description, date  
**Risk Rating:** HIGH

---

## 25.2 Functional Tests

### GW-JE-FNC-001
**Objective:** Manual journal entry created with balanced debits and credits  
**Preconditions:** GL accounts exist  
**Steps:**
1. POST `/api/v1/finance/journals` with: reference, description, date, lines: [{ accountId, debit: 10000, credit: 0 }, { accountId2, debit: 0, credit: 10000 }]
2. Confirm HTTP 201
3. Confirm total debits = total credits = 10,000

**Expected Result:** Balanced journal entry created  
**Pass Criteria:** Debits must equal credits (double-entry accounting)  
**Risk Rating:** CRITICAL

---

## 25.3 Negative Tests

### GW-JE-NEG-001
**Objective:** Unbalanced journal entry rejected  
**Preconditions:** GL accounts exist  
**Steps:**
1. POST journal with lines where debits ≠ credits (e.g., DR 10,000 / CR 8,000)
2. Record response

**Expected Result:** HTTP 400 — journal must balance  
**Pass Criteria:** Balance validation enforced before posting  
**Risk Rating:** CRITICAL

---

## 25.4 Audit Trail Tests

### GW-JE-AUD-001
**Objective:** Journal posting audited  
**Preconditions:** Journal entry in draft  
**Steps:**
1. Post journal entry
2. Query AuditLog: `WHERE action = 'JOURNAL_POSTED'`
3. Confirm: actorUserId, journalId, totalAmount, reference

**Expected Result:** Journal posting audit entry  
**Pass Criteria:** Immutable record of journal approval  
**Risk Rating:** CRITICAL

---

---

# MODULE 26: TRIAL BALANCE

## 26.1 Functional Tests

### GW-TB-FNC-001
**Objective:** Trial balance generated correctly  
**Preconditions:** Posted journal entries exist  
**Steps:**
1. GET `/api/v1/finance/reports/trial-balance?period=2026-06`
2. Confirm total debits = total credits
3. Confirm each account shows opening balance, period movements, closing balance

**Expected Result:** Balanced trial balance  
**Pass Criteria:** DR total = CR total; all accounts included  
**Risk Rating:** CRITICAL

---

## 26.2 Compliance Tests

### GW-TB-CMP-001
**Objective:** Trial balance complies with IFRS/GAAP structure  
**Preconditions:** Chart of accounts configured  
**Steps:**
1. Generate trial balance
2. Confirm accounts grouped: Assets, Liabilities, Equity, Revenue, Expenses
3. Confirm Assets = Liabilities + Equity (balance sheet equation)

**Expected Result:** Accounting equation satisfied  
**Pass Criteria:** A = L + E maintained  
**Risk Rating:** CRITICAL

---


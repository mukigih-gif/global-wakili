# Module Coverage Audit — TODO-011 Part A

**Date:** 2026-06-20
**Scope:** `apps/api/src/modules/*` — every service file (`*Service.ts`, `*.service.ts`)
**Method:** for each service, count references to its class/file base name across all
of `apps/api/src/**/*.ts`, **excluding** the service's own file and its module's
`index.ts` barrel (`export *`). A service referenced **only** in the barrel (or
nowhere) is **dead to every code path** — no route, controller, worker, or other
service invokes it. This is the same defect class as FINDING-007-010 (a correct,
complete service that was never wired in).

**Confidence:** the method was confirmed by direct inspection on matter (12/12),
billing `invoice.service`, procurement `ProcurementService`, document
`DocumentESignatureService`, finance `petty-cash.service` — all appear only in
their barrel (or nowhere). Candidate count is therefore reliable as a *detector*;
the remaining judgement (below) is **inline-vs-absent** classification per service.

> **What "dead" does and does not mean.** It means the dedicated service is not
> wired. It does NOT by itself mean the *capability* is missing — several modules
> (matter profitability, matter dashboard) reimplement the logic **inline in the
> route** and bypass the service. So each dead service still needs a per-endpoint
> classification: **(a) capability served inline anyway**, **(b) capability absent
> from HTTP entirely**, or **(c) genuinely obsolete**. That classification is the
> next step; this document records the module-level detection.

---

## Scan results

16 of 26 modules are clean (0 dead). **10 modules carry 43 export-only service
files:**

| Module | Services | Dead | Dead / export-only services |
|---|---:|---:|---|
| document | 23 | **11** | DocumentApprovalBridgeService, DocumentESignatureService, DocumentEthicalWallService, DocumentIntelligenceService, DocumentPdfService, DocumentShareService, DocumentTemplateService, GoogleWorkspaceService, InSystemEditorService, Office365IntegrationService, evidence.service |
| matter | 23 | **12** | CourtService, MatterDashboardService, MatterKYCService, MatterOnboardingService, MatterProfitabilityService, MatterQueryService, PassiveTimeCaptureQueueService, TenderService, TimeApprovalService, TimerService, WriteOffService, statute-limit.service |
| procurement | 15 | **6** | ProcurementService, PurchaseOrderService, QuotationService, RFQService, SupplierService, recurring-expense.service |
| finance | 23 | **3** | client-ledger.service, exchange-rate.service, petty-cash.service |
| client | 10 | **3** | ClientIssueService, ClientOnboardingService, ClientProspectService |
| billing | 11 | **2** | invoice.service (the dead `InvoiceService` from FINDING-007-010), withholding-tax-certificate.service |
| payroll | 13 | **2** | BenefitsService, LeaveService |
| trust | 16 | **2** | TrustReportService, TrustSettlementService |
| payments | 7 | **1** | payment-status.service |
| calendar | 9 | **1** | DeadlineService |

**Clean (0 dead):** ai, analytics, approval, compliance, court, hr, integrations,
notifications, platform, queues, reception, reporting, task, vendor, banking.

---

## Per-module interpretation (initial)

- **matter (12)** — logged as **FINDING-MAT-001**. Routes run inline; profitability
  proven (007-010 class). `/reports/matter-profitability` absent.
- **document (11)** — largest surface. Includes e-signature, templates, sharing,
  PDF, intelligence, ethical wall, and **GoogleWorkspace/Office365 integration**
  services — all unwired. Directly corroborates **TODO-008** (document platform is
  upload-only; no workspace/email/cloud integration). Strong candidate for "built
  but never wired" at scale.
- **procurement (6)** — essentially the entire service layer (Procurement, PO, RFQ,
  Quotation, Supplier) is unwired. Corroborates **TODO-001/024** (procurement
  largely unbuilt at the HTTP layer). Classify as "absent from HTTP" pending route
  check.
- **billing `invoice.service`** — confirmed dead `InvoiceService` (FINDING-007-010
  recon). The posting-capable path now runs via the approval hook; `InvoiceService`
  itself remains unwired (candidate for wire-in or delete).
- **finance (3)** — client-ledger, exchange-rate, petty-cash unwired; exchange-rate
  in particular may matter for multi-currency (cross-check with Phase 3 tax/FX).
- **trust (2)** — TrustReportService, TrustSettlementService unwired (trust posting
  itself IS wired and live-verified earlier; these are report/settlement extras).
- **client (3)** — issues/onboarding/prospect (CRM) services unwired.
- **payroll (2)** — Benefits/Leave services unwired (cross-check HR→Payroll
  interconnection, TODO-011 Part B).
- **payments (1)**, **calendar (1)** — single unwired service each.

---

## Next steps (TODO-011 continuation)

1. **Per-service classification** for each of the 43: inline-served (a),
   absent-from-HTTP (b), or obsolete (c). Requires mapping each module's routes to
   the capability. (matter started; document/procurement are the biggest.)
2. **Part B — cross-module interconnection** (separate from this Part A detection):
   Billing→Finance ✅, Trust→Finance, Payments→Finance, Payroll→Finance,
   Procurement→AP, Documents→Matters/Billing/Trust, HR→Payroll.
3. Per service, decide: **wire-in**, **delete**, or **accept (ADR)**. Each is its
   own scoped change under CHANGE_CONTROL — not done as part of this detection pass.

This audit is detection only; no code changed.

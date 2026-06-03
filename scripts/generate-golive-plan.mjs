import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, HeadingLevel, AlignmentType, WidthType, ShadingType, PageBreak,
} from 'docx';
import { writeFileSync } from 'fs';

const OUTPUT = 'C:/Users/Global/Downloads/GlobalWakili_GoLive_Closure_Plan_v2.docx';

const DARK_BLUE  = '1F3864';
const MID_BLUE   = '2E75B6';
const LIGHT_BLUE = 'DEEAF1';
const GREEN      = '375623';
const LIGHT_GREEN= 'E2EFDA';
const ORANGE     = 'E97132';
const LIGHT_ORG  = 'FFF2CC';
const RED        = 'C00000';
const LIGHT_RED  = 'FCE4D6';
const PURPLE     = '7030A0';
const LIGHT_PURP = 'EAD1DC';
const GREY       = '595959';
const WHITE      = 'FFFFFF';
const BLACK      = '000000';

const run  = (t, o = {}) => new TextRun({ text: t, font: 'Calibri', size: 20, ...o });
const bold = (t, color = BLACK, size = 20) => run(t, { bold: true, color, size });

const para = (children, opts = {}) => new Paragraph({
  children: Array.isArray(children) ? children : [children],
  spacing: { after: 80 },
  ...opts,
});

const h1 = (t) => new Paragraph({
  children: [run(t, { bold: true, size: 32, color: DARK_BLUE })],
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 300, after: 150 },
});
const h2 = (t) => new Paragraph({
  children: [run(t, { bold: true, size: 26, color: MID_BLUE })],
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 220, after: 100 },
});
const h3 = (t) => new Paragraph({
  children: [run(t, { bold: true, size: 22, color: ORANGE })],
  heading: HeadingLevel.HEADING_3,
  spacing: { before: 160, after: 80 },
});

const check = (t, indent = 360) => new Paragraph({
  children: [run('☐  ', { bold: true, color: GREY }), run(t)],
  spacing: { after: 70 },
  indent: { left: indent },
});

const note = (t) => new Paragraph({
  children: [run('Note: ', { bold: true, italics: true, color: ORANGE }), run(t, { italics: true, color: GREY })],
  spacing: { after: 100 },
});

const divider = () => new Paragraph({ children: [run('')], spacing: { after: 80 } });

const hCell = (t, w, bg = DARK_BLUE) => new TableCell({
  children: [para([run(t, { bold: true, color: WHITE, size: 19 })], { alignment: AlignmentType.CENTER })],
  shading: { type: ShadingType.SOLID, color: bg, fill: bg },
  width: { size: w, type: WidthType.DXA },
  margins: { top: 55, bottom: 55, left: 90, right: 90 },
});

const dCell = (t, fg = BLACK, bg = WHITE, w = 2000, b = false) => new TableCell({
  children: [para([run(t, { color: fg, bold: b, size: 19 })])],
  shading: { type: ShadingType.SOLID, color: bg, fill: bg },
  width: { size: w, type: WidthType.DXA },
  margins: { top: 55, bottom: 55, left: 90, right: 90 },
});

// ── helpers ──────────────────────────────────────────────────────────────────

const children = [];

// ── TITLE ────────────────────────────────────────────────────────────────────

children.push(
  new Paragraph({ children: [run('Global Wakili Legal Enterprise', { bold: true, size: 52, color: DARK_BLUE })], alignment: AlignmentType.CENTER, spacing: { before: 500, after: 100 } }),
  new Paragraph({ children: [run('Go-Live Closure Plan  —  Version 2', { bold: true, size: 36, color: ORANGE })], alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
  new Paragraph({ children: [run('Synthesised from: CLAUDE.md · MASTER_EXECUTION_CHARTER.md · PROJECT_STATUS.md', { size: 19, color: GREY, italics: true })], alignment: AlignmentType.CENTER, spacing: { after: 60 } }),
  new Paragraph({ children: [run('EXECUTION_ROADMAP.md · COMPLETED_GATES.md · KNOWN_GAPS.md · HANDOVER_NOTES.md', { size: 19, color: GREY, italics: true })], alignment: AlignmentType.CENTER, spacing: { after: 60 } }),
  new Paragraph({ children: [run('Date: 3 June 2026  |  Confidential', { size: 19, color: GREY, italics: true })], alignment: AlignmentType.CENTER, spacing: { after: 500 } }),
  new Paragraph({ children: [new PageBreak()] }),
);

// ── 1. PRODUCTION READINESS SNAPSHOT ─────────────────────────────────────────

children.push(h1('1. Production Readiness Snapshot'));
children.push(para([
  run('Source: PROJECT_STATUS.md · HANDOVER_NOTES.md · 3 June 2026. All 365 unit tests pass. Backend core production-grade. Frontend and integrations incomplete.'),
]));
children.push(divider());

children.push(new Table({
  width: { size: 9000, type: WidthType.DXA },
  rows: [
    new TableRow({ children: [hCell('Module', 3200), hCell('Completion', 1200), hCell('Status', 1600), hCell('Key Outstanding Work', 3000)] }),
    new TableRow({ children: [dCell('Multi-Tenant Platform', BLACK, WHITE, 3200), dCell('90%', GREEN, LIGHT_GREEN, 1200, true), dCell('Strong', GREEN, LIGHT_GREEN, 1600), dCell('Automated breach tests on real DB', BLACK, WHITE, 3000)] }),
    new TableRow({ children: [dCell('Trust Accounting', BLACK, WHITE, 3200), dCell('95%', GREEN, LIGHT_GREEN, 1200, true), dCell('Strong', GREEN, LIGHT_GREEN, 1600), dCell('Full automated trust matrix, production verification', BLACK, WHITE, 3000)] }),
    new TableRow({ children: [dCell('Finance & Accounting', BLACK, WHITE, 3200), dCell('85%', GREEN, LIGHT_GREEN, 1200, true), dCell('Strong', GREEN, LIGHT_GREEN, 1600), dCell('Bank feeds, external ERP integrations, more tests', BLACK, WHITE, 3000)] }),
    new TableRow({ children: [dCell('Legal Matter Management', BLACK, WHITE, 3200), dCell('85%', GREEN, LIGHT_GREEN, 1200, true), dCell('Strong', GREEN, LIGHT_GREEN, 1600), dCell('Workflow expansion, frontend completion', BLACK, WHITE, 3000)] }),
    new TableRow({ children: [dCell('HR & Payroll', BLACK, WHITE, 3200), dCell('70%', ORANGE, LIGHT_ORG, 1200, true), dCell('Moderate', ORANGE, LIGHT_ORG, 1600), dCell('End-to-end workflow, payroll compliance validation', BLACK, WHITE, 3000)] }),
    new TableRow({ children: [dCell('Reporting & Analytics', BLACK, WHITE, 3200), dCell('75%', ORANGE, LIGHT_ORG, 1200, true), dCell('Moderate', ORANGE, LIGHT_ORG, 1600), dCell('Headless BI APIs, dashboard finalisation', BLACK, WHITE, 3000)] }),
    new TableRow({ children: [dCell('Notification Platform', BLACK, WHITE, 3200), dCell('50%', ORANGE, LIGHT_ORG, 1200, true), dCell('Partial', ORANGE, LIGHT_ORG, 1600), dCell('Email, SMS, Push, Reminder/Escalation/Digest engines', BLACK, WHITE, 3000)] }),
    new TableRow({ children: [dCell('Document Storage', BLACK, WHITE, 3200), dCell('60%', ORANGE, LIGHT_ORG, 1200, true), dCell('Partial', ORANGE, LIGHT_ORG, 1600), dCell('Malware scanning, retention policies, version history', BLACK, WHITE, 3000)] }),
    new TableRow({ children: [dCell('AI Platform', BLACK, WHITE, 3200), dCell('45%', RED, LIGHT_RED, 1200, true), dCell('Partial', RED, LIGHT_RED, 1600), dCell('LLM providers disabled; generative assembly, contract risk, semantic search', BLACK, WHITE, 3000)] }),
    new TableRow({ children: [dCell('External Integrations', BLACK, WHITE, 3200), dCell('20%', RED, LIGHT_RED, 1200, true), dCell('Partial', RED, LIGHT_RED, 1600), dCell('M-PESA stub, eTIMS stub, Graph stub, QuickBooks/Zoho/Bank feeds missing', BLACK, WHITE, 3000)] }),
    new TableRow({ children: [dCell('Frontend', BLACK, WHITE, 3200), dCell('25%', RED, LIGHT_RED, 1200, true), dCell('Early Stage', RED, LIGHT_RED, 1600), dCell('3 placeholder pages; 11 full domains required', BLACK, WHITE, 3000)] }),
    new TableRow({ children: [dCell('Passive Time Capture', BLACK, WHITE, 3200), dCell('0%', RED, LIGHT_RED, 1200, true), dCell('Not Started', RED, LIGHT_RED, 1600), dCell('Architecture not implemented', BLACK, WHITE, 3000)] }),
    new TableRow({ children: [dCell('Production Infrastructure', BLACK, WHITE, 3200), dCell('40%', RED, LIGHT_RED, 1200, true), dCell('Incomplete', RED, LIGHT_RED, 1600), dCell('No Redis, no metrics/APM, no DR plan, no CI deploy', BLACK, WHITE, 3000)] }),
    new TableRow({ children: [dCell('OVERALL', BLACK, LIGHT_BLUE, 3200), dCell('65–75%', MID_BLUE, LIGHT_BLUE, 1200, true), dCell('Active Dev', MID_BLUE, LIGHT_BLUE, 1600, true), dCell('Backend strong. Frontend + integrations critical path.', MID_BLUE, LIGHT_BLUE, 3000, true)] }),
  ],
}));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ── 2. KNOWN GAPS REGISTER ────────────────────────────────────────────────────

children.push(h1('2. Known Gaps Register (v2 — 20 Gaps)'));
children.push(para([run('Source: KNOWN_GAPS.md updated 3 June 2026. Original 15 gaps expanded to 20 after full charter cross-reference.')]));
children.push(divider());

const gaps = [
  { id: 'Gap 001–005', mod: 'Control Plane (WIP-001)', pri: 'CRITICAL', status: 'Open', issue: 'Control Plane provisioning automation. Gate 7 verified service logic (4 records/tenant). Live provisioning script for real tenant onboarding still required: PlatformTenantProfile, TenantSubscription, TenantModuleEntitlement, TenantQuotaPolicy, TenantUsageMetric.' },
  { id: 'Gap 006', mod: 'Notifications (WIP-002)', pri: 'HIGH', status: 'Open', issue: 'Notification delivery ecosystem 50% complete. Missing: email delivery, SMS (Twilio/Africa\'s Talking), push (Firebase Cloud Messaging), in-app, reminder engine, escalation engine, digest engine, delivery tracking, preferences, Outlook/Gmail integration.' },
  { id: 'Gap 007', mod: 'Document Storage (WIP-003)', pri: 'HIGH', status: 'Open', issue: 'Document platform 60% complete. Missing: malware scanning verification, retention policies, version history, enhanced matter indexing.' },
  { id: 'Gap 008', mod: 'AI Platform (WIP-005)', pri: 'HIGH', status: 'Open', issue: 'AI platform 45% complete. All external LLM providers have executionSupported:false — rules-only. Missing: generative document assembly, variable extraction, prompt auditing, artifact governance, review workflows, contract risk radar, semantic precedent search, real LLM provider integration.' },
  { id: 'Gap 009', mod: 'Passive Time Capture (WIP-004)', pri: 'HIGH', status: 'Open', issue: 'NOT STARTED. TimeEntry model exists. No background activity ingestion (email, calendar, document, matter), no queue processing, no WIP generation, no approval workflow.' },
  { id: 'Gap 010', mod: 'M-PESA (WIP-006)', pri: 'CRITICAL', status: 'Open', issue: 'M-PESA Daraja stubbed — no real API calls. Required charter flow: Invoice → Payment Request → STK Push → Callback → Receipt → Journal Entry → Audit Event. External: Safaricom Daraja credentials (2–4 weeks).' },
  { id: 'Gap 011', mod: 'eTIMS (WIP-006)', pri: 'CRITICAL', status: 'Open', issue: 'KRA eTIMS client stubbed — no real KRA HTTP calls. Service and queue layers complete. Required flow: Invoice Finalization → Submission → Control Number → QR Code → PDF Stamping → Audit Event. External: KRA eTIMS credentials (2–4 weeks).' },
  { id: 'Gap 012', mod: 'Microsoft Graph (WIP-006)', pri: 'MEDIUM', status: 'Open', issue: 'OAuth URL generation works. Token exchange returns placeholder. No Mail, Calendar, Contacts, Teams, Files, or Webhooks integration.' },
  { id: 'Gap 013', mod: 'Google Workspace (WIP-006)', pri: 'MEDIUM', status: 'Open', issue: 'OAuth URL generation works. Token exchange returns placeholder. No Gmail, Calendar, Drive, or Docs sync.' },
  { id: 'Gap 014', mod: 'QuickBooks (WIP-006)', pri: 'MEDIUM', status: 'Open', issue: 'Zero files in codebase. Required flow: Invoice → Posting Queue → OAuth Validation → Synchronisation → Audit Event.' },
  { id: 'Gap 015', mod: 'Zoho ERP (WIP-006)', pri: 'MEDIUM', status: 'Open', issue: 'Zero files in codebase. Required flow: Journal → Aggregation → Synchronisation → Audit Event.' },
  { id: 'Gap 016', mod: 'Bank Feeds (WIP-006)', pri: 'MEDIUM', status: 'Open', issue: 'Bank feed integrations not started. Listed in WIP-006 and charter integration requirements.' },
  { id: 'Gap 017', mod: 'Frontend (11 Domains)', pri: 'HIGH', status: 'Open', issue: '25% complete — 3 placeholder pages only. 11 full domains required per MASTER_EXECUTION_CHARTER.md: Public Marketing, Super Admin, Tenant Admin, Legal Practice Management, Finance, Trust Accounting, HR & Payroll, Analytics & Reporting, AI Platform UI, Notifications UI, Client Portal.' },
  { id: 'Gap 018', mod: 'Testing Matrix', pri: 'HIGH', status: 'Open', issue: '365 unit tests pass. Missing: integration tests on real Neon DB, E2E M-PESA flow, E2E eTIMS flow, load tests (50 users/tenant, p95<500ms), HR/Payroll compliance tests, notification delivery tests, AI fuzzing/prompt injection tests.' },
  { id: 'Gap 019', mod: 'Production Infrastructure', pri: 'HIGH', status: 'Open', issue: 'Missing: Redis-backed rate limiter (in-memory does not support multi-instance), Prometheus /metrics, Grafana/APM, alerting rules, OpenTelemetry tracing, log aggregation, uptime monitoring, DR plan, RTO/RPO, backup restore test, CI/CD deploy pipeline, production env vars.' },
  { id: 'Gap 020', mod: 'Documentation', pri: 'MEDIUM', status: 'Open', issue: 'Gate 14 committed 19 governance docs (gate records). Missing operational docs: /docs architecture, API docs, deployment guide, operational runbooks, DR procedures, tenant isolation runbook, finance/trust runbooks, eTIMS/M-PESA operations guides.' },
];

const priColor = { CRITICAL: RED, HIGH: ORANGE, MEDIUM: PURPLE };
const priBg   = { CRITICAL: LIGHT_RED, HIGH: LIGHT_ORG, MEDIUM: LIGHT_PURP };

children.push(new Table({
  width: { size: 9000, type: WidthType.DXA },
  rows: [
    new TableRow({ children: [hCell('Gap', 1000), hCell('Module', 2000), hCell('Priority', 1000), hCell('Issue Summary', 5000)] }),
    ...gaps.map(g => new TableRow({ children: [
      dCell(g.id, MID_BLUE, LIGHT_BLUE, 1000, true),
      dCell(g.mod, BLACK, WHITE, 2000),
      dCell(g.pri, priColor[g.pri], priBg[g.pri], 1000, true),
      dCell(g.issue, BLACK, WHITE, 5000),
    ]})),
  ],
}));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ── 3. ORDERED NEXT STEPS ─────────────────────────────────────────────────────

children.push(h1('3. Ordered Next Steps  (per PROJECT_STATUS.md)'));
children.push(para([run('Execute in the order below. Do not skip steps. Each step must include the mandatory pre-code analysis format from MASTER_EXECUTION_CHARTER.md (Scope → Findings → Risks → Impacted Files → Proposed Plan → Test Plan → Rollback Plan).')]));
children.push(divider());

children.push(new Table({
  width: { size: 9000, type: WidthType.DXA },
  rows: [
    new TableRow({ children: [hCell('#', 500), hCell('Step', 3500), hCell('WIP', 900), hCell('Gate', 900), hCell('Priority', 1000), hCell('Est. Effort', 1200), hCell('Ext. Dependency', 1000)] }),
    new TableRow({ children: [dCell('1', BLACK, WHITE, 500), dCell('Control Plane Provisioning — PlatformTenantProfile, TenantSubscription, TenantModuleEntitlement, TenantQuotaPolicy, TenantUsageMetric automation', BLACK, WHITE, 3500), dCell('WIP-001', BLACK, WHITE, 900), dCell('Gate 7', BLACK, WHITE, 900), dCell('CRITICAL', RED, LIGHT_RED, 1000, true), dCell('1 week', BLACK, WHITE, 1200), dCell('None', BLACK, WHITE, 1000)] }),
    new TableRow({ children: [dCell('2', BLACK, WHITE, 500), dCell('Tenant verification matrix — cross-tenant breach tests on real Neon DB (not unit tests)', BLACK, WHITE, 3500), dCell('—', BLACK, WHITE, 900), dCell('Gate 13', BLACK, WHITE, 900), dCell('CRITICAL', RED, LIGHT_RED, 1000, true), dCell('3 days', BLACK, WHITE, 1200), dCell('None', BLACK, WHITE, 1000)] }),
    new TableRow({ children: [dCell('3', BLACK, WHITE, 500), dCell('Audit verification matrix — hash-chain integrity on real data, tamper detection test', BLACK, WHITE, 3500), dCell('—', BLACK, WHITE, 900), dCell('Gate 13', BLACK, WHITE, 900), dCell('HIGH', ORANGE, LIGHT_ORG, 1000, true), dCell('2 days', BLACK, WHITE, 1200), dCell('None', BLACK, WHITE, 1000)] }),
    new TableRow({ children: [dCell('4', BLACK, WHITE, 500), dCell('eTIMS — complete eTimsClient.ts HTTP calls to KRA; control number; QR code; PDF stamping', BLACK, WHITE, 3500), dCell('WIP-006', BLACK, WHITE, 900), dCell('Gate 11', BLACK, WHITE, 900), dCell('CRITICAL', RED, LIGHT_RED, 1000, true), dCell('1–2 weeks', BLACK, WHITE, 1200), dCell('KRA API key', BLACK, WHITE, 1000)] }),
    new TableRow({ children: [dCell('5', BLACK, WHITE, 500), dCell('M-PESA — Daraja OAuth, STK Push, callback → Payment + Journal Entry + Audit Event', BLACK, WHITE, 3500), dCell('WIP-006', BLACK, WHITE, 900), dCell('Gate 11', BLACK, WHITE, 900), dCell('CRITICAL', RED, LIGHT_RED, 1000, true), dCell('2–3 weeks', BLACK, WHITE, 1200), dCell('Safaricom Daraja', BLACK, WHITE, 1000)] }),
    new TableRow({ children: [dCell('6', BLACK, WHITE, 500), dCell('CI/CD pipeline — add test job, build job, deploy-to-staging, manual production gate', BLACK, WHITE, 3500), dCell('—', BLACK, WHITE, 900), dCell('Gate 15', BLACK, WHITE, 900), dCell('CRITICAL', RED, LIGHT_RED, 1000, true), dCell('1 week', BLACK, WHITE, 1200), dCell('None', BLACK, WHITE, 1000)] }),
    new TableRow({ children: [dCell('7', BLACK, WHITE, 500), dCell('Notification Platform — email, SMS (Twilio/Africa\'s Talking), push (FCM), reminder/escalation/digest engines', BLACK, WHITE, 3500), dCell('WIP-002', BLACK, WHITE, 900), dCell('Gate 8', BLACK, WHITE, 900), dCell('HIGH', ORANGE, LIGHT_ORG, 1000, true), dCell('3–4 weeks', BLACK, WHITE, 1200), dCell('Twilio, FCM', BLACK, WHITE, 1000)] }),
    new TableRow({ children: [dCell('8', BLACK, WHITE, 500), dCell('Document Storage — malware scanning, retention policies, version history, enhanced indexing', BLACK, WHITE, 3500), dCell('WIP-003', BLACK, WHITE, 900), dCell('Gate 9', BLACK, WHITE, 900), dCell('HIGH', ORANGE, LIGHT_ORG, 1000, true), dCell('1–2 weeks', BLACK, WHITE, 1200), dCell('None', BLACK, WHITE, 1000)] }),
    new TableRow({ children: [dCell('9', BLACK, WHITE, 500), dCell('AI Platform — enable one LLM provider (Anthropic recommended); generative assembly; prompt injection protection; cost quota', BLACK, WHITE, 3500), dCell('WIP-005', BLACK, WHITE, 900), dCell('Gate 10', BLACK, WHITE, 900), dCell('HIGH', ORANGE, LIGHT_ORG, 1000, true), dCell('2–3 weeks', BLACK, WHITE, 1200), dCell('Anthropic API key', BLACK, WHITE, 1000)] }),
    new TableRow({ children: [dCell('10', BLACK, WHITE, 500), dCell('Passive Time Capture — background activity ingestion (email/calendar/document/matter), queue, WIP generation, approval workflow', BLACK, WHITE, 3500), dCell('WIP-004', BLACK, WHITE, 900), dCell('Phase 7', BLACK, WHITE, 900), dCell('HIGH', ORANGE, LIGHT_ORG, 1000, true), dCell('2–3 weeks', BLACK, WHITE, 1200), dCell('Graph/Google auth', BLACK, WHITE, 1000)] }),
    new TableRow({ children: [dCell('11', BLACK, WHITE, 500), dCell('Microsoft Graph — token exchange, Calendar sync, Mail read, Contacts, Teams, Files, Webhooks', BLACK, WHITE, 3500), dCell('WIP-006', BLACK, WHITE, 900), dCell('Gate 11', BLACK, WHITE, 900), dCell('MEDIUM', PURPLE, LIGHT_PURP, 1000, true), dCell('2–3 weeks', BLACK, WHITE, 1200), dCell('Azure AD app', BLACK, WHITE, 1000)] }),
    new TableRow({ children: [dCell('12', BLACK, WHITE, 500), dCell('Google Workspace — token exchange, Gmail, Calendar, Drive, Docs sync', BLACK, WHITE, 3500), dCell('WIP-006', BLACK, WHITE, 900), dCell('Gate 11', BLACK, WHITE, 900), dCell('MEDIUM', PURPLE, LIGHT_PURP, 1000, true), dCell('2–3 weeks', BLACK, WHITE, 1200), dCell('Google Cloud app', BLACK, WHITE, 1000)] }),
    new TableRow({ children: [dCell('13', BLACK, WHITE, 500), dCell('QuickBooks — OAuth, invoice/journal/payment sync, queue, audit events', BLACK, WHITE, 3500), dCell('WIP-006', BLACK, WHITE, 900), dCell('Gate 11', BLACK, WHITE, 900), dCell('MEDIUM', PURPLE, LIGHT_PURP, 1000, true), dCell('3–4 weeks', BLACK, WHITE, 1200), dCell('Intuit portal', BLACK, WHITE, 1000)] }),
    new TableRow({ children: [dCell('14', BLACK, WHITE, 500), dCell('Zoho ERP — OAuth, journal/invoice sync, audit events', BLACK, WHITE, 3500), dCell('WIP-006', BLACK, WHITE, 900), dCell('Gate 11', BLACK, WHITE, 900), dCell('MEDIUM', PURPLE, LIGHT_PURP, 1000, true), dCell('3–4 weeks', BLACK, WHITE, 1200), dCell('Zoho portal', BLACK, WHITE, 1000)] }),
    new TableRow({ children: [dCell('15', BLACK, WHITE, 500), dCell('Frontend — all 11 domains (see Section 4)', BLACK, WHITE, 3500), dCell('—', BLACK, WHITE, 900), dCell('Gate 12', BLACK, WHITE, 900), dCell('HIGH', ORANGE, LIGHT_ORG, 1000, true), dCell('8–12 weeks', BLACK, WHITE, 1200), dCell('None', BLACK, WHITE, 1000)] }),
    new TableRow({ children: [dCell('16', BLACK, WHITE, 500), dCell('Observability — Prometheus /metrics, Grafana, alerting, OpenTelemetry, log aggregation, uptime monitoring', BLACK, WHITE, 3500), dCell('—', BLACK, WHITE, 900), dCell('Gate 15', BLACK, WHITE, 900), dCell('HIGH', ORANGE, LIGHT_ORG, 1000, true), dCell('1–2 weeks', BLACK, WHITE, 1200), dCell('None', BLACK, WHITE, 1000)] }),
    new TableRow({ children: [dCell('17', BLACK, WHITE, 500), dCell('Redis rate limiter — replace in-memory limiter for multi-instance deployment support', BLACK, WHITE, 3500), dCell('—', BLACK, WHITE, 900), dCell('Gate 15', BLACK, WHITE, 900), dCell('HIGH', ORANGE, LIGHT_ORG, 1000, true), dCell('3 days', BLACK, WHITE, 1200), dCell('Redis instance', BLACK, WHITE, 1000)] }),
    new TableRow({ children: [dCell('18', BLACK, WHITE, 500), dCell('Disaster Recovery — RTO/RPO, automated backups, restore test, failover procedure', BLACK, WHITE, 3500), dCell('—', BLACK, WHITE, 900), dCell('Gate 15', BLACK, WHITE, 900), dCell('HIGH', ORANGE, LIGHT_ORG, 1000, true), dCell('1 week', BLACK, WHITE, 1200), dCell('None', BLACK, WHITE, 1000)] }),
    new TableRow({ children: [dCell('19', BLACK, WHITE, 500), dCell('Documentation — /docs architecture, API docs, deployment guide, operational runbooks, DR procedures', BLACK, WHITE, 3500), dCell('—', BLACK, WHITE, 900), dCell('Gate 14', BLACK, WHITE, 900), dCell('MEDIUM', PURPLE, LIGHT_PURP, 1000, true), dCell('1–2 weeks', BLACK, WHITE, 1200), dCell('None', BLACK, WHITE, 1000)] }),
    new TableRow({ children: [dCell('20', BLACK, WHITE, 500), dCell('Security hardening — OWASP/Burp scan, penetration test, credential rotation, load test (p95 < 500ms)', BLACK, WHITE, 3500), dCell('—', BLACK, WHITE, 900), dCell('Gate 15/16', BLACK, WHITE, 900), dCell('HIGH', ORANGE, LIGHT_ORG, 1000, true), dCell('1–2 weeks', BLACK, WHITE, 1200), dCell('None', BLACK, WHITE, 1000)] }),
  ],
}));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ── 4. FRONTEND — 11 DOMAINS ──────────────────────────────────────────────────

children.push(h1('4. Frontend Completion — 11 Domains Required'));
children.push(para([run('Source: MASTER_EXECUTION_CHARTER.md Core Business Domains. Current state: 25% complete (3 placeholder pages). Gate 12 closed the security hardening of existing 10 files only. Full UI development is outstanding.')]));
children.push(divider());

const fedomains = [
  { n: '1', name: 'Public Marketing Platform', items: ['SEO and programmatic SEO', 'Lead generation and conversion tracking', 'Legal triage bots', 'Booking workflows', 'Landing pages'] },
  { n: '2', name: 'Super Admin Platform', items: ['Tenant lifecycle management (create/suspend/activate/terminate)', 'Subscription and billing management', 'Module entitlement management', 'Monitoring and incident management', 'Support workspace', 'Impersonation sessions with audit trail'] },
  { n: '3', name: 'Tenant Administration', items: ['Staff and user management', 'Branch management', 'Role and permission configuration', 'System configuration and integration settings'] },
  { n: '4', name: 'Legal Practice Management', items: ['Matter list, detail, and status tracking', 'Workflow management and task assignment', 'Hearings and court dates', 'Contracts and litigation support', 'Matter timeline view'] },
  { n: '5', name: 'Finance', items: ['Chart of accounts and journal entries', 'Ledger views and bank statements', 'Invoice creation, sending, and tracking', 'Payment management and reconciliation', 'Procurement and vendor management'] },
  { n: '6', name: 'Trust Accounting', items: ['Trust ledger dashboard', 'Trust transaction entry and approval', 'Three-way reconciliation view', 'Overdraw alerts and balance monitoring'] },
  { n: '7', name: 'HR & Payroll', items: ['Employee records management', 'Payroll processing and payslips', 'Leave management', 'Performance goals and reviews'] },
  { n: '8', name: 'Analytics & Reporting', items: ['Executive dashboards and KPIs', 'Billing and revenue reports', 'Trust and finance reports', 'BI export and scheduled reports'] },
  { n: '9', name: 'AI Platform UI', items: ['AI provider configuration', 'Prompt registry and management', 'Artifact registry and review workflows', 'Contract risk radar UI'] },
  { n: '10', name: 'Notifications UI', items: ['User notification preferences', 'Email, SMS, push, in-app settings', 'Notification history and delivery status'] },
  { n: '11', name: 'Client Portal', items: ['Passwordless access (magic links / OTP)', 'Matter timeline view', 'Invoice viewing and M-PESA payment', 'Secure document vault', 'Trust account balance view (read-only)'] },
];

for (const d of fedomains) {
  children.push(h3(`${d.n}. ${d.name}`));
  for (const item of d.items) children.push(check(item));
  children.push(divider());
}

children.push(new Paragraph({ children: [new PageBreak()] }));

// ── 5. WIP CLOSURE CHECKLISTS ─────────────────────────────────────────────────

children.push(h1('5. WIP Closure Checklists'));

// WIP-001
children.push(h2('WIP-001 — Control Plane Provisioning'));
children.push(note('Gap 001–005. Gate 7 verified service logic. Live provisioning script still required.'));
children.push(check('Create provisioning command / seed script for new tenant onboarding'));
children.push(check('Verify PlatformTenantProfile record created automatically on tenant activation'));
children.push(check('Verify TenantSubscription record linked to correct plan'));
children.push(check('Verify TenantModuleEntitlement records match plan modules'));
children.push(check('Verify TenantQuotaPolicy records match plan quotas'));
children.push(check('Verify TenantUsageMetric records initialised to zero'));
children.push(check('Confirm all 5 records exist for every existing tenant in production DB'));
children.push(check('Add automated integration test: create tenant → assert 5 records exist'));
children.push(divider());

// WIP-002
children.push(h2('WIP-002 — Notification Platform'));
children.push(note('Gap 006. 50% complete. Delivery channels and engines not yet wired.'));
children.push(check('Implement email delivery (SMTP / SendGrid / SES)'));
children.push(check('Implement SMS delivery via Twilio'));
children.push(check('Implement SMS delivery via Africa\'s Talking (Kenya primary provider)'));
children.push(check('Implement push notifications via Firebase Cloud Messaging'));
children.push(check('Implement in-app notification storage and real-time delivery via Socket.IO'));
children.push(check('Implement Reminder Engine — schedule-based notification triggers'));
children.push(check('Implement Escalation Engine — unacknowledged notification re-routing'));
children.push(check('Implement Digest Engine — batch daily/weekly summaries'));
children.push(check('Implement Delivery Tracking — per-notification delivery status with retry'));
children.push(check('Implement User Notification Preferences — channel opt-in/opt-out per notification type'));
children.push(check('Integrate Microsoft Outlook (Graph Mail API) for email delivery'));
children.push(check('Integrate Gmail (Google API) for email delivery'));
children.push(check('Test full flow: trigger → queue → delivery → tracking → preference enforcement'));
children.push(divider());

// WIP-003
children.push(h2('WIP-003 — Document Platform'));
children.push(note('Gap 007. 60% complete. Storage and signed URLs present; features missing.'));
children.push(check('Verify cloud storage backend (S3/GCS/Azure) is configured and working'));
children.push(check('Implement malware scanning on upload (ClamAV or cloud-native scanner)'));
children.push(check('Implement DOCUMENT_MALWARE_SCAN_REQUIRED=true enforcement in production'));
children.push(check('Implement document retention policies — automated expiry and deletion'));
children.push(check('Implement version history — every upload creates a new version, old versions retained'));
children.push(check('Implement enhanced matter indexing — documents searchable by matter, client, date, type'));
children.push(check('Implement audit tracking — every view, download, delete creates an audit entry'));
children.push(check('Test: upload → malware scan → version created → matter indexed → audit logged'));
children.push(divider());

// WIP-004
children.push(h2('WIP-004 — Passive Time Capture'));
children.push(note('Gap 009. NOT STARTED. TimeEntry model exists in schema.'));
children.push(check('Design background activity ingestion architecture (queue-based)'));
children.push(check('Implement email activity listener — detect matter-related emails, create draft TimeEntry'));
children.push(check('Implement calendar activity listener — meeting on matter calendar = billable time candidate'));
children.push(check('Implement document activity tracker — open/edit on matter document = time suggestion'));
children.push(check('Implement matter activity tracker — API calls on matter trigger time suggestion'));
children.push(check('Implement queue processing — batch passive entries, deduplicate overlapping activity'));
children.push(check('Implement approval workflow — lawyer reviews auto-captured entries, approves/discards'));
children.push(check('Implement WIP generation — approved entries convert to WIP → invoice line'));
children.push(check('Implement matter timeline synchronisation — WIP entries appear on matter timeline'));
children.push(check('Build frontend timer widget (start/stop/resume) in Tenant Admin portal'));
children.push(divider());

// WIP-005
children.push(h2('WIP-005 — AI Legal Operations Platform'));
children.push(note('Gap 008. 45% complete. All 19 AI service files exist; rules-based only; LLM providers disabled.'));
children.push(check('Select and obtain API key for primary LLM provider (recommended: Anthropic Claude)'));
children.push(check('Set executionSupported: true for chosen provider in provider registry'));
children.push(check('Implement provider execute() — send prompt, receive completion, return ArtifactResult'));
children.push(check('Enable prompt caching for repeated legal document templates'));
children.push(check('Implement prompt injection protection — sanitise user input before embedding'));
children.push(check('Implement context isolation — each tenant prompt never includes another tenant\'s data'));
children.push(check('Set token/cost quota per tenant using TenantQuotaPolicy'));
children.push(check('Implement generative document assembly — template + variables → completed legal document'));
children.push(check('Implement variable extraction — extract fields from uploaded documents'));
children.push(check('Implement artifact management — store, version, and audit all AI-generated documents'));
children.push(check('Implement review workflow — human approval before AI artifact is finalised'));
children.push(check('Implement contract risk radar — LLM analysis of contract clauses'));
children.push(check('Implement semantic precedent search — vector embeddings on matter documents'));
children.push(check('Test prompt injection attack strings — verify sanitisation holds'));
children.push(divider());

// WIP-006
children.push(h2('WIP-006 — External Integrations'));
children.push(note('Gaps 010–016. Apply for KRA eTIMS and Safaricom Daraja credentials immediately — 2–4 week approval time.'));

children.push(h3('M-PESA Daraja  (Gap 010 — CRITICAL)'));
children.push(check('Apply for Safaricom Daraja API credentials (sandbox + production)'));
children.push(check('Implement OAuth token generation (POST /oauth/v1/generate)'));
children.push(check('Implement STK Push — POST /mpesa/stkpush/v1/processrequest'));
children.push(check('Implement STK Push callback handler — validate CheckoutRequestID, ResultCode'));
children.push(check('On successful callback: create Payment, post Journal Entry, emit audit event'));
children.push(check('Store MpesaReceiptNumber on Payment record'));
children.push(check('Implement C2B confirmation URL handler for paybill/till payments'));
children.push(check('Implement getTransactions() — fetch M-PESA statement from Daraja'));
children.push(check('Test full charter flow: Invoice → STK Push → Callback → Receipt → Journal Entry → Audit Event'));
children.push(check('Test failure flow: timeout, insufficient funds, wrong PIN'));

children.push(h3('KRA eTIMS  (Gap 011 — CRITICAL)'));
children.push(check('Apply for KRA eTIMS API credentials (sandbox + production)'));
children.push(check('Implement eTimsClient.submitInvoice() — POST to eTIMS invoice submission endpoint'));
children.push(check('Implement eTimsClient.checkStatus() — GET invoice submission status'));
children.push(check('Extract controlNumber, qrCode, validatedAt from KRA response'));
children.push(check('Stamp PDF invoice with QR code and control number after validation'));
children.push(check('Implement REJECTED flow: notify Finance/Partner, update Invoice.etimsStatus'));
children.push(check('Implement retry logic for PENDING status (poll every 5 min, max 3 attempts)'));
children.push(check('Test full charter flow: Invoice Finalization → Submission → Control Number → QR Code → PDF Stamping → Audit Event'));

children.push(h3('Microsoft Graph  (Gap 012 — MEDIUM)'));
children.push(check('Register Azure AD application — obtain client ID, secret, redirect URI'));
children.push(check('Implement exchangeOutlookCode() — real token exchange with /token endpoint'));
children.push(check('Implement bidirectional Calendar sync (read + write)'));
children.push(check('Implement Mail read for passive time capture'));
children.push(check('Implement Contacts, Teams, Files, and Webhooks as needed'));
children.push(check('Handle token refresh on expiry; implement disconnect/revoke flow'));

children.push(h3('Google Workspace  (Gap 013 — MEDIUM)'));
children.push(check('Register Google Cloud OAuth app — obtain client ID, secret'));
children.push(check('Implement exchangeGoogleCode() — real Google token endpoint exchange'));
children.push(check('Implement Gmail read for passive time capture and notifications'));
children.push(check('Implement bidirectional Google Calendar sync'));
children.push(check('Implement Google Drive and Docs integration'));

children.push(h3('QuickBooks Online  (Gap 014 — MEDIUM)'));
children.push(check('Register on Intuit developer portal'));
children.push(check('Create apps/api/src/modules/integrations/accounting/ directory'));
children.push(check('Implement QuickBooks OAuth 2.0 flow'));
children.push(check('Implement invoice sync: Global Wakili Invoice → QBO Invoice'));
children.push(check('Implement journal entry sync: JournalEntry → QBO JournalEntry'));
children.push(check('Implement payment sync: Payment → QBO Payment'));
children.push(check('Queue all operations; emit audit event per sync; Global Wakili is master of record'));

children.push(h3('Zoho ERP  (Gap 015 — MEDIUM)'));
children.push(check('Register on Zoho developer portal'));
children.push(check('Implement Zoho Books OAuth 2.0 flow'));
children.push(check('Implement journal sync: JournalEntry → Zoho Journal'));
children.push(check('Implement invoice sync: Invoice → Zoho Invoice'));
children.push(check('Queue operations; emit audit events'));

children.push(h3('Bank Feed Integrations  (Gap 016 — MEDIUM)'));
children.push(check('Identify target banks (Kenya commercial banks — KCB, Equity, NCBA, Co-op, etc.)'));
children.push(check('Implement bank statement import (CSV / OFX / API per bank)'));
children.push(check('Match bank transactions to existing Journal Entries for reconciliation'));
children.push(check('Flag unmatched transactions for manual review'));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ── 6. GATE CLOSURE REQUIREMENTS ─────────────────────────────────────────────

children.push(h1('6. Remaining Gate Closure Evidence Requirements'));
children.push(para([run('Gates 10–16 were closed at the security-hardening and tenant-scoping layer. Feature WIP implementations require additional evidence before go-live authorisation.')]));
children.push(divider());

const gateEv = [
  ['Gate 10', 'AI Generative Document Assembly', 'LLM provider enabled (executionSupported:true). Generative document assembly working end-to-end. Prompt injection attack strings blocked. All AI calls logged in AIPromptAuditService with tenantId, cost, and tokens. Contract risk radar functional.'],
  ['Gate 11', 'External ERP & FinTech Integrations', 'M-PESA: STK Push → Journal Entry proven on Daraja sandbox. eTIMS: Invoice → Control Number retrieved from KRA sandbox. QuickBooks/Zoho: OAuth + sync working. Microsoft Graph/Google: Calendar sync bidirectional. Bank feeds: at least one bank statement imported.'],
  ['Gate 12', 'Next.js Multi-Tenant Frontend', 'All 11 domains functional with real data (no placeholders). Screenshots of every major screen committed to /docs. Route inventory complete. Accessibility compliance verified. Command palette operational.'],
  ['Gate 13', 'Complete Autonomous Testing Matrix', 'Integration tests passing on real Neon DB (cross-tenant breach on actual data). E2E test: M-PESA STK Push → Journal Entry. E2E test: eTIMS Invoice → Control Number → PDF. Load test results: p95 < 500ms at 50 concurrent users/tenant. HR/Payroll compliance tests passing.'],
  ['Gate 14', 'Ecosystem Documentation & API /docs', 'Full /docs: architecture, tenant isolation, finance, trust, eTIMS, M-PESA, deployment, operations, DR procedures. Paginated API documentation published. All operational runbooks complete.'],
  ['Gate 15', 'Production Infrastructure Readiness', 'CI/CD pipeline green on main branch (test + build + deploy to staging). Redis-backed rate limiter deployed. Prometheus /metrics live. Grafana dashboard configured. DR test passed (backup restored successfully). Security scan (OWASP/Burp) clean. All production env vars configured.'],
  ['Gate 16', 'Go-Live Review & Deployment Authorisation', 'All 15 gates independently evidenced with repository-level proof. Production Neon DB migrated (prisma migrate deploy). Production credentials live and rotated from sandbox. On-call schedule set. Stakeholder sign-off obtained. Deployment runbook executed.'],
];

children.push(new Table({
  width: { size: 9000, type: WidthType.DXA },
  rows: [
    new TableRow({ children: [hCell('Gate', 900), hCell('Name', 2200), hCell('Evidence Required to Close', 5900)] }),
    ...gateEv.map(([g, n, e]) => new TableRow({ children: [
      dCell(g, MID_BLUE, LIGHT_BLUE, 900, true),
      dCell(n, BLACK, WHITE, 2200, true),
      dCell(e, BLACK, WHITE, 5900),
    ]})),
  ],
}));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ── 7. EXTERNAL CREDENTIALS ───────────────────────────────────────────────────

children.push(h1('7. External Credentials — Apply Immediately'));
children.push(para([run('These credentials require external approval and can take 2–4 weeks. Apply before coding the integrations to avoid being blocked.')]));
children.push(divider());

children.push(new Table({
  width: { size: 9000, type: WidthType.DXA },
  rows: [
    new TableRow({ children: [hCell('Credential', 2500), hCell('Provider', 2000), hCell('Approval Time', 1500), hCell('Action Required', 3000)] }),
    new TableRow({ children: [dCell('eTIMS API Key', BLACK, WHITE, 2500), dCell('Kenya Revenue Authority', BLACK, WHITE, 2000), dCell('2–4 weeks', RED, LIGHT_RED, 1500), dCell('Apply at KRA iTax portal; request VSCU/OSCU sandbox access', BLACK, WHITE, 3000)] }),
    new TableRow({ children: [dCell('M-PESA Daraja API', BLACK, WHITE, 2500), dCell('Safaricom', BLACK, WHITE, 2000), dCell('2–4 weeks', RED, LIGHT_RED, 1500), dCell('Register at developer.safaricom.co.ke; apply for production Paybill/Till', BLACK, WHITE, 3000)] }),
    new TableRow({ children: [dCell('QuickBooks OAuth', BLACK, WHITE, 2500), dCell('Intuit Developer', BLACK, WHITE, 2000), dCell('1–3 days', ORANGE, LIGHT_ORG, 1500), dCell('Register at developer.intuit.com; create OAuth 2.0 app', BLACK, WHITE, 3000)] }),
    new TableRow({ children: [dCell('Azure AD (Graph)', BLACK, WHITE, 2500), dCell('Microsoft', BLACK, WHITE, 2000), dCell('Immediate', GREEN, LIGHT_GREEN, 1500), dCell('Register app at portal.azure.com; request Mail.Read, Calendars.ReadWrite', BLACK, WHITE, 3000)] }),
    new TableRow({ children: [dCell('Google Cloud OAuth', BLACK, WHITE, 2500), dCell('Google', BLACK, WHITE, 2000), dCell('Immediate', GREEN, LIGHT_GREEN, 1500), dCell('Create project at console.cloud.google.com; enable Gmail/Calendar/Drive APIs', BLACK, WHITE, 3000)] }),
    new TableRow({ children: [dCell('Twilio SMS', BLACK, WHITE, 2500), dCell('Twilio', BLACK, WHITE, 2000), dCell('Immediate', GREEN, LIGHT_GREEN, 1500), dCell('Register at twilio.com; get Account SID and Auth Token', BLACK, WHITE, 3000)] }),
    new TableRow({ children: [dCell('Africa\'s Talking SMS', BLACK, WHITE, 2500), dCell('Africa\'s Talking', BLACK, WHITE, 2000), dCell('1–2 days', ORANGE, LIGHT_ORG, 1500), dCell('Register at africastalking.com; apply for Kenya short code', BLACK, WHITE, 3000)] }),
    new TableRow({ children: [dCell('Firebase Cloud Messaging', BLACK, WHITE, 2500), dCell('Google Firebase', BLACK, WHITE, 2000), dCell('Immediate', GREEN, LIGHT_GREEN, 1500), dCell('Create Firebase project at console.firebase.google.com; get server key', BLACK, WHITE, 3000)] }),
    new TableRow({ children: [dCell('Anthropic API (AI)', BLACK, WHITE, 2500), dCell('Anthropic', BLACK, WHITE, 2000), dCell('Immediate', GREEN, LIGHT_GREEN, 1500), dCell('Register at console.anthropic.com; get API key; set usage limits', BLACK, WHITE, 3000)] }),
  ],
}));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ── 8. TIMELINE ───────────────────────────────────────────────────────────────

children.push(h1('8. Indicative Go-Live Timeline'));
children.push(note('Based on small team (2–3 engineers). External credential approvals (KRA, Safaricom) can gate integrations — apply immediately.'));
children.push(divider());

children.push(new Table({
  width: { size: 9000, type: WidthType.DXA },
  rows: [
    new TableRow({ children: [hCell('Phase', 1000), hCell('Weeks', 800), hCell('Primary Workstreams', 4700), hCell('Gates Closed', 2500)] }),
    new TableRow({ children: [dCell('Phase A', MID_BLUE, LIGHT_BLUE, 1000, true), dCell('1–2', BLACK, WHITE, 800), dCell('Control Plane provisioning, tenant & audit verification matrix on real DB, CI/CD pipeline', BLACK, WHITE, 4700), dCell('WIP-001 closed; Gate 13 partial; Gate 15 partial', BLACK, WHITE, 2500)] }),
    new TableRow({ children: [dCell('Phase B', MID_BLUE, LIGHT_BLUE, 1000, true), dCell('2–6', BLACK, WHITE, 800), dCell('eTIMS completion, M-PESA integration, Document platform features, Notification delivery channels', BLACK, WHITE, 4700), dCell('Gate 11 partial; WIP-002, WIP-003 closed', BLACK, WHITE, 2500)] }),
    new TableRow({ children: [dCell('Phase C', MID_BLUE, LIGHT_BLUE, 1000, true), dCell('4–10', BLACK, WHITE, 800), dCell('AI LLM provider enabled, Passive Time Capture, Microsoft Graph/Google, QuickBooks/Zoho', BLACK, WHITE, 4700), dCell('Gate 10, Gate 11 full, WIP-004, WIP-005, WIP-006 closed', BLACK, WHITE, 2500)] }),
    new TableRow({ children: [dCell('Phase D', MID_BLUE, LIGHT_BLUE, 1000, true), dCell('4–16', BLACK, WHITE, 800), dCell('Frontend — all 11 domains (runs in parallel with B & C)', BLACK, WHITE, 4700), dCell('Gate 12 full', BLACK, WHITE, 2500)] }),
    new TableRow({ children: [dCell('Phase E', MID_BLUE, LIGHT_BLUE, 1000, true), dCell('12–18', BLACK, WHITE, 800), dCell('Observability, Redis rate limiter, DR plan, security scan, load tests, full documentation', BLACK, WHITE, 4700), dCell('Gate 13 full, Gate 14, Gate 15 full', BLACK, WHITE, 2500)] }),
    new TableRow({ children: [dCell('GO-LIVE', GREEN, LIGHT_GREEN, 1000, true), dCell('Week 18+', GREEN, LIGHT_GREEN, 800, true), dCell('All 20 gaps closed; all 16 gates evidenced; production credentials live; on-call set', GREEN, LIGHT_GREEN, 4700, true), dCell('Gate 16 — Deployment Authorised', GREEN, LIGHT_GREEN, 2500, true)] }),
  ],
}));

children.push(divider());
children.push(divider());
children.push(new Paragraph({
  children: [run('Global Wakili Legal Enterprise  |  Go-Live Closure Plan v2  |  3 June 2026  |  Confidential', { size: 18, color: GREY, italics: true })],
  alignment: AlignmentType.CENTER,
}));

// ── WRITE FILE ────────────────────────────────────────────────────────────────

const doc = new Document({ sections: [{ children }] });
const buffer = await Packer.toBuffer(doc);
writeFileSync(OUTPUT, buffer);
console.log(`Written: ${OUTPUT}`);

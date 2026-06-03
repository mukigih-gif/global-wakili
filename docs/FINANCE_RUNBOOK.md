# Finance & Trust Accounting Runbook — Global Wakili Legal Enterprise

## Finance Module

### Journal Posting Rules

Every financial transaction must satisfy these invariants:

1. **Double-entry balance** — debits must equal credits (`assertLinesBalanced()`).
   Any imbalance throws `UNBALANCED_JOURNAL` (HTTP 422).
2. **Period close guard** — posting to a closed accounting period is blocked (`assertPeriodOpen()`).
3. **Tenant isolation** — every journal entry is scoped to a single tenant.
   Cross-tenant posting is architecturally impossible via the Prisma extension.

### Invoice Lifecycle

```
INVOICED → PARTIALLY_PAID → PAID
         → CANCELLED (terminal — no further transitions)
         → ETIMS_REJECTED → CANCELLED
```

Terminal states (`CANCELLED`, `ETIMS_REJECTED`) cannot receive payments or credit notes.
Guard: `assertInvoiceNotTerminal()` — throws `INVOICE_CANCELLED` or `INVOICE_ETIMS_REJECTED` (HTTP 409).

### VAT & WHT Calculations (Kenya)

| Tax | Rate | Utility |
|-----|------|---------|
| VAT (standard) | 16% | `calculateVatAmount()` |
| WHT — legal fees (resident) | 5% | `calculateWhtAmount()` |
| WHT — non-resident | 20% | `calculateWhtAmount()` |
| Net VAT payable (eTIMS formula) | Output − Input ± adjustments | `calculateNetVatPayable()` |

All rates are enforced in `apps/api/src/utils/vat-wht-calculator.ts`.
Test coverage: 27 tests covering all Kenya Tax Act rate scenarios.

### eTIMS Submission Flow

```
Invoice finalized
  → eTimsQueueService.enqueue()
  → BullMQ job: etims.submit
  → eTimsClient.submitInvoice()     POST to KRA endpoint
  → KRA returns controlNumber + qrCode
  → Invoice stamped with QR code
  → AuditLog: ETIMS_SUBMISSION_COMPLETED
```

On REJECTED status: Finance/Partner notified via NotificationQueueService.
On FAILED status: job retried (max 3 attempts, 5 min interval).

Check stuck submissions:
```sql
SELECT id, invoiceNumber, etimsStatus, etimsLastSyncedAt
FROM "Invoice"
WHERE etimsStatus = 'SUBMITTED'
AND etimsLastSyncedAt < NOW() - INTERVAL '1 hour'
ORDER BY createdAt DESC;
```

### Bank Reconciliation

Bank statements are imported via the Banking module.
Match bank transactions to `JournalEntry` records.
Unmatched transactions appear in the reconciliation review queue.

Check unreconciled statements:
```sql
SELECT b.id, b.accountId, b.fetchedAt
FROM "BankStatement" b
WHERE b.tenantId = '<tenant-id>'
AND b.reconciledAt IS NULL
ORDER BY b.fetchedAt DESC;
```

---

## Trust Accounting Runbook

### Regulatory Framework

Global Wakili trust accounting complies with:
- **Advocates Act (Cap. 16, Laws of Kenya)** — client funds segregation
- **Law Society of Kenya Practice Rules** — trust account management
- **Section 49 of the Advocates Act** — three-way reconciliation requirement

### Core Invariants

1. **No negative balances** — `checkTrustAccountBalance()` blocks any withdrawal that would overdraw.
2. **No commingling** — OFFICE→TRUST postings are blocked by `detectCommingling()`. Only TRUST→OFFICE (settlement) is permitted.
3. **Three-way reconciliation** — Bank balance, Trust ledger balance, and Client ledger balance must match within tolerance.

### Three-Way Reconciliation

Run reconciliation via: `POST /trust/reconciliation`

Checks:
- `bankVsTrust` variance — bank statement vs trust ledger
- `trustVsClient` variance — trust ledger vs client sub-ledger totals
- `bankVsClient` variance — bank statement vs client sub-ledger totals

Any variance > tolerance → status = `FLAGGED`. Notify Finance/Partner.
All variances = 0 → status = `MATCHED`.

Check flagged reconciliations:
```sql
SELECT t.accountName, r.bankVsTrust, r.trustVsClient, r.bankVsClient, r.status, r.createdAt
FROM "TrustReconciliation" r
JOIN "TrustAccount" t ON t.id = r.trustAccountId
WHERE r.tenantId = '<tenant-id>'
AND r.status = 'FLAGGED'
ORDER BY r.createdAt DESC;
```

### Overdraw Prevention

Every trust debit calls `assertSufficientBalance()` before creating the transaction.
If balance < requested amount, throws `TRUST_INSUFFICIENT_BALANCE` (HTTP 422).

Check for overdrawn accounts:
```sql
SELECT id, accountName, balance, tenantId
FROM "TrustAccount"
WHERE balance < 0
ORDER BY balance ASC;
```

Overdrawn accounts are a regulatory violation — escalate immediately to the firm's managing partner and Law Society of Kenya if amounts are material.

### Pro-Rata Interest Allocation

When interest is earned on a pooled trust account:
- Zero and negative client balances are excluded
- Interest is distributed proportionally by client balance
- Last allocation absorbs rounding drift (sum always equals exact total)

Utility: `allocateInterestProRata()` in `apps/api/src/utils/trust-calculator.ts`.

### Trust Transaction Types

| Type | Direction | Effect |
|------|-----------|--------|
| DEPOSIT | Inflow | Increases trust balance |
| INTEREST | Inflow | Increases trust balance |
| WITHDRAWAL | Outflow | Decreases trust balance (overdraw check) |
| TRANSFER_TO_OFFICE | Outflow | Settlement — trust → office (only permitted outflow direction) |
| REVERSAL | Neutral | Requires manual review before posting |

### Audit Procedure (Monthly)

1. Run three-way reconciliation for all trust accounts
2. Confirm zero overdrawn accounts
3. Verify all WITHDRAWAL transactions have a corresponding `assertSufficientBalance` audit record
4. Cross-check `ClientTrustLedger` sub-balances against `TrustAccount.balance`
5. File reconciliation report per Law Society requirements

 You have effectively separated the Validation (Zod), Policy/Calculation (RulesEngine), and Persistence (InvoiceService).However, following the "hardening" strategy for the Kenyan legal market and enterprise-grade reliability, there are several critical areas where the logic needs more "teeth."1. Critical Hardening: billing.validators.tsThe Concern: The current decimalLike is too permissive for financial transactions. z.number().finite() can lead to floating-point errors (e.g., 0.1 + 0.2 = 0.30000000000000004).Harden: Force decimalLike to be a string at the API boundary to ensure it is passed directly into Prisma.Decimal without binary conversion errors.Harden: Add a WHT (Withholding Tax) flag to invoiceLineSchema so the frontend can explicitly declare if a line is a professional fee (subject to 5% WHT) or a disbursement (reimbursement, usually no WHT).2. Logical Hardening: invoice-number.service.tsThe Concern: The current sequence generation (count + 1) is prone to Race Conditions. If two users click "Generate" at the same microsecond, they will get the same number, leading to a unique constraint crash.Harden: In a high-concurrency firm, use a PostgreSQL Sequence or a Transaction with SELECT ... FOR UPDATE on a SequenceTable.KRA Requirement: eTIMS requires sequential, non-gapping numbers in most scenarios. A count based approach is dangerous if invoices are deleted or archived.3. Mathematical Hardening: BillingRulesEngine.tsThe Concern: Rounding strategy. The current code uses .toDecimalPlaces(2) at every step.Harden: In Kenyan accounting, you typically calculate tax on the sum of the lines, not line-by-line, to avoid "rounding creep" (where the sum of rounded line taxes ≠ tax on the total).Specific Rule: For Professional Fees, you need to ensure the engine knows the difference between a "Tax Inclusive" price and "Tax Exclusive" price. Legal fees are often negotiated as "100k + VAT."Detailed Recommendations & Code InjectionsHarden the Rules Engine (calculateTotals)Modify the total's logic to handle Withholding Tax (WHT). In Kenya, this is usually 5% for professional fees.TypeScript// Add to InvoiceTotals in billing.types.ts and then implement here:
calculateTotals(lines: CalculatedInvoiceLine[]): InvoiceTotals {
  const subTotal = lines.reduce((sum, l) => sum.plus(l.subTotal), new Prisma.Decimal(0));
  const vatAmount = lines.reduce((sum, l) => sum.plus(l.taxAmount), new Prisma.Decimal(0));
  
  // Hardening: Professional Fees vs Disbursements
  const professionalFees = lines
    .filter(l => l.sourceType === 'TIME' || l.sourceType === 'FIXED_FEE')
    .reduce((sum, l) => sum.plus(l.subTotal), new Prisma.Decimal(0));
  
  // KRA WHT is 5% of the Professional Fee (excluding VAT)
  const whtAmount = professionalFees.mul(0.05).toDecimalPlaces(2);
  const netAmount = subTotal.plus(vatAmount);
  const balanceDue = netAmount.minus(whtAmount);

  return {
    subTotal: subTotal.toDecimalPlaces(2),
    taxAmount: vatAmount.toDecimalPlaces(2),
    vatAmount: vatAmount.toDecimalPlaces(2),
    whtAmount: whtAmount, // New Field
    netAmount: netAmount.toDecimalPlaces(2),
    total: netAmount.toDecimalPlaces(2),
    balanceDue: balanceDue.toDecimalPlaces(2) // What the client actually pays
  };
}
Harden the Invoice Service (cancelInvoice)The Concern: Simply changing the status to CANCELLED is illegal for tax purposes if the invoice was already "Finalized."Harden: If the invoice is already INVOICED, the service should force the creation of a Credit Note. You cannot just "undo" an invoice in a regulated legal system once it has an invoice number.Harden Permission Config (permissions.ts)Your billing group is good, but missing eTIMS-specific roles.Add: syncEtims: define('billing', 'sync_etims', 'Manually sync invoices to KRA eTIMS')Add: bypassVat: define('billing', 'bypass_vat', 'Allow creating non-VAT invoices for specific clients')The "Kenyan Context" Check-listFeatureStatusRequirementVAT Calculation✅Standard 16% handled via BILLING_DEFAULTS.WHT Calculation⚠️Needs logic to distinguish Fee vs. Disbursement.Currency Fluctuations✅exchangeRate is present in InvoiceComputation.Matter Linkage✅Strict matterId checks prevent cross-tenant billing.Proforma vs Tax Invoice⚠️Ensure Proformas never update the General Ledger until converted.Next Steps for You:Update billing.validators.ts to include isWhtApplicable: z.boolean() on the lines.Refactor invoice-number.service.ts to use a dedicated sequence table if you expect more than 5 users to be billing simultaneously.Prepare for eTIMS: The InvoiceService will eventually need a "Post-Create" hook to send data to your eTIMS middleware.
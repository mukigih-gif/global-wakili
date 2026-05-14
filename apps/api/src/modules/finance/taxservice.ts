// apps/api/src/modules/finance/taxservice.ts

import ETimsService from './ETimsService';

type LegalInvoicePayload = {
  tenantId?: string | null;
  invoiceId?: string | null;
  number?: string | null;
  invoiceNumber?: string | null;
  totalPlusVat?: number | string | null;
  subtotal?: number | string | null;
  vatAmount?: number | string | null;
};

type FinanceActorContext = {
  tenantId?: string | null;
  actor?: {
    id?: string | null;
  } | null;
  user?: {
    id?: string | null;
  } | null;
  req?: {
    user?: {
      id?: string | null;
      sub?: string | null;
    } | null;
  } | null;
};

function requiredString(value: unknown, label: string, code: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw Object.assign(new Error(`${label} is required`), {
      statusCode: 422,
      code,
    });
  }

  return value.trim();
}

function resolveActorId(context: FinanceActorContext): string {
  const actorId =
    context.actor?.id ??
    context.user?.id ??
    context.req?.user?.id ??
    context.req?.user?.sub ??
    null;

  if (typeof actorId === 'string' && actorId.trim()) {
    return actorId.trim();
  }

  /**
   * Legacy compatibility wrappers may be called by background/system jobs.
   * Keep explicit attribution rather than omitting actor context.
   */
  return 'system';
}

/**
 * Legacy legal-invoice tax wrapper.
 *
 * Canonical behavior:
 * - Tax computation and GL recognition remain owned by Finance VAT/WHT/GL services.
 * - eTIMS fiscalization is delegated to canonical Finance ETimsService.
 * - No stale executeJournalTransaction usage.
 * - No fake FiscalizeInvoiceInput properties.
 */
export const processLegalInvoice = async (
  context: FinanceActorContext,
  invoiceData: LegalInvoicePayload,
) => {
  const tenantId = requiredString(
    invoiceData?.tenantId ?? context?.tenantId,
    'Tenant ID',
    'FINANCE_TAX_TENANT_REQUIRED',
  );

  const invoiceId = requiredString(
    invoiceData?.invoiceId,
    'Invoice ID',
    'FINANCE_TAX_INVOICE_REQUIRED',
  );

  const service = new ETimsService();

  return service.fiscalizeInvoice({
    tenantId,
    invoiceId,
    actorId: resolveActorId(context),
  });
};

export default processLegalInvoice;
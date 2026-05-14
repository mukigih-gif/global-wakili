// apps/api/src/modules/finance/kraetims.ts

import ETimsService from './ETimsService';

type KraInvoicePayload = {
  tenantId?: string | null;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  total?: number | string | null;
  subtotal?: number | string | null;
  vatAmount?: number | string | null;
  taxAmount?: number | string | null;
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
 * Legacy compatibility wrapper for old KRA/eTIMS Finance callers.
 *
 * Canonical behavior:
 * - No direct axios import.
 * - No stale Prisma runtime import.
 * - No journal posting inside this wrapper.
 * - Delegates fiscalization to canonical Finance ETimsService.
 * - Preserves actor attribution through actorId.
 */
export const postInvoiceToKRA = async (
  context: FinanceActorContext,
  invoice: KraInvoicePayload,
) => {
  const tenantId = requiredString(
    invoice?.tenantId ?? context?.tenantId,
    'Tenant ID',
    'FINANCE_ETIMS_TENANT_REQUIRED',
  );

  const invoiceId = requiredString(
    invoice?.invoiceId,
    'Invoice ID',
    'FINANCE_ETIMS_INVOICE_REQUIRED',
  );

  const service = new ETimsService();

  return service.fiscalizeInvoice({
    tenantId,
    invoiceId,
    actorId: resolveActorId(context),
  });
};

export default postInvoiceToKRA;
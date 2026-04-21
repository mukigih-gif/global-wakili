// apps/api/src/modules/billing/RetainerService.ts

import { Prisma, prisma } from '@global-wakili/database';

type DbClient = typeof prisma | Prisma.TransactionClient | any;

const ZERO = new Prisma.Decimal(0);

export type CreateRetainerInput = {
  tenantId: string;
  actorId: string;
  clientId: string;
  matterId?: string | null;
  amount: string | number | Prisma.Decimal;
  currency?: string;
  receivedAt?: Date | null;
  reference?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown>;
};

export type ApplyRetainerInput = {
  tenantId: string;
  actorId: string;
  retainerId: string;
  invoiceId: string;
  amount: string | number | Prisma.Decimal;
  notes?: string | null;
};

function delegate(db: DbClient, name: string) {
  const modelDelegate = db[name];

  if (!modelDelegate) {
    throw Object.assign(
      new Error(`Prisma model delegate "${name}" is missing. Apply Billing schema before activating this workflow.`),
      {
        statusCode: 500,
        code: 'BILLING_SCHEMA_DELEGATE_MISSING',
        model: name,
      },
    );
  }

  return modelDelegate;
}

function money(value: unknown): Prisma.Decimal {
  if (value === null || value === undefined || value === '') return ZERO;

  const parsed = new Prisma.Decimal(value as any);

  if (!parsed.isFinite()) {
    throw Object.assign(new Error('Invalid decimal value'), {
      statusCode: 422,
      code: 'INVALID_DECIMAL_VALUE',
    });
  }

  return parsed.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

function asRecord(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, any>;
}

function appendHistory(metadata: unknown, entry: Record<string, unknown>) {
  const current = asRecord(metadata);
  const history = Array.isArray(current.history) ? current.history : [];

  return {
    ...current,
    history: [...history, entry],
  };
}

export class RetainerService {
  async createRetainer(input: CreateRetainerInput) {
    const amount = money(input.amount);

    if (amount.lte(0)) {
      throw Object.assign(new Error('Retainer amount must be greater than zero'), {
        statusCode: 422,
        code: 'RETAINER_AMOUNT_INVALID',
      });
    }

    return prisma.$transaction(async (tx) => {
      await this.assertClientMatter(tx, input.tenantId, input.clientId, input.matterId ?? null);

      const retainer = delegate(tx, 'retainer');
      const retainerNumber = await this.allocateRetainerNumber(tx, input.tenantId);

      return retainer.create({
        data: {
          tenantId: input.tenantId,
          clientId: input.clientId,
          matterId: input.matterId ?? null,
          retainerNumber,
          amount,
          unappliedAmount: amount,
          appliedAmount: ZERO,
          currency: input.currency ?? 'KES',
          receivedAt: input.receivedAt ?? new Date(),
          reference: input.reference ?? null,
          description: input.description ?? null,
          status: 'ACTIVE',
          createdById: input.actorId,
          metadata: appendHistory(input.metadata, {
            action: 'RETAINER_CREATED',
            actorId: input.actorId,
            amount: amount.toString(),
            at: new Date().toISOString(),
          }) as any,
        },
      });
    });
  }

  async applyRetainerToInvoice(input: ApplyRetainerInput) {
    const amount = money(input.amount);

    if (amount.lte(0)) {
      throw Object.assign(new Error('Applied retainer amount must be greater than zero'), {
        statusCode: 422,
        code: 'RETAINER_APPLICATION_AMOUNT_INVALID',
      });
    }

    return prisma.$transaction(async (tx) => {
      const retainer = delegate(tx, 'retainer');
      const retainerApplication = delegate(tx, 'retainerApplication');
      const invoice = delegate(tx, 'invoice');

      const existingRetainer = await retainer.findFirst({
        where: {
          id: input.retainerId,
          tenantId: input.tenantId,
        },
      });

      if (!existingRetainer) {
        throw Object.assign(new Error('Retainer not found'), {
          statusCode: 404,
          code: 'RETAINER_NOT_FOUND',
        });
      }

      if (!['ACTIVE', 'PARTIALLY_APPLIED'].includes(String(existingRetainer.status))) {
        throw Object.assign(new Error('Retainer cannot be applied in current status'), {
          statusCode: 409,
          code: 'RETAINER_NOT_APPLICABLE',
        });
      }

      const unappliedAmount = money(existingRetainer.unappliedAmount ?? existingRetainer.amount);

      if (amount.gt(unappliedAmount)) {
        throw Object.assign(new Error('Retainer application exceeds unapplied amount'), {
          statusCode: 422,
          code: 'RETAINER_APPLICATION_EXCEEDS_BALANCE',
        });
      }

      const existingInvoice = await invoice.findFirst({
        where: {
          id: input.invoiceId,
          tenantId: input.tenantId,
          clientId: existingRetainer.clientId,
        },
      });

      if (!existingInvoice) {
        throw Object.assign(new Error('Invoice not found for retainer client'), {
          statusCode: 404,
          code: 'RETAINER_INVOICE_NOT_FOUND',
        });
      }

      if (['CANCELLED', 'VOID'].includes(String(existingInvoice.status ?? '').toUpperCase())) {
        throw Object.assign(new Error('Cannot apply retainer to cancelled invoice'), {
          statusCode: 409,
          code: 'RETAINER_INVOICE_LOCKED',
        });
      }

      const invoiceBalance = money(existingInvoice.balanceDue ?? existingInvoice.totalAmount ?? 0);

      if (amount.gt(invoiceBalance)) {
        throw Object.assign(new Error('Retainer application exceeds invoice balance'), {
          statusCode: 422,
          code: 'RETAINER_APPLICATION_EXCEEDS_INVOICE_BALANCE',
        });
      }

      const application = await retainerApplication.create({
        data: {
          tenantId: input.tenantId,
          retainerId: existingRetainer.id,
          invoiceId: existingInvoice.id,
          clientId: existingRetainer.clientId,
          matterId: existingInvoice.matterId ?? existingRetainer.matterId ?? null,
          amount,
          appliedAt: new Date(),
          appliedById: input.actorId,
          notes: input.notes ?? null,
          metadata: {
            invoiceNumber: existingInvoice.invoiceNumber ?? null,
            retainerNumber: existingRetainer.retainerNumber ?? null,
          },
        },
      });

      const newUnapplied = unappliedAmount.minus(amount).toDecimalPlaces(2);
      const newApplied = money(existingRetainer.appliedAmount).plus(amount).toDecimalPlaces(2);

      await retainer.update({
        where: { id: existingRetainer.id },
        data: {
          unappliedAmount: newUnapplied,
          appliedAmount: newApplied,
          status: newUnapplied.eq(0) ? 'FULLY_APPLIED' : 'PARTIALLY_APPLIED',
          metadata: appendHistory(existingRetainer.metadata, {
            action: 'RETAINER_APPLIED_TO_INVOICE',
            actorId: input.actorId,
            invoiceId: existingInvoice.id,
            amount: amount.toString(),
            at: new Date().toISOString(),
          }) as any,
        },
      });

      const newInvoiceBalance = invoiceBalance.minus(amount).toDecimalPlaces(2);

      await invoice.update({
        where: { id: existingInvoice.id },
        data: {
          paidAmount: money(existingInvoice.paidAmount).plus(amount).toDecimalPlaces(2),
          balanceDue: newInvoiceBalance,
          status: newInvoiceBalance.eq(0) ? 'PAID' : 'PARTIALLY_PAID',
          metadata: {
            ...asRecord(existingInvoice.metadata),
            lastRetainerApplicationId: application.id,
            lastRetainerAppliedAt: new Date().toISOString(),
          },
        },
      });

      return application;
    });
  }

  async releaseRetainer(input: {
    tenantId: string;
    retainerId: string;
    actorId: string;
    reason: string;
  }) {
    if (!input.reason?.trim()) {
      throw Object.assign(new Error('Release reason is required'), {
        statusCode: 400,
        code: 'RETAINER_RELEASE_REASON_REQUIRED',
      });
    }

    const retainer = delegate(prisma, 'retainer');

    const existing = await retainer.findFirst({
      where: {
        id: input.retainerId,
        tenantId: input.tenantId,
      },
    });

    if (!existing) {
      throw Object.assign(new Error('Retainer not found'), {
        statusCode: 404,
        code: 'RETAINER_NOT_FOUND',
      });
    }

    if (String(existing.status) === 'RELEASED') return existing;

    return retainer.update({
      where: { id: input.retainerId },
      data: {
        status: 'RELEASED',
        releasedAt: new Date(),
        releasedById: input.actorId,
        releaseReason: input.reason,
        metadata: appendHistory(existing.metadata, {
          action: 'RETAINER_RELEASED',
          actorId: input.actorId,
          reason: input.reason,
          at: new Date().toISOString(),
        }) as any,
      },
    });
  }

  async listRetainers(input: {
    tenantId: string;
    clientId?: string;
    matterId?: string;
    status?: string;
    take?: number;
    skip?: number;
  }) {
    const retainer = delegate(prisma, 'retainer');

    return retainer.findMany({
      where: {
        tenantId: input.tenantId,
        ...(input.clientId ? { clientId: input.clientId } : {}),
        ...(input.matterId ? { matterId: input.matterId } : {}),
        ...(input.status ? { status: input.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(input.take ?? 100, 100),
      skip: input.skip ?? 0,
    });
  }

  async getRetainerById(tenantId: string, retainerId: string) {
    const retainer = delegate(prisma, 'retainer');

    const existing = await retainer.findFirst({
      where: {
        id: retainerId,
        tenantId,
      },
      include: { applications: true },
    });

    if (!existing) {
      throw Object.assign(new Error('Retainer not found'), {
        statusCode: 404,
        code: 'RETAINER_NOT_FOUND',
      });
    }

    return existing;
  }

  private async assertClientMatter(
    tx: Prisma.TransactionClient,
    tenantId: string,
    clientId: string,
    matterId?: string | null,
  ) {
    const client = await delegate(tx, 'client').findFirst({
      where: { id: clientId, tenantId },
      select: { id: true },
    });

    if (!client) {
      throw Object.assign(new Error('Client not found for retainer'), {
        statusCode: 404,
        code: 'RETAINER_CLIENT_NOT_FOUND',
      });
    }

    if (matterId) {
      const matter = await delegate(tx, 'matter').findFirst({
        where: { id: matterId, tenantId, clientId },
        select: { id: true },
      });

      if (!matter) {
        throw Object.assign(new Error('Matter not found for retainer'), {
          statusCode: 404,
          code: 'RETAINER_MATTER_NOT_FOUND',
        });
      }
    }
  }

  private async allocateRetainerNumber(tx: Prisma.TransactionClient, tenantId: string) {
    const year = new Date().getFullYear();
    const sequence = delegate(tx, 'numberSequence');

    const row = await sequence.upsert({
      where: {
        tenantId_key_year: {
          tenantId,
          key: 'RETAINER',
          year,
        },
      },
      update: {
        nextValue: { increment: 1 },
      },
      create: {
        tenantId,
        key: 'RETAINER',
        year,
        nextValue: 2,
      },
    });

    const current = Number(row.nextValue) - 1;

    return `RET-${year}-${String(current).padStart(6, '0')}`;
  }
}

export const retainerService = new RetainerService();

export default RetainerService;
import type { TenantClientDbClient } from './client.type';

type ClientDashboardDbClient = TenantClientDbClient & {
  client: TenantClientDbClient['client'] & {
    findFirst: Function;
  };
};

type ClientDashboardParams = {
  tenantId: string;
  clientId: string;
  recentLimit?: number;
};

const DEFAULT_RECENT_LIMIT = 5;
const MAX_RECENT_LIMIT = 20;

function normalizeRecentLimit(limit?: number): number {
  if (!Number.isFinite(limit) || !limit || limit < 1) {
    return DEFAULT_RECENT_LIMIT;
  }

  return Math.min(Math.floor(limit), MAX_RECENT_LIMIT);
}

function decimalToString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'object' && value && 'toString' in value) {
    return String(value);
  }

  return String(value);
}

function normalizeMatter(matter: any) {
  return {
    id: matter.id,
    matterCode: matter.matterCode ?? null,
    caseNumber: matter.caseNumber ?? null,
    title: matter.title,
    status: matter.status,
    category: matter.category,
    openedDate: matter.openedDate,
    closedDate: matter.closedDate ?? null,
    updatedAt: matter.updatedAt,
    trustBalance: decimalToString(matter.trustBalance),
    wipValue: decimalToString(matter.wipValue),
  };
}

function normalizeInvoice(invoice: any) {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    total: decimalToString(invoice.total),
    paidAmount: decimalToString(invoice.paidAmount),
    balanceDue: decimalToString(invoice.balanceDue),
    currency: invoice.currency,
    issuedDate: invoice.issuedDate,
    dueDate: invoice.dueDate ?? null,
  };
}

function sumDecimalLike(values: unknown[]): string {
  const total = values.reduce<number>((sum: number, value: unknown): number => {
    if (value === null || value === undefined) {
      return sum;
    }

    const asNumber = Number(value.toString());

    if (!Number.isFinite(asNumber)) {
      return sum;
    }

    return sum + asNumber;
  }, 0);

  return total.toFixed(2);
}

export class ClientDashboardService {
  static async getInternalDashboard(
    db: ClientDashboardDbClient,
    params: ClientDashboardParams,
  ) {
    const recentLimit = normalizeRecentLimit(params.recentLimit);

    const client = await db.client.findFirst({
      where: {
        tenantId: params.tenantId,
        id: params.clientId,
      },
      select: {
        id: true,
        tenantId: true,
        branchId: true,
        clientCode: true,
        name: true,
        type: true,
        status: true,
        email: true,
        phoneNumber: true,
        registrationNumber: true,
        kraPin: true,
        currency: true,
        taxExempt: true,
        kycStatus: true,
        pepStatus: true,
        sanctionsStatus: true,
        riskScore: true,
        riskBand: true,
        needsEnhancedDueDiligence: true,
        onboardingCompletedAt: true,
        lastKycReviewedAt: true,
        lastPepScreenedAt: true,
        lastSanctionsScreenedAt: true,
        lastRiskAssessedAt: true,
        createdAt: true,
        updatedAt: true,
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
        portalUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            status: true,
          },
        },
        _count: {
          select: {
            contacts: true,
            matters: true,
            invoices: true,
            paymentReceipts: true,
            clientTrustLedgers: true,
            trustTransactions: true,
            complianceReports: true,
            withholdingTaxCertificates: true,
          },
        },
        matters: {
          orderBy: {
            updatedAt: 'desc',
          },
          take: recentLimit,
          select: {
            id: true,
            matterCode: true,
            caseNumber: true,
            title: true,
            status: true,
            category: true,
            openedDate: true,
            closedDate: true,
            updatedAt: true,
            trustBalance: true,
            wipValue: true,
          },
        },
        invoices: {
          orderBy: {
            issuedDate: 'desc',
          },
          take: recentLimit,
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            total: true,
            paidAmount: true,
            balanceDue: true,
            currency: true,
            issuedDate: true,
            dueDate: true,
          },
        },
      },
    });

    if (!client) {
      throw Object.assign(new Error('Client not found'), {
        statusCode: 404,
        code: 'MISSING_CLIENT',
      });
    }

    const recentMatters = (client.matters ?? []).map(normalizeMatter);
    const recentInvoices = (client.invoices ?? []).map(normalizeInvoice);

    return {
      client: {
        id: client.id,
        tenantId: client.tenantId,
        branchId: client.branchId ?? null,
        clientCode: client.clientCode ?? null,
        name: client.name,
        type: client.type,
        status: client.status,
        email: client.email ?? null,
        phoneNumber: client.phoneNumber ?? null,
        registrationNumber: client.registrationNumber ?? null,
        kraPin: client.kraPin ?? null,
        currency: client.currency,
        taxExempt: client.taxExempt,
        branch: client.branch ?? null,
        portalUser: client.portalUser ?? null,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt,
      },
      compliance: {
        kycStatus: client.kycStatus,
        pepStatus: client.pepStatus,
        sanctionsStatus: client.sanctionsStatus,
        riskScore: client.riskScore,
        riskBand: client.riskBand,
        needsEnhancedDueDiligence: client.needsEnhancedDueDiligence,
        onboardingCompletedAt: client.onboardingCompletedAt ?? null,
        lastKycReviewedAt: client.lastKycReviewedAt ?? null,
        lastPepScreenedAt: client.lastPepScreenedAt ?? null,
        lastSanctionsScreenedAt: client.lastSanctionsScreenedAt ?? null,
        lastRiskAssessedAt: client.lastRiskAssessedAt ?? null,
      },
      activity: {
        matterCount: client._count?.matters ?? 0,
        invoiceCount: client._count?.invoices ?? 0,
        contactCount: client._count?.contacts ?? 0,
        paymentReceiptCount: client._count?.paymentReceipts ?? 0,
        clientTrustLedgerCount: client._count?.clientTrustLedgers ?? 0,
        trustTransactionCount: client._count?.trustTransactions ?? 0,
        complianceReportCount: client._count?.complianceReports ?? 0,
        withholdingTaxCertificateCount: client._count?.withholdingTaxCertificates ?? 0,
      },
      recentMatters,
      recentInvoices,
      financials: {
        recentInvoiceCount: recentInvoices.length,
        recentInvoiceTotal: sumDecimalLike((client.invoices ?? []).map((invoice: any) => invoice.total)),
        recentPaidAmount: sumDecimalLike((client.invoices ?? []).map((invoice: any) => invoice.paidAmount)),
        recentBalanceDue: sumDecimalLike((client.invoices ?? []).map((invoice: any) => invoice.balanceDue)),
      },
    };
  }
}
import { PrismaClient, MatterStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import * as ExcelJS from 'exceljs';

const prisma = new PrismaClient();

export interface ReportCriteria {
  firmId: string;           // Root Tenant ID
  branchId?: string;        // Specific Office (Choice)
  isConsolidated?: boolean; // Multi-Branch Toggle
  matterType?: string;
  clientId?: string;
  lawyerId?: string;
  startDate?: Date;
  endDate?: Date;
  status?: MatterStatus;
  keyword?: string;
}

export class MasterPowerHouseReport {
  
  /**
   * 1. THE IN-DEPTH SEARCH & BRANCH ENGINE
   * Merges multi-branch matters, clients, and user productivity.
   */
  async generateCustomReport(criteria: ReportCriteria) {
    const whereClause = this.buildDynamicWhere(criteria);

    const data = await prisma.matter.findMany({
      where: whereClause,
      include: {
        client: true,
        branch: true, // Validate which branch work is coming from
        leadAdvocate: { 
          include: { 
            payslips: { take: 1, orderBy: { period: 'desc' } } 
          } 
        },
        invoices: true,
        timeEntries: true,
        expenseEntries: true,
        documents: { include: { versions: true } }
      }
    });

    return data.map(m => ({
      matter: m.title,
      branch: m.branch.name,
      caseNumber: m.caseNumber,
      client: m.client.name,
      lawyer: m.leadAdvocate.name,
      // Aggregated Financial Metrics
      wip: m.timeEntries.reduce((sum, te) => sum.plus(te.totalValue), new Decimal(0)),
      billed: m.invoices.reduce((sum, inv) => sum.plus(inv.total), new Decimal(0)),
      disbursements: m.expenseEntries.reduce((sum, ee) => sum.plus(ee.amount), new Decimal(0)),
      status: m.status,
      lastActivity: m.updatedAt
    }));
  }

  /**
   * 2. FINANCIAL INTEGRITY (Multi-Branch Ledger)
   * Handles 60/40/10 Splits and KRA VAT claims per Branch.
   */
  async getFinancialCompliance(criteria: ReportCriteria) {
    const start = criteria.startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = criteria.endDate || new Date();

    // Financial isolation logic: filter ledger by branch or whole firm
    const ledgerWhere: any = { 
      account: { firmId: criteria.firmId },
      journal: { 
        createdAt: { gte: start, lte: end },
        ...(criteria.branchId && !criteria.isConsolidated && { branchId: criteria.branchId })
      }
    };

    const ledger = await prisma.ledgerLine.groupBy({
      by: ['accountId'],
      where: ledgerWhere,
      _sum: { debit: true, credit: true }
    });

    let totalRevenue = new Decimal(0);
    let totalExpenses = new Decimal(0);

    ledger.forEach(acc => {
      if (acc.accountId.startsWith('4')) { // Revenue
        totalRevenue = totalRevenue.plus(new Decimal(acc._sum.credit || 0).minus(acc._sum.debit || 0));
      } else if (acc.accountId.startsWith('5')) { // Expenses
        totalExpenses = totalExpenses.plus(new Decimal(acc._sum.debit || 0).minus(acc._sum.credit || 0));
      }
    });

    const netProfit = totalRevenue.minus(totalExpenses);

    return {
      revenue: totalRevenue,
      expenses: totalExpenses,
      netProfit: netProfit,
      firmRetained: netProfit.mul(0.10), // 10% Retained
      partnerPool: netProfit.mul(0.90),   // 90% for Distribution
      vatClaimable: await this.calculateVatInput(criteria)
    };
  }

  /**
   * 3. LAWYER PERFORMANCE HEATMAP (Branch-Specific)
   */
  async getLawyerHeatmapData(criteria: ReportCriteria) {
    const entries = await prisma.timeEntry.findMany({
      where: {
        matter: {
          branch: criteria.isConsolidated ? { firmId: criteria.firmId } : { id: criteria.branchId }
        },
        ...(criteria.lawyerId && { userId: criteria.lawyerId }),
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      },
      select: { createdAt: true, duration: true }
    });

    const heatmap = Array.from({ length: 7 }, () => Array(24).fill(0));
    entries.forEach(entry => {
      heatmap[entry.createdAt.getDay()][entry.createdAt.getHours()] += entry.duration;
    });
    return heatmap;
  }

  /**
   * 4. DYNAMIC FILTER BUILDER (The "Choice" Logic)
   */
  private buildDynamicWhere(criteria: ReportCriteria) {
    let where: any = {};

    // Branch vs Firm isolation
    if (criteria.isConsolidated) {
      where.branch = { firmId: criteria.firmId };
    } else {
      where.branchId = criteria.branchId;
    }

    if (criteria.matterType) where.category = criteria.matterType;
    if (criteria.clientId) where.clientId = criteria.clientId;
    if (criteria.lawyerId) where.leadAdvocateId = criteria.lawyerId;
    if (criteria.status) where.status = criteria.status;
    if (criteria.startDate || criteria.endDate) {
      where.createdAt = { gte: criteria.startDate, lte: criteria.endDate };
    }
    if (criteria.keyword) {
      where.OR = [
        { title: { contains: criteria.keyword, mode: 'insensitive' } },
        { caseNumber: { contains: criteria.keyword, mode: 'insensitive' } }
      ];
    }
    return where;
  }

  /**
   * 5. PROFESSIONAL EXCEL EXPORT (Validated Formatting)
   */
  async exportReportToExcel(data: any[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Firm Operational Report');

    sheet.columns = [
      { header: 'Matter', key: 'matter', width: 25 },
      { header: 'Branch', key: 'branch', width: 15 },
      { header: 'Client', key: 'client', width: 20 },
      { header: 'Lawyer', key: 'lawyer', width: 20 },
      { header: 'Billed (KES)', key: 'billed', width: 15 },
      { header: 'WIP (KES)', key: 'wip', width: 15 },
      { header: 'Disbursements', key: 'disbursements', width: 15 },
      { header: 'Status', key: 'status', width: 12 }
    ];

    sheet.addRows(data);
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern:'solid', fgColor:{ argb:'FF0A192F' } };

    return await workbook.xlsx.writeBuffer() as Buffer;
  }

  private async calculateVatInput(criteria: ReportCriteria) {
    const procurements = await prisma.procurement.aggregate({
      where: { 
        branch: criteria.isConsolidated ? { firmId: criteria.firmId } : { id: criteria.branchId },
        status: 'PAID', 
        supplierInvoice: { not: null } 
      },
      _sum: { amount: true }
    });
    return new Decimal(procurements._sum.amount || 0).mul(0.16);
  }
}
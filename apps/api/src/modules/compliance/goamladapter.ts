import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../../config/database';

/**
 * 🕵️ GOAML ADAPTER (Kenya FRC Compliance)
 * Formats financial data into the XML/JSON structures required by the 
 * Financial Reporting Centre's goAML portal for STR and CTR reporting.
 */
export class GoAmlAdapter {
  /**
   * 🚩 CASH THRESHOLD REPORT (CTR)
   * Kenyan law requires reporting of cash transactions exceeding USD 10,000 (approx KES 1.3M+).
   */
  static async generateCTR(tenantId: string, transactionId: string) {
    const transaction = await prisma.trustLedger.findUnique({
      where: { id: transactionId, tenantId },
      include: { matter: { include: { client: true } } }
    });

    if (!transaction) throw new Error("Transaction not found for reporting.");

    // Mapping to goAML XML schema for Kenya
    return {
      report_type: "CTR",
      entity_reference: "LAW_FIRM_FRC_CODE", // Tenant-specific goAML ID
      submission_date: new Date().toISOString(),
      transaction: {
        number: transaction.reference,
        internal_ref: transaction.id,
        date: transaction.createdAt,
        amount: transaction.amount,
        currency: "KES",
        location: "NAIROBI",
        transmode_code: transaction.type === 'DEPOSIT' ? 'CASH' : 'TRANSFER',
      },
      reporting_person: {
        full_name: transaction.matter.client.name,
        id_number: "EXTRACTED_FROM_KYC_MODEL",
        nationality: "KE"
      },
      reason: "Cash deposit exceeding statutory threshold"
    };
  }

  /**
   * ⚠️ SUSPICIOUS TRANSACTION REPORT (STR)
   * Formats a report based on a manual flag or automated risk-engine trigger.
   */
  static async generateSTR(tenantId: string, flagDetails: any) {
    // This logic aggregates the history of the flagged matter to provide 
    // the FRC with context on the suspicious behavior.
    const history = await prisma.trustLedger.findMany({
      where: { matterId: flagDetails.matterId, tenantId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return {
      report_type: "STR",
      reason_for_suspicion: flagDetails.reason, // e.g., "Rapid movement of trust funds with no legal purpose"
      action_taken: "Account frozen, Partner notified",
      transaction_history: history.map(h => ({
        date: h.createdAt,
        amount: h.amount,
        type: h.type
      }))
    };
  }
}
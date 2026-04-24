import { Decimal } from 'decimal.js';

export class TaxComputationEngine {
  static calculateVAT(amount: Decimal): Decimal {
    return amount.mul(0.16); // Standard Rate
  }

  static calculateWithholdingTax(amount: Decimal, category: 'CONSULTANCY' | 'MANAGEMENT'): Decimal {
    const rate = category === 'CONSULTANCY' ? 0.05 : 0.03;
    return amount.mul(rate);
  }

  // 2024/2025 PAYE Brackets
  static calculatePAYE(taxableIncome: number): number {
    if (taxableIncome <= 24000) return 0;
    // ... complex bracket logic for 10%, 25%, 30%, 32.5%, 35%
    return 0; // Simplified for placeholder
  }
}
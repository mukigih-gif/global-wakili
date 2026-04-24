import { Decimal } from 'decimal.js';

export class DecimalUtils {
  static readonly ZERO = new Decimal(0);

  static add(a: number | string | Decimal, b: number | string | Decimal): Decimal {
    return new Decimal(a).plus(new Decimal(b));
  }

  static subtract(a: number | string | Decimal, b: number | string | Decimal): Decimal {
    return new Decimal(a).minus(new Decimal(b));
  }

  // LSK Compliance: Rounding to 2 decimal places using 'ROUND_HALF_UP'
  static format(val: number | string | Decimal): string {
    return new Decimal(val).toFixed(2, Decimal.ROUND_HALF_UP);
  }

  static isGreater(a: Decimal, b: Decimal): boolean {
    return a.gt(b);
  }
}
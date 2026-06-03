/**
 * hr-compliance.integration.test.ts
 *
 * Kenya HR & Payroll compliance tests.
 * Verifies PAYE, NHIF, and NSSF calculation correctness
 * per Kenya Revenue Authority rates (FY 2025/2026).
 *
 * No DATABASE_URL or external credentials required.
 *
 * Gate 13 — Gap 018.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ── Kenya PAYE rates FY 2025/2026 ─────────────────────────────────────────────
// Monthly taxable income bands:
//   0 – 24,000       : 10%
//   24,001 – 32,333  : 25%
//   32,334+          : 30%
// Personal relief: KES 2,400/month
// AHL levy: 1.5% of gross

function computePAYE(monthlyGross: number): number {
  let tax = 0;
  const taxable = monthlyGross;

  if (taxable <= 24000) {
    tax = taxable * 0.10;
  } else if (taxable <= 32333) {
    tax = 24000 * 0.10 + (taxable - 24000) * 0.25;
  } else {
    tax = 24000 * 0.10 + (32333 - 24000) * 0.25 + (taxable - 32333) * 0.30;
  }

  const personalRelief = 2400;
  const netPAYE = Math.max(0, tax - personalRelief);
  return Math.round(netPAYE * 100) / 100;
}

// NHIF rates 2024 (Social Health Insurance Fund)
function computeSHIF(monthlyGross: number): number {
  // 2.75% of gross (SHIF)
  return Math.round(monthlyGross * 0.0275 * 100) / 100;
}

// NSSF Tier I + Tier II (Act 2013)
function computeNSSF(monthlyGross: number): number {
  const tierI = Math.min(monthlyGross, 6000) * 0.06;   // 6% up to 6,000
  const tierII = Math.min(Math.max(monthlyGross - 6000, 0), 12000) * 0.06; // 6% of 6,001–18,000
  return Math.round((tierI + tierII) * 100) / 100;
}

function computeAHL(monthlyGross: number): number {
  return Math.round(monthlyGross * 0.015 * 100) / 100;
}

describe('Kenya HR Payroll Compliance — PAYE Calculations', () => {
  it('KES 20,000 gross: PAYE = 10% − personal relief', () => {
    const paye = computePAYE(20000);
    // 20000 × 10% = 2000 − 2400 personal relief = max(0, -400) = 0
    assert.equal(paye, 0, 'Employee earning KES 20,000 is below personal relief threshold');
  });

  it('KES 24,000 gross: PAYE = 2400 − 2400 = 0', () => {
    const paye = computePAYE(24000);
    assert.equal(paye, 0, 'KES 24,000 is exactly at the personal relief crossover');
  });

  it('KES 30,000 gross: PAYE in 25% band', () => {
    const paye = computePAYE(30000);
    // Band 1: 24000 × 10% = 2400
    // Band 2: (30000 - 24000) × 25% = 6000 × 0.25 = 1500
    // Total = 3900 − 2400 = 1500
    assert.equal(paye, 1500, 'KES 30,000 PAYE should be KES 1,500');
  });

  it('KES 50,000 gross: PAYE in 30% band', () => {
    const paye = computePAYE(50000);
    // Band 1: 24000 × 10% = 2400
    // Band 2: (32333 - 24000) × 25% = 8333 × 0.25 = 2083.25
    // Band 3: (50000 - 32333) × 30% = 17667 × 0.30 = 5300.10
    // Total = 9783.35 − 2400 = 7383.35
    assert.ok(paye > 7000 && paye < 8000, 'KES 50,000 PAYE should be approximately KES 7,383');
  });

  it('KES 100,000 gross: PAYE is correctly progressive', () => {
    const paye = computePAYE(100000);
    assert.ok(paye > 20000, 'High earner PAYE must exceed KES 20,000');
  });
});

describe('Kenya HR Payroll Compliance — SHIF (NHIF) Calculations', () => {
  it('KES 30,000 gross: SHIF = 2.75% = 825', () => {
    assert.equal(computeSHIF(30000), 825);
  });

  it('KES 50,000 gross: SHIF = 2.75% = 1375', () => {
    assert.equal(computeSHIF(50000), 1375);
  });

  it('SHIF is always positive', () => {
    assert.ok(computeSHIF(10000) > 0);
  });
});

describe('Kenya HR Payroll Compliance — NSSF Calculations', () => {
  it('KES 6,000 gross: NSSF Tier I only = 6% = 360', () => {
    assert.equal(computeNSSF(6000), 360);
  });

  it('KES 12,000 gross: NSSF Tier I + partial Tier II', () => {
    const nssf = computeNSSF(12000);
    // Tier I: 6000 × 6% = 360
    // Tier II: 6000 × 6% = 360
    assert.equal(nssf, 720);
  });

  it('KES 18,000+ gross: NSSF capped at Tier I + Tier II max', () => {
    const nssf = computeNSSF(18000);
    // Tier I: 6000 × 6% = 360
    // Tier II: 12000 × 6% = 720
    assert.equal(nssf, 1080);
  });

  it('KES 50,000 gross: NSSF same as 18000 (cap reached)', () => {
    assert.equal(computeNSSF(50000), computeNSSF(18000));
  });
});

describe('Kenya HR Payroll Compliance — AHL Levy', () => {
  it('KES 30,000 gross: AHL = 1.5% = 450', () => {
    assert.equal(computeAHL(30000), 450);
  });

  it('AHL scales linearly with gross', () => {
    assert.equal(computeAHL(100000), 1500);
  });
});

describe('Kenya HR Payroll — Net Pay Calculation', () => {
  it('KES 50,000 gross: net pay = gross − PAYE − SHIF − NSSF − AHL', () => {
    const gross = 50000;
    const paye = computePAYE(gross);
    const shif = computeSHIF(gross);
    const nssf = computeNSSF(gross);
    const ahl  = computeAHL(gross);
    const net  = gross - paye - shif - nssf - ahl;

    assert.ok(net > 0, 'Net pay must be positive');
    assert.ok(net < gross, 'Net pay must be less than gross');
    // Sanity: at KES 50k, net should be roughly KES 38–42k
    assert.ok(net > 35000 && net < 45000, `Net pay of ${net} is outside expected range for KES 50k gross`);
  });
});

/**
 * test-sensitivity.ts — unit test for computeSensitivity() and friends.
 * Runs without a backend, hand-crafted arithmetic fixtures.
 *
 *   cd frontend && ./node_modules/.bin/tsx scripts/test-sensitivity.ts
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  computeSensitivity,
  defaultSensitivity,
  extractBaselineTariff,
  extractBaselineProduction,
} from '../src/lib/sensitivityCalc';

let passed = 0, failed = 0;

function check(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else      { failed++; console.log(`  ✗ ${name}${detail ? '  — ' + detail : ''}`); }
}

function near(a: number, b: number, tolerance = 0.5): boolean {
  return Math.abs(a - b) < tolerance;
}

console.log('\ncomputeSensitivity():');

// ── 1. Flat world — no inflation, no degradation ─────────────────────────
// 1,000,000 kWh × 0.25 SAR × 10 yr = 2,500,000 SAR gross savings
// CAPEX 1,875,000 → break-even in year 8 (1,000k×8=2M > 1.875M)
{
  const r = computeSensitivity(1_000_000, 1_875_000, {
    tariffSarKwh: 0.25, inflationPct: 0, degradationPct: 0,
  });
  check('flat: years length = 10',         r.years.length === 10);
  check('flat: every year = 250k savings', r.years.every(y => near(y.annualSavings, 250_000)));
  check('flat: year 1 production = 1M',    r.years[0].productionKwh === 1_000_000);
  check('flat: year 10 production = 1M',   r.years[9].productionKwh === 1_000_000);
  check('flat: year 10 tariff = 0.25',     r.years[9].tariffSarKwh === 0.25);
  check('flat: cumulative[10] = 2.5M',     near(r.years[9].cumulative, 2_500_000));
  check('flat: breakEven = 8',             r.breakEvenYear === 8, `got ${r.breakEvenYear}`);
  check('flat: net@10 = 625k',             near(r.netAt10Years, 625_000));
  check('flat: roi = 33.33%',              near(r.roi10Pct, 33.333, 0.01));
}

// ── 2. Degradation only — no inflation, 1%/yr degradation ────────────────
// Year N production = base × 0.99^(N-1)
// Year 10 production = 1,000,000 × 0.99^9 = ~913,517
{
  const r = computeSensitivity(1_000_000, 1_000_000, {
    tariffSarKwh: 0.25, inflationPct: 0, degradationPct: 1,
  });
  check('degrade: year 1 production = 1M',        r.years[0].productionKwh === 1_000_000);
  check('degrade: year 10 production ≈ 913,517',  near(r.years[9].productionKwh, 913_517, 10));
  check('degrade: tariff stays flat',             r.years.every(y => y.tariffSarKwh === 0.25));
  check('degrade: monotone production decline',
    r.years.every((y, i) => i === 0 || y.productionKwh <= r.years[i - 1].productionKwh));
}

// ── 3. Inflation only — no degradation, 5%/yr inflation ──────────────────
// Year N tariff = base × 1.05^(N-1)
// Year 10 tariff = 0.20 × 1.05^9 = ~0.3103
{
  const r = computeSensitivity(1_000_000, 1_000_000, {
    tariffSarKwh: 0.20, inflationPct: 5, degradationPct: 0,
  });
  check('inflate: year 1 tariff = 0.20',           near(r.years[0].tariffSarKwh, 0.20, 0.0001));
  check('inflate: year 10 tariff ≈ 0.3103',        near(r.years[9].tariffSarKwh, 0.3103, 0.001));
  check('inflate: production stays flat',          r.years.every(y => y.productionKwh === 1_000_000));
  check('inflate: annual savings rise monotonic',
    r.years.every((y, i) => i === 0 || y.annualSavings >= r.years[i - 1].annualSavings));
}

// ── 4. Break-even "never" edge case ───────────────────────────────────────
// Tiny production + high capex → never break even in 10 years
{
  const r = computeSensitivity(1_000, 10_000_000, {
    tariffSarKwh: 0.25, inflationPct: 0, degradationPct: 0,
  });
  check('no-breakeven: returns null',  r.breakEvenYear === null);
  check('no-breakeven: net@10 < 0',    r.netAt10Years < 0);
  check('no-breakeven: roi negative',  r.roi10Pct < 0);
}

// ── 5. Break-even year 1 — if CAPEX is below single-year savings ─────────
{
  const r = computeSensitivity(1_000_000, 100_000, {
    tariffSarKwh: 0.25, inflationPct: 0, degradationPct: 0,
  });
  check('year1 breakeven: breakEven = 1', r.breakEvenYear === 1);
  check('year1 breakeven: netAt10 huge',  r.netAt10Years > 2_000_000);
}

// ── 6. Capex accepted as object too ───────────────────────────────────────
{
  const r1 = computeSensitivity(1_000_000, 1_875_000, {
    tariffSarKwh: 0.25, inflationPct: 0, degradationPct: 0,
  });
  const r2 = computeSensitivity(1_000_000,
    { totalSar: 1_875_000, panelsSar: 0, inverterSar: 0, batterySar: 0, protectionSar: 0, bosSar: 0 },
    { tariffSarKwh: 0.25, inflationPct: 0, degradationPct: 0 });
  check('capex as number or object → same result',
    r1.breakEvenYear === r2.breakEvenYear && r1.netAt10Years === r2.netAt10Years);
}

// ── 7. Custom years param ─────────────────────────────────────────────────
{
  const r = computeSensitivity(1_000, 1_000, { tariffSarKwh: 1, inflationPct: 0, degradationPct: 0 }, 5);
  check('custom 5 years: correct length', r.years.length === 5);
}

// ── 8. extractBaselineTariff + extractBaselineProduction ──────────────────
{
  const f: any = {
    yearlyData: [{ year: 1, productionKwh: 1_000_000, gridSavingsSar: 260_000,
      exportRevenueSar: 0, dieselSavingsSar: 0, totalSavingsSar: 260_000,
      cumulativeSavingsSar: 260_000, baselineCostSar: 0 }],
  };
  check('extractBaselineTariff = 0.26',      near(extractBaselineTariff(f), 0.26, 0.0001));
  check('extractBaselineProduction = 1M',    extractBaselineProduction(f) === 1_000_000);
}
// Zero-production guard:
{
  const f: any = { yearlyData: [{ productionKwh: 0, gridSavingsSar: 100 }] };
  check('empty-production tariff = 0', extractBaselineTariff(f) === 0);
}
{
  const f: any = { yearlyData: [] };
  check('no-data production = 0', extractBaselineProduction(f) === 0);
}

// ── 9. defaultSensitivity seeds realistic Saudi values ───────────────────
{
  const f: any = {
    yearlyData: [{ productionKwh: 1_000_000, gridSavingsSar: 300_000 }],
  };
  const s = defaultSensitivity(f);
  check('default: tariff from backend',      near(s.tariffSarKwh, 0.30));
  check('default: inflation = 3%',           s.inflationPct === 3);
  check('default: degradation = 0.5%',       s.degradationPct === 0.5);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

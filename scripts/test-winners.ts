/**
 * test-winners.ts — unit test for the pure computeWinners() function.
 * Runs without a backend; uses hand-crafted fixtures.
 *
 *   cd frontend && ./node_modules/.bin/tsx scripts/test-winners.ts
 *
 * This file intentionally uses `any` in stub fixtures: we only populate the
 * SavedDesign fields that computeWinners actually reads; the rest stay empty
 * and are cast to any so the test doesn't double as a type-exhaustiveness suite.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { computeWinners, computeCo2Year1Kg, computeRoi10Pct } from '../src/lib/computeWinners';
import type { SavedDesign } from '../src/store/AppContext.types';

let failed = 0;
let passed = 0;

function check(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else      { failed++; console.log(`  ✗ ${name}${detail ? '  — ' + detail : ''}`); }
}

/**
 * Minimal fixture — produces a SavedDesign stub with only the fields
 * that computeWinners actually reads. Other fields stay minimal / empty.
 */
function stub(id: string, capex: number, be: number | null, net10: number, prodY1: number): SavedDesign {
  return {
    id,
    label:    `test-${id}`,
    savedAt:  '2026-04-18T00:00:00Z',
    design: {
      capexBreakdown: { totalSar: capex, panelsSar: 0, inverterSar: 0, batterySar: 0, protectionSar: 0, bosSar: 0 },
      financials: {
        capexTotalSar:       capex,
        monthlySavingsSar:   0,
        year1SavingsSar:     0,
        year5SavingsSar:     0,
        year10SavingsSar:    0,
        breakEvenYear:       be,
        baseline10yrCostSar: 0,
        net10yrBenefitSar:   net10,
        yearlyData:          [{ year: 1, productionKwh: prodY1, gridSavingsSar: 0, exportRevenueSar: 0, dieselSavingsSar: 0, totalSavingsSar: 0, cumulativeSavingsSar: 0, baselineCostSar: 0 }],
      },
      profile: {} as any, requirements: {} as any, panels: [], inverters: [], batteries: [], protection: {} as any, bos: {} as any, generator: null, tariff: {} as any, simulationConfig: {} as any,
    } as any,
    panel:    {} as any,
    inverter: {} as any,
    battery:  {} as any,
  };
}

// ── Test cases ────────────────────────────────────────────────────────────

console.log('\ncomputeWinners():');

// 1. Fewer than 2 designs → no winners anywhere
{
  const w = computeWinners([]);
  check('empty list → all winners null', w.capex === null && w.breakEven === null && w.roi === null && w.co2 === null);
}
{
  const only = stub('a', 1000, 5, 500, 1000);
  const w = computeWinners([only]);
  check('single design → all winners null', w.capex === null && w.breakEven === null && w.roi === null && w.co2 === null);
}

// 2. Clear wins on each metric
{
  const a = stub('a', 2_000_000, 8,  500_000, 100_000);   // mid
  const b = stub('b', 1_500_000, 6, 1_200_000, 180_000);  // wins capex + be + roi + co2
  const c = stub('c', 2_500_000, 9,  300_000,  80_000);   // worst on all
  const w = computeWinners([a, b, c]);
  check('capex winner = b (lowest)',           w.capex     === 'b', `got ${w.capex}`);
  check('break-even winner = b (year 6)',      w.breakEven === 'b', `got ${w.breakEven}`);
  check('roi winner = b (80% vs 25% vs 12%)',  w.roi       === 'b', `got ${w.roi}`);
  check('co2 winner = b (180k kWh × 0.6)',     w.co2       === 'b', `got ${w.co2}`);
}

// 3. Split wins: different design wins different metrics
{
  const a = stub('a', 1_000_000, 9,   500_000,  80_000);   // best capex, worst of everything else
  const b = stub('b', 2_000_000, 5, 2_000_000, 120_000);   // best break-even, best ROI
  const c = stub('c', 1_800_000, 7, 1_000_000, 200_000);   // best CO2
  const w = computeWinners([a, b, c]);
  check('capex winner = a',       w.capex     === 'a', `got ${w.capex}`);
  check('break-even winner = b',  w.breakEven === 'b', `got ${w.breakEven}`);
  check('roi winner = b',         w.roi       === 'b', `got ${w.roi}`);
  check('co2 winner = c',         w.co2       === 'c', `got ${w.co2}`);
}

// 4. Null break-even beats nothing, finite always wins
{
  const a = stub('a', 1_000_000, null, 100_000, 100_000);  // break-even never reached
  const b = stub('b', 1_500_000, 9,     80_000,  90_000);
  const w = computeWinners([a, b]);
  check('null break-even loses to finite year', w.breakEven === 'b', `got ${w.breakEven}`);
}

// 5. Complete tie on one metric → null
{
  const a = stub('a', 1_000_000, 7, 500_000, 100_000);
  const b = stub('b', 1_000_000, 7, 500_000, 100_000);
  const w = computeWinners([a, b]);
  check('identical designs → all winners null',
    w.capex === null && w.breakEven === null && w.roi === null && w.co2 === null);
}

// 6. Helper fns themselves
{
  const a = stub('a', 1_000_000, 7, 250_000, 100_000);
  check('computeCo2Year1Kg = 60,000',  computeCo2Year1Kg(a) === 60_000);
  check('computeRoi10Pct   = 25',      computeRoi10Pct(a)   === 25);
}

// 7. Three-way tie but two winners — pick the first hit (stable), the rest null
{
  const a = stub('a', 1_000_000, 7, 500_000, 100_000);
  const b = stub('b', 1_000_000, 5, 500_000, 100_000);   // lone best break-even
  const c = stub('c', 1_000_000, 7, 500_000, 100_000);
  const w = computeWinners([a, b, c]);
  check('all-tie capex → null',          w.capex === null);
  check('unique break-even → b',         w.breakEven === 'b');
  check('all-tie roi → null',            w.roi === null);
  check('all-tie co2 → null',            w.co2 === null);
}

// ── Summary ───────────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

/* eslint-disable @typescript-eslint/no-explicit-any */
import { recalcDesign } from '../src/lib/recalcDesign';

async function main() {
  const r = await fetch('http://localhost:5099/api/Design', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      userType: 'facility', region: 'central', gridScenario: 'on_grid',
      monthlyBillSar: 18000, peakLoadKw: 150, operatingHours: 14, criticalLoadPct: 25,
    }),
  });
  const d = (await r.json()).systemDesign;

  let pass = 0, fail = 0;
  function check(name: string, cond: boolean, detail = '') {
    if (cond) { pass++; console.log('  ✓', name); }
    else      { fail++; console.log('  ✗', name, detail); }
  }

  console.log('\nrecalcDesign():');

  // 1. Original components → should match backend exactly
  const orig = recalcDesign(d, d.panels[0], d.inverters[0], d.batteries[0]);
  check('original CAPEX matches backend', orig.capex.totalSar === d.capexBreakdown.totalSar,
    `${orig.capex.totalSar} vs ${d.capexBreakdown.totalSar}`);
  check('original break-even matches', orig.financials.breakEvenYear === d.financials.breakEvenYear);
  check('original panelsSar matches', orig.capex.panelsSar === d.capexBreakdown.panelsSar);
  check('original inverterSar matches', orig.capex.inverterSar === d.capexBreakdown.inverterSar);
  check('original batterySar matches', orig.capex.batterySar === d.capexBreakdown.batterySar);
  check('original yearly data length = 10', orig.financials.yearlyData.length === 10);

  // 2. Swap panel → CAPEX should change by the panel cost difference
  if (d.panels.length >= 2) {
    const alt = recalcDesign(d, d.panels[1], d.inverters[0], d.batteries[0]);
    const expectedDelta = d.panels[1].panelsCostSar - d.panels[0].panelsCostSar;
    const actualDelta = alt.capex.totalSar - orig.capex.totalSar;
    check('swap panel → CAPEX delta correct', Math.abs(actualDelta - expectedDelta) < 1,
      `expected delta ${expectedDelta}, got ${actualDelta}`);
    check('swap panel → inverterSar unchanged', alt.capex.inverterSar === orig.capex.inverterSar);
    check('swap panel → batterySar unchanged', alt.capex.batterySar === orig.capex.batterySar);
    check('swap panel → protectionSar unchanged', alt.capex.protectionSar === orig.capex.protectionSar);
    console.log(`     panel swap: ${d.panels[0].brand} → ${d.panels[1].brand}`);
    console.log(`     CAPEX: ${orig.capex.totalSar.toLocaleString()} → ${alt.capex.totalSar.toLocaleString()} SAR`);
    console.log(`     Break-even: ${orig.financials.breakEvenYear} → ${alt.financials.breakEvenYear}`);
  }

  // 3. Swap battery → only battery cost changes
  if (d.batteries.length >= 2) {
    const alt = recalcDesign(d, d.panels[0], d.inverters[0], d.batteries[1]);
    check('swap battery → panelsSar unchanged', alt.capex.panelsSar === orig.capex.panelsSar);
    const expectedDelta = d.batteries[1].batteryCostSar - d.batteries[0].batteryCostSar;
    const actualDelta = alt.capex.totalSar - orig.capex.totalSar;
    check('swap battery → CAPEX delta correct', Math.abs(actualDelta - expectedDelta) < 1);
  }

  // 4. Financial consistency
  const y10 = orig.financials.yearlyData[9];
  check('year 10 cumulative = sum of yearly totals',
    Math.abs(y10.cumulativeSavingsSar - orig.financials.yearlyData.reduce((s, y) => s + y.totalSavingsSar, 0)) < 10);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main();

/**
 * test-comprehensive.ts — full system verification suite.
 *
 * Tests EVERYTHING: APIs, calculations, edge cases, concurrency.
 *   cd frontend && ./node_modules/.bin/tsx scripts/test-comprehensive.ts
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { computeWinners } from '../src/lib/computeWinners';
import { computeSensitivity, defaultSensitivity, extractBaselineTariff } from '../src/lib/sensitivityCalc';
import { recalcDesign } from '../src/lib/recalcDesign';

const API = 'http://localhost:5099/api';
let passed = 0, failed = 0, warnings = 0;
const failures: string[] = [];

function ok(t: string) { passed++; console.log(`  ✓ ${t}`); }
function fail(t: string, d = '') { failed++; failures.push(`${t} ${d}`); console.log(`  ✗ ${t} ${d}`); }
function warn(t: string, d = '') { warnings++; console.log(`  ⚠ ${t} ${d}`); }

async function post(path: string, body: any) {
  const t0 = Date.now();
  try {
    const r = await fetch(`${API}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const text = await r.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = { _raw: text.slice(0, 200) }; }
    return { status: r.status, json, ms: Date.now() - t0 };
  } catch (e: any) { return { status: -1, json: { error: e.message }, ms: Date.now() - t0 }; }
}
async function get(path: string) {
  try {
    const r = await fetch(`${API}${path}`);
    const text = await r.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = { _raw: text.slice(0, 200) }; }
    return { status: r.status, json };
  } catch (e: any) { return { status: -1, json: { error: e.message } }; }
}

// ═══════════════════════════════════════════════════════════════════
// A. API HEALTH + ENDPOINTS
// ═══════════════════════════════════════════════════════════════════
async function testHealth() {
  console.log('\nA. API health & endpoints:');
  const h = await get('/health');
  h.status === 200 ? ok('GET /health → 200') : fail('/health', `${h.status}`);

  const c = await get('/Components');
  if (c.status === 200 && c.json) {
    const comps = c.json.components ?? c.json;
    const panels = comps.panels?.length ?? 0;
    const invs = comps.inverters?.length ?? 0;
    const batts = comps.batteries?.length ?? 0;
    panels > 0 && invs > 0 && batts > 0
      ? ok(`GET /Components → ${panels} panels, ${invs} inverters, ${batts} batteries`)
      : fail('/Components empty', `p=${panels} i=${invs} b=${batts}`);
  } else fail('/Components', `${c.status}`);
}

// ═══════════════════════════════════════════════════════════════════
// B. ALL USERTYPE × REGION × GRID COMBINATIONS
// ═══════════════════════════════════════════════════════════════════
async function testCombinations() {
  console.log('\nB. All userType × region × grid combinations:');
  const combos: any[] = [];
  for (const ut of ['facility', 'farm', 'residential']) {
    for (const rg of ['eastern', 'central', 'western']) {
      for (const gs of ['on_grid', 'off_grid']) {
        if (ut === 'residential' && gs === 'off_grid') continue;
        const body: any = { userType: ut, region: rg, gridScenario: gs, monthlyBillSar: 15000, criticalLoadPct: 25 };
        if (ut === 'facility') { body.peakLoadKw = 120; body.operatingHours = 12; }
        if (ut === 'farm') { body.pumpPowerKw = 22; body.pumpHoursDay = 8; }
        if (ut === 'residential') { body.acUnits = 6; body.roofAreaM2 = 150; }
        combos.push({ name: `${ut}/${rg}/${gs}`, body });
      }
    }
  }
  for (const c of combos) {
    const r = await post('/Design', c.body);
    if (r.status !== 200 || r.json?.status !== 'ok') { fail(c.name, `status=${r.status}`); continue; }
    const d = r.json.systemDesign;
    if (!d.panels?.length || !d.inverters?.length || !d.batteries?.length) { fail(`${c.name} components missing`); continue; }
    if (d.capexBreakdown.totalSar <= 0) { fail(`${c.name} capex=0`); continue; }
    if (d.financials.yearlyData.length !== 10) { fail(`${c.name} yearlyData len=${d.financials.yearlyData.length}`); continue; }
    ok(c.name);
  }
}

// ═══════════════════════════════════════════════════════════════════
// C. FINANCIAL CALCULATION CORRECTNESS
// ═══════════════════════════════════════════════════════════════════
async function testFinancials() {
  console.log('\nC. Financial calculation correctness:');
  const r = await post('/Design', { userType: 'facility', region: 'central', gridScenario: 'on_grid', monthlyBillSar: 18000, peakLoadKw: 150, operatingHours: 14, criticalLoadPct: 25 });
  const d = r.json.systemDesign;
  const f = d.financials;
  const c = d.capexBreakdown;
  const annualBaseline = d.profile.monthlyBillSar * 12;

  // 1. Cumulative sum consistency
  let cumCheck = 0;
  let cumOk = true;
  for (const y of f.yearlyData) {
    cumCheck += y.totalSavingsSar;
    if (Math.abs(cumCheck - y.cumulativeSavingsSar) > 1) { cumOk = false; break; }
  }
  cumOk ? ok('cumulative savings = Σ yearly totals') : fail('cumulative sum mismatch');

  // 2. Grid savings never exceed annual baseline
  const savingsOk = f.yearlyData.every((y: any) => y.gridSavingsSar <= annualBaseline + 1);
  savingsOk ? ok('grid savings ≤ annual baseline (cap works)') : fail('savings exceed baseline!');

  // 3. Production degrades each year
  const degradeOk = f.yearlyData.every((y: any, i: number) => i === 0 || y.productionKwh <= f.yearlyData[i - 1].productionKwh);
  degradeOk ? ok('production degrades year-over-year') : fail('production increased');

  // 4. Break-even logic
  if (f.breakEvenYear) {
    const beCum = f.yearlyData[f.breakEvenYear - 1]?.cumulativeSavingsSar ?? 0;
    beCum >= c.totalSar ? ok(`break-even year ${f.breakEvenYear}: cumulative ${beCum} ≥ CAPEX ${c.totalSar}`) : fail('break-even year wrong');
    if (f.breakEvenYear > 1) {
      const prevCum = f.yearlyData[f.breakEvenYear - 2]?.cumulativeSavingsSar ?? 0;
      prevCum < c.totalSar ? ok('year before break-even: cumulative < CAPEX') : fail('break-even too late');
    }
  } else { ok('no break-even (CAPEX > 10yr savings — acceptable for large systems)'); }

  // 5. CAPEX components sum to total
  const capexSum = c.panelsSar + c.inverterSar + c.batterySar + c.protectionSar + c.bosSar;
  Math.abs(capexSum - c.totalSar) < 1 ? ok('CAPEX components sum to total') : fail(`CAPEX sum mismatch: ${capexSum} vs ${c.totalSar}`);

  // 6. Net 10yr = cumulative[10] - CAPEX
  const y10cum = f.yearlyData[9]?.cumulativeSavingsSar ?? 0;
  Math.abs(f.net10yrBenefitSar - (y10cum - c.totalSar)) < 1 ? ok('net 10yr = cumulative - CAPEX') : fail('net 10yr mismatch');

  // 7. Monthly savings = year1 / 12
  Math.abs(f.monthlySavingsSar - f.yearlyData[0].totalSavingsSar / 12) < 1 ? ok('monthly savings = year1 / 12') : fail('monthly savings wrong');
}

// ═══════════════════════════════════════════════════════════════════
// D. OFF-GRID CORRECTNESS
// ═══════════════════════════════════════════════════════════════════
async function testOffGrid() {
  console.log('\nD. Off-grid correctness:');
  const r = await post('/Design', { userType: 'facility', region: 'central', gridScenario: 'off_grid', monthlyBillSar: 18000, peakLoadKw: 150, operatingHours: 14, criticalLoadPct: 25 });
  const d = r.json.systemDesign;
  const c = d.capexBreakdown;
  const f = d.financials;
  const annualBaseline = 18000 * 12;

  // Battery should be reasonable (not 10M+ SAR)
  c.batterySar < 2_000_000 ? ok(`battery cost reasonable: ${c.batterySar.toLocaleString()} SAR`) : fail(`battery too expensive: ${c.batterySar.toLocaleString()}`);

  // CAPEX should be < 5M for this facility
  c.totalSar < 5_000_000 ? ok(`CAPEX reasonable: ${c.totalSar.toLocaleString()} SAR`) : fail(`CAPEX too high: ${c.totalSar.toLocaleString()}`);

  // Should eventually break even
  f.breakEvenYear != null ? ok(`breaks even in year ${f.breakEvenYear}`) : warn('no break-even in 10yr');

  // Savings capped at baseline
  const savingsCapped = f.yearlyData.every((y: any) => y.gridSavingsSar <= annualBaseline + 1);
  savingsCapped ? ok('off-grid savings capped at annual baseline') : fail('off-grid savings exceed baseline');

  // Off-grid with generator
  const r2 = await post('/Design', { userType: 'facility', region: 'central', gridScenario: 'off_grid', monthlyBillSar: 18000, peakLoadKw: 150, criticalLoadPct: 25, hasGenerator: true, generatorKva: 200 });
  const d2 = r2.json.systemDesign;
  d2.generator != null ? ok('generator spec present') : fail('generator missing');
  d2.financials.yearlyData[0].dieselSavingsSar > 0 ? ok(`diesel savings: ${d2.financials.yearlyData[0].dieselSavingsSar.toLocaleString()} SAR`) : warn('no diesel savings');
}

// ═══════════════════════════════════════════════════════════════════
// E. BATTERY RETROFIT MODE
// ═══════════════════════════════════════════════════════════════════
async function testRetrofit() {
  console.log('\nE. Battery retrofit mode:');
  const r = await post('/Design', { userType: 'facility', region: 'eastern', gridScenario: 'on_grid', monthlyBillSar: 20000, peakLoadKw: 120, criticalLoadPct: 30, existingPvKwp: 400, existingInverterKw: 150 });
  if (r.status !== 200) { fail('retrofit API call', `status=${r.status}`); return; }
  const d = r.json.systemDesign;
  const c = d.capexBreakdown;

  // Panel should be "Existing" with cost 0
  d.panels[0].id === 'existing_pv' ? ok('panel is synthetic "existing_pv"') : fail(`panel id: ${d.panels[0].id}`);
  c.panelsSar === 0 ? ok('panel cost = 0') : fail(`panel cost = ${c.panelsSar}`);
  c.inverterSar === 0 ? ok('inverter cost = 0') : fail(`inverter cost = ${c.inverterSar}`);
  c.batterySar > 0 ? ok(`battery cost = ${c.batterySar.toLocaleString()} SAR`) : fail('battery cost = 0');
  c.totalSar === c.batterySar + c.protectionSar + c.bosSar ? ok('total = battery + protection + BoS') : fail('CAPEX total mismatch');

  // Compare with non-retrofit
  const r2 = await post('/Design', { userType: 'facility', region: 'eastern', gridScenario: 'on_grid', monthlyBillSar: 20000, peakLoadKw: 120, criticalLoadPct: 30 });
  const c2 = r2.json.systemDesign.capexBreakdown;
  c.totalSar < c2.totalSar ? ok(`retrofit CAPEX (${c.totalSar.toLocaleString()}) < full (${c2.totalSar.toLocaleString()})`) : fail('retrofit more expensive than full system');
}

// ═══════════════════════════════════════════════════════════════════
// F. LIVE COMPONENT SWAPPING (recalcDesign)
// ═══════════════════════════════════════════════════════════════════
async function testRecalc() {
  console.log('\nF. Live component swapping (recalcDesign):');
  const r = await post('/Design', { userType: 'facility', region: 'central', gridScenario: 'on_grid', monthlyBillSar: 18000, peakLoadKw: 150, operatingHours: 14, criticalLoadPct: 25 });
  const d = r.json.systemDesign;

  // Original matches backend
  const orig = recalcDesign(d, d.panels[0], d.inverters[0], d.batteries[0]);
  orig.capex.totalSar === d.capexBreakdown.totalSar ? ok('original CAPEX matches backend exactly') : fail(`original mismatch: ${orig.capex.totalSar} vs ${d.capexBreakdown.totalSar}`);
  orig.financials.breakEvenYear === d.financials.breakEvenYear ? ok('original break-even matches') : fail('break-even mismatch');

  // Swap panel → only panel cost changes
  if (d.panels.length >= 2) {
    const alt = recalcDesign(d, d.panels[1], d.inverters[0], d.batteries[0]);
    const expectedDelta = d.panels[1].panelsCostSar - d.panels[0].panelsCostSar;
    const actualDelta = alt.capex.totalSar - orig.capex.totalSar;
    Math.abs(actualDelta - expectedDelta) < 1 ? ok('swap panel → CAPEX delta correct') : fail(`panel delta: expected ${expectedDelta}, got ${actualDelta}`);
    alt.capex.inverterSar === orig.capex.inverterSar ? ok('swap panel → inverter cost unchanged') : fail('inverter cost changed');
    alt.capex.batterySar === orig.capex.batterySar ? ok('swap panel → battery cost unchanged') : fail('battery cost changed');
  }

  // Swap battery → only battery cost changes
  if (d.batteries.length >= 2) {
    const alt = recalcDesign(d, d.panels[0], d.inverters[0], d.batteries[1]);
    alt.capex.panelsSar === orig.capex.panelsSar ? ok('swap battery → panel cost unchanged') : fail('panel cost changed');
  }

  // Financial consistency after swap
  if (d.panels.length >= 2) {
    const alt = recalcDesign(d, d.panels[1], d.inverters[0], d.batteries[0]);
    let cumCheck = 0;
    for (const y of alt.financials.yearlyData) cumCheck += y.totalSavingsSar;
    Math.abs(cumCheck - alt.financials.yearlyData[9].cumulativeSavingsSar) < 10 ? ok('swapped financials: cumulative consistent') : fail('cumulative mismatch after swap');
  }
}

// ═══════════════════════════════════════════════════════════════════
// G. SENSITIVITY CALCULATIONS
// ═══════════════════════════════════════════════════════════════════
function testSensitivity() {
  console.log('\nG. Sensitivity calculations:');

  // Flat world — no inflation, no degradation
  const flat = computeSensitivity(1_000_000, 1_875_000, { tariffSarKwh: 0.25, inflationPct: 0, degradationPct: 0 });
  flat.years.length === 10 ? ok('flat: 10 years') : fail('flat years count');
  flat.years.every(y => Math.abs(y.annualSavings - 250_000) < 1) ? ok('flat: 250k/yr constant') : fail('flat savings not constant');
  flat.breakEvenYear === 8 ? ok('flat: break-even year 8') : fail(`flat break-even: ${flat.breakEvenYear}`);
  Math.abs(flat.roi10Pct - 33.333) < 0.01 ? ok('flat: ROI 33.33%') : fail(`flat ROI: ${flat.roi10Pct}`);

  // Degradation
  const deg = computeSensitivity(1_000_000, 1_000_000, { tariffSarKwh: 0.25, inflationPct: 0, degradationPct: 1 });
  const y10prod = 1_000_000 * Math.pow(0.99, 9);
  Math.abs(deg.years[9].productionKwh - y10prod) < 10 ? ok('degradation: year 10 production correct') : fail('degradation production wrong');

  // Inflation
  const inf = computeSensitivity(1_000_000, 1_000_000, { tariffSarKwh: 0.20, inflationPct: 5, degradationPct: 0 });
  const y10tariff = 0.20 * Math.pow(1.05, 9);
  Math.abs(inf.years[9].tariffSarKwh - y10tariff) < 0.001 ? ok('inflation: year 10 tariff correct') : fail('inflation tariff wrong');

  // Default extraction
  const s = defaultSensitivity({ yearlyData: [{ productionKwh: 1000, gridSavingsSar: 260 }] } as any);
  Math.abs(s.tariffSarKwh - 0.26) < 0.001 ? ok('extractBaselineTariff = 0.26') : fail(`tariff: ${s.tariffSarKwh}`);
  s.inflationPct === 3 && s.degradationPct === 0.5 ? ok('defaults: 3% inflation, 0.5% degradation') : fail('bad defaults');
}

// ═══════════════════════════════════════════════════════════════════
// H. COMPARE / WINNERS LOGIC
// ═══════════════════════════════════════════════════════════════════
function testWinners() {
  console.log('\nH. Compare / winners logic:');
  const stub = (id: string, capex: number, be: number | null, net: number, prod: number): any => ({
    id, label: id, savedAt: '2026-01-01T00:00:00Z',
    design: { capexBreakdown: { totalSar: capex }, financials: { breakEvenYear: be, net10yrBenefitSar: net, yearlyData: [{ year: 1, productionKwh: prod, gridSavingsSar: 0 }] } } as any,
    panel: {} as any, inverter: {} as any, battery: {} as any,
  });

  // < 2 designs → no winners
  const w0 = computeWinners([stub('a', 1000, 5, 500, 100)]);
  w0.capex === null && w0.breakEven === null ? ok('single design → no winners') : fail('single design has winners');

  // Distinct winners
  const w1 = computeWinners([stub('a', 1_000_000, 5, 500_000, 100_000), stub('b', 800_000, 6, 500_000, 90_000)]);
  w1.capex === 'b' ? ok('capex winner = b (lower)') : fail(`capex: ${w1.capex}`);
  w1.breakEven === 'a' ? ok('break-even winner = a (year 5)') : fail(`be: ${w1.breakEven}`);
  w1.roi === 'b' ? ok('roi winner = b (higher % on lower capex)') : fail(`roi: ${w1.roi}`);
  w1.co2 === 'a' ? ok('co2 winner = a (more production)') : fail(`co2: ${w1.co2}`);

  // Tie → null
  const w2 = computeWinners([stub('a', 1000, 5, 500, 100), stub('b', 1000, 5, 500, 100)]);
  w2.capex === null ? ok('identical designs → null winners') : fail('tie has winners');
}

// ═══════════════════════════════════════════════════════════════════
// I. SIMULATION LIFECYCLE
// ═══════════════════════════════════════════════════════════════════
async function testSimulation() {
  console.log('\nI. Simulation lifecycle:');
  // Prime with a design
  await post('/Design', { userType: 'facility', region: 'central', gridScenario: 'on_grid', monthlyBillSar: 15000, peakLoadKw: 100, criticalLoadPct: 25 });

  // Step 20 ticks
  let lastTs: string | null = null;
  let ticks = 0, errors = 0;
  for (let i = 0; i < 20; i++) {
    const t = await get('/Simulation/next');
    if (t.status === 200 && t.json?.state) {
      ticks++;
      const ts = t.json.state.timestamp;
      if (lastTs && ts === lastTs) fail(`tick ${i}: timestamp didn't advance`);
      lastTs = ts;
    } else errors++;
  }
  errors === 0 ? ok(`${ticks}/20 ticks advanced`) : fail(`${errors} ticks errored`);

  // History
  const h = await get('/Simulation/history');
  h.status === 200 ? ok(`history: ${(h.json?.history ?? h.json ?? []).length} entries`) : fail('history failed');

  // Scenario
  const sc = await post('/Simulation/scenario', { scenario: 'grid_outage', value: true });
  sc.status === 200 ? ok('grid_outage scenario triggered') : warn('scenario', `${sc.status}`);

  // Reset
  const rs = await post('/Simulation/reset', {});
  rs.status === 200 ? ok('reset accepted') : fail('reset', `${rs.status}`);
}

// ═══════════════════════════════════════════════════════════════════
// J. INPUT VALIDATION + MALICIOUS INPUTS
// ═══════════════════════════════════════════════════════════════════
async function testValidation() {
  console.log('\nJ. Input validation:');
  const bad: [string, any][] = [
    ['empty body', {}],
    ['missing userType', { region: 'central', gridScenario: 'on_grid', monthlyBillSar: 1000 }],
    ['missing region', { userType: 'facility', gridScenario: 'on_grid', monthlyBillSar: 1000 }],
    ['missing gridScenario', { userType: 'facility', region: 'central', monthlyBillSar: 1000 }],
    ['bad userType', { userType: 'hacker', region: 'central', gridScenario: 'on_grid', monthlyBillSar: 1000 }],
    ['bad region', { userType: 'facility', region: '<script>alert(1)</script>', gridScenario: 'on_grid', monthlyBillSar: 1000 }],
    ['SQL injection', { userType: "'; DROP TABLE--", region: 'central', gridScenario: 'on_grid', monthlyBillSar: 1000 }],
    ['negative bill', { userType: 'facility', region: 'central', gridScenario: 'on_grid', monthlyBillSar: -5000 }],
    ['bill = 0', { userType: 'facility', region: 'central', gridScenario: 'on_grid', monthlyBillSar: 0 }],
    ['bill under min', { userType: 'facility', region: 'central', gridScenario: 'on_grid', monthlyBillSar: 50 }],
    ['critical % = 150', { userType: 'facility', region: 'central', gridScenario: 'on_grid', monthlyBillSar: 10000, criticalLoadPct: 150 }],
    ['peak = -50', { userType: 'facility', region: 'central', gridScenario: 'on_grid', monthlyBillSar: 10000, peakLoadKw: -50 }],
    ['residential off_grid', { userType: 'residential', region: 'central', gridScenario: 'off_grid', monthlyBillSar: 1500 }],
    ['100k-char string', { userType: 'a'.repeat(100000), region: 'central', gridScenario: 'on_grid', monthlyBillSar: 1000 }],
  ];
  for (const [name, body] of bad) {
    const r = await post('/Design', body);
    const rejected = r.status === 400 || r.status === 422;
    rejected ? ok(`rejected: ${name}`) : fail(`accepted: ${name} (status=${r.status})`);
  }
}

// ═══════════════════════════════════════════════════════════════════
// K. PDF ROBUSTNESS
// ═══════════════════════════════════════════════════════════════════
async function testPdf() {
  console.log('\nK. PDF robustness:');
  const React = await import('react');
  const { renderToBuffer } = await import('@react-pdf/renderer');
  const { ProposalDocument } = await import('../src/pdf/ProposalDocument');

  for (const [name, body] of [
    ['facility on-grid', { userType: 'facility', region: 'central', gridScenario: 'on_grid', monthlyBillSar: 18000, peakLoadKw: 150, criticalLoadPct: 25 }],
    ['residential small', { userType: 'residential', region: 'western', gridScenario: 'on_grid', monthlyBillSar: 200, acUnits: 1 }],
    ['facility off-grid', { userType: 'facility', region: 'eastern', gridScenario: 'off_grid', monthlyBillSar: 50000, peakLoadKw: 300, criticalLoadPct: 30 }],
  ] as [string, any][]) {
    try {
      const r = await post('/Design', body);
      if (r.status !== 200) { fail(`PDF ${name}: design failed`); continue; }
      const d = r.json.systemDesign;
      const buf = await renderToBuffer(React.createElement(ProposalDocument as any, { design: d, panel: d.panels[0], inverter: d.inverters[0], battery: d.batteries[0] }) as any);
      buf.byteLength > 5000 ? ok(`PDF ${name}: ${buf.byteLength.toLocaleString()} bytes`) : fail(`PDF ${name}: too small ${buf.byteLength}`);
    } catch (e: any) { fail(`PDF ${name}: threw — ${e.message}`); }
  }
}

// ═══════════════════════════════════════════════════════════════════
// L. REDUCER RESILIENCE
// ═══════════════════════════════════════════════════════════════════
async function testReducer() {
  console.log('\nL. Reducer resilience:');
  const { appReducer } = await import('../src/store/appReducer');
  const { INITIAL_STATE } = await import('../src/store/AppContext.types');

  const nasty: any[] = [[], [{}], [{ id: 'a', design: null }], null, undefined, 'string'];
  let crashes = 0;
  for (const payload of nasty) {
    try { appReducer(INITIAL_STATE, { type: 'HYDRATE_SAVED', saved: payload } as any); } catch { crashes++; }
  }
  crashes === 0 ? ok(`reducer survived ${nasty.length} malformed payloads`) : fail(`${crashes} crashes`);

  const next = appReducer(INITIAL_STATE, { type: 'UNKNOWN_ACTION' } as any);
  next === INITIAL_STATE ? ok('unknown action → state unchanged') : fail('unknown action mutated');
}

// ═══════════════════════════════════════════════════════════════════
// M. CONCURRENCY (20 parallel)
// ═══════════════════════════════════════════════════════════════════
async function testConcurrency() {
  console.log('\nM. Concurrency (20 parallel):');
  const t0 = Date.now();
  const promises = Array.from({ length: 20 }, (_, i) =>
    post('/Design', { userType: ['facility', 'farm', 'residential'][i % 3], region: ['eastern', 'central', 'western'][i % 3], gridScenario: 'on_grid', monthlyBillSar: 2000 + i * 500, peakLoadKw: 50, criticalLoadPct: 20 })
  );
  const results = await Promise.all(promises);
  const oks = results.filter(r => r.status === 200 && r.json?.status === 'ok').length;
  const crashes = results.filter(r => r.status === 500 || r.status === -1).length;
  crashes === 0 ? ok(`20 parallel: ${oks} ok, 0 crashes in ${Date.now() - t0} ms`) : fail(`${crashes} crashed`);
}

// ═══════════════════════════════════════════════════════════════════
// N. DETERMINISM (same input → same output)
// ═══════════════════════════════════════════════════════════════════
async function testDeterminism() {
  console.log('\nN. Determinism:');
  const body = { userType: 'facility', region: 'central', gridScenario: 'on_grid', monthlyBillSar: 15000, peakLoadKw: 100, criticalLoadPct: 25 };
  const r1 = await post('/Design', body);
  const r2 = await post('/Design', body);
  const c1 = r1.json.systemDesign.capexBreakdown.totalSar;
  const c2 = r2.json.systemDesign.capexBreakdown.totalSar;
  c1 === c2 ? ok(`deterministic: both = ${c1.toLocaleString()} SAR`) : fail(`non-deterministic: ${c1} vs ${c2}`);
}

// ═══════════════════════════════════════════════════════════════════
// O. CROSS-SCENARIO COMPARISON (on-grid vs off-grid for same facility)
// ═══════════════════════════════════════════════════════════════════
async function testCrossScenario() {
  console.log('\nO. Cross-scenario comparison:');
  const base = { userType: 'facility', region: 'central', monthlyBillSar: 18000, peakLoadKw: 150, criticalLoadPct: 25 };
  const on = await post('/Design', { ...base, gridScenario: 'on_grid' });
  const off = await post('/Design', { ...base, gridScenario: 'off_grid' });
  const onC = on.json.systemDesign.capexBreakdown;
  const offC = off.json.systemDesign.capexBreakdown;

  // Off-grid should have different (not necessarily more) CAPEX
  onC.totalSar !== offC.totalSar ? ok(`on-grid CAPEX ${onC.totalSar.toLocaleString()} ≠ off-grid ${offC.totalSar.toLocaleString()}`) : warn('same CAPEX for both scenarios');

  // Both should have valid financials
  on.json.systemDesign.financials.yearlyData.length === 10 ? ok('on-grid: 10 years') : fail('on-grid yearly count');
  off.json.systemDesign.financials.yearlyData.length === 10 ? ok('off-grid: 10 years') : fail('off-grid yearly count');
}

// ═══════════════════════════════════════════════════════════════════
// MAIN RUNNER
// ═══════════════════════════════════════════════════════════════════
async function main() {
  const health = await get('/health');
  if (health.status !== 200) { console.error('❌ Backend not reachable at', API); process.exit(2); }
  console.log('Comprehensive test suite — backend up\n');

  await testHealth();
  await testCombinations();
  await testFinancials();
  await testOffGrid();
  await testRetrofit();
  await testRecalc();
  testSensitivity();
  testWinners();
  await testSimulation();
  await testValidation();
  await testPdf();
  await testReducer();
  await testConcurrency();
  await testDeterminism();
  await testCrossScenario();

  console.log('\n' + '═'.repeat(60));
  console.log(`TOTAL: ${passed} passed, ${failed} failed, ${warnings} warnings`);
  console.log('═'.repeat(60));
  if (failures.length) {
    console.log('\n❌ FAILURES:');
    failures.forEach(f => console.log(`   ${f}`));
  }
  console.log(failed === 0 ? '\n🎉 All tests passed!' : `\n❌ ${failed} test(s) failed.`);
  process.exit(failed ? 1 : 0);
}

main().catch(e => { console.error('💥 Test runner crashed:', e); process.exit(3); });

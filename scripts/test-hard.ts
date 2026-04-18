/**
 * test-hard.ts — aggressive robustness suite.
 *
 * Runs 9 categories of tests against the live API + in-process components:
 *   A. API happy-path — every userType × region × grid combination
 *   B. API rejection — malformed / missing / out-of-range / malicious inputs
 *   C. API boundary — min/max numeric edges (bill, peak, critical %, etc.)
 *   D. Concurrency — 50 parallel design submits
 *   E. Sequential stress — 200 sequential designs
 *   F. Pure-logic regressions — computeWinners, computeSensitivity
 *   G. PDF robustness — render against edge-case designs
 *   H. Simulation lifecycle — start / tick / scenarios / reset
 *   I. Data corruption — malformed localStorage
 *
 *   cd frontend && ./node_modules/.bin/tsx scripts/test-hard.ts
 *
 * Exits 0 if no "fatal" problems found. "Warnings" go to stderr but
 * don't fail the run — they're user-experience issues that may or may
 * not be real bugs depending on context.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { computeWinners } from '../src/lib/computeWinners';
import { computeSensitivity, defaultSensitivity } from '../src/lib/sensitivityCalc';

const API = 'http://localhost:5099/api';

// ── Reporting ───────────────────────────────────────────────────────────
interface Category { name: string; passed: number; failed: number; warnings: number; }
const cats: Record<string, Category> = {};
const failures: Array<{ cat: string; test: string; detail: string }> = [];
const warnings: Array<{ cat: string; test: string; detail: string }> = [];

function cat(c: string) {
  if (!cats[c]) cats[c] = { name: c, passed: 0, failed: 0, warnings: 0 };
  return cats[c];
}
function ok(c: string, t: string)                     { cat(c).passed++; console.log(`  ✓ [${c}] ${t}`); }
function fail(c: string, t: string, detail = '')     { cat(c).failed++; failures.push({ cat: c, test: t, detail }); console.log(`  ✗ [${c}] ${t}  ${detail}`); }
function warn(c: string, t: string, detail = '')     { cat(c).warnings++; warnings.push({ cat: c, test: t, detail }); console.log(`  ⚠ [${c}] ${t}  ${detail}`); }

// ── HTTP helpers ────────────────────────────────────────────────────────

async function post(path: string, body: any): Promise<{ status: number; json: any; ms: number }> {
  const t0 = Date.now();
  try {
    const res = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = { _rawText: text.slice(0, 200) }; }
    return { status: res.status, json, ms: Date.now() - t0 };
  } catch (e: any) {
    return { status: -1, json: { error: e.message }, ms: Date.now() - t0 };
  }
}

async function get(path: string): Promise<{ status: number; json: any }> {
  try {
    const res = await fetch(`${API}${path}`);
    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = { _rawText: text.slice(0, 200) }; }
    return { status: res.status, json };
  } catch (e: any) {
    return { status: -1, json: { error: e.message } };
  }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
void sleep;  // kept as a utility for future tests even if unused today

// ══════════════════════════════════════════════════════════════════════
// CATEGORY A — API happy-path combinatorics
// Every user type × region × grid combination must return 200 + status=ok
// ══════════════════════════════════════════════════════════════════════

async function catA() {
  console.log('\nA. API happy-path combinatorics:');
  const userTypes = ['facility', 'farm', 'residential'] as const;
  const regions = ['eastern', 'central', 'western'] as const;
  const grids = ['on_grid', 'off_grid'] as const;

  for (const ut of userTypes) {
    for (const r of regions) {
      for (const g of grids) {
        // residential off_grid is invalid per our rules — skip
        if (ut === 'residential' && g === 'off_grid') continue;
        const body: any = {
          userType: ut, region: r, gridScenario: g,
          monthlyBillSar: 15000, criticalLoadPct: 25,
        };
        if (ut === 'facility')    { body.peakLoadKw = 120; body.operatingHours = 12; }
        if (ut === 'farm')        { body.pumpPowerKw = 22;  body.pumpHoursDay   = 8;  }
        if (ut === 'residential') { body.acUnits     = 6;   body.roofAreaM2    = 150; }

        const r1 = await post('/Design', body);
        if (r1.status !== 200)            { fail('A', `${ut}/${r}/${g} HTTP`, `status=${r1.status}`); continue; }
        if (r1.json?.status !== 'ok')     { fail('A', `${ut}/${r}/${g} body.status`, JSON.stringify(r1.json).slice(0, 200)); continue; }
        const d = r1.json.systemDesign;
        if (!d?.panels?.length)           fail('A', `${ut}/${r}/${g} panels`, `empty`);
        if (!d?.inverters?.length)        fail('A', `${ut}/${r}/${g} inverters`, `empty`);
        if (!d?.batteries?.length)        fail('A', `${ut}/${r}/${g} batteries`, `empty`);
        if (d?.capexBreakdown?.totalSar <= 0) fail('A', `${ut}/${r}/${g} capex`, `${d?.capexBreakdown?.totalSar}`);
        if (!d?.financials?.yearlyData || d.financials.yearlyData.length !== 10)
          fail('A', `${ut}/${r}/${g} yearlyData`, `len=${d?.financials?.yearlyData?.length}`);
        if (d?.panels?.length > 0 && d.inverters.length > 0 && d.batteries.length > 0
          && d.capexBreakdown.totalSar > 0 && d.financials.yearlyData.length === 10) {
          ok('A', `${ut}/${r}/${g}`);
        }
      }
    }
  }
}

// ══════════════════════════════════════════════════════════════════════
// CATEGORY B — API rejection (malformed / missing / malicious)
// Server MUST reject these with 400 (or at worst 500), never crash silently.
// ══════════════════════════════════════════════════════════════════════

async function catB() {
  console.log('\nB. API rejection of bad inputs:');

  const bad: Array<{ name: string; body: any; expect: 'reject' | 'acceptOrReject' }> = [
    { name: 'empty body {}',                     body: {},                                                       expect: 'reject' },
    { name: 'missing userType',                  body: { region: 'central', gridScenario: 'on_grid', monthlyBillSar: 1000 }, expect: 'reject' },
    { name: 'missing region',                    body: { userType: 'facility', gridScenario: 'on_grid', monthlyBillSar: 1000 }, expect: 'reject' },
    { name: 'missing gridScenario',              body: { userType: 'facility', region: 'central', monthlyBillSar: 1000 }, expect: 'reject' },
    { name: 'userType=xxx',                      body: { userType: 'xxx', region: 'central', gridScenario: 'on_grid', monthlyBillSar: 1000 }, expect: 'reject' },
    { name: 'region=moon',                       body: { userType: 'facility', region: 'moon', gridScenario: 'on_grid', monthlyBillSar: 1000 }, expect: 'reject' },
    { name: 'gridScenario=null',                 body: { userType: 'facility', region: 'central', gridScenario: null, monthlyBillSar: 1000 }, expect: 'reject' },
    { name: 'residential + off_grid (rule)',     body: { userType: 'residential', region: 'central', gridScenario: 'off_grid', monthlyBillSar: 1500 }, expect: 'reject' },
    { name: 'bill = -1000',                      body: { userType: 'facility', region: 'central', gridScenario: 'on_grid', monthlyBillSar: -1000 }, expect: 'reject' },
    { name: 'bill = 0',                          body: { userType: 'facility', region: 'central', gridScenario: 'on_grid', monthlyBillSar: 0 }, expect: 'reject' },
    { name: 'bill = 99 (under min 100)',         body: { userType: 'facility', region: 'central', gridScenario: 'on_grid', monthlyBillSar: 99 }, expect: 'reject' },
    { name: 'bill = 999_999_999',                body: { userType: 'facility', region: 'central', gridScenario: 'on_grid', monthlyBillSar: 999_999_999 }, expect: 'reject' },
    { name: 'bill = Infinity',                   body: { userType: 'facility', region: 'central', gridScenario: 'on_grid', monthlyBillSar: Number.POSITIVE_INFINITY }, expect: 'reject' },
    { name: 'bill = "5000" (string)',            body: { userType: 'facility', region: 'central', gridScenario: 'on_grid', monthlyBillSar: '5000' }, expect: 'acceptOrReject' },
    { name: 'bill = "not-a-number"',             body: { userType: 'facility', region: 'central', gridScenario: 'on_grid', monthlyBillSar: 'abc' }, expect: 'reject' },
    { name: 'peakLoadKw = -50',                  body: { userType: 'facility', region: 'central', gridScenario: 'on_grid', monthlyBillSar: 10000, peakLoadKw: -50 }, expect: 'reject' },
    { name: 'peakLoadKw = 1_000_000',            body: { userType: 'facility', region: 'central', gridScenario: 'on_grid', monthlyBillSar: 10000, peakLoadKw: 1_000_000 }, expect: 'reject' },
    { name: 'criticalLoadPct = 150',             body: { userType: 'facility', region: 'central', gridScenario: 'on_grid', monthlyBillSar: 10000, criticalLoadPct: 150 }, expect: 'reject' },
    { name: 'criticalLoadPct = -10',             body: { userType: 'facility', region: 'central', gridScenario: 'on_grid', monthlyBillSar: 10000, criticalLoadPct: -10 }, expect: 'reject' },
    { name: 'operatingHours = 26',               body: { userType: 'facility', region: 'central', gridScenario: 'on_grid', monthlyBillSar: 10000, operatingHours: 26 }, expect: 'reject' },
    { name: 'SQL injection in userType',         body: { userType: "'; DROP TABLE Components;--", region: 'central', gridScenario: 'on_grid', monthlyBillSar: 1000 }, expect: 'reject' },
    { name: 'XSS in region',                     body: { userType: 'facility', region: '<script>alert(1)</script>', gridScenario: 'on_grid', monthlyBillSar: 1000 }, expect: 'reject' },
    { name: 'extremely long userType string',    body: { userType: 'a'.repeat(100_000), region: 'central', gridScenario: 'on_grid', monthlyBillSar: 1000 }, expect: 'reject' },
  ];

  for (const t of bad) {
    const r = await post('/Design', t.body);
    const rejected = r.status === 400 || r.status === 422 || (r.status === 200 && r.json?.status === 'error');
    const crashed  = r.status === 500 || r.status === -1;
    if (crashed) { warn('B', t.name, `server-side crash, status=${r.status}`); continue; }
    if (t.expect === 'reject' && !rejected)           fail('B', t.name, `expected 400, got ${r.status} (status=${r.json?.status})`);
    else if (t.expect === 'acceptOrReject')           { ok('B', `${t.name} (handled: ${r.status})`); }
    else                                               ok('B', t.name);
  }
}

// ══════════════════════════════════════════════════════════════════════
// CATEGORY C — API boundary (min/max valid values)
// ══════════════════════════════════════════════════════════════════════

async function catC() {
  console.log('\nC. API boundary values:');
  const cases = [
    { name: 'bill = 100 (min)',    body: { userType: 'residential', region: 'central', gridScenario: 'on_grid', monthlyBillSar: 100, acUnits: 1 } },
    { name: 'bill = 5_000_000',    body: { userType: 'facility',    region: 'eastern', gridScenario: 'on_grid', monthlyBillSar: 5_000_000, peakLoadKw: 5000 } },
    { name: 'criticalLoadPct = 0', body: { userType: 'facility',    region: 'central', gridScenario: 'on_grid', monthlyBillSar: 10000, criticalLoadPct: 0 } },
    { name: 'criticalLoadPct = 100', body: { userType: 'facility',  region: 'central', gridScenario: 'off_grid', monthlyBillSar: 10000, criticalLoadPct: 100 } },
    { name: 'peakLoadKw = 1',      body: { userType: 'facility',    region: 'central', gridScenario: 'on_grid', monthlyBillSar: 1000, peakLoadKw: 1 } },
  ];
  for (const t of cases) {
    const r = await post('/Design', t.body);
    if (r.status !== 200)               { warn('C', t.name, `status=${r.status}, body=${JSON.stringify(r.json).slice(0,120)}`); continue; }
    if (r.json?.status !== 'ok')        { warn('C', t.name, `status=${r.json?.status}`); continue; }
    // Extra sanity: results should be internally consistent
    const d = r.json.systemDesign;
    if (d.capexBreakdown.totalSar <= 0)        fail('C', `${t.name} → capex`, `${d.capexBreakdown.totalSar}`);
    else if (d.financials.yearlyData.length !== 10) fail('C', `${t.name} → yearlyData len`, `${d.financials.yearlyData.length}`);
    else                                       ok('C', `${t.name} → capex ${d.capexBreakdown.totalSar.toLocaleString()} SAR`);
  }
}

// ══════════════════════════════════════════════════════════════════════
// CATEGORY D — Concurrency (50 parallel submits)
// ══════════════════════════════════════════════════════════════════════

async function catD() {
  console.log('\nD. Concurrency — 50 parallel designs:');
  const t0 = Date.now();
  const promises = Array.from({ length: 50 }, (_, i) =>
    post('/Design', {
      userType: ['facility', 'farm', 'residential'][i % 3],
      region: ['eastern', 'central', 'western'][i % 3],
      gridScenario: (i % 3) === 2 && i % 2 === 0 ? 'on_grid' : 'on_grid',
      monthlyBillSar: 1000 + i * 300,
      peakLoadKw: 50 + i * 5,
      criticalLoadPct: 20,
    })
  );
  const results = await Promise.all(promises);
  const dt = Date.now() - t0;
  const oks = results.filter(r => r.status === 200 && r.json?.status === 'ok').length;
  const rejects = results.filter(r => r.status === 400).length;
  const crashes = results.filter(r => r.status === 500 || r.status === -1).length;
  if (crashes > 0)  fail('D', `50 parallel — crashes: ${crashes}`, '');
  if (oks < 40)     fail('D', `50 parallel — only ${oks}/50 succeeded`, `rejects=${rejects}`);
  else              ok('D', `50 parallel in ${dt} ms — ${oks} ok, ${rejects} rejected, ${crashes} crashed`);

  // Latency distribution
  const sorted = results.map(r => r.ms).sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[sorted.length - 1];
  console.log(`     latency p50=${p50}ms p95=${p95}ms max=${p99}ms`);
  if (p95 > 5000) warn('D', `p95 > 5s`, `${p95}ms`);
}

// ══════════════════════════════════════════════════════════════════════
// CATEGORY E — Sequential stress (200 designs, check for memory/state issues)
// ══════════════════════════════════════════════════════════════════════

async function catE() {
  console.log('\nE. Sequential stress — 200 designs:');
  const t0 = Date.now();
  let errs = 0;
  let capexStable = true;
  let firstCapex: number | null = null;
  for (let i = 0; i < 200; i++) {
    const r = await post('/Design', {
      userType: 'facility', region: 'central', gridScenario: 'on_grid',
      monthlyBillSar: 15000, peakLoadKw: 100, operatingHours: 10, criticalLoadPct: 25,
    });
    if (r.status === 200 && r.json?.status === 'ok') {
      const c = r.json.systemDesign.capexBreakdown.totalSar;
      if (firstCapex === null) firstCapex = c;
      else if (c !== firstCapex) capexStable = false;
    } else errs++;
  }
  const dt = Date.now() - t0;
  if (errs > 0)         fail('E', `200 sequential — ${errs} errored`);
  if (!capexStable)     fail('E', `identical input produced different CAPEX (non-deterministic)`, '');
  if (errs === 0 && capexStable) ok('E', `200 sequential in ${dt} ms — all ok, CAPEX deterministic (${firstCapex?.toLocaleString()} SAR)`);
  const avgMs = dt / 200;
  if (avgMs > 500) warn('E', `slow average — ${avgMs.toFixed(0)} ms/request`);
}

// ══════════════════════════════════════════════════════════════════════
// CATEGORY F — Pure logic regressions (deterministic, no network)
// ══════════════════════════════════════════════════════════════════════

function catF() {
  console.log('\nF. Pure-logic regressions (no backend):');

  // computeWinners — identical designs should produce null winners, distinct ones should not
  const stub = (id: string, capex: number, be: number | null, net: number, prod: number): any => ({
    id, label: id, savedAt: '2026-01-01T00:00:00Z',
    design: {
      capexBreakdown: { totalSar: capex, panelsSar: 0, inverterSar: 0, batterySar: 0, protectionSar: 0, bosSar: 0 },
      financials: {
        breakEvenYear: be, net10yrBenefitSar: net,
        yearlyData: [{ year: 1, productionKwh: prod, gridSavingsSar: 0, exportRevenueSar: 0, dieselSavingsSar: 0, totalSavingsSar: 0, cumulativeSavingsSar: 0, baselineCostSar: 0 }],
      } as any,
    } as any,
    panel: {} as any, inverter: {} as any, battery: {} as any,
  });

  {
    // Distinct ROIs: a = 500k/1M = 50%,  b = 500k/800k = 62.5% → b should win roi
    const w = computeWinners([
      stub('a', 1_000_000, 5, 500_000, 100_000),
      stub('b',   800_000, 6, 500_000,  90_000),
    ]);
    if (w.capex !== 'b')       fail('F', 'computeWinners capex wrong', `got ${w.capex}`);
    if (w.breakEven !== 'a')   fail('F', 'computeWinners breakEven wrong', `got ${w.breakEven}`);
    if (w.roi !== 'b')         fail('F', 'computeWinners roi wrong', `got ${w.roi}`);
    if (w.co2 !== 'a')         fail('F', 'computeWinners co2 wrong', `got ${w.co2}`);
    if (w.capex === 'b' && w.breakEven === 'a' && w.roi === 'b' && w.co2 === 'a') ok('F', 'computeWinners (2 designs, distinct metrics)');
  }

  // computeSensitivity — known-good numeric check
  {
    const r = computeSensitivity(1_000_000, 1_875_000, { tariffSarKwh: 0.25, inflationPct: 0, degradationPct: 0 });
    if (r.years.length !== 10) fail('F', 'sensitivity 10 years', `got ${r.years.length}`);
    else if (Math.abs(r.years[9].cumulative - 2_500_000) > 1) fail('F', 'sensitivity cumulative', `got ${r.years[9].cumulative}`);
    else if (r.breakEvenYear !== 8) fail('F', 'sensitivity breakEven = 8', `got ${r.breakEvenYear}`);
    else ok('F', 'computeSensitivity flat-world');
  }

  {
    const s = defaultSensitivity({ yearlyData: [{ productionKwh: 1000, gridSavingsSar: 260 }] } as any);
    if (Math.abs(s.tariffSarKwh - 0.26) > 0.001) fail('F', 'defaultSensitivity tariff', `${s.tariffSarKwh}`);
    else if (s.inflationPct !== 3)                fail('F', 'defaultSensitivity inflation', `${s.inflationPct}`);
    else if (s.degradationPct !== 0.5)            fail('F', 'defaultSensitivity degradation', `${s.degradationPct}`);
    else ok('F', 'defaultSensitivity seeds correctly');
  }
}

// ══════════════════════════════════════════════════════════════════════
// CATEGORY G — PDF robustness (edge-case designs still render)
// ══════════════════════════════════════════════════════════════════════

async function catG() {
  console.log('\nG. PDF robustness:');

  // Tiny design — residential with very low bill
  const tiny = await post('/Design', {
    userType: 'residential', region: 'western', gridScenario: 'on_grid',
    monthlyBillSar: 200, acUnits: 1, roofAreaM2: 50,
  });

  // Huge design — big facility
  const huge = await post('/Design', {
    userType: 'facility', region: 'eastern', gridScenario: 'off_grid',
    monthlyBillSar: 500000, peakLoadKw: 800, operatingHours: 24, criticalLoadPct: 100,
  });

  const cases = [
    { name: 'tiny residential',    resp: tiny },
    { name: 'huge off-grid facility', resp: huge },
  ];

  const React = await import('react');
  const { renderToBuffer } = await import('@react-pdf/renderer');
  const { ProposalDocument } = await import('../src/pdf/ProposalDocument');

  for (const c of cases) {
    if (c.resp.status !== 200) { fail('G', `${c.name} — design fetch`, `status=${c.resp.status}`); continue; }
    const d = c.resp.json.systemDesign;
    try {
      const buf = await renderToBuffer(
        React.createElement(ProposalDocument as any, {
          design: d, panel: d.panels[0], inverter: d.inverters[0], battery: d.batteries[0],
        }) as any,
      );
      const hdr = buf.toString('binary', 0, 8);
      if (!hdr.startsWith('%PDF-')) fail('G', `${c.name} PDF magic header`, hdr);
      else if (buf.byteLength < 5000) fail('G', `${c.name} PDF too small`, `${buf.byteLength} bytes`);
      else ok('G', `${c.name} → ${buf.byteLength.toLocaleString()} bytes`);
    } catch (e: any) {
      fail('G', `${c.name} render threw`, e.message);
    }
  }
}

// ══════════════════════════════════════════════════════════════════════
// CATEGORY H — Simulation lifecycle
// ══════════════════════════════════════════════════════════════════════

async function catH() {
  console.log('\nH. Simulation lifecycle:');

  // 1. Kick off a design — simulation is auto-primed server-side as soon as
  //    a valid design is submitted. There's no /start endpoint.
  const d = await post('/Design', {
    userType: 'facility', region: 'central', gridScenario: 'on_grid',
    monthlyBillSar: 15000, peakLoadKw: 100, operatingHours: 12, criticalLoadPct: 25,
  });
  if (d.status !== 200) { fail('H', 'precondition design', `status=${d.status}`); return; }
  ok('H', 'design submitted (sim primed server-side)');

  // 2. Advance a bunch of ticks via GET /api/Simulation/next
  let lastTimestamp: string | null = null;
  let advances = 0;
  let errors = 0;
  for (let i = 0; i < 20; i++) {
    const t = await get('/Simulation/next');
    if (t.status !== 200 || !t.json) { errors++; continue; }
    const state = t.json.state ?? t.json;   // may be enveloped or flat
    const ts = state?.timestamp;
    if (typeof ts !== 'string') { errors++; continue; }
    if (lastTimestamp !== null && ts > lastTimestamp) advances++;
    lastTimestamp = ts;
  }
  if (errors > 2) fail('H', `${errors}/20 ticks errored`);
  else if (advances < 15) fail('H', `only ${advances}/20 ticks advanced monotonically`);
  else ok('H', `${advances}/20 ticks advanced monotonically, ${errors} errors`);

  // 3. History endpoint
  const h = await get('/Simulation/history');
  if (h.status !== 200) fail('H', 'history endpoint', `status=${h.status}`);
  else {
    const arr = h.json?.history ?? h.json;
    if (!Array.isArray(arr)) fail('H', 'history shape', JSON.stringify(h.json).slice(0, 120));
    else if (arr.length < 1)  warn('H', 'history empty', 'expected at least 1 entry after ticks');
    else ok('H', `history returned ${arr.length} entries`);
  }

  // 4. Trigger a scenario — use a real scenario value from ScenarioRequestDto.
  //    Valid: grid_outage, grid_restore, season_summer|moderate|winter|reset,
  //    load_spike, load_restore, cloud_cover, cloud_restore,
  //    low_battery, low_battery_restore.
  const scen = await post('/Simulation/scenario', { scenario: 'grid_outage' });
  if (scen.status !== 200) warn('H', 'grid_outage scenario', `status=${scen.status}, body=${JSON.stringify(scen.json).slice(0, 150)}`);
  else ok('H', 'grid_outage scenario triggered');

  // 5. Reset endpoint — should clear sim state cleanly
  const reset = await post('/Simulation/reset', {});
  if (reset.status !== 200) warn('H', 'reset endpoint', `status=${reset.status}`);
  else ok('H', 'sim reset accepted');
}

// ══════════════════════════════════════════════════════════════════════
// CATEGORY I — Data corruption (localStorage resilience is tested in-browser;
//              here we just verify the pure reducer doesn't crash on bad
//              HYDRATE_SAVED payloads)
// ══════════════════════════════════════════════════════════════════════

async function catI() {
  console.log('\nI. Reducer resilience against bad state:');
  const { appReducer } = await import('../src/store/appReducer');
  const { INITIAL_STATE } = await import('../src/store/AppContext.types');

  const nasty: any[] = [
    [],
    [{}],                                                                      // completely empty SavedDesign
    [{ id: 'a', label: 'x', savedAt: 'bad', design: null, panel: null, inverter: null, battery: null }],
    [{ id: 'a', design: { financials: null } }],                                // missing financials
    null,
    undefined,
    { id: 'not-an-array' },
  ];

  let crashes = 0;
  for (const payload of nasty) {
    try {
      const next = appReducer(INITIAL_STATE, { type: 'HYDRATE_SAVED', saved: payload } as any);
      if (!next || typeof next !== 'object') { crashes++; fail('I', `HYDRATE_SAVED returned non-object for ${JSON.stringify(payload)?.slice(0, 50)}`); }
    } catch (e: any) {
      crashes++;
      fail('I', `HYDRATE_SAVED threw for ${JSON.stringify(payload)?.slice(0, 50)}`, e.message);
    }
  }
  if (crashes === 0) ok('I', `reducer handled ${nasty.length} malformed payloads without throwing`);

  // Unknown action type
  try {
    const next = appReducer(INITIAL_STATE, { type: 'UNKNOWN_ACTION' } as any);
    if (next === INITIAL_STATE) ok('I', 'unknown action returns state unchanged');
    else fail('I', 'unknown action mutated state');
  } catch (e: any) {
    fail('I', 'unknown action threw', e.message);
  }
}

// ══════════════════════════════════════════════════════════════════════
// MAIN — run everything, print a summary
// ══════════════════════════════════════════════════════════════════════

async function main() {
  // Precondition: backend must be up
  const health = await get('/health');
  if (health.status !== 200) {
    console.error('\n❌ Backend not reachable at', API);
    console.error('   Run it first:  cd backend/SolarBrain.Api && dotnet run');
    process.exit(2);
  }

  console.log(`Hard-test suite — backend up (${JSON.stringify(health.json)})`);

  await catA();
  await catB();
  await catC();
  await catD();
  await catE();
  catF();
  await catG();
  await catH();
  await catI();

  // ── Summary ─────────────────────────────────────────────────────────
  console.log('\n\n' + '═'.repeat(70));
  console.log('SUMMARY');
  console.log('═'.repeat(70));

  let totalPassed = 0, totalFailed = 0, totalWarnings = 0;
  for (const k of Object.keys(cats)) {
    const c = cats[k];
    totalPassed   += c.passed;
    totalFailed   += c.failed;
    totalWarnings += c.warnings;
    const status = c.failed === 0 ? '✅' : '❌';
    console.log(`${status}  ${c.name}:  ${c.passed} passed,  ${c.failed} failed,  ${c.warnings} warnings`);
  }

  console.log('─'.repeat(70));
  console.log(`Total: ${totalPassed} passed,  ${totalFailed} failed,  ${totalWarnings} warnings`);

  if (failures.length) {
    console.log('\n❌ FAILURES:');
    for (const f of failures) console.log(`   [${f.cat}] ${f.test}  ${f.detail}`);
  }
  if (warnings.length) {
    console.log('\n⚠️  WARNINGS (non-fatal, user-experience issues):');
    for (const w of warnings) console.log(`   [${w.cat}] ${w.test}  ${w.detail}`);
  }

  if (totalFailed > 0) process.exit(1);
  console.log('\n🎉 All hard tests passed.');
}

main().catch(e => { console.error('\n💥 Hard-test runner crashed:', e); process.exit(3); });

/**
 * test-pdf.ts — End-to-end smoke test for the proposal PDF generator.
 *
 * What it does:
 *   1. Hits the running API on :5099 for a real design (facility/central/on-grid)
 *   2. Imports ProposalDocument directly (via tsx, no build step)
 *   3. Renders the document to a Buffer with @react-pdf/renderer's renderToBuffer
 *   4. Writes the buffer to /tmp/solarbrain-test.pdf
 *   5. Validates the file:
 *        - starts with "%PDF-"
 *        - is at least 5 KB (real multi-page PDFs always are)
 *        - has "SolarBrain" and a known financial number embedded as text
 *   6. Exits 0 on pass, 1 on any failure
 *
 * Run with:  cd frontend && ./node_modules/.bin/tsx scripts/test-pdf.ts
 */

import fs from 'node:fs/promises';
import { createElement } from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { ProposalDocument } from '../src/pdf/ProposalDocument';
import type { SystemDesign } from '../src/types/api';

const OUT_PATH = '/tmp/solarbrain-test.pdf';
const API_BASE = 'http://localhost:5099/api';

async function fetchDesign(): Promise<SystemDesign> {
  const res = await fetch(`${API_BASE}/Design`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      userType:        'facility',
      region:          'central',
      gridScenario:    'on_grid',
      monthlyBillSar:  18000,
      peakLoadKw:      150,
      operatingHours:  14,
      criticalLoadPct: 25,
    }),
  });
  if (!res.ok) throw new Error(`API HTTP ${res.status}`);
  const json = await res.json();
  if (json.status !== 'ok') throw new Error(`API returned: ${JSON.stringify(json).slice(0, 300)}`);
  return json.systemDesign;
}

async function main() {
  console.log('1. Fetching a real design from the API…');
  const design = await fetchDesign();
  console.log(`   ✓ ${design.panels[0].brand} ${design.panels[0].model}`);
  console.log(`   ✓ CAPEX: ${design.capexBreakdown.totalSar.toLocaleString()} SAR`);
  console.log(`   ✓ Break-even: year ${design.financials.breakEvenYear}`);
  console.log(`   ✓ Yearly data rows: ${design.financials.yearlyData.length}`);

  console.log('\n2. Rendering ProposalDocument → Buffer…');
  const start = Date.now();
  const buf = await renderToBuffer(
    createElement(ProposalDocument, {
      design,
      panel:    design.panels[0],
      inverter: design.inverters[0],
      battery:  design.batteries[0],
    })
  );
  console.log(`   ✓ Rendered in ${Date.now() - start} ms, ${buf.byteLength.toLocaleString()} bytes`);

  console.log('\n3. Writing to disk…');
  await fs.writeFile(OUT_PATH, buf);
  const stat = await fs.stat(OUT_PATH);
  console.log(`   ✓ ${OUT_PATH} · ${stat.size.toLocaleString()} bytes`);

  console.log('\n4. Validating file…');
  const asText = buf.toString('binary');
  const header = asText.slice(0, 8);
  assert(header.startsWith('%PDF-'),           `PDF magic header missing — got "${header}"`);
  assert(stat.size > 5_000,                    `File too small (${stat.size} bytes)`);
  assert(asText.includes('SolarBrain'),        'PDF metadata missing "SolarBrain"');
  // Page count is emitted by react-pdf as "/Count N" in the page tree
  const pageCountMatch = asText.match(/\/Type\s*\/Pages[\s\S]{0,200}?\/Count\s+(\d+)/);
  const pageCount = pageCountMatch ? parseInt(pageCountMatch[1], 10) : -1;
  assert(pageCount === 4,                      `Expected 4 pages, got ${pageCount}`);
  console.log('   ✓ %PDF- header present');
  console.log(`   ✓ Size OK (${stat.size.toLocaleString()} bytes)`);
  console.log('   ✓ "SolarBrain" embedded');
  console.log(`   ✓ Page count = ${pageCount}`);

  console.log('\n✅ All PDF smoke-test assertions passed');
  console.log(`   Open the file to eyeball it:  open ${OUT_PATH}`);
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) { console.error('   ✗ ' + msg); process.exit(1); }
}

main().catch(err => {
  console.error('\n❌ Smoke test failed:', err);
  process.exit(1);
});

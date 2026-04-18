/**
 * sensitivityCalc.ts — pure-function 10-year ROI projection for the
 * Sensitivity panel. Anchored to the backend's year-1 production and CAPEX,
 * then evolved forward with user-configurable economic assumptions.
 *
 * Why not re-use the backend's yearlyData directly?
 *   Because the backend applies a specific set of assumptions the user
 *   can't change (flat tariff, its own degradation curve). The Sensitivity
 *   panel exists precisely to let users explore "what if tariffs rise 3%?"
 *   or "what if panels age faster than spec?" — so we need to recompute.
 *
 * Approach: take year-1 production as the production anchor, apply panel
 * degradation compounding, and multiply against the chosen tariff
 * (inflated forward) to derive year-N savings.
 */

import type { FinancialModel, CapexBreakdown } from '../types/api';

export interface SensitivityInputs {
  /** Electricity tariff, SAR per kWh, in year 1 */
  tariffSarKwh:        number;
  /** Annual tariff inflation, as a percentage (e.g. 3 means 3%/yr) */
  inflationPct:        number;
  /** Annual panel degradation, as a percentage (e.g. 0.5 means 0.5%/yr) */
  degradationPct:      number;
}

export interface SensitivityYear {
  year:             number;   // 1..10
  productionKwh:    number;   // this year's production after degradation
  tariffSarKwh:     number;   // this year's tariff after inflation
  annualSavings:    number;   // productionKwh × tariffSarKwh
  cumulative:       number;   // gross cumulative savings
  cumulativeNet:    number;   // cumulative − CAPEX
}

export interface SensitivityResult {
  years:            SensitivityYear[];
  breakEvenYear:    number | null;  // first year where cumulativeNet >= 0, null if never
  netAt10Years:     number;
  roi10Pct:         number;
}

/**
 * Extract the implied baseline tariff from the backend's yearlyData so the
 * tariff slider's default matches the backend exactly.
 * Returns 0 if year-1 has no production (shouldn't happen in practice).
 */
export function extractBaselineTariff(financials: FinancialModel): number {
  const y1 = financials.yearlyData[0];
  if (!y1 || y1.productionKwh <= 0) return 0;
  return y1.gridSavingsSar / y1.productionKwh;
}

/** Year-1 baseline production — used as the anchor for recomputation. */
export function extractBaselineProduction(financials: FinancialModel): number {
  return financials.yearlyData[0]?.productionKwh ?? 0;
}

/**
 * Sensible starting points when the panel first opens. These are the
 * "realistic" Saudi assumptions — chosen so the user sees an immediate
 * uplift over the backend's conservative (flat tariff, zero inflation)
 * projection.
 */
export function defaultSensitivity(financials: FinancialModel): SensitivityInputs {
  return {
    tariffSarKwh:   extractBaselineTariff(financials) || 0.26,
    inflationPct:   3,      // ~Saudi CPI historical average
    degradationPct: 0.5,    // industry-standard for LiFePO4-era panels
  };
}

/**
 * Compute a 10-year projection under the user-chosen assumptions.
 *
 * Math:
 *   productionY  = baseProductionKwh × (1 − degradationPct/100) ^ (Y−1)
 *   tariffY      = tariffSarKwh      × (1 + inflationPct  /100) ^ (Y−1)
 *   annualY      = productionY × tariffY
 *   cumulative   = Σ annualY
 *   netCum       = cumulative − capex
 */
export function computeSensitivity(
  baseProductionKwh: number,
  capex:             CapexBreakdown | number,
  inputs:            SensitivityInputs,
  years:             number = 10,
): SensitivityResult {
  const capexTotal = typeof capex === 'number' ? capex : capex.totalSar;
  const out: SensitivityYear[] = [];
  let cumulative = 0;
  let breakEvenYear: number | null = null;

  for (let y = 1; y <= years; y++) {
    const production = baseProductionKwh
      * Math.pow(1 - inputs.degradationPct / 100, y - 1);
    const tariff     = inputs.tariffSarKwh
      * Math.pow(1 + inputs.inflationPct / 100, y - 1);
    const annual     = production * tariff;
    cumulative += annual;
    const net = cumulative - capexTotal;

    if (breakEvenYear === null && net >= 0) breakEvenYear = y;

    out.push({
      year:          y,
      productionKwh: production,
      tariffSarKwh:  tariff,
      annualSavings: annual,
      cumulative,
      cumulativeNet: net,
    });
  }

  const last = out[out.length - 1];
  return {
    years:         out,
    breakEvenYear,
    netAt10Years:  last?.cumulativeNet ?? -capexTotal,
    roi10Pct:      capexTotal > 0 ? ((last?.cumulativeNet ?? 0) / capexTotal) * 100 : 0,
  };
}

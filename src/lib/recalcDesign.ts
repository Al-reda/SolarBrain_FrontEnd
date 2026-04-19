/**
 * recalcDesign.ts — client-side recalculation of CAPEX + financials
 * when the user swaps a panel, inverter, or battery selection.
 *
 * The backend computes the design against the top-ranked (#1) options.
 * When the user picks a different component, we adjust:
 *   1. CAPEX — swap the component cost, keep protection + BOS fixed
 *   2. Production — scale by the ratio of new panel kWp to original
 *   3. Financials — re-derive yearly savings, break-even, ROI from
 *      the new CAPEX + new production numbers
 *
 * This is a pure function — no side effects, fully testable.
 */

import type {
  CapexBreakdown,
  FinancialModel,
  FinancialYear,
  RankedPanel,
  RankedInverter,
  RankedBattery,
  SystemDesign,
} from '../types/api';

export interface RecalcResult {
  capex:      CapexBreakdown;
  financials: FinancialModel;
}

/**
 * Recalculate CAPEX + financials based on user-selected components.
 *
 * @param design     The original SystemDesign from the backend
 * @param panel      Currently selected panel (may differ from design.panels[0])
 * @param inverter   Currently selected inverter
 * @param battery    Currently selected battery
 * @returns          Adjusted CapexBreakdown + FinancialModel
 */
export function recalcDesign(
  design:   SystemDesign,
  panel:    RankedPanel,
  inverter: RankedInverter,
  battery:  RankedBattery,
): RecalcResult {
  const orig = design.capexBreakdown;
  const origFin = design.financials;

  // ── 1. CAPEX ──────────────────────────────────────────────────────
  const newPanels   = panel.panelsCostSar;
  const newInverter = inverter.inverterCostSar;
  const newBattery  = battery.batteryCostSar;
  // Protection & BOS are design-level constants, not per-component
  const protection  = orig.protectionSar;
  const bos         = orig.bosSar;
  const newTotal    = newPanels + newInverter + newBattery + protection + bos;

  const capex: CapexBreakdown = {
    panelsSar:     newPanels,
    inverterSar:   newInverter,
    batterySar:    newBattery,
    protectionSar: protection,
    bosSar:        bos,
    totalSar:      newTotal,
  };

  // ── 2. Production ratio ───────────────────────────────────────────
  // The backend's financials are anchored to the #1 panel's actualKwp.
  // A bigger/smaller array linearly scales energy production.
  const origPanel = design.panels[0];
  const prodRatio = origPanel && origPanel.actualKwp > 0
    ? panel.actualKwp / origPanel.actualKwp
    : 1;

  // ── 3. Re-derive financials ───────────────────────────────────────
  const yearlyData: FinancialYear[] = [];
  let cumulative = 0;
  let breakEvenYear: number | null = null;

  for (const yr of origFin.yearlyData) {
    const production     = yr.productionKwh * prodRatio;
    const gridSavings    = yr.gridSavingsSar * prodRatio;
    const exportRevenue  = yr.exportRevenueSar * prodRatio;
    const dieselSavings  = yr.dieselSavingsSar * prodRatio;
    const totalSavings   = gridSavings + exportRevenue + dieselSavings;
    cumulative += totalSavings;

    if (breakEvenYear === null && cumulative >= newTotal) {
      breakEvenYear = yr.year;
    }

    yearlyData.push({
      year:                yr.year,
      productionKwh:       Math.round(production),
      gridSavingsSar:      Math.round(gridSavings),
      exportRevenueSar:    Math.round(exportRevenue),
      dieselSavingsSar:    Math.round(dieselSavings),
      totalSavingsSar:     Math.round(totalSavings),
      cumulativeSavingsSar: Math.round(cumulative),
      baselineCostSar:     yr.baselineCostSar,  // unchanged — grid baseline
    });
  }

  const y1  = yearlyData[0]?.totalSavingsSar ?? 0;
  const y5  = yearlyData[4]?.cumulativeSavingsSar ?? 0;
  const y10 = yearlyData[9]?.cumulativeSavingsSar ?? 0;

  const financials: FinancialModel = {
    capexTotalSar:       newTotal,
    monthlySavingsSar:   Math.round(y1 / 12),
    year1SavingsSar:     Math.round(y1),
    year5SavingsSar:     Math.round(y5),
    year10SavingsSar:    Math.round(y10),
    breakEvenYear,
    baseline10yrCostSar: origFin.baseline10yrCostSar,  // grid baseline unchanged
    net10yrBenefitSar:   Math.round(y10 - newTotal),
    yearlyData,
  };

  return { capex, financials };
}

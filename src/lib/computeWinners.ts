/**
 * computeWinners.ts — pure function for the Compare view.
 *
 * Given a set of saved designs, returns which one wins each metric
 * (lowest CAPEX, earliest break-even, best 10-year ROI, most CO₂ offset).
 * A metric has no winner if fewer than 2 designs are saved, or if all
 * contenders tie.
 *
 * Winners are referenced by SavedDesign.id so the caller can render
 * badges directly without extra bookkeeping.
 */

import type { SavedDesign } from '../store/AppContext.types';

export type WinnerMetric = 'capex' | 'breakEven' | 'roi' | 'co2';

export interface Winners {
  capex:     string | null;   // id with lowest capex
  breakEven: string | null;   // id with lowest breakEvenYear (non-null wins over null)
  roi:       string | null;   // id with highest 10-yr ROI %
  co2:       string | null;   // id with highest year-1 CO2 avoided (kg)
}

const CO2_PER_KWH = 0.6;  // same constant as the PDF — K.A.CARE / IEA approx

/** Year-1 CO₂ avoided in kg for a saved design. */
export function computeCo2Year1Kg(s: SavedDesign): number {
  const y1 = s.design.financials.yearlyData[0];
  return y1 ? y1.productionKwh * CO2_PER_KWH : 0;
}

/** 10-year ROI % relative to CAPEX. */
export function computeRoi10Pct(s: SavedDesign): number {
  const capex = s.design.capexBreakdown.totalSar;
  if (capex <= 0) return 0;
  return (s.design.financials.net10yrBenefitSar / capex) * 100;
}

/**
 * Pick the id with the extremum score.
 *
 * Returns null when:
 *   - the list has fewer than 2 items (nothing to compare)
 *   - all items tie on the metric (no clear winner)
 *   - every item scores NaN/invalid
 *
 * `direction`:
 *   'min'  → lowest score wins (capex, break-even)
 *   'max'  → highest score wins (roi, co2)
 */
function pickExtreme(
  list: SavedDesign[],
  score: (s: SavedDesign) => number,
  direction: 'min' | 'max',
): string | null {
  if (list.length < 2) return null;
  let bestId: string | null = null;
  let bestScore = direction === 'min' ? Infinity : -Infinity;
  let tieCount  = 0;

  for (const s of list) {
    const n = score(s);
    if (!Number.isFinite(n)) continue;
    const better = direction === 'min' ? n < bestScore : n > bestScore;
    if (better) {
      bestScore = n;
      bestId    = s.id;
      tieCount  = 1;
    } else if (n === bestScore) {
      tieCount++;
    }
  }

  if (bestId === null || tieCount === list.length) return null;
  return bestId;
}

export function computeWinners(saved: SavedDesign[]): Winners {
  return {
    capex:     pickExtreme(saved, s => s.design.capexBreakdown.totalSar,                  'min'),
    breakEven: pickExtreme(saved, s => s.design.financials.breakEvenYear ?? Number.POSITIVE_INFINITY, 'min'),
    roi:       pickExtreme(saved, computeRoi10Pct,                                        'max'),
    co2:       pickExtreme(saved, computeCo2Year1Kg,                                      'max'),
  };
}

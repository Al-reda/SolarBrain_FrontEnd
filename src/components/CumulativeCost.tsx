/**
 * CumulativeCost.tsx — cost comparison bar chart for the simulation.
 *
 * Shows side-by-side:
 *   - What the facility WOULD pay without solar (baseline)
 *   - What they actually pay with SolarBrain
 *   - The savings amount + percentage
 */

import type { SimulationState, SystemDesign } from '../types/api';

interface Props { state: SimulationState; design: SystemDesign; }

export function CumulativeCost({ state, design }: Props) {
  const tariff = deriveTariff(design);
  const totalLoadKwh = state.totalSolarKwh + state.totalGridKwh;
  const baselineCost = totalLoadKwh * tariff;
  const actualCost = state.totalCostSar;
  const saved = baselineCost - actualCost;
  const savedPct = baselineCost > 0 ? (saved / baselineCost) * 100 : 0;
  const steps = state.interval ?? 0;
  const baselinePerStep = steps > 0 ? baselineCost / steps : 0;
  const maxBar = Math.max(baselineCost, actualCost, 1);

  return (
    <div className="cum-cost">
      {/* KPI strip */}
      <div className="cum-cost__kpis">
        <div className="cum-cost__kpi cum-cost__kpi--green">
          <div className="cum-cost__kpi-label">SAVED SO FAR</div>
          <div className="cum-cost__kpi-value">{fmt(saved)} SAR</div>
          <div className="cum-cost__kpi-sub">{savedPct.toFixed(0)}% less than baseline</div>
        </div>
        <div className="cum-cost__kpi">
          <div className="cum-cost__kpi-label">Steps completed</div>
          <div className="cum-cost__kpi-value">{steps}</div>
          <div className="cum-cost__kpi-sub">× 15 min intervals</div>
        </div>
        <div className="cum-cost__kpi">
          <div className="cum-cost__kpi-label">Baseline rate</div>
          <div className="cum-cost__kpi-value">{fmt(baselinePerStep)} SAR</div>
          <div className="cum-cost__kpi-sub">per 15 min interval</div>
        </div>
      </div>

      {/* Bars */}
      <div className="cum-cost__bars">
        <div className="cum-cost__bar-row">
          <span className="cum-cost__bar-label">Without solar system (grid-only baseline)</span>
          <span className="cum-cost__bar-amount">{fmt(baselineCost)} SAR</span>
        </div>
        <div className="cum-cost__bar cum-cost__bar--baseline" style={{ width: `${(baselineCost / maxBar) * 100}%` }}>
          <span className="cum-cost__bar-inner">{fmt(baselineCost)} SAR</span>
        </div>

        <div className="cum-cost__bar-row" style={{ marginTop: 12 }}>
          <span className="cum-cost__bar-label">With SolarBrain system (actual grid draw)</span>
          <span className="cum-cost__bar-amount">{fmt(actualCost)} SAR</span>
        </div>
        <div className="cum-cost__bar cum-cost__bar--actual" style={{ width: `${(actualCost / maxBar) * 100}%` }}>
          <span className="cum-cost__bar-inner">{fmt(actualCost)} SAR</span>
        </div>

        {saved > 0 && (
          <div className="cum-cost__savings-row">
            <span>↑ Battery + brain saved <b>{fmt(saved)} SAR</b> vs baseline this session</span>
            <span className="cum-cost__savings-pct">−{savedPct.toFixed(0)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

function fmt(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function deriveTariff(design: SystemDesign): number {
  const y1 = design.financials.yearlyData[0];
  if (!y1 || y1.productionKwh <= 0) return 0.26;
  return y1.gridSavingsSar / y1.productionKwh;
}

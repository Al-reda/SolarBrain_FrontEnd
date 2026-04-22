/**
 * FormulasPanel.tsx — collapsible section showing the engineering
 * formulas and calculations behind the SolarBrain sizing engine.
 *
 * Intended for judges / technical reviewers who want to see the math.
 * Toggles open/closed — collapsed by default so it doesn't overwhelm
 * regular users.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SystemDesign } from '../types/api';

interface Props { design: SystemDesign }

export function FormulasPanel({ design }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const p = design.profile;
  const r = design.requirements;
  const y1 = design.financials.yearlyData[0];
  const y1Prod = y1?.productionKwh ?? 0;
  const y1Grid = y1?.gridSavingsSar ?? 0;

  return (
    <div className="formulas">
      <button
        type="button"
        className="formulas__toggle"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="formulas__toggle-icon">{open ? '▾' : '▸'}</span>
        <span>{t('formulas.title')}</span>
      </button>

      {open && (
        <div className="formulas__body">
          <p className="formulas__intro">{t('formulas.intro')}</p>

          <FormulaBlock
            title={t('formulas.pvSizing')}
            formula={`PV_kWp = (Daily_Load / (GHI × PR)) × SF`}
            values={[
              [`Daily Load`, `${p.dailyLoadKwh} kWh/day`],
              [`GHI (${p.regionName})`, `${p.ghi} kWh/m²/day`],
              [`Performance Ratio`, `${r.performanceRatio}`],
              [`Safety Factor`, `${r.safetyFactor}`],
              [`Result`, `${r.pvKwpRequired} kWp`],
            ]}
          />

          <FormulaBlock
            title={t('formulas.batterySizing')}
            formula={`Battery_kWh = Peak_Load × Autonomy_Hours × DoD_Factor`}
            values={[
              [`Peak Load`, `${p.peakLoadKw} kW`],
              [`Autonomy`, `${r.autonomyHours} hours`],
              [`Result`, `${r.batteryKwhRequired} kWh`],
            ]}
          />

          <FormulaBlock
            title={t('formulas.inverterSizing')}
            formula={`Inverter_kW = Peak_Load × Oversize_Factor`}
            values={[
              [`Peak Load`, `${p.peakLoadKw} kW`],
              [`Result`, `${r.inverterKwRequired} kW`],
            ]}
          />

          <FormulaBlock
            title={t('formulas.annualProduction')}
            formula={`E_year(y) = PV_kWp × GHI × 365 × PR × 0.99^y`}
            values={[
              [`PV Array`, `${design.panels[0]?.actualKwp ?? r.pvKwpRequired} kWp`],
              [`GHI`, `${p.ghi} kWh/m²/day`],
              [`PR`, `${r.performanceRatio}`],
              [`Degradation`, `1% / year (compounding)`],
              [`Year 1`, `${design.financials.yearlyData[0]?.productionKwh.toLocaleString()} kWh`],
              [`Year 10`, `${design.financials.yearlyData[9]?.productionKwh.toLocaleString()} kWh`],
            ]}
          />

          <FormulaBlock
            title={t('formulas.gridSavings')}
            formula={`Savings_year(y) = E_year(y) × Tariff_SAR/kWh`}
            values={[
              [`Tariff (derived)`, `${y1Prod > 0 ? (y1Grid / y1Prod).toFixed(4) : '—'} SAR/kWh`],
              ...(p.gridScenario === 'on_grid' ? [
                [`Export assumption`, `20% of production`],
              ] as [string, string][] : []),
              [`Year 1 savings`, `${design.financials.yearlyData[0]?.totalSavingsSar.toLocaleString()} SAR`],
            ]}
          />

          <FormulaBlock
            title={t('formulas.breakEven')}
            formula={`Break-even = first year where Σ Savings ≥ CAPEX`}
            values={[
              [`Total CAPEX`, `${design.capexBreakdown.totalSar.toLocaleString()} SAR`],
              [`Break-even`, design.financials.breakEvenYear
                ? `Year ${design.financials.breakEvenYear}`
                : 'Beyond 10 years'],
              [`10-year net`, `${design.financials.net10yrBenefitSar.toLocaleString()} SAR`],
            ]}
          />

          <FormulaBlock
            title={t('formulas.capex')}
            formula={`CAPEX = Panels + Inverter + Battery + Protection + BoS`}
            values={[
              [`Panels`, `${design.capexBreakdown.panelsSar.toLocaleString()} SAR`],
              [`Inverter`, `${design.capexBreakdown.inverterSar.toLocaleString()} SAR`],
              [`Battery`, `${design.capexBreakdown.batterySar.toLocaleString()} SAR`],
              [`Protection`, `${design.capexBreakdown.protectionSar.toLocaleString()} SAR`],
              [`BoS (mounting + cable)`, `${design.capexBreakdown.bosSar.toLocaleString()} SAR`],
              [`Total`, `${design.capexBreakdown.totalSar.toLocaleString()} SAR`],
            ]}
          />
        </div>
      )}
    </div>
  );
}

// ── Sub-component ──────────────────────────────────────────────────────────

function FormulaBlock({
  title, formula, values,
}: {
  title: string;
  formula: string;
  values: [string, string][];
}) {
  return (
    <div className="formulas__block">
      <div className="formulas__block-title">{title}</div>
      <code className="formulas__equation">{formula}</code>
      <div className="formulas__values">
        {values.map(([label, val], i) => (
          <div key={i} className="formulas__row">
            <span className="formulas__row-label">{label}</span>
            <span className="formulas__row-value">{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

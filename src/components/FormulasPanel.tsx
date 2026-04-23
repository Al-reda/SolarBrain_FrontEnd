/**
 * FormulasPanel.tsx — two collapsible sections:
 *   1. Electrical Engineering — PV, battery, inverter sizing + production
 *   2. Business Analysis — savings, CAPEX, break-even, ROI
 *
 * Each section toggles independently. Both collapsed by default.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SystemDesign } from '../types/api';

interface Props { design: SystemDesign }

export function FormulasPanel({ design }: Props) {
  const { t } = useTranslation();
  const [eeOpen, setEeOpen] = useState(false);
  const [bizOpen, setBizOpen] = useState(false);
  const p = design.profile;
  const r = design.requirements;
  const f = design.financials;
  const c = design.capexBreakdown;
  const y1 = f.yearlyData[0];
  const y1Prod = y1?.productionKwh ?? 0;
  const y1Grid = y1?.gridSavingsSar ?? 0;

  return (
    <div className="formulas">
      {/* ── Section 1: Electrical Engineering ──────────── */}
      <button type="button" className="formulas__toggle" onClick={() => setEeOpen(o => !o)} aria-expanded={eeOpen}>
        <span className="formulas__toggle-icon">{eeOpen ? '▾' : '▸'}</span>
        <span>⚡ {t('formulas.eeTitle')}</span>
      </button>

      {eeOpen && (
        <div className="formulas__body">
          <p className="formulas__intro">{t('formulas.eeIntro')}</p>

          <FormulaBlock
            title={t('formulas.pvSizing')}
            formula="PV_kWp = (Daily_Load / (GHI × PR)) × SF"
            values={[
              ['Daily Load', `${p.dailyLoadKwh} kWh/day`],
              [`GHI (${p.regionName})`, `${p.ghi} kWh/m²/day`],
              ['Performance Ratio', `${r.performanceRatio}`],
              ['Safety Factor', `${r.safetyFactor}`],
              ['Result', `${r.pvKwpRequired} kWp`],
            ]}
          />

          <FormulaBlock
            title={t('formulas.batterySizing')}
            formula="Battery_kWh = Peak_Load × Autonomy_Hours / DoD"
            values={[
              ['Peak Load', `${p.peakLoadKw} kW`],
              ['Autonomy', `${r.autonomyHours} hours`],
              ['Result', `${r.batteryKwhRequired} kWh`],
            ]}
          />

          <FormulaBlock
            title={t('formulas.inverterSizing')}
            formula="Inverter_kW = Peak_Load × Oversize_Factor"
            values={[
              ['Peak Load', `${p.peakLoadKw} kW`],
              ['Result', `${r.inverterKwRequired} kW`],
            ]}
          />

          <FormulaBlock
            title={t('formulas.annualProduction')}
            formula="E_year(y) = PV_kWp × GHI × 365 × PR × 0.99^y"
            values={[
              ['PV Array', `${design.panels[0]?.actualKwp ?? r.pvKwpRequired} kWp`],
              ['GHI', `${p.ghi} kWh/m²/day`],
              ['PR', `${r.performanceRatio}`],
              ['Degradation', '1% / year (compounding)'],
              ['Year 1 production', `${f.yearlyData[0]?.productionKwh.toLocaleString()} kWh`],
              ['Year 10 production', `${f.yearlyData[9]?.productionKwh.toLocaleString()} kWh`],
            ]}
          />
        </div>
      )}

      {/* ── Section 2: Business Analysis ──────────────── */}
      <button type="button" className="formulas__toggle formulas__toggle--biz" onClick={() => setBizOpen(o => !o)} aria-expanded={bizOpen}>
        <span className="formulas__toggle-icon">{bizOpen ? '▾' : '▸'}</span>
        <span>📊 {t('formulas.bizTitle')}</span>
      </button>

      {bizOpen && (
        <div className="formulas__body">
          <p className="formulas__intro">{t('formulas.bizIntro')}</p>

          <FormulaBlock
            title={t('formulas.capex')}
            formula="CAPEX = Panels + Inverter + Battery + Protection + BoS"
            values={[
              ['Panels', `${c.panelsSar.toLocaleString()} SAR`],
              ['Inverter', `${c.inverterSar.toLocaleString()} SAR`],
              ['Battery', `${c.batterySar.toLocaleString()} SAR`],
              ['Protection', `${c.protectionSar.toLocaleString()} SAR`],
              ['BoS (mounting + cable)', `${c.bosSar.toLocaleString()} SAR`],
              ['Total', `${c.totalSar.toLocaleString()} SAR`],
            ]}
          />

          <FormulaBlock
            title={t('formulas.gridSavings')}
            formula="Savings_year(y) = E_year(y) × Tariff_SAR/kWh"
            values={[
              ['Tariff (derived)', `${y1Prod > 0 ? (y1Grid / y1Prod).toFixed(4) : '—'} SAR/kWh`],
              ...(p.gridScenario === 'on_grid' ? [
                ['Export assumption', '20% of production'],
              ] as [string, string][] : []),
              ['Year 1 savings', `${y1?.totalSavingsSar.toLocaleString()} SAR`],
              ['Monthly savings', `${f.monthlySavingsSar.toLocaleString()} SAR`],
            ]}
          />

          <FormulaBlock
            title={t('formulas.breakEven')}
            formula="Break-even = first year where Σ Savings ≥ CAPEX"
            values={[
              ['Total CAPEX', `${c.totalSar.toLocaleString()} SAR`],
              ['Break-even', f.breakEvenYear ? `Year ${f.breakEvenYear}` : 'Beyond 10 years'],
              ['10-year net benefit', `${f.net10yrBenefitSar.toLocaleString()} SAR`],
              ['10-year ROI', `${c.totalSar > 0 ? ((f.net10yrBenefitSar / c.totalSar) * 100).toFixed(1) : 0}%`],
            ]}
          />
        </div>
      )}
    </div>
  );
}

function FormulaBlock({ title, formula, values }: { title: string; formula: string; values: [string, string][] }) {
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

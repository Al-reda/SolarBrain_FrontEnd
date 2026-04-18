/**
 * SensitivityPanel.tsx — interactive "what-if" card under the ROI chart.
 *
 * Three sliders let the user set economic assumptions the backend can't
 * vary (tariff rate, annual inflation, panel degradation). A chart shows
 * the new cumulative-net-savings curve overlaid on the backend baseline,
 * and a KPI strip summarises the delta.
 *
 * All computation is client-side (pure function in lib/sensitivityCalc).
 * The backend design is never mutated.
 */

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CartesianGrid, Legend, Line, LineChart, ReferenceDot,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { SystemDesign } from '../types/api';
import {
  computeSensitivity,
  defaultSensitivity,
  type SensitivityInputs,
} from '../lib/sensitivityCalc';

interface Props { design: SystemDesign }

export function SensitivityPanel({ design }: Props) {
  const { t } = useTranslation();
  const f = design.financials;
  const capex = design.capexBreakdown.totalSar;

  // Derived once per design. Sliders drift from these defaults.
  const defaults = useMemo(() => defaultSensitivity(f), [f]);
  const [inputs, setInputs] = useState<SensitivityInputs>(defaults);
  const baseProductionKwh = f.yearlyData[0]?.productionKwh ?? 0;

  const result = useMemo(
    () => computeSensitivity(baseProductionKwh, capex, inputs, 10),
    [baseProductionKwh, capex, inputs],
  );

  // Chart data: both series on a shared year axis
  const chartData = useMemo(() => {
    return result.years.map((y, i) => ({
      year:        y.year,
      scenario:    Math.round(y.cumulativeNet),
      baseline:    Math.round((f.yearlyData[i]?.cumulativeSavingsSar ?? 0) - capex),
    }));
  }, [result, f.yearlyData, capex]);

  const beScenario = result.breakEvenYear;
  const beBaseline = f.breakEvenYear;
  const baselineNetAt10 = f.net10yrBenefitSar;
  const delta = result.netAt10Years - baselineNetAt10;

  const beDot = beScenario
    ? chartData.find(d => d.year === beScenario)
    : null;

  function resetAll() { setInputs(defaults); }

  return (
    <div className="sensitivity">
      <p className="sensitivity__intro">{t('sensitivity.intro')}</p>

      <div className="sensitivity__sliders">
        <Slider
          label={t('sensitivity.tariffLabel')}
          value={inputs.tariffSarKwh}
          display={`${inputs.tariffSarKwh.toFixed(3)} SAR/kWh`}
          min={0.10} max={0.80} step={0.005}
          onChange={v => setInputs(s => ({ ...s, tariffSarKwh: v }))}
          baseline={defaults.tariffSarKwh}
        />
        <Slider
          label={t('sensitivity.inflationLabel')}
          value={inputs.inflationPct}
          display={`${inputs.inflationPct.toFixed(1)}% / yr`}
          min={0} max={10} step={0.1}
          onChange={v => setInputs(s => ({ ...s, inflationPct: v }))}
          baseline={defaults.inflationPct}
        />
        <Slider
          label={t('sensitivity.degradationLabel')}
          value={inputs.degradationPct}
          display={`${inputs.degradationPct.toFixed(2)}% / yr`}
          min={0} max={2} step={0.05}
          onChange={v => setInputs(s => ({ ...s, degradationPct: v }))}
          baseline={defaults.degradationPct}
        />
      </div>

      <div className="sensitivity__reset-row">
        <button type="button" className="btn btn--ghost btn--sm" onClick={resetAll}>
          {t('sensitivity.reset')}
        </button>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 11, fill: '#6B7280' }}
            label={{ value: t('sensitivity.yearAxis'), position: 'insideBottomRight', offset: -4, fill: '#6B7280', fontSize: 11 }}
          />
          <YAxis
            tickFormatter={(n) => `${(n / 1000).toFixed(0)}k`}
            tick={{ fontSize: 11, fill: '#6B7280' }}
            label={{ value: t('sensitivity.netAxis'), angle: -90, position: 'insideLeft', fill: '#6B7280', fontSize: 11 }}
          />
          <Tooltip
            formatter={(v) => {
              const n = typeof v === 'number' ? v : Number(v ?? 0);
              return `${n.toLocaleString(undefined, { maximumFractionDigits: 0 })} SAR`;
            }}
            labelFormatter={l => `${t('sensitivity.year')} ${l}`}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '0.5px solid #D1D5DB' }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone" dataKey="baseline"
            name={t('sensitivity.lineBaseline')}
            stroke="#8B8072" strokeWidth={1.5} strokeDasharray="6 4" dot={false}
          />
          <Line
            type="monotone" dataKey="scenario"
            name={t('sensitivity.lineScenario')}
            stroke="#3D6B4E" strokeWidth={2.4} dot={{ r: 3, fill: '#3D6B4E' }}
          />
          {beDot && (
            <ReferenceDot
              x={beDot.year} y={beDot.scenario}
              r={7} fill="#C8932E" stroke="white" strokeWidth={2}
              label={{
                value: `${t('sensitivity.breakEvenLabel')} · ${t('sensitivity.year')} ${beDot.year}`,
                position: 'top', fill: '#A8771F', fontSize: 11, fontWeight: 600,
              }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* Delta KPI strip */}
      <div className="sensitivity__kpis">
        <KpiDelta
          label={t('sensitivity.newBreakEven')}
          baseline={beBaseline != null ? `${t('sensitivity.year')} ${beBaseline}` : t('sensitivity.none')}
          scenario={beScenario != null ? `${t('sensitivity.year')} ${beScenario}` : t('sensitivity.none')}
          better={
            beScenario != null && (beBaseline == null || beScenario < beBaseline)
          }
          worse={
            beScenario == null && beBaseline != null
            || (beScenario != null && beBaseline != null && beScenario > beBaseline)
          }
        />
        <KpiDelta
          label={t('sensitivity.netSavings10')}
          baseline={fmtSAR(baselineNetAt10)}
          scenario={fmtSAR(result.netAt10Years)}
          better={delta > 0}
          worse={delta < 0}
          deltaText={delta !== 0 ? `${delta > 0 ? '+' : ''}${fmtSAR(delta)}` : ''}
        />
        <KpiDelta
          label={t('sensitivity.roi10')}
          baseline={capex > 0 ? `${(baselineNetAt10 / capex * 100).toFixed(0)}%` : '—'}
          scenario={`${result.roi10Pct.toFixed(0)}%`}
          better={result.roi10Pct > (baselineNetAt10 / capex * 100)}
          worse={result.roi10Pct < (baselineNetAt10 / capex * 100)}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────

function fmtSAR(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}M SAR`;
  if (abs >= 1_000)     return `${sign}${(abs / 1_000).toFixed(0)}k SAR`;
  return `${sign}${abs.toFixed(0)} SAR`;
}

interface SliderProps {
  label:    string;
  value:    number;
  display:  string;
  min:      number;
  max:      number;
  step:     number;
  baseline: number;
  onChange: (v: number) => void;
}
function Slider({ label, value, display, min, max, step, baseline, onChange }: SliderProps) {
  const isAtBaseline = Math.abs(value - baseline) < step / 2;
  return (
    <div className="sens-slider">
      <div className="sens-slider__row">
        <label className="sens-slider__label">{label}</label>
        <span className={`sens-slider__value ${isAtBaseline ? '' : 'sens-slider__value--dirty'}`}>
          {display}
        </span>
      </div>
      <input
        type="range"
        className="sens-slider__range"
        min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
      />
    </div>
  );
}

interface KpiDeltaProps {
  label:     string;
  baseline:  string;
  scenario:  string;
  better?:   boolean;
  worse?:    boolean;
  deltaText?: string;
}
function KpiDelta({ label, baseline, scenario, better, worse, deltaText }: KpiDeltaProps) {
  const tone = better ? 'better' : worse ? 'worse' : 'neutral';
  return (
    <div className={`sens-kpi sens-kpi--${tone}`}>
      <div className="sens-kpi__label">{label}</div>
      <div className="sens-kpi__value">{scenario}</div>
      <div className="sens-kpi__baseline">
        <span>vs {baseline}</span>
        {deltaText && <span className="sens-kpi__delta">{deltaText}</span>}
      </div>
    </div>
  );
}

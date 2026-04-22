/**
 * RoiChart.tsx — 10-year payback chart.
 *
 * Shows cumulative savings as a growing line vs a horizontal CAPEX
 * reference line. The break-even point is where savings crosses CAPEX.
 * Much clearer than the old "savings vs baseline cost" which confused
 * users when the two lines had different scales.
 */

import {
  CartesianGrid, Legend, Line, LineChart, ReferenceDot, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { CapexBreakdown, FinancialModel } from '../types/api';

const fmt = (n: number) => `${(n / 1000).toFixed(0)}k`;

interface Props {
  financials: FinancialModel;
  capex?: CapexBreakdown;
}

export function RoiChart({ financials, capex }: Props) {
  const capexTotal = capex?.totalSar ?? financials.capexTotalSar;

  const data = financials.yearlyData.map(y => ({
    year: y.year,
    savings: Math.round(y.cumulativeSavingsSar),
    baseline: Math.round(y.baselineCostSar),
  }));

  const beYear = financials.breakEvenYear;
  const beDot = beYear ? data.find(d => d.year === beYear) : null;

  return (
    <div className="roi-chart">
      <div className="roi-chart__header">
        <h3>10-year financial projection</h3>
        <span className="muted">Cumulative savings vs investment cost</span>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="year"
            label={{ value: 'Year', position: 'insideBottomRight', offset: -4, fill: '#6B7280', fontSize: 11 }}
            tick={{ fontSize: 11, fill: '#6B7280' }}
          />
          <YAxis
            tickFormatter={fmt}
            tick={{ fontSize: 11, fill: '#6B7280' }}
            label={{ value: 'SAR (k)', angle: -90, position: 'insideLeft', fill: '#6B7280', fontSize: 11 }}
          />
          <Tooltip
            formatter={(v) => {
              const n = typeof v === 'number' ? v : Number(v ?? 0);
              return `${n.toLocaleString(undefined, { maximumFractionDigits: 0 })} SAR`;
            }}
            labelFormatter={l => `Year ${l}`}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '0.5px solid #D1D5DB' }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />

          {/* CAPEX horizontal reference line */}
          <ReferenceLine
            y={capexTotal}
            stroke="#A32D2D"
            strokeWidth={2}
            strokeDasharray="6 4"
            label={{
              value: `CAPEX: ${fmt(capexTotal)} SAR`,
              position: 'right',
              fill: '#A32D2D',
              fontSize: 11,
              fontWeight: 600,
            }}
          />

          {/* Cumulative savings — growing line */}
          <Line
            type="monotone" dataKey="savings" name="Cumulative savings"
            stroke="#1D9E75" strokeWidth={2.5} dot={{ r: 3 }}
          />

          {/* Baseline cost — what you'd pay without solar */}
          <Line
            type="monotone" dataKey="baseline" name="Grid cost (no solar)"
            stroke="#8B8072" strokeWidth={1.5} strokeDasharray="4 3" dot={false}
          />

          {/* Break-even dot */}
          {beDot && (
            <ReferenceDot
              x={beDot.year} y={beDot.savings}
              r={7} fill="#BA7517" stroke="white" strokeWidth={2}
              label={{
                value: `Break-even · Year ${beDot.year}`,
                position: 'top', fill: '#BA7517', fontSize: 11, fontWeight: 600,
              }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

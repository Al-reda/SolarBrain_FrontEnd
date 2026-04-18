/**
 * RoiChart.tsx — 10-year cumulative savings vs baseline cost.
 * Uses Recharts' LineChart with two series:
 *   - Cumulative savings (climbs year over year)
 *   - Baseline cost (what they'd pay without the system, straight line)
 * Highlights the break-even point with a reference dot.
 */

import {
  CartesianGrid, Legend, Line, LineChart, ReferenceDot,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { FinancialModel } from '../types/api';

const fmt = (n: number) => `${(n / 1000).toFixed(0)}k`;

export function RoiChart({ financials }: { financials: FinancialModel }) {
  const data = financials.yearlyData.map(y => ({
    year: y.year,
    savings: y.cumulativeSavingsSar,
    baseline: y.baselineCostSar,
  }));

  const beYear = financials.breakEvenYear;
  const beDot = beYear
    ? data.find(d => d.year === beYear)
    : null;

  return (
    <div className="roi-chart">
      <div className="roi-chart__header">
        <h3>10-year financial projection</h3>
        <span className="muted">
          Cumulative savings vs cost of doing nothing
        </span>
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
            formatter={(v: number) => `${v.toLocaleString(undefined, { maximumFractionDigits: 0 })} SAR`}
            labelFormatter={l => `Year ${l}`}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '0.5px solid #D1D5DB' }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone" dataKey="savings" name="Cumulative savings"
            stroke="#1D9E75" strokeWidth={2} dot={{ r: 3 }}
          />
          <Line
            type="monotone" dataKey="baseline" name="Doing nothing (baseline)"
            stroke="#A32D2D" strokeWidth={2} strokeDasharray="6 4" dot={false}
          />
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

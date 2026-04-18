/**
 * HistoryChart.tsx — 24-hour stacked area of energy sources over time,
 * with the battery SOC line overlaid on a right-hand axis. Fed from
 * state.simHistory (the last N ticks kept by the store).
 */

import {
  Area, CartesianGrid, ComposedChart, Legend, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { SimulationState } from '../types/api';

interface Props {
  history: SimulationState[];
}

export function HistoryChart({ history }: Props) {
  if (history.length < 2) {
    return (
      <div className="muted" style={{ padding: 30, textAlign: 'center' }}>
        Not enough data yet — press <b>▶ Play</b> and the chart will build up in real time.
      </div>
    );
  }

  // Project each state to the chart shape
  const data = history.map((s, i) => ({
    idx:       i,
    time:      s.timestamp.slice(11, 16),   // HH:mm
    solar:     s.solarKw,
    battery:   s.batteryDischargeKw,
    grid:      s.gridKw,
    generator: s.generatorKw,
    soc:       s.batterySocPct,
  }));

  // Tick spacing — every 8 points (~2 hours at 15-min steps) keeps axis clean
  const tickInterval = Math.max(0, Math.floor(data.length / 8));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 11, fill: '#6B7280' }}
          interval={tickInterval}
        />
        <YAxis
          yAxisId="left"
          tick={{ fontSize: 11, fill: '#6B7280' }}
          label={{ value: 'kW', angle: -90, position: 'insideLeft', fill: '#6B7280', fontSize: 11 }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: '#6B7280' }}
          label={{ value: 'SOC %', angle: 90, position: 'insideRight', fill: '#6B7280', fontSize: 11 }}
        />

        <Tooltip
          formatter={(v: number, name: string) => {
            if (name === 'SOC %') return `${v.toFixed(1)}%`;
            return `${v.toFixed(2)} kW`;
          }}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '0.5px solid #D1D5DB' }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area yAxisId="left" type="monotone" dataKey="solar"     stackId="1" stroke="#BA7517" fill="#BA7517" fillOpacity={0.7} name="Solar" />
        <Area yAxisId="left" type="monotone" dataKey="battery"   stackId="1" stroke="#534AB7" fill="#534AB7" fillOpacity={0.7} name="Battery" />
        <Area yAxisId="left" type="monotone" dataKey="grid"      stackId="1" stroke="#185FA5" fill="#185FA5" fillOpacity={0.6} name="Grid" />
        <Area yAxisId="left" type="monotone" dataKey="generator" stackId="1" stroke="#6B7280" fill="#6B7280" fillOpacity={0.6} name="Generator" />
        <Line yAxisId="right" type="monotone" dataKey="soc" stroke="#1D9E75" strokeWidth={2} dot={false} name="SOC %" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

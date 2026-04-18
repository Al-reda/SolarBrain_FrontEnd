/**
 * SimKpis.tsx — 6 live KPI cards showing the current mode and running totals.
 * The mode card is large and color-coded (amber for SOLAR_ONLY, red for
 * EMERGENCY, etc.). Totals animate up as the simulation ticks.
 */

import type { SimulationState } from '../types/api';

const fmt0 = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
const fmt1 = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 1 });

interface Props {
  state:  SimulationState;
  onGrid: boolean;
}

export function SimKpis({ state, onGrid }: Props) {
  const chargingArrow =
    state.batteryChargeKw > 0.1    ? '▲' :
    state.batteryDischargeKw > 0.1 ? '▼' :
                                     '—';

  const chargingLabel =
    state.batteryChargeKw > 0.1    ? `charging ${fmt1(state.batteryChargeKw)} kW` :
    state.batteryDischargeKw > 0.1 ? `discharging ${fmt1(state.batteryDischargeKw)} kW` :
                                     'idle';

  return (
    <>
      {/* Big mode chip spanning the row */}
      <div
        className="sim-mode-chip"
        style={{ background: state.modeColor, color: 'white' }}
        title={state.modeDescription}
      >
        <div className="sim-mode-chip__label">Current mode</div>
        <div className="sim-mode-chip__value">{state.mode.replace('_', ' ')}</div>
        <div className="sim-mode-chip__desc">{state.modeDescription}</div>
      </div>

      <div className="sim-kpis">
        <KpiBox
          label="Solar output"
          value={`${fmt1(state.pvOutputKw)} kW`}
          sub={`${state.solarUtilizationPct}% utilization`}
        />

        <KpiBox
          label="Battery SOC"
          value={`${fmt1(state.batterySocPct)}% ${chargingArrow}`}
          sub={chargingLabel}
        />

        <KpiBox
          label="SAR saved today"
          value={`${fmt0(state.totalCo2SavedKg * 0.72 * 0 + (state.totalNetMeterSar + Math.max(0, state.totalSolarKwh * 0.26 - state.totalCostSar)))} SAR`}
          sub={`${fmt0(state.totalCostSar)} SAR cost so far`}
          accent="green"
        />

        <KpiBox
          label="CO₂ avoided"
          value={`${fmt0(state.totalCo2SavedKg)} kg`}
          sub={`≈ ${fmt0(state.totalCo2SavedKg / 20)} trees/year`}
          accent="green"
        />

        {onGrid && (
          <KpiBox
            label="Net-meter revenue"
            value={`${fmt0(state.totalNetMeterSar)} SAR`}
            sub={`${fmt1(state.gridExportKw)} kW exporting now`}
            accent="amber"
          />
        )}

        <KpiBox
          label="Grid dependency"
          value={`${fmt0(state.gridDependencyPct)}%`}
          sub={`${fmt1(state.gridKw)} kW drawing now`}
        />
      </div>
    </>
  );
}

function KpiBox({
  label, value, sub, accent,
}: { label: string; value: string; sub?: string; accent?: 'green' | 'amber' }) {
  return (
    <div className={`sim-kpi ${accent ? `sim-kpi--${accent}` : ''}`}>
      <div className="sim-kpi__label">{label}</div>
      <div className="sim-kpi__value">{value}</div>
      {sub && <div className="sim-kpi__sub">{sub}</div>}
    </div>
  );
}

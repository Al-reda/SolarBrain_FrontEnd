/**
 * DesignView.tsx — the Designer.
 *
 * Initial state: compact form fills the screen — no scroll needed.
 * After a design comes back: form stays collapsed to a summary, and
 * the results sections expand below it.
 */

import { useApp } from '../store/useApp';
import { DesignForm }        from '../components/DesignForm';
import {
  BatteryCards, InverterCards, PanelCards,
} from '../components/ComponentCards';
import { Kpis }              from '../components/Kpis';
import { RoiChart }          from '../components/RoiChart';
import { SystemDiagram }     from '../components/SystemDiagram';

export function DesignView() {
  const { state, dispatch } = useApp();
  const {
    systemDesign, selectedPanel, selectedInverter, selectedBattery,
  } = state;

  const canGoToSim =
    !!(systemDesign && selectedPanel && selectedInverter && selectedBattery);

  return (
    <div className="view">
      {/* ── Stage A — compact form (always visible) ─────── */}
      <section className="form-card">
        <DesignForm />
      </section>

      {/* ── Stage B — results (only after a design) ─────── */}
      {systemDesign && (
        <>
          <section className="card">
            <h2>Sizing requirements</h2>
            <div className="profile-grid">
              <Stat label="Region"        value={systemDesign.profile.regionName} />
              <Stat label="GHI"           value={`${systemDesign.profile.ghi} kWh/m²/day`} />
              <Stat label="Peak load"     value={`${systemDesign.profile.peakLoadKw} kW`} />
              <Stat label="Daily load"    value={`${systemDesign.profile.dailyLoadKwh} kWh`} />
              <Stat label="Tier"          value={`Tier ${systemDesign.profile.tier}`} />
              <Stat label="PV required"   value={`${systemDesign.requirements.pvKwpRequired} kWp`} />
              <Stat label="Battery req."  value={`${systemDesign.requirements.batteryKwhRequired} kWh`} />
              <Stat label="Inverter req." value={`${systemDesign.requirements.inverterKwRequired} kW`} />
            </div>
          </section>

          <section className="card">
            <h2>Panel recommendations</h2>
            <PanelCards options={systemDesign.panels} />
          </section>

          <section className="card">
            <h2>Inverter recommendations</h2>
            <InverterCards options={systemDesign.inverters} />
          </section>

          <section className="card">
            <h2>Battery recommendations</h2>
            <BatteryCards options={systemDesign.batteries} />
          </section>

          {selectedPanel && selectedInverter && selectedBattery && (
            <section className="card">
              <h2>Single-line diagram</h2>
              <SystemDiagram
                panel={selectedPanel}
                inverter={selectedInverter}
                battery={selectedBattery}
                generator={systemDesign.generator}
                gridScenario={systemDesign.profile.gridScenario}
              />
            </section>
          )}

          <section className="card">
            <h2>Financials</h2>
            <Kpis
              capex={systemDesign.capexBreakdown}
              financials={systemDesign.financials}
              generator={systemDesign.generator}
            />
          </section>

          <section className="card">
            <RoiChart financials={systemDesign.financials} />
          </section>

          <div className="design-form__submit">
            <button
              className="btn btn--amber btn--lg"
              disabled={!canGoToSim}
              onClick={() => dispatch({ type: 'NAVIGATE', view: 'simulation' })}
            >
              Run live simulation →
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="profile-stat">
      <div className="profile-stat__label">{label}</div>
      <div className="profile-stat__value">{value}</div>
    </div>
  );
}

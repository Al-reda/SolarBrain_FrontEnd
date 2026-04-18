/**
 * DesignView.tsx — Layer 1 root.
 *
 * Stage A: the facility form is always visible.
 * Stage B: after a design comes back, we append the full results:
 *   sizing requirements → recommendation cards → single-line diagram →
 *   financial KPIs + CAPEX + 10-year ROI chart → "Go to Simulation".
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
      <header className="view__header">
        <h1>
          SolarBrain · Designer
          <span className="tag">Layer 1</span>
        </h1>
        <p className="view__sub">
          Intelligent Hybrid Energy Management System — .NET 9 · React TS
        </p>
      </header>

      {/* ── Stage A — the form ─────────────────────────────── */}
      <section className="card">
        <h2>1. Facility profile</h2>
        <DesignForm />
      </section>

      {/* ── Stage B — results (visible only after a design) ── */}
      {systemDesign && (
        <>
          <section className="card">
            <h2>2. Sizing requirements</h2>
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
            <h2>3. Panel recommendations</h2>
            <PanelCards options={systemDesign.panels} />
          </section>

          <section className="card">
            <h2>4. Inverter recommendations</h2>
            <InverterCards options={systemDesign.inverters} />
          </section>

          <section className="card">
            <h2>5. Battery recommendations</h2>
            <BatteryCards options={systemDesign.batteries} />
          </section>

          {selectedPanel && selectedInverter && selectedBattery && (
            <section className="card">
              <h2>6. Single-line diagram</h2>
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
            <h2>7. Financials</h2>
            <Kpis
              capex={systemDesign.capexBreakdown}
              financials={systemDesign.financials}
              generator={systemDesign.generator}
            />
          </section>

          <section className="card">
            <RoiChart financials={systemDesign.financials} />
          </section>

          <div className="form-submit">
            <button
              className="btn btn--amber"
              disabled={!canGoToSim}
              onClick={() => dispatch({ type: 'NAVIGATE', view: 'simulation' })}
            >
              → Run simulation (Layer 2)
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

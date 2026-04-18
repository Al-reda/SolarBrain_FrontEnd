/**
 * SimulationView.tsx — Layer 2 root.
 *
 * Responsibilities:
 *   1. Read the current design from the store (set by Layer 1)
 *   2. Kick off 1 Hz polling of /api/Simulation/next
 *   3. Render: nav header → time context → energy flow + KPIs →
 *      controls → history chart / decision log / scenario panel (session 2)
 */

import { useApp } from '../store/useApp';
import { useSimPolling } from '../hooks/useSimPolling';
import { EnergyFlow } from '../components/EnergyFlow';
import { SimKpis } from '../components/SimKpis';
import { TimeContext } from '../components/TimeContext';
import { PlaybackControls } from '../components/PlaybackControls';
import { HistoryChart } from '../components/HistoryChart';
import { DecisionLog } from '../components/DecisionLog';
import { ScenarioPanel } from '../components/ScenarioPanel';

export function SimulationView() {
  const { state, dispatch } = useApp();
  const { systemDesign, simState } = state;

  // Kick off polling whenever simRunning is true
  useSimPolling();

  // No design loaded → send the user back to Layer 1
  if (!systemDesign) {
    return (
      <div className="view">
        <header className="view__header">
          <h1>SolarBrain · Simulation <span className="tag tag--sim">Layer 2</span></h1>
        </header>
        <section className="card">
          <h2>No design loaded</h2>
          <p>Submit a facility profile in Layer 1 first so the brain has something to run.</p>
          <button
            className="btn btn--ghost"
            onClick={() => dispatch({ type: 'NAVIGATE', view: 'design' })}
          >
            ← Back to Designer
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="view">
      <header className="view__header view__header--sim">
        <h1>
          SolarBrain · Simulation
          <span className="tag tag--sim">Layer 2</span>
        </h1>
        <p className="view__sub">
          {systemDesign.profile.regionName} · {systemDesign.profile.gridScenario.replace('_', '-')} ·
          {' '}{systemDesign.profile.userType}
        </p>
        <button
          className="btn btn--ghost"
          style={{ marginLeft: 'auto', position: 'absolute', top: 18, right: 24 }}
          onClick={() => dispatch({ type: 'NAVIGATE', view: 'design' })}
        >
          ← Back to Designer
        </button>
      </header>

      {/* Time strip + controls */}
      <section className="card">
        {simState
          ? <TimeContext state={simState} />
          : <div className="muted" style={{ padding: 20, textAlign: 'center' }}>
              Press <b>▶ Play</b> below to start streaming live state from the brain.
            </div>}
        <div style={{ marginTop: 14 }}>
          <PlaybackControls />
        </div>
      </section>

      {/* KPI row */}
      {simState && (
        <section className="card">
          <h2>Live system state</h2>
          <SimKpis state={simState} onGrid={systemDesign.profile.gridScenario === 'on_grid'} />
        </section>
      )}

      {/* Energy flow */}
      {simState && (
        <section className="card">
          <h2>Energy flow</h2>
          <EnergyFlow state={simState} design={systemDesign} />
        </section>
      )}

      {/* Session 2 components */}
      <section className="card">
        <h2>24-hour history</h2>
        <HistoryChart history={state.simHistory} />
      </section>

      <section className="card">
        <h2>Decision log</h2>
        <DecisionLog entries={simState?.recentDecisions ?? []} />
      </section>

      <section className="card">
        <h2>Scenario injection</h2>
        <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
          Click a card to stress-test the brain live. Click again to restore normal conditions.
        </p>
        <ScenarioPanel />
      </section>
    </div>
  );
}

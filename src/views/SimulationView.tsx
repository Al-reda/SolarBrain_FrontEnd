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

  // No design loaded → send the user back to the designer
  if (!systemDesign) {
    return (
      <div className="view">
        <div className="view__intro">
          <h1 className="view__intro-title">Live simulation</h1>
          <p className="view__intro-sub">
            You need a system to simulate. Head over to the designer, generate a
            configuration for your facility, then come back here to watch it run.
          </p>
        </div>
        <section className="card">
          <h2>No design loaded yet</h2>
          <p>
            Start by describing your facility — we'll size the system in about a
            second, and this screen will stream live data from the decision
            engine once you're ready.
          </p>
          <button
            className="btn btn--green"
            onClick={() => dispatch({ type: 'NAVIGATE', view: 'design' })}
          >
            Go to designer
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="view">
      <div className="view__intro view__intro--row">
        <div>
          <h1 className="view__intro-title">Live simulation</h1>
          <p className="view__intro-sub">
            Running on your <b>{prettyUserType(systemDesign.profile.userType)}</b>
            {' '}system in <b>{systemDesign.profile.regionName}</b>
            {' '}({systemDesign.profile.gridScenario === 'on_grid' ? 'on-grid' : 'off-grid'}).
          </p>
        </div>
        <button
          className="btn btn--ghost"
          onClick={() => dispatch({ type: 'NAVIGATE', view: 'design' })}
        >
          ← Back to design
        </button>
      </div>

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
        <h2>Stress tests</h2>
        <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
          Trigger a real-world event and watch the system adapt. Click again to
          restore normal conditions.
        </p>
        <ScenarioPanel />
      </section>
    </div>
  );
}

function prettyUserType(t: string): string {
  if (t === 'facility')    return 'industrial facility';
  if (t === 'farm')        return 'agricultural farm';
  if (t === 'residential') return 'residential';
  return t;
}

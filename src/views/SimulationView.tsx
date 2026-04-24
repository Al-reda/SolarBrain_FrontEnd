/**
 * SimulationView.tsx — live monitoring view, fully translated.
 */

import { useTranslation } from 'react-i18next';
import { useApp } from '../store/useApp';
import { useSimPolling } from '../hooks/useSimPolling';
import { EnergyFlow } from '../components/EnergyFlow';
import { SimKpis } from '../components/SimKpis';
import { TimeContext } from '../components/TimeContext';
import { PlaybackControls } from '../components/PlaybackControls';
import { HistoryChart } from '../components/HistoryChart';
import { DecisionLog } from '../components/DecisionLog';
import { ScenarioPanel } from '../components/ScenarioPanel';
import { CumulativeCost } from '../components/CumulativeCost';
import { SimDataLogger } from '../components/SimDataLogger';

export function SimulationView() {
  const { t } = useTranslation();
  const { state, dispatch } = useApp();
  const { systemDesign, simState } = state;

  // Kick off polling whenever simRunning is true
  useSimPolling();

  // No design loaded → send the user back to the designer
  if (!systemDesign) {
    return (
      <div className="view">
        <div className="view__intro">
          <h1 className="view__intro-title">{t('sim.viewTitle')}</h1>
          <p className="view__intro-sub">{t('sim.needDesignFirst')}</p>
        </div>
        <section className="card">
          <h2>{t('sim.noDesignTitle')}</h2>
          <p>{t('sim.noDesignBody')}</p>
          <button
            className="btn btn--green"
            onClick={() => dispatch({ type: 'NAVIGATE', view: 'design' })}
          >
            {t('sim.goToDesigner')}
          </button>
        </section>
      </div>
    );
  }

  const userTypeLong = t(`userType.${systemDesign.profile.userType}Long`);
  const regionLabel  = t(`region.${systemDesign.profile.region}`);
  const scenarioLbl  = systemDesign.profile.gridScenario === 'on_grid'
    ? t('form.onGrid') : t('form.offGrid');

  return (
    <div className="view">
      <div className="view__intro view__intro--row">
        <div>
          <h1 className="view__intro-title">{t('sim.viewTitle')}</h1>
          <p
            className="view__intro-sub"
            dangerouslySetInnerHTML={{
              __html: t('sim.facilityLine', {
                userType: `<b>${userTypeLong}</b>`,
                region:   `<b>${regionLabel}</b>`,
                scenario: scenarioLbl,
              }),
            }}
          />
        </div>
        <button
          className="btn btn--ghost"
          onClick={() => dispatch({ type: 'NAVIGATE', view: 'design' })}
        >
          {t('sim.backToDesign')}
        </button>
      </div>

      {/* Time strip + controls */}
      <section className="card">
        {simState
          ? <TimeContext state={simState} />
          : <div className="muted" style={{ padding: 20, textAlign: 'center' }}>
              {t('sim.pressPlayHint')}
            </div>}
        <div style={{ marginTop: 14 }}>
          <PlaybackControls />
        </div>
      </section>

      {/* KPI row */}
      {simState && (
        <section className="card">
          <h2>{t('sim.liveState')}</h2>
          <SimKpis state={simState} onGrid={systemDesign.profile.gridScenario === 'on_grid'} />
        </section>
      )}

      {/* Energy flow */}
      {simState && (
        <section className="card">
          <h2>{t('sim.energyFlow')}</h2>
          <EnergyFlow state={simState} design={systemDesign} />
        </section>
      )}

      {/* Cumulative cost comparison */}
      {simState && simState.interval > 0 && (
        <section className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Cumulative cost comparison — this session</h2>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--sb-oasis)', border: '1px solid var(--sb-oasis)', padding: '3px 10px', borderRadius: 6 }}>LIVE · updates every step</span>
          </div>
          <CumulativeCost state={simState} design={systemDesign} />
        </section>
      )}

      {/* History */}
      <section className="card">
        <h2>{t('sim.history24')}</h2>
        <HistoryChart history={state.simHistory} />
      </section>

      {/* Data logger — export simulation data as CSV */}
      <section className="card">
        <h2>{t('sim.dataLogger')}</h2>
        <SimDataLogger history={state.simHistory} />
      </section>

      <section className="card">
        <h2>{t('sim.decisionLog')}</h2>
        <DecisionLog entries={simState?.recentDecisions ?? []} />
      </section>

      <section className="card">
        <h2>{t('sim.stressTests')}</h2>
        <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
          {t('sim.stressTestsHint')}
        </p>
        <ScenarioPanel />
      </section>
    </div>
  );
}

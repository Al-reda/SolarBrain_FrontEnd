/**
 * DesignView.tsx — the Designer.
 *
 * Initial state: compact form fills the screen — no scroll needed.
 * After a design comes back: form stays collapsed to a summary, and
 * the results sections expand below it.
 */

import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import { useApp } from '../store/useApp';
import { LandingHero }    from '../components/LandingHero';
import { DesignForm }     from '../components/DesignForm';
import {
  BatteryCards, InverterCards, PanelCards,
} from '../components/ComponentCards';
import { Kpis }           from '../components/Kpis';
import { RoiChart }       from '../components/RoiChart';
import { SystemDiagram }  from '../components/SystemDiagram';
import { SensitivityPanel } from '../components/SensitivityPanel';
import { DownloadProposalButton } from '../components/DownloadProposalButton';
import { SaveDesignButton } from '../components/SaveDesignButton';
import { recalcDesign } from '../lib/recalcDesign';

export function DesignView() {
  const { t } = useTranslation();
  const { state, dispatch } = useApp();
  const {
    systemDesign, selectedPanel, selectedInverter, selectedBattery,
  } = state;

  const canGoToSim =
    !!(systemDesign && selectedPanel && selectedInverter && selectedBattery);

  // Live recalculation — updates instantly when user swaps a component
  const adjusted = useMemo(() => {
    if (!systemDesign || !selectedPanel || !selectedInverter || !selectedBattery) return null;
    return recalcDesign(systemDesign, selectedPanel, selectedInverter, selectedBattery);
  }, [systemDesign, selectedPanel, selectedInverter, selectedBattery]);

  // Use adjusted values if available, fall back to original
  const activeCapex      = adjusted?.capex      ?? systemDesign?.capexBreakdown;
  const activeFinancials = adjusted?.financials  ?? systemDesign?.financials;

  return (
    <>
      {/* Cinematic hero — hides itself once a design has been generated */}
      <LandingHero />

      <div className="view" id="design-form-anchor">
        {/* ── Stage A — compact form (always visible) ─────── */}
        <section className="form-card">
          <DesignForm />
        </section>

      {/* ── Stage B — results (only after a design) ─────── */}
      {systemDesign && (
        <>
          <section className="card">
            <h2>{t('results.sizingReqs')}</h2>
            <div className="profile-grid">
              <Stat label={t('stat.region')}      value={systemDesign.profile.regionName} />
              <Stat label={t('stat.ghi')}         value={`${systemDesign.profile.ghi} kWh/m²/day`} />
              <Stat label={t('stat.peakLoad')}    value={`${systemDesign.profile.peakLoadKw} kW`} />
              <Stat label={t('stat.dailyLoad')}   value={`${systemDesign.profile.dailyLoadKwh} kWh`} />
              <Stat label={t('stat.tier')}        value={`Tier ${systemDesign.profile.tier}`} />
              <Stat label={t('stat.pvRequired')}  value={`${systemDesign.requirements.pvKwpRequired} kWp`} />
              <Stat label={t('stat.batteryReq')}  value={`${systemDesign.requirements.batteryKwhRequired} kWh`} />
              <Stat label={t('stat.inverterReq')} value={`${systemDesign.requirements.inverterKwRequired} kW`} />
            </div>
          </section>

          <section className="card">
            <h2>{t('results.panelRecs')}</h2>
            <PanelCards options={systemDesign.panels} />
          </section>

          <section className="card">
            <h2>{t('results.inverterRecs')}</h2>
            <InverterCards options={systemDesign.inverters} />
          </section>

          <section className="card">
            <h2>{t('results.batteryRecs')}</h2>
            <BatteryCards options={systemDesign.batteries} />
          </section>

          {selectedPanel && selectedInverter && selectedBattery && (
            <section className="card">
              <h2>{t('results.diagram')}</h2>
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
            <h2>{t('results.financials')}</h2>
            {activeCapex && activeFinancials && (
              <Kpis
                capex={activeCapex}
                financials={activeFinancials}
                generator={systemDesign.generator}
              />
            )}
          </section>

          {activeFinancials && (
            <section className="card">
              <RoiChart financials={activeFinancials} />
            </section>
          )}

          {activeCapex && activeFinancials && (
            <section className="card">
              <h2>{t('sensitivity.title')}</h2>
              <SensitivityPanel design={{
                ...systemDesign,
                capexBreakdown: activeCapex,
                financials: activeFinancials,
              }} />
            </section>
          )}

          <div className="design-form__submit design-form__submit--row">
            <SaveDesignButton />
            <DownloadProposalButton />
            <button
              className="btn btn--amber btn--lg"
              disabled={!canGoToSim}
              onClick={() => dispatch({ type: 'NAVIGATE', view: 'simulation' })}
            >
              {t('results.runSim')}
            </button>
          </div>
        </>
      )}
      </div>
    </>
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

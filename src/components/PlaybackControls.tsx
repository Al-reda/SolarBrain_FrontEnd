/**
 * PlaybackControls.tsx — Auto/Manual toggle, Play/Pause/Step, Speed, Reset.
 *
 * Auto mode: plays continuously at the chosen speed (1×, 5×, 10×).
 * Manual mode: user clicks "Step →" to advance one tick at a time.
 */

import { useTranslation } from 'react-i18next';
import { useApp } from '../store/useApp';
import { getNextStep, resetSimulation, setSpeed as apiSetSpeed } from '../api/client';

const SPEEDS = [1, 5, 10];

export function PlaybackControls() {
  const { t } = useTranslation();
  const { state, dispatch } = useApp();
  const { simRunning, simPaused, simSpeed, simManual } = state;
  const isPlaying = simRunning && !simPaused && !simManual;

  function play() {
    dispatch({ type: 'SIM_SET_RUNNING', running: true });
    dispatch({ type: 'SIM_SET_PAUSED', paused: false });
  }
  function pause() {
    dispatch({ type: 'SIM_SET_PAUSED', paused: true });
  }
  async function onSpeed(s: number) {
    dispatch({ type: 'SIM_SET_SPEED', speed: s });
    try { await apiSetSpeed(s); } catch { /* best-effort */ }
  }
  async function onReset() {
    dispatch({ type: 'SIM_SET_RUNNING', running: false });
    dispatch({ type: 'SIM_SET_PAUSED', paused: false });
    dispatch({ type: 'SIM_CLEAR_HISTORY' });
    try { await resetSimulation(); } catch { /* best-effort */ }
  }
  function setManual(m: boolean) {
    dispatch({ type: 'SIM_SET_MANUAL', manual: m });
    if (m) {
      // Entering manual mode: ensure sim is "running" so step works,
      // but pause auto-polling
      dispatch({ type: 'SIM_SET_RUNNING', running: true });
      dispatch({ type: 'SIM_SET_PAUSED', paused: true });
    }
  }
  async function step() {
    // Fire one tick manually
    try {
      const resp = await getNextStep();
      if (resp.status === 'ok' && resp.state) {
        dispatch({ type: 'SIM_TICK', state: resp.state });
      } else if (resp.status === 'complete') {
        dispatch({ type: 'SIM_SET_RUNNING', running: false });
      }
    } catch { /* swallow */ }
  }

  return (
    <div className="controls">
      {/* Auto / Manual toggle */}
      <div className="seg seg--compact">
        <button type="button" className={`seg-pill ${!simManual ? 'seg-pill--on' : ''}`} onClick={() => setManual(false)}>
          {t('sim.auto')}
        </button>
        <button type="button" className={`seg-pill ${simManual ? 'seg-pill--on' : ''}`} onClick={() => setManual(true)}>
          {t('sim.manual')}
        </button>
      </div>

      {simManual ? (
        /* Manual mode: Step button */
        <button className="btn btn--green" onClick={step}>
          {t('sim.stepForward')} →
        </button>
      ) : (
        /* Auto mode: Play / Pause */
        !isPlaying ? (
          <button className="btn btn--green" onClick={play}>▶ {t('sim.play')}</button>
        ) : (
          <button className="btn btn--ghost" onClick={pause}>⏸ {t('sim.pause')}</button>
        )
      )}

      {/* Speed pills — visible in both modes (affects backend tick interval) */}
      <div className="speed-group">
        <span className="muted" style={{ fontSize: 11 }}>{t('sim.speed')}</span>
        {SPEEDS.map(s => (
          <button key={s} className={simSpeed === s ? 'speed-pill speed-pill--on' : 'speed-pill'} onClick={() => onSpeed(s)}>
            {s}×
          </button>
        ))}
      </div>

      <button className="btn btn--ghost" onClick={onReset}>↻ {t('sim.reset')}</button>
    </div>
  );
}

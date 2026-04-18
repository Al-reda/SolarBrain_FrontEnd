/**
 * PlaybackControls.tsx — Play/Pause · Speed · Reset.
 * Syncs the backend's speed via POST /api/Simulation/speed and updates
 * the local store so the polling hook picks up the new rate.
 */

import { useApp } from '../store/useApp';
import { resetSimulation, setSpeed as apiSetSpeed } from '../api/client';

const SPEEDS = [1, 5, 10];

export function PlaybackControls() {
  const { state, dispatch } = useApp();
  const { simRunning, simPaused, simSpeed } = state;

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

  const isPlaying = simRunning && !simPaused;

  return (
    <div className="controls">
      {!isPlaying ? (
        <button className="btn btn--green" onClick={play}>▶ Play</button>
      ) : (
        <button className="btn btn--ghost" onClick={pause}>⏸ Pause</button>
      )}

      <div className="speed-group">
        <span className="muted" style={{ fontSize: 11 }}>Speed</span>
        {SPEEDS.map(s => (
          <button
            key={s}
            className={simSpeed === s ? 'speed-pill speed-pill--on' : 'speed-pill'}
            onClick={() => onSpeed(s)}
          >
            {s}×
          </button>
        ))}
      </div>

      <button className="btn btn--ghost" onClick={onReset}>↻ Reset</button>
    </div>
  );
}

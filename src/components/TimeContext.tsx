/**
 * TimeContext.tsx — strip above the KPIs showing where we are in the
 * year and how far through the simulation we've progressed.
 */

import type { SimulationState } from '../types/api';

const SEASON_EMOJI: Record<string, string> = {
  summer:   '☀️',
  moderate: '🌤️',
  winter:   '❄️',
};

function formatTimestamp(ts: string): string {
  // Backend sends 'yyyy-MM-dd HH:mm:ss' — strip seconds, show locale-ish
  return ts.slice(0, 16).replace('T', ' ');
}

export function TimeContext({ state }: { state: SimulationState }) {
  const isDaytime = state.hour >= 6 && state.hour < 19;
  return (
    <div className="time-ctx">
      <div>
        <div className="time-ctx__label">Sim time</div>
        <div className="time-ctx__value">{formatTimestamp(state.timestamp)}</div>
      </div>
      <div>
        <div className="time-ctx__label">Season</div>
        <div className="time-ctx__value">
          {SEASON_EMOJI[state.season] ?? '•'} {state.season}
        </div>
      </div>
      <div>
        <div className="time-ctx__label">Time of day</div>
        <div className="time-ctx__value">{isDaytime ? '🌞 Daytime' : '🌙 Night'}</div>
      </div>
      <div>
        <div className="time-ctx__label">Interval</div>
        <div className="time-ctx__value">#{state.interval}</div>
      </div>
      <div style={{ flex: 1 }}>
        <div className="time-ctx__label">Progress</div>
        <div className="progress-bar">
          <div className="progress-bar__fill" style={{ width: `${state.progressPct}%` }} />
        </div>
        <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>
          {state.progressPct.toFixed(1)}%
        </div>
      </div>
    </div>
  );
}

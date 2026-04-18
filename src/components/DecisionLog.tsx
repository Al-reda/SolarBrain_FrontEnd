/**
 * DecisionLog.tsx — shows the last N mode transitions from the brain,
 * each with a coloured "from → to" badge pair and plain-language reason.
 */

import type { DecisionLogEntry, Mode } from '../types/api';

const MODE_COLORS: Record<Mode, string> = {
  SOLAR_ONLY:       '#BA7517',
  HYBRID:           '#1D9E75',
  BATTERY_BACKUP:   '#534AB7',
  EMERGENCY:        '#A32D2D',
  CHARGE_MODE:      '#185FA5',
  GRID_ONLY:        '#6B7280',
  GENERATOR_BACKUP: '#374151',
};

function ModeBadge({ mode }: { mode: Mode }) {
  return (
    <span className="mode-badge" style={{ background: MODE_COLORS[mode] }}>
      {mode.replace('_', ' ')}
    </span>
  );
}

export function DecisionLog({ entries }: { entries: DecisionLogEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="muted" style={{ padding: '12px 0' }}>
        No mode changes yet — run the simulation for a while to see the brain's reasoning.
      </p>
    );
  }

  // Reverse so newest is at the top
  const ordered = [...entries].reverse();

  return (
    <div className="decision-log">
      {ordered.map((e, i) => (
        <div key={`${e.timestamp}-${i}`} className="decision-log__entry">
          <div className="decision-log__head">
            <span className="decision-log__time">{e.timestamp.slice(5, 16)}</span>
            <div className="decision-log__transition">
              <ModeBadge mode={e.fromMode} />
              <span className="decision-log__arrow">→</span>
              <ModeBadge mode={e.toMode} />
            </div>
            <span className="decision-log__soc">SOC {e.batterySoc.toFixed(0)}%</span>
          </div>
          <div className="decision-log__reason">{e.reason}</div>
        </div>
      ))}
    </div>
  );
}

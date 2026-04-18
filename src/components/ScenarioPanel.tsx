/**
 * ScenarioPanel.tsx — 6 scenario buttons that stress-test the brain in
 * front of judges. Each button toggles between its "injection" and its
 * "restore" scenario (e.g. grid_outage ↔ grid_restore). A red LIVE
 * badge appears while a scenario is active so the demo is legible.
 */

import { useState } from 'react';
import { injectScenario } from '../api/client';
import type { ScenarioName } from '../types/api';

interface Scenario {
  title:      string;
  desc:       string;
  onName:     ScenarioName;
  offName:    ScenarioName;
  emoji:      string;
  tone:       'red' | 'amber' | 'blue' | 'purple';
}

const SCENARIOS: Scenario[] = [
  { title: 'Grid outage',       desc: 'Force grid down — brain switches to EMERGENCY',
    onName: 'grid_outage',       offName: 'grid_restore',        emoji: '⚡', tone: 'red'    },
  { title: 'Load spike',        desc: 'Sudden +30% demand — tests balancing logic',
    onName: 'load_spike',        offName: 'load_restore',        emoji: '📈', tone: 'amber'  },
  { title: 'Cloud cover',       desc: 'Solar drops 60% — HYBRID should kick in',
    onName: 'cloud_cover',       offName: 'cloud_restore',       emoji: '☁️', tone: 'blue'   },
  { title: 'Low battery',       desc: 'Force SOC near floor — triggers CHARGE_MODE',
    onName: 'low_battery',       offName: 'low_battery_restore', emoji: '🔋', tone: 'purple' },
];

export function ScenarioPanel() {
  // Track which scenarios are currently "on" (injected but not restored)
  const [active, setActive] = useState<Set<ScenarioName>>(new Set());
  const [season, setSeason] = useState<'default' | 'summer' | 'winter'>('default');

  async function toggle(s: Scenario) {
    const isActive = active.has(s.onName);
    const scenarioToSend: ScenarioName = isActive ? s.offName : s.onName;
    try {
      await injectScenario(scenarioToSend);
      setActive(prev => {
        const next = new Set(prev);
        if (isActive) next.delete(s.onName);
        else          next.add(s.onName);
        return next;
      });
    } catch (err) {
      console.error('Scenario injection failed', err);
    }
  }

  async function jumpSeason(target: 'summer' | 'winter' | 'default') {
    try {
      if (target === 'default') {
        await injectScenario('season_reset');
      } else if (target === 'summer') {
        await injectScenario('season_summer');
      } else {
        await injectScenario('season_winter');
      }
      setSeason(target);
    } catch (err) {
      console.error('Season jump failed', err);
    }
  }

  return (
    <>
      <div className="scenario-grid">
        {SCENARIOS.map(s => {
          const isOn = active.has(s.onName);
          return (
            <button
              key={s.onName}
              type="button"
              className={`scenario-card scenario-card--${s.tone} ${isOn ? 'scenario-card--on' : ''}`}
              onClick={() => toggle(s)}
            >
              <div className="scenario-card__head">
                <span className="scenario-card__emoji">{s.emoji}</span>
                <span className="scenario-card__title">{s.title}</span>
                {isOn && <span className="scenario-card__live">LIVE</span>}
              </div>
              <div className="scenario-card__desc">{s.desc}</div>
            </button>
          );
        })}
      </div>

      <div className="season-jump">
        <span className="muted" style={{ fontSize: 11, marginRight: 8 }}>Jump season:</span>
        {(['default', 'summer', 'winter'] as const).map(target => (
          <button
            key={target}
            type="button"
            className={season === target ? 'speed-pill speed-pill--on' : 'speed-pill'}
            onClick={() => jumpSeason(target)}
          >
            {target === 'default' ? '🗓️ Auto' : target === 'summer' ? '☀️ Summer' : '❄️ Winter'}
          </button>
        ))}
      </div>
    </>
  );
}

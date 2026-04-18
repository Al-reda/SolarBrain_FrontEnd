/**
 * AppHeader.tsx — persistent top bar shared by both views.
 * Shows the brand, a one-line product tagline, and two nav tabs.
 * The Simulation tab is disabled until a design exists so users can't
 * land on an empty dashboard.
 */

import { useApp } from '../store/useApp';
import type { View } from '../store/AppContext.types';

export function AppHeader() {
  const { state, dispatch } = useApp();
  const { view, systemDesign } = state;

  function goto(target: View) {
    if (target === 'simulation' && !systemDesign) return;
    dispatch({ type: 'NAVIGATE', view: target });
  }

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <div className="app-header__brand" onClick={() => goto('design')} role="button">
          <SunLogo />
          <div className="app-header__title-group">
            <div className="app-header__title">SolarBrain</div>
            <div className="app-header__tagline">
              Hybrid solar energy design &amp; live optimization
            </div>
          </div>
        </div>

        <nav className="app-header__nav">
          <button
            type="button"
            className={`nav-tab ${view === 'design' ? 'nav-tab--on' : ''}`}
            onClick={() => goto('design')}
          >
            Design
          </button>
          <button
            type="button"
            className={`nav-tab ${view === 'simulation' ? 'nav-tab--on' : ''}`}
            onClick={() => goto('simulation')}
            disabled={!systemDesign}
            title={systemDesign ? undefined : 'Generate a design first'}
          >
            Live Simulation
          </button>
        </nav>
      </div>
    </header>
  );
}

/** Amber-on-dark sun logo — small, recognizable, matches the favicon. */
function SunLogo() {
  return (
    <svg
      className="app-header__logo"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="7" fill="#BA7517" />
      <g stroke="#BA7517" strokeWidth="2.5" strokeLinecap="round">
        <line x1="16" y1="2"  x2="16" y2="6"  />
        <line x1="16" y1="26" x2="16" y2="30" />
        <line x1="2"  y1="16" x2="6"  y2="16" />
        <line x1="26" y1="16" x2="30" y2="16" />
        <line x1="6"  y1="6"  x2="9"  y2="9"  />
        <line x1="23" y1="23" x2="26" y2="26" />
        <line x1="26" y1="6"  x2="23" y2="9"  />
        <line x1="9"  y1="23" x2="6"  y2="26" />
      </g>
    </svg>
  );
}

/**
 * App.tsx — root. Wraps everything in AppProvider and switches between
 * the Design (Layer 1) and Simulation (Layer 2) views based on nav state.
 *
 * SimulationView is lazy-loaded: Recharts + React Flow only enter the
 * bundle when the user navigates there. Cuts the initial JS payload by ~60%.
 */

import { Suspense, lazy } from 'react';
import { AppProvider } from './store/AppContext';
import { useApp } from './store/useApp';
import { DesignView } from './views/DesignView';

const SimulationView = lazy(() =>
  import('./views/SimulationView').then(m => ({ default: m.SimulationView }))
);

function Shell() {
  const { state } = useApp();

  if (state.view === 'design') return <DesignView />;

  return (
    <Suspense fallback={<ViewLoading />}>
      <SimulationView />
    </Suspense>
  );
}

function ViewLoading() {
  return (
    <div className="view">
      <div className="card" style={{ textAlign: 'center', padding: 60 }}>
        <div className="muted">Loading simulation…</div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}

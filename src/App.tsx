/**
 * App.tsx — app root. Renders a persistent top header + the active view.
 * SimulationView is lazy-loaded so its chart + diagram libraries stay out of
 * the initial bundle until the user actually opens it.
 */

import { Suspense, lazy } from 'react';
import { AppProvider } from './store/AppContext';
import { useApp } from './store/useApp';
import { AppHeader } from './components/AppHeader';
import { DesignView } from './views/DesignView';

const SimulationView = lazy(() =>
  import('./views/SimulationView').then(m => ({ default: m.SimulationView }))
);

function Shell() {
  const { state } = useApp();

  return (
    <>
      <AppHeader />
      <main className="app-main">
        {state.view === 'design' ? (
          <DesignView />
        ) : (
          <Suspense fallback={<ViewLoading />}>
            <SimulationView />
          </Suspense>
        )}
      </main>
    </>
  );
}

function ViewLoading() {
  return (
    <div className="view">
      <div className="card" style={{ textAlign: 'center', padding: 60 }}>
        <div className="muted">Loading…</div>
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

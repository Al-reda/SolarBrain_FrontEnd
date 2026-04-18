/**
 * AppContext.tsx — ONLY the AppProvider component.
 *
 * By exporting just one component (and nothing else), this file keeps
 * React Fast Refresh happy — changing AppProvider in dev can do a
 * clean HMR swap without a full reload.
 *
 * The raw Context handle and useApp hook live in useApp.ts.
 * Types + initial state live in AppContext.types.ts.
 * The reducer lives in appReducer.ts.
 */

import { useReducer, type ReactNode } from 'react';

import { INITIAL_STATE } from './AppContext.types';
import { appReducer } from './appReducer';
import { AppContext } from './useApp';

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, INITIAL_STATE);
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

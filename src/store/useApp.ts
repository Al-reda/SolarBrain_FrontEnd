/**
 * useApp.ts — owns the raw Context + the typed consumer hook.
 *
 * Keeping these together here (and away from AppContext.tsx) is what
 * lets AppContext.tsx export ONLY the AppProvider component, which
 * satisfies the `react-refresh/only-export-components` rule.
 */

import { createContext, useContext, type Dispatch } from 'react';
import type { Action, AppState } from './AppContext.types';

export interface ContextShape {
  state:    AppState;
  dispatch: Dispatch<Action>;
}

/** Raw Context handle. Consumed by AppProvider and useApp only. */
export const AppContext = createContext<ContextShape | null>(null);

/** Typed consumer — throws if used outside AppProvider. */
export function useApp(): ContextShape {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

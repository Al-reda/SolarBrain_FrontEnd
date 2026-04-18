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
 *
 * The provider also handles localStorage persistence of savedDesigns
 * (Day 5 compare feature).
 */

import { useEffect, useReducer, useRef, type ReactNode } from 'react';

import { INITIAL_STATE } from './AppContext.types';
import type { SavedDesign } from './AppContext.types';
import { appReducer } from './appReducer';
import { AppContext } from './useApp';

const SB_SAVED_KEY = 'sb-saved-designs';

function readSavedFromStorage(): SavedDesign[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SB_SAVED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, INITIAL_STATE);
  const hydrated = useRef(false);

  // Hydrate once on mount — separate from render to avoid SSR issues
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const saved = readSavedFromStorage();
    if (saved.length) dispatch({ type: 'HYDRATE_SAVED', saved });
  }, []);

  // Persist whenever the savedDesigns list changes
  useEffect(() => {
    if (!hydrated.current) return;  // don't overwrite storage with [] before hydration
    try {
      window.localStorage.setItem(SB_SAVED_KEY, JSON.stringify(state.savedDesigns));
    } catch {
      // Quota / private-mode — silent ignore. UI state still works for this session.
    }
  }, [state.savedDesigns]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

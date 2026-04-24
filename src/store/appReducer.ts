/**
 * appReducer.ts — pure reducer for AppState. No React imports, fully testable
 * in isolation. Lives next to the Context so the related code stays together.
 */

import { HISTORY_CAP, MAX_SAVED } from './AppContext.types';
import type { Action, AppState } from './AppContext.types';

export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_FORM':
      return { ...state, formValues: { ...state.formValues, ...action.form } };

    case 'DESIGN_START':
      return { ...state, designLoading: true, designError: null };

    case 'DESIGN_SUCCESS': {
      const d = action.design;
      return {
        ...state,
        designLoading:    false,
        designError:      null,
        systemDesign:     d,
        selectedPanel:    d.panels[0] ?? null,
        selectedInverter: d.inverters[0] ?? null,
        selectedBattery:  d.batteries[0] ?? null,
      };
    }

    case 'DESIGN_ERROR':
      return { ...state, designLoading: false, designError: action.error };

    case 'SELECT_PANEL':    return { ...state, selectedPanel:    action.panel };
    case 'SELECT_INVERTER': return { ...state, selectedInverter: action.inverter };
    case 'SELECT_BATTERY':  return { ...state, selectedBattery:  action.battery };

    case 'SIM_TICK': {
      const next = [...state.simHistory, action.state];
      return {
        ...state,
        simState:   action.state,
        simHistory: next.length > HISTORY_CAP ? next.slice(-HISTORY_CAP) : next,
      };
    }

    case 'SIM_HISTORY_REPLACE':
      return { ...state, simHistory: action.history.slice(-HISTORY_CAP) };

    case 'SIM_CLEAR_HISTORY':
      return { ...state, simHistory: [], simState: null };

    case 'SIM_SET_RUNNING': return { ...state, simRunning: action.running };
    case 'SIM_SET_PAUSED':  return { ...state, simPaused:  action.paused };
    case 'SIM_SET_SPEED':   return { ...state, simSpeed:   action.speed };
    case 'SIM_SET_MANUAL':  return { ...state, simManual:  action.manual };
    case 'SET_NOTES':       return { ...state, userNotes:  action.notes };

    case 'NAVIGATE':        return { ...state, view: action.view };

    // ── Compare (Day 5) ────────────────────────────────────────────────
    case 'SAVE_DESIGN': {
      // Cap at MAX_SAVED. Oldest entry falls off the end if we'd exceed.
      const withoutDup = state.savedDesigns.filter(s => s.id !== action.saved.id);
      const next       = [action.saved, ...withoutDup].slice(0, MAX_SAVED);
      return { ...state, savedDesigns: next };
    }

    case 'REMOVE_SAVED_DESIGN':
      return {
        ...state,
        savedDesigns: state.savedDesigns.filter(s => s.id !== action.id),
      };

    case 'LOAD_SAVED_DESIGN': {
      const s = state.savedDesigns.find(x => x.id === action.id);
      if (!s) return state;
      return {
        ...state,
        systemDesign:     s.design,
        selectedPanel:    s.panel,
        selectedInverter: s.inverter,
        selectedBattery:  s.battery,
        formValues:       {
          ...state.formValues,
          userType:        s.design.profile.userType,
          region:          s.design.profile.region,
          gridScenario:    s.design.profile.gridScenario,
          monthlyBillSar:  s.design.profile.monthlyBillSar,
          peakLoadKw:      s.design.profile.peakLoadKw,
          criticalLoadPct: s.design.profile.criticalLoadPct,
        },
        view: 'design',
      };
    }

    case 'HYDRATE_SAVED':
      return { ...state, savedDesigns: action.saved };

    default:
      return state;
  }
}

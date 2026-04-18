/**
 * appReducer.ts — pure reducer for AppState. No React imports, fully testable
 * in isolation. Lives next to the Context so the related code stays together.
 */

import { HISTORY_CAP } from './AppContext.types';
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

    case 'NAVIGATE':        return { ...state, view: action.view };

    default:
      return state;
  }
}

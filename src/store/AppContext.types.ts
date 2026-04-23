/**
 * AppContext.types.ts — state shape, actions, defaults for the SolarBrain UI.
 * Pure types + constants, no React components — so Fast Refresh stays happy.
 */

import type {
  FacilityProfile,
  RankedBattery,
  RankedInverter,
  RankedPanel,
  SimulationState,
  SystemDesign,
} from '../types/api';

// ── State shape ────────────────────────────────────────────────────────────

export type View = 'design' | 'simulation' | 'compare';

/** A design the user has bookmarked for side-by-side comparison. */
export interface SavedDesign {
  id:        string;           // generated at save-time (crypto.randomUUID)
  label:     string;           // user-facing name
  savedAt:   string;           // ISO timestamp
  design:    SystemDesign;
  panel:     RankedPanel;
  inverter:  RankedInverter;
  battery:   RankedBattery;
}

export const MAX_SAVED = 3;

export interface AppState {
  // Layer 1
  formValues:        FacilityProfile;
  systemDesign:      SystemDesign | null;
  selectedPanel:     RankedPanel | null;
  selectedInverter:  RankedInverter | null;
  selectedBattery:   RankedBattery | null;
  designLoading:     boolean;
  designError:       string | null;

  // Layer 2
  simState:          SimulationState | null;
  simHistory:        SimulationState[];
  simRunning:        boolean;
  simPaused:         boolean;
  simSpeed:          number;
  simManual:         boolean;

  // Navigation
  view:              View;

  // Compare (Day 5)
  savedDesigns:      SavedDesign[];
}

// ── Defaults ───────────────────────────────────────────────────────────────

export const DEFAULT_FORM: FacilityProfile = {
  userType:        'facility',
  region:          'eastern',
  gridScenario:    'on_grid',
  monthlyBillSar:  15000,
  peakLoadKw:      150,
  operatingHours:  14,
  criticalLoadPct: 20,
  hasGenerator:    false,
};

export const INITIAL_STATE: AppState = {
  formValues:       DEFAULT_FORM,
  systemDesign:     null,
  selectedPanel:    null,
  selectedInverter: null,
  selectedBattery:  null,
  designLoading:    false,
  designError:      null,

  simState:    null,
  simHistory:  [],
  simRunning:  false,
  simPaused:   false,
  simSpeed:    1,
  simManual:   false,

  view: 'design',

  savedDesigns: [],
};

// ── Actions ────────────────────────────────────────────────────────────────

export type Action =
  | { type: 'SET_FORM';            form: Partial<FacilityProfile> }
  | { type: 'DESIGN_START' }
  | { type: 'DESIGN_SUCCESS';      design: SystemDesign }
  | { type: 'DESIGN_ERROR';        error: string }
  | { type: 'SELECT_PANEL';        panel: RankedPanel | null }
  | { type: 'SELECT_INVERTER';     inverter: RankedInverter | null }
  | { type: 'SELECT_BATTERY';      battery: RankedBattery | null }
  | { type: 'SIM_TICK';            state: SimulationState }
  | { type: 'SIM_HISTORY_REPLACE'; history: SimulationState[] }
  | { type: 'SIM_CLEAR_HISTORY' }
  | { type: 'SIM_SET_RUNNING';     running: boolean }
  | { type: 'SIM_SET_PAUSED';      paused: boolean }
  | { type: 'SIM_SET_SPEED';       speed: number }
  | { type: 'SIM_SET_MANUAL';      manual: boolean }
  | { type: 'NAVIGATE';            view: View }
  | { type: 'SAVE_DESIGN';         saved: SavedDesign }
  | { type: 'REMOVE_SAVED_DESIGN'; id: string }
  | { type: 'LOAD_SAVED_DESIGN';   id: string }
  | { type: 'HYDRATE_SAVED';       saved: SavedDesign[] };

export const HISTORY_CAP = 288;   // 72 hours at 15-min intervals

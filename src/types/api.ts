/**
 * api.ts — single source of truth for every backend DTO.
 *
 * ASP.NET Core serialises C# PascalCase to JSON camelCase by default,
 * so these mirror the .NET DTO shapes with camelCase property names.
 * If a backend DTO changes, update the matching type here.
 */

// ══════════════════════════════════════════════════════════════════════════
// Inputs
// ══════════════════════════════════════════════════════════════════════════

export type UserType     = 'facility' | 'farm' | 'residential';
export type RegionKey    = 'eastern' | 'central' | 'western';
export type GridScenario = 'on_grid' | 'off_grid';

/** Request body for POST /api/Design. */
export interface FacilityProfile {
  userType:         UserType;
  region:           RegionKey;
  gridScenario:     GridScenario;
  monthlyBillSar:   number;

  // Optional — derived if missing
  peakLoadKw?:      number;
  operatingHours?:  number;
  buildingSizeM2?:  number;
  criticalLoadPct?: number;
  roofAreaM2?:      number;

  // Farm-specific
  pumpPowerKw?:     number;
  pumpHoursDay?:    number;

  // Residential-specific
  acUnits?:         number;

  // Off-grid
  hasGenerator?:    boolean;
  generatorKva?:    number;

  // Battery retrofit mode — user already has panels + inverter
  existingPvKwp?:      number;
  existingInverterKw?: number;
}

// ══════════════════════════════════════════════════════════════════════════
// Design response
// ══════════════════════════════════════════════════════════════════════════

export type Mode =
  | 'SOLAR_ONLY'
  | 'HYBRID'
  | 'BATTERY_BACKUP'
  | 'EMERGENCY'
  | 'CHARGE_MODE'
  | 'GRID_ONLY'
  | 'GENERATOR_BACKUP';

export type Season = 'summer' | 'moderate' | 'winter';

export interface ProfileSummary {
  userType:        UserType;
  region:          RegionKey;
  regionName:      string;
  gridScenario:    GridScenario;
  monthlyBillSar:  number;
  peakLoadKw:      number;
  dailyLoadKwh:    number;
  tier:            number;
  ghi:             number;
  criticalLoadPct: number;
}

export interface SizingRequirements {
  pvKwpRequired:      number;
  batteryKwhRequired: number;
  inverterKwRequired: number;
  autonomyHours:      number;
  performanceRatio:   number;
  safetyFactor:       number;
}

export type RecommendationLabel = 'Best value' | 'Best performance' | 'Budget option' | string;

export interface RankedPanel {
  recommendationLabel: RecommendationLabel;
  score:               number;
  id:                  string;
  brand:               string;
  model:               string;
  tier:                number;
  powerWp:             number;
  efficiencyPct:       number;
  areaM2:              number;
  type:                string;
  warrantyYears:       number;
  priceSar:            number;
  tempCoefficientPct:  number;
  gridScenario:        string;
  unitsRequired:       number;
  actualKwp:           number;
  roofAreaM2:          number;
  panelsCostSar:       number;
  roofLimited:         boolean;
}

export interface RankedInverter {
  recommendationLabel: RecommendationLabel;
  score:               number;
  id:                  string;
  brand:               string;
  model:               string;
  tier:                number;
  capacityKw:          number;
  type:                string;
  efficiencyPct:       number;
  warrantyYears:       number;
  priceSar:            number;
  maxPvInputKw:        number;
  gridScenario:        string;
  unitsRequired:       number;
  actualKw:            number;
  inverterCostSar:     number;
}

export interface RankedBattery {
  recommendationLabel: RecommendationLabel;
  score:               number;
  id:                  string;
  brand:               string;
  model:               string;
  tier:                number;
  capacityKwh:         number;
  chemistry:           string;
  cycleLife:           number;
  dodPct:              number;
  warrantyYears:       number;
  priceSar:            number;
  gridScenario:        string;
  unitsRequired:       number;
  actualKwh:           number;
  floorSocPct:         number;
  batteryCostSar:      number;
}

export interface ProtectionLine {
  key:           string;
  description:   string;
  spec:          string;
  quantity:      number;
  unitPriceSar:  number;
  totalPriceSar: number;
}

export interface ProtectionSummary {
  items:    ProtectionLine[];
  totalSar: number;
}

export interface Bos {
  mountingStructure: ProtectionLine;
  dcCable:           ProtectionLine;
  acCable:           ProtectionLine;
  totalSar:          number;
}

export interface GeneratorSpec {
  kva:                    number;
  kwOutput:               number;
  fuelConsumptionLph:     number;
  estimatedAnnualCostSar: number;
}

export interface CapexBreakdown {
  panelsSar:     number;
  inverterSar:   number;
  batterySar:    number;
  protectionSar: number;
  bosSar:        number;
  totalSar:      number;
}

export interface FinancialYear {
  year:                 number;
  productionKwh:        number;
  gridSavingsSar:       number;
  exportRevenueSar:     number;
  dieselSavingsSar:     number;
  totalSavingsSar:      number;
  cumulativeSavingsSar: number;
  baselineCostSar:      number;
}

export interface FinancialModel {
  capexTotalSar:       number;
  monthlySavingsSar:   number;
  year1SavingsSar:     number;
  year5SavingsSar:     number;
  year10SavingsSar:    number;
  breakEvenYear:       number | null;
  baseline10yrCostSar: number;
  net10yrBenefitSar:   number;
  yearlyData:          FinancialYear[];
}

export interface Tariff {
  rateSarKwh:        number;
  peakRateSarKwh:    number;
  offpeakRateSarKwh: number;
  exportRateSarKwh:  number;
}

export interface SimulationConfig {
  userType:        UserType;
  region:          RegionKey;
  gridScenario:    GridScenario;
  peakLoadKw:      number;
  criticalLoadPct: number;
  arrayKwp:        number;
  batteryKwh:      number;
  dodPct:          number;
  ghi:             number;
  tariff:          Tariff;
  panelTempCoeff:  number;
  hasGenerator:    boolean;
  generatorKva:    number;
  simulationYear:  number;
}

export interface SystemDesign {
  profile:          ProfileSummary;
  requirements:     SizingRequirements;
  panels:           RankedPanel[];
  inverters:        RankedInverter[];
  batteries:        RankedBattery[];
  protectionItems:  ProtectionSummary;
  bos:              Bos;
  generator:        GeneratorSpec | null;
  financials:       FinancialModel;
  capexBreakdown:   CapexBreakdown;
  simulationConfig: SimulationConfig;
}

export interface DesignResponse {
  status:       'ok' | string;
  systemDesign: SystemDesign;
}

// ══════════════════════════════════════════════════════════════════════════
// Simulation (Layer 2)
// ══════════════════════════════════════════════════════════════════════════

export interface DecisionLogEntry {
  timestamp:   string;
  fromMode:    Mode;
  toMode:      Mode;
  reason:      string;
  batterySoc:  number;
}

export interface SimulationState {
  timestamp:       string;
  hour:            number;
  season:          Season;
  interval:        number;

  mode:            Mode;
  modeColor:       string;
  modeDescription: string;

  pvOutputKw:      number;
  loadKw:          number;
  batterySocPct:   number;
  gridAvailable:   boolean;

  solarKw:              number;
  batteryDischargeKw:   number;
  gridKw:               number;
  generatorKw:          number;
  batteryChargeKw:      number;
  gridExportKw:         number;

  co2SavedKg:             number;
  costSar:                number;
  netMeteringRevenueSar:  number;
  generatorFuelCostSar:   number;
  solarUtilizationPct:    number;
  gridDependencyPct:      number;

  totalCo2SavedKg:   number;
  totalCostSar:      number;
  totalSolarKwh:     number;
  totalGridKwh:      number;
  totalNetMeterSar:  number;

  recentDecisions:  DecisionLogEntry[];

  progressPct:      number;
  currentIndex:     number;
}

export interface SimulationSummary {
  intervalsRun:     number;
  hoursSimulated:   number;
  totalCo2SavedKg:  number;
  totalCostSar:     number;
  totalSolarKwh:    number;
  totalGridKwh:     number;
  totalNetMeterSar: number;
  currentMode:      Mode;
  batterySocPct:    number;
  solarFractionPct: number;
}

/** The 12 validated scenario strings the backend accepts. */
export type ScenarioName =
  | 'grid_outage' | 'grid_restore'
  | 'season_summer' | 'season_moderate' | 'season_winter' | 'season_reset'
  | 'load_spike' | 'load_restore'
  | 'cloud_cover' | 'cloud_restore'
  | 'low_battery' | 'low_battery_restore';

export interface ScenarioRequest {
  scenario: ScenarioName;
  value?:   number;
}

export interface SpeedRequest {
  speed: number;   // 1–20
}

// ── Envelopes returned by simulation endpoints ─────────────────────────────

export interface NextStepEnvelope {
  status:  'ok' | 'complete';
  state?:  SimulationState;
  message?: string;
}

export interface HistoryEnvelope {
  status:  'ok';
  history: SimulationState[];
}

export interface SummaryEnvelope {
  status:  'ok';
  summary: SimulationSummary;
}

export interface HealthResponse {
  status:      string;
  version:     string;
  runnerReady: boolean;
}

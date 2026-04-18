/**
 * ComponentCards.tsx — renders the top-3 recommendations for each
 * component type as selectable cards. Clicking one updates the store
 * so the downstream diagram + CAPEX reflect the chosen combination.
 */

import { useApp } from '../store/useApp';
import type {
  RankedBattery,
  RankedInverter,
  RankedPanel,
} from '../types/api';

// ── Shared styling helpers ─────────────────────────────────────────────────

const labelColor = (label: string): string => {
  if (label === 'Best value')       return '#1D9E75';
  if (label === 'Best performance') return '#BA7517';
  if (label === 'Budget option')    return '#185FA5';
  return '#6B7280';
};

function CardHeader({ label, title, price }: { label: string; title: string; price: string }) {
  return (
    <div className="rec-card__head">
      <span className="rec-card__badge" style={{ background: labelColor(label) }}>{label}</span>
      <div className="rec-card__title">{title}</div>
      <div className="rec-card__price">{price}</div>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rec-card__spec">
      <span className="rec-card__spec-label">{label}</span>
      <span className="rec-card__spec-value">{value}</span>
    </div>
  );
}

// ── Panel cards ────────────────────────────────────────────────────────────

export function PanelCards({ options }: { options: RankedPanel[] }) {
  const { state, dispatch } = useApp();
  const selectedId = state.selectedPanel?.id;

  return (
    <div className="rec-grid">
      {options.map(p => {
        const isSelected = p.id === selectedId;
        return (
          <button
            key={p.id}
            type="button"
            className={`rec-card ${isSelected ? 'rec-card--on' : ''}`}
            onClick={() => dispatch({ type: 'SELECT_PANEL', panel: p })}
          >
            <CardHeader
              label={p.recommendationLabel}
              title={`${p.brand} ${p.model}`}
              price={`${p.panelsCostSar.toLocaleString()} SAR`}
            />
            <Spec label="Power"        value={`${p.powerWp} Wp`} />
            <Spec label="Efficiency"   value={`${p.efficiencyPct}%`} />
            <Spec label="Type"         value={p.type} />
            <Spec label="Units"        value={`${p.unitsRequired} panels`} />
            <Spec label="Array size"   value={`${p.actualKwp} kWp`} />
            <Spec label="Roof area"    value={`${p.roofAreaM2} m²${p.roofLimited ? ' (capped)' : ''}`} />
            <Spec label="Warranty"     value={`${p.warrantyYears} yr`} />
          </button>
        );
      })}
    </div>
  );
}

// ── Inverter cards ─────────────────────────────────────────────────────────

export function InverterCards({ options }: { options: RankedInverter[] }) {
  const { state, dispatch } = useApp();
  const selectedId = state.selectedInverter?.id;

  return (
    <div className="rec-grid">
      {options.map(i => {
        const isSelected = i.id === selectedId;
        return (
          <button
            key={i.id}
            type="button"
            className={`rec-card ${isSelected ? 'rec-card--on' : ''}`}
            onClick={() => dispatch({ type: 'SELECT_INVERTER', inverter: i })}
          >
            <CardHeader
              label={i.recommendationLabel}
              title={`${i.brand} ${i.model}`}
              price={`${i.inverterCostSar.toLocaleString()} SAR`}
            />
            <Spec label="Unit capacity" value={`${i.capacityKw} kW`} />
            <Spec label="Efficiency"    value={`${i.efficiencyPct}%`} />
            <Spec label="Type"          value={i.type} />
            <Spec label="Units"         value={`${i.unitsRequired}`} />
            <Spec label="Total output"  value={`${i.actualKw} kW`} />
            <Spec label="Warranty"      value={`${i.warrantyYears} yr`} />
          </button>
        );
      })}
    </div>
  );
}

// ── Battery cards ──────────────────────────────────────────────────────────

export function BatteryCards({ options }: { options: RankedBattery[] }) {
  const { state, dispatch } = useApp();
  const selectedId = state.selectedBattery?.id;

  return (
    <div className="rec-grid">
      {options.map(b => {
        const isSelected = b.id === selectedId;
        return (
          <button
            key={b.id}
            type="button"
            className={`rec-card ${isSelected ? 'rec-card--on' : ''}`}
            onClick={() => dispatch({ type: 'SELECT_BATTERY', battery: b })}
          >
            <CardHeader
              label={b.recommendationLabel}
              title={`${b.brand} ${b.model}`}
              price={`${b.batteryCostSar.toLocaleString()} SAR`}
            />
            <Spec label="Unit capacity" value={`${b.capacityKwh} kWh`} />
            <Spec label="Chemistry"     value={b.chemistry} />
            <Spec label="Cycle life"    value={`${b.cycleLife.toLocaleString()}`} />
            <Spec label="DoD"           value={`${b.dodPct}%`} />
            <Spec label="Units"         value={`${b.unitsRequired}`} />
            <Spec label="Total energy"  value={`${b.actualKwh} kWh`} />
            <Spec label="Warranty"      value={`${b.warrantyYears} yr`} />
          </button>
        );
      })}
    </div>
  );
}

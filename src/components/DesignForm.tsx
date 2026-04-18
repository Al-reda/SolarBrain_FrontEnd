/**
 * DesignForm.tsx — Layer 1 input form.
 *
 * Switches fields based on userType:
 *   - facility:    peak load, operating hours, building size
 *   - farm:        pump power, pump hours/day
 *   - residential: AC units, roof area (on_grid only enforced)
 *
 * Off-grid (not residential) unlocks the optional generator block.
 * Submit → POST /api/Design via typed client → dispatch DESIGN_SUCCESS.
 */

import { useState } from 'react';
import { useApp } from '../store/useApp';
import { submitDesign } from '../api/client';
import type {
  FacilityProfile,
  GridScenario,
  RegionKey,
  UserType,
} from '../types/api';

const USER_TYPES: { value: UserType; label: string; hint: string }[] = [
  { value: 'facility',    label: 'Industrial Facility', hint: 'Factory, warehouse, data center' },
  { value: 'farm',        label: 'Agricultural Farm',   hint: 'Pumps, irrigation, livestock' },
  { value: 'residential', label: 'Residential Home',    hint: 'Villa or apartment block' },
];

const REGIONS: { value: RegionKey; label: string; ghi: number }[] = [
  { value: 'eastern', label: 'Eastern Region — Jubail, Dammam, Dhahran, Al Khobar', ghi: 5.9 },
  { value: 'central', label: 'Central Region — Riyadh, Hail, Buraydah',              ghi: 6.2 },
  { value: 'western', label: 'Western Region — Yanbu, Jeddah, Medina, Mecca',         ghi: 5.8 },
];

export function DesignForm() {
  const { state, dispatch } = useApp();
  const form = state.formValues;
  const [localErr, setLocalErr] = useState<string | null>(null);

  // Helper — update one form field with type safety
  function update<K extends keyof FacilityProfile>(key: K, value: FacilityProfile[K]) {
    dispatch({ type: 'SET_FORM', form: { [key]: value } as Partial<FacilityProfile> });
  }

  // Residential is on-grid only — enforce invariant
  function onUserTypeChange(ut: UserType) {
    const patch: Partial<FacilityProfile> = { userType: ut };
    if (ut === 'residential') {
      patch.gridScenario = 'on_grid';
      patch.hasGenerator = false;
    }
    dispatch({ type: 'SET_FORM', form: patch });
  }

  function onGridScenarioChange(gs: GridScenario) {
    const patch: Partial<FacilityProfile> = { gridScenario: gs };
    if (gs === 'on_grid') patch.hasGenerator = false;
    dispatch({ type: 'SET_FORM', form: patch });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalErr(null);

    if (!form.monthlyBillSar || form.monthlyBillSar < 100) {
      setLocalErr('Monthly bill must be at least 100 SAR.');
      return;
    }

    try {
      dispatch({ type: 'DESIGN_START' });
      const resp = await submitDesign(form);
      dispatch({ type: 'DESIGN_SUCCESS', design: resp.systemDesign });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Unknown error — is the API running?';
      dispatch({ type: 'DESIGN_ERROR', error: msg });
    }
  }

  const isResidential = form.userType === 'residential';
  const offGrid       = form.gridScenario === 'off_grid';

  return (
    <form onSubmit={onSubmit} className="form-grid">
      {/* ── Section 1 — Identity ───────────────────────────── */}
      <div className="form-section">
        <label className="form-section__title">User type</label>
        <div className="form-radios">
          {USER_TYPES.map(u => (
            <label key={u.value} className={`radio-card ${form.userType === u.value ? 'radio-card--on' : ''}`}>
              <input
                type="radio"
                name="userType"
                checked={form.userType === u.value}
                onChange={() => onUserTypeChange(u.value)}
              />
              <div>
                <div className="radio-card__title">{u.label}</div>
                <div className="radio-card__hint">{u.hint}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* ── Section 2 — Location ───────────────────────────── */}
      <div className="form-section">
        <label className="form-section__title">Region (Saudi Arabia)</label>
        <select
          className="form-input"
          value={form.region}
          onChange={e => update('region', e.target.value as RegionKey)}
        >
          {REGIONS.map(r => (
            <option key={r.value} value={r.value}>
              {r.label}  ·  GHI {r.ghi} kWh/m²/day
            </option>
          ))}
        </select>
      </div>

      {/* ── Section 3 — Grid scenario ──────────────────────── */}
      <div className="form-section">
        <label className="form-section__title">Grid scenario</label>
        <div className="form-toggle">
          <button
            type="button"
            className={form.gridScenario === 'on_grid' ? 'toggle toggle--on' : 'toggle'}
            onClick={() => onGridScenarioChange('on_grid')}
          >
            On-grid
          </button>
          <button
            type="button"
            className={form.gridScenario === 'off_grid' ? 'toggle toggle--on' : 'toggle'}
            onClick={() => onGridScenarioChange('off_grid')}
            disabled={isResidential}
            title={isResidential ? 'Residential must be on-grid in Saudi Arabia' : undefined}
          >
            Off-grid{isResidential && ' (residential forced on-grid)'}
          </button>
        </div>
      </div>

      {/* ── Section 4 — Monthly bill + critical load ─────── */}
      <div className="form-grid-2">
        <div className="form-section">
          <label className="form-section__title">Monthly electricity bill (SAR)</label>
          <input
            className="form-input"
            type="number" min={100} step={100}
            value={form.monthlyBillSar}
            onChange={e => update('monthlyBillSar', Number(e.target.value))}
          />
        </div>
        <div className="form-section">
          <label className="form-section__title">Critical load %</label>
          <input
            className="form-input"
            type="number" min={5} max={80} step={5}
            value={form.criticalLoadPct ?? 30}
            onChange={e => update('criticalLoadPct', Number(e.target.value))}
          />
        </div>
      </div>

      {/* ── Section 5 — User-type-specific fields ────────── */}
      {form.userType === 'facility' && (
        <div className="form-grid-2">
          <div className="form-section">
            <label className="form-section__title">Peak load (kW)</label>
            <input
              className="form-input"
              type="number" min={5} step={5}
              value={form.peakLoadKw ?? ''}
              onChange={e => update('peakLoadKw', Number(e.target.value) || undefined)}
            />
          </div>
          <div className="form-section">
            <label className="form-section__title">Operating hours / day</label>
            <input
              className="form-input"
              type="number" min={1} max={24}
              value={form.operatingHours ?? 14}
              onChange={e => update('operatingHours', Number(e.target.value))}
            />
          </div>
        </div>
      )}

      {form.userType === 'farm' && (
        <div className="form-grid-2">
          <div className="form-section">
            <label className="form-section__title">Pump total power (kW)</label>
            <input
              className="form-input"
              type="number" min={1} step={1}
              value={form.pumpPowerKw ?? ''}
              onChange={e => update('pumpPowerKw', Number(e.target.value) || undefined)}
            />
          </div>
          <div className="form-section">
            <label className="form-section__title">Pump hours / day</label>
            <input
              className="form-input"
              type="number" min={1} max={24}
              value={form.pumpHoursDay ?? 8}
              onChange={e => update('pumpHoursDay', Number(e.target.value))}
            />
          </div>
        </div>
      )}

      {form.userType === 'residential' && (
        <div className="form-grid-2">
          <div className="form-section">
            <label className="form-section__title">Number of AC units</label>
            <input
              className="form-input"
              type="number" min={0} max={20}
              value={form.acUnits ?? ''}
              onChange={e => update('acUnits', Number(e.target.value) || undefined)}
            />
          </div>
          <div className="form-section">
            <label className="form-section__title">Roof area available (m²)</label>
            <input
              className="form-input"
              type="number" min={10} step={10}
              value={form.roofAreaM2 ?? ''}
              onChange={e => update('roofAreaM2', Number(e.target.value) || undefined)}
            />
          </div>
        </div>
      )}

      {/* ── Section 6 — Off-grid generator block ─────────── */}
      {offGrid && !isResidential && (
        <div className="form-section form-block--accent">
          <label className="form-check">
            <input
              type="checkbox"
              checked={form.hasGenerator ?? false}
              onChange={e => update('hasGenerator', e.target.checked)}
            />
            <span>Include diesel backup generator</span>
          </label>
          {form.hasGenerator && (
            <div style={{ marginTop: 12 }}>
              <label className="form-section__title">Generator kVA (0 = auto-size)</label>
              <input
                className="form-input"
                type="number" min={0} step={5}
                value={form.generatorKva ?? 0}
                onChange={e => update('generatorKva', Number(e.target.value))}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Submit ──────────────────────────────────────── */}
      <div className="form-submit">
        {localErr         && <p className="err">⚠ {localErr}</p>}
        {state.designError && <p className="err">⚠ {state.designError}</p>}
        <button
          type="submit"
          className="btn btn--green"
          disabled={state.designLoading}
        >
          {state.designLoading ? 'Sizing system…' : 'Generate System Design'}
        </button>
      </div>
    </form>
  );
}

/**
 * DesignForm.tsx — compact single-screen form, with i18n.
 *
 * Grid layout:
 *   Row 1 (full width)           User type selector (3 segmented pills)
 *   Row 2 (2 cols)               Region  |  Grid scenario
 *   Row 3 (3 cols, user-specific Monthly bill  |  Primary metric  |  Critical %
 *          fields on 3rd row for              (peak kW / pump kW / AC count)
 *          each user type)
 *   Row 4 (2 cols, conditional)  Secondary metric  |  (optional generator)
 *   Submit button
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../store/useApp';
import { submitDesign } from '../api/client';
import type {
  FacilityProfile,
  GridScenario,
  RegionKey,
  UserType,
} from '../types/api';

const USER_TYPE_KEYS: UserType[] = ['facility', 'farm', 'residential'];
const REGION_GHI: Record<RegionKey, number> = {
  eastern: 5.9,
  central: 6.2,
  western: 5.8,
};

export function DesignForm() {
  const { t } = useTranslation();
  const { state, dispatch } = useApp();
  const form = state.formValues;
  const [localErr, setLocalErr] = useState<string | null>(null);

  function update<K extends keyof FacilityProfile>(key: K, value: FacilityProfile[K]) {
    dispatch({ type: 'SET_FORM', form: { [key]: value } as Partial<FacilityProfile> });
  }

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
      setLocalErr(t('form.billTooLow'));
      return;
    }
    try {
      dispatch({ type: 'DESIGN_START' });
      const resp = await submitDesign(form);
      dispatch({ type: 'DESIGN_SUCCESS', design: resp.systemDesign });
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('form.apiUnreachable');
      dispatch({ type: 'DESIGN_ERROR', error: msg });
    }
  }

  const isResidential = form.userType === 'residential';
  const offGrid = form.gridScenario === 'off_grid';

  return (
    <form onSubmit={onSubmit} className="design-form">
      {/* Row 1 — User type pills */}
      <Field label={t('form.userTypeLabel')}>
        <div className="seg">
          {USER_TYPE_KEYS.map(ut => (
            <button
              key={ut}
              type="button"
              className={`seg-pill ${form.userType === ut ? 'seg-pill--on' : ''}`}
              onClick={() => onUserTypeChange(ut)}
            >
              {t(`userType.${ut}`)}
            </button>
          ))}
        </div>
      </Field>

      {/* Row 2 — Region + Grid */}
      <div className="row row-2">
        <Field label={t('form.regionLabel')}>
          <select
            className="input"
            value={form.region}
            onChange={e => update('region', e.target.value as RegionKey)}
          >
            {(['eastern', 'central', 'western'] as RegionKey[]).map(r => (
              <option key={r} value={r}>
                {t(`region.${r}`)} · GHI {REGION_GHI[r]}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t('form.gridLabel')}>
          <div className="seg seg--compact">
            <button
              type="button"
              className={`seg-pill ${form.gridScenario === 'on_grid' ? 'seg-pill--on' : ''}`}
              onClick={() => onGridScenarioChange('on_grid')}
            >
              {t('form.onGrid')}
            </button>
            <button
              type="button"
              className={`seg-pill ${form.gridScenario === 'off_grid' ? 'seg-pill--on' : ''}`}
              onClick={() => onGridScenarioChange('off_grid')}
              disabled={isResidential}
              title={isResidential ? t('form.residentialMustBeOnGrid') : undefined}
            >
              {t('form.offGrid')}
            </button>
          </div>
        </Field>
      </div>

      {/* Row 3 — Bill + primary user-type metric + critical % */}
      <div className="row row-3">
        <Field label={t('form.monthlyBillLabel')}>
          <input
            className="input"
            type="number" min={100} step={100}
            value={form.monthlyBillSar}
            onChange={e => update('monthlyBillSar', Number(e.target.value))}
          />
        </Field>

        {form.userType === 'facility' && (
          <Field label={t('form.peakLoadLabel')}>
            <input
              className="input"
              type="number" min={5} step={5}
              value={form.peakLoadKw ?? ''}
              onChange={e => update('peakLoadKw', Number(e.target.value) || undefined)}
            />
          </Field>
        )}
        {form.userType === 'farm' && (
          <Field label={t('form.pumpPowerLabel')}>
            <input
              className="input"
              type="number" min={1} step={1}
              value={form.pumpPowerKw ?? ''}
              onChange={e => update('pumpPowerKw', Number(e.target.value) || undefined)}
            />
          </Field>
        )}
        {form.userType === 'residential' && (
          <Field label={t('form.acUnitsLabel')}>
            <input
              className="input"
              type="number" min={0} max={20}
              value={form.acUnits ?? ''}
              onChange={e => update('acUnits', Number(e.target.value) || undefined)}
            />
          </Field>
        )}

        <Field label={t('form.criticalPctLabel')}>
          <input
            className="input"
            type="number" min={5} max={80} step={5}
            value={form.criticalLoadPct ?? 30}
            onChange={e => update('criticalLoadPct', Number(e.target.value))}
          />
        </Field>
      </div>

      {/* Row 4 — Secondary user-type metric + optional generator */}
      <div className="row row-2">
        {form.userType === 'facility' && (
          <Field label={t('form.operatingHrsLabel')}>
            <input
              className="input"
              type="number" min={1} max={24}
              value={form.operatingHours ?? 14}
              onChange={e => update('operatingHours', Number(e.target.value))}
            />
          </Field>
        )}
        {form.userType === 'farm' && (
          <Field label={t('form.pumpHrsLabel')}>
            <input
              className="input"
              type="number" min={1} max={24}
              value={form.pumpHoursDay ?? 8}
              onChange={e => update('pumpHoursDay', Number(e.target.value))}
            />
          </Field>
        )}
        {form.userType === 'residential' && (
          <Field label={t('form.roofAreaLabel')}>
            <input
              className="input"
              type="number" min={10} step={10}
              value={form.roofAreaM2 ?? ''}
              onChange={e => update('roofAreaM2', Number(e.target.value) || undefined)}
            />
          </Field>
        )}

        {offGrid && !isResidential && (
          <Field label={t('form.genLabel')}>
            <label className="inline-check">
              <input
                type="checkbox"
                checked={form.hasGenerator ?? false}
                onChange={e => update('hasGenerator', e.target.checked)}
              />
              <span>{t('form.genCheckbox')}</span>
            </label>
          </Field>
        )}
      </div>

      {/* Submit */}
      <div className="design-form__submit">
        {localErr && <span className="err">⚠ {localErr}</span>}
        {state.designError && <span className="err">⚠ {state.designError}</span>}
        <button
          type="submit"
          className="btn btn--green btn--lg"
          disabled={state.designLoading}
        >
          {state.designLoading ? t('form.submitting') : t('form.submit')}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label className="field__label">{label}</label>
      {children}
    </div>
  );
}

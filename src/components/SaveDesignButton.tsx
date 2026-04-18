/**
 * SaveDesignButton.tsx — saves the currently-loaded design for side-by-side
 * comparison. Auto-generates a short label (e.g., "Industrial · Central ·
 * On-grid · Bill 18k").
 *
 * Behavior:
 *   - Hidden/disabled if no design is loaded
 *   - If the compare slate is full (3/3), shows "Saved 3/3 — view compare"
 *     and routes to the Compare view instead of trying to save
 *   - After a successful save, flashes the label in the compare tab count
 */

import { useTranslation } from 'react-i18next';
import { useApp } from '../store/useApp';
import { MAX_SAVED } from '../store/AppContext.types';
import type { SavedDesign } from '../store/AppContext.types';

function shortLabel(s: SavedDesign): string {
  const p = s.design.profile;
  const bill = Math.round(p.monthlyBillSar / 1000);
  const grid = p.gridScenario === 'on_grid' ? 'on-grid' : 'off-grid';
  const ut   = p.userType.charAt(0).toUpperCase() + p.userType.slice(1);
  return `${ut} · ${p.regionName} · ${grid} · ${bill}k SAR`;
}

function newId(): string {
  // crypto.randomUUID exists in modern browsers; fall back to a timestamp slug
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `sb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function SaveDesignButton() {
  const { t } = useTranslation();
  const { state, dispatch } = useApp();
  const { systemDesign, selectedPanel, selectedInverter, selectedBattery, savedDesigns } = state;

  const ready = !!(systemDesign && selectedPanel && selectedInverter && selectedBattery);
  const full  = savedDesigns.length >= MAX_SAVED;

  function onClick() {
    if (full) {
      dispatch({ type: 'NAVIGATE', view: 'compare' });
      return;
    }
    if (!ready || !systemDesign) return;
    const saved: SavedDesign = {
      id:       newId(),
      label:    '',
      savedAt:  new Date().toISOString(),
      design:   systemDesign,
      panel:    selectedPanel!,
      inverter: selectedInverter!,
      battery:  selectedBattery!,
    };
    saved.label = shortLabel(saved);
    dispatch({ type: 'SAVE_DESIGN', saved });
  }

  return (
    <button
      type="button"
      className={`btn btn--ghost btn--lg ${full ? 'btn--ghost-muted' : ''}`}
      disabled={!ready}
      onClick={onClick}
    >
      <BookmarkIcon />
      {full
        ? t('compare.slateFull', { count: MAX_SAVED })
        : t('compare.saveForCompare', { count: savedDesigns.length, max: MAX_SAVED })}
    </button>
  );
}

function BookmarkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"
         style={{ marginInlineEnd: 8, verticalAlign: '-2px' }}>
      <path d="M3 1.5h8v11l-4-2.5-4 2.5v-11z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

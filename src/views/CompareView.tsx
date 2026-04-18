/**
 * CompareView.tsx — the Compare tab.
 *
 * Shows saved designs side-by-side as cards, with winner badges on the
 * best metric per column (cheapest CAPEX, fastest break-even, best ROI,
 * greenest). If nothing's saved yet, renders a friendly empty state with
 * a one-click route back to the Designer.
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../store/useApp';
import { computeWinners } from '../lib/computeWinners';
import { SavedDesignCard } from '../components/SavedDesignCard';
import { MAX_SAVED } from '../store/AppContext.types';

export function CompareView() {
  const { t } = useTranslation();
  const { state, dispatch } = useApp();
  const { savedDesigns } = state;

  const winners = useMemo(() => computeWinners(savedDesigns), [savedDesigns]);

  if (savedDesigns.length === 0) {
    return (
      <div className="view">
        <div className="view__intro">
          <h1 className="view__intro-title">{t('compare.viewTitle')}</h1>
          <p className="view__intro-sub">{t('compare.emptyBody')}</p>
        </div>
        <section className="card compare-empty">
          <div className="compare-empty__icon">☰</div>
          <h2>{t('compare.emptyTitle')}</h2>
          <p>{t('compare.emptyHint', { max: MAX_SAVED })}</p>
          <button
            className="btn btn--green btn--lg"
            onClick={() => dispatch({ type: 'NAVIGATE', view: 'design' })}
          >
            {t('compare.goDesign')}
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="view">
      <div className="view__intro view__intro--row">
        <div>
          <h1 className="view__intro-title">{t('compare.viewTitle')}</h1>
          <p className="view__intro-sub">
            {t('compare.tagline', { n: savedDesigns.length, max: MAX_SAVED })}
          </p>
        </div>
        <button
          className="btn btn--ghost"
          onClick={() => dispatch({ type: 'NAVIGATE', view: 'design' })}
        >
          ← {t('compare.backToDesign')}
        </button>
      </div>

      <div className={`compare-grid compare-grid--${savedDesigns.length}`}>
        {savedDesigns.map((s, i) => (
          <SavedDesignCard
            key={s.id}
            saved={s}
            winners={winners}
            position={i + 1}
          />
        ))}
      </div>
    </div>
  );
}

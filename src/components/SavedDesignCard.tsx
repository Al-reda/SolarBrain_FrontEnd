/**
 * SavedDesignCard.tsx — one column in the Compare view.
 *
 * Shows the full vital-stats picture of a saved design:
 *   - Label + saved timestamp + remove (X)
 *   - Metric rows with gold "winner" badges where applicable
 *   - Component specs (panel / inverter / battery)
 *   - Profile summary (user type, region, grid scenario, bill)
 *   - Load button (makes this design the current one in the Designer)
 */

import { useTranslation } from 'react-i18next';
import { useApp } from '../store/useApp';
import type { SavedDesign } from '../store/AppContext.types';
import type { Winners, WinnerMetric } from '../lib/computeWinners';
import { computeCo2Year1Kg, computeRoi10Pct } from '../lib/computeWinners';

interface Props {
  saved:    SavedDesign;
  winners:  Winners;
  position: number;  // 1-based column index, for the A / B / C letter
}

export function SavedDesignCard({ saved, winners, position }: Props) {
  const { t, i18n } = useTranslation();
  const { dispatch } = useApp();
  const d = saved.design;
  const p = d.profile;
  const f = d.financials;
  const c = d.capexBreakdown;

  const co2Y1 = computeCo2Year1Kg(saved);
  const roi10 = computeRoi10Pct(saved);
  const beStr = f.breakEvenYear != null ? `${t('compare.year')} ${f.breakEvenYear}` : t('compare.noBreakEven');

  function isWinner(m: WinnerMetric): boolean {
    return winners[m] === saved.id;
  }

  function loadDesign()   { dispatch({ type: 'LOAD_SAVED_DESIGN',   id: saved.id }); }
  function removeDesign() { dispatch({ type: 'REMOVE_SAVED_DESIGN', id: saved.id }); }

  const savedDate = new Date(saved.savedAt).toLocaleDateString(
    i18n.language === 'ar' ? 'ar-SA' : 'en-US',
    { year: 'numeric', month: 'short', day: 'numeric' },
  );

  return (
    <article className="compare-card">
      <header className="compare-card__header">
        <div className="compare-card__letter">{String.fromCharCode(64 + position)}</div>
        <div className="compare-card__title-col">
          <div className="compare-card__label">{saved.label}</div>
          <div className="compare-card__date">{t('compare.savedOn')} {savedDate}</div>
        </div>
        <button
          type="button"
          className="compare-card__remove"
          onClick={removeDesign}
          aria-label={t('compare.removeDesign')}
          title={t('compare.removeDesign')}
        >×</button>
      </header>

      {/* ── Key metrics ─────────────────────────────────── */}
      <dl className="compare-card__metrics">
        <MetricRow
          label={t('compare.capex')}
          value={`${c.totalSar.toLocaleString()} SAR`}
          winner={isWinner('capex')}
          winnerLabel={t('compare.bestCapex')}
        />
        <MetricRow
          label={t('compare.breakEven')}
          value={beStr}
          winner={isWinner('breakEven')}
          winnerLabel={t('compare.fastestPayback')}
        />
        <MetricRow
          label={t('compare.net10y')}
          value={`${f.net10yrBenefitSar.toLocaleString()} SAR`}
          winner={isWinner('roi')}
          winnerLabel={t('compare.bestRoi', { pct: roi10.toFixed(0) })}
        />
        <MetricRow
          label={t('compare.co2Y1')}
          value={`${co2Y1.toLocaleString(undefined, { maximumFractionDigits: 0 })} kg`}
          winner={isWinner('co2')}
          winnerLabel={t('compare.greenest')}
        />
      </dl>

      {/* ── Components ───────────────────────────────────── */}
      <div className="compare-card__section">
        <div className="compare-card__section-title">{t('compare.componentsTitle')}</div>
        <div className="compare-card__spec">
          <span className="compare-card__spec-label">{t('compare.panel')}</span>
          <span className="compare-card__spec-value">{saved.panel.brand} {saved.panel.model}</span>
        </div>
        <div className="compare-card__spec">
          <span className="compare-card__spec-label">{t('compare.inverter')}</span>
          <span className="compare-card__spec-value">{saved.inverter.brand} {saved.inverter.model}</span>
        </div>
        <div className="compare-card__spec">
          <span className="compare-card__spec-label">{t('compare.battery')}</span>
          <span className="compare-card__spec-value">{saved.battery.brand} {saved.battery.model}</span>
        </div>
        <div className="compare-card__spec">
          <span className="compare-card__spec-label">{t('compare.pvArray')}</span>
          <span className="compare-card__spec-value">{saved.panel.actualKwp.toFixed(1)} kWp</span>
        </div>
      </div>

      {/* ── Profile ──────────────────────────────────────── */}
      <div className="compare-card__section">
        <div className="compare-card__section-title">{t('compare.profileTitle')}</div>
        <div className="compare-card__spec">
          <span className="compare-card__spec-label">{t('stat.region')}</span>
          <span className="compare-card__spec-value">{p.regionName}</span>
        </div>
        <div className="compare-card__spec">
          <span className="compare-card__spec-label">{t('form.gridLabel')}</span>
          <span className="compare-card__spec-value">
            {p.gridScenario === 'on_grid' ? t('form.onGrid') : t('form.offGrid')}
          </span>
        </div>
        <div className="compare-card__spec">
          <span className="compare-card__spec-label">{t('stat.peakLoad')}</span>
          <span className="compare-card__spec-value">{p.peakLoadKw.toFixed(0)} kW</span>
        </div>
        <div className="compare-card__spec">
          <span className="compare-card__spec-label">{t('form.monthlyBillLabel')}</span>
          <span className="compare-card__spec-value">{p.monthlyBillSar.toLocaleString()} SAR</span>
        </div>
      </div>

      <div className="compare-card__footer">
        <button type="button" className="btn btn--amber" onClick={loadDesign}>
          {t('compare.loadDesign')} →
        </button>
      </div>
    </article>
  );
}

function MetricRow({ label, value, winner, winnerLabel }:
  { label: string; value: string; winner: boolean; winnerLabel: string }) {
  return (
    <div className={`compare-card__metric ${winner ? 'compare-card__metric--win' : ''}`}>
      <dt>{label}</dt>
      <dd>
        <span className="compare-card__metric-value">{value}</span>
        {winner && <span className="compare-card__winner-badge">★ {winnerLabel}</span>}
      </dd>
    </div>
  );
}

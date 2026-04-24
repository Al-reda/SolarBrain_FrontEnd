/**
 * SimDataLogger.tsx — data logger for simulation. Shows tick count
 * and a "Download CSV" button that exports the full simulation history
 * as a timestamped CSV file for analysis in Excel / Google Sheets.
 */

import { useTranslation } from 'react-i18next';
import type { SimulationState } from '../types/api';

interface Props { history: SimulationState[] }

export function SimDataLogger({ history }: Props) {
  const { t } = useTranslation();
  const count = history.length;

  function downloadCsv() {
    if (count === 0) return;

    const headers = [
      'Timestamp', 'Hour', 'Season', 'Interval',
      'Mode', 'Mode Description',
      'Solar kW', 'Load kW', 'PV Output kW',
      'Battery Discharge kW', 'Battery Charge kW', 'Battery SOC %',
      'Grid Import kW', 'Grid Export kW', 'Grid Available',
      'Generator kW',
      'Cost SAR', 'CO2 Saved kg',
      'Net Metering Revenue SAR', 'Generator Fuel Cost SAR',
      'Solar Utilization %', 'Grid Dependency %',
      'Cumulative Cost SAR', 'Cumulative CO2 Saved kg',
    ];

    const rows = history.map(s => [
      s.timestamp, s.hour, s.season, s.interval,
      s.mode, `"${s.modeDescription}"`,
      s.solarKw.toFixed(2), s.loadKw.toFixed(2), s.pvOutputKw.toFixed(2),
      s.batteryDischargeKw.toFixed(2), s.batteryChargeKw.toFixed(2), s.batterySocPct.toFixed(1),
      s.gridKw.toFixed(2), s.gridExportKw.toFixed(2), s.gridAvailable ? 1 : 0,
      s.generatorKw.toFixed(2),
      s.costSar.toFixed(2), s.co2SavedKg.toFixed(2),
      s.netMeteringRevenueSar.toFixed(2), s.generatorFuelCostSar.toFixed(2),
      s.solarUtilizationPct.toFixed(1), s.gridDependencyPct.toFixed(1),
      s.totalCostSar.toFixed(2), s.totalCo2SavedKg.toFixed(2),
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solarbrain-sim-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="data-logger">
      <div className="data-logger__info">
        <div className="data-logger__stat">
          <span className="data-logger__label">{t('sim.loggedTicks')}</span>
          <span className="data-logger__value">{count}</span>
        </div>
        <div className="data-logger__stat">
          <span className="data-logger__label">{t('sim.simTime')}</span>
          <span className="data-logger__value">{(count * 15 / 60).toFixed(1)} hrs</span>
        </div>
        <div className="data-logger__stat">
          <span className="data-logger__label">{t('sim.columns')}</span>
          <span className="data-logger__value">24</span>
        </div>
      </div>
      <button
        type="button"
        className="btn btn--green"
        onClick={downloadCsv}
        disabled={count === 0}
      >
        ⬇ {t('sim.downloadLog')} ({count} {t('sim.rows')})
      </button>
    </div>
  );
}

/**
 * DataLogger.tsx — exports simulation history as a downloadable CSV file.
 * Accumulates all ticks from the session and lets the user download
 * a structured log with timestamps, energy flows, costs, and decisions.
 */

import { useTranslation } from 'react-i18next';
import type { SimulationState } from '../types/api';

interface Props { history: SimulationState[] }

const CSV_COLUMNS = [
  'timestamp', 'hour', 'season', 'interval', 'mode',
  'solar_kw', 'load_kw', 'battery_discharge_kw', 'battery_charge_kw',
  'grid_import_kw', 'grid_export_kw', 'generator_kw',
  'battery_soc_pct', 'grid_available',
  'cost_sar', 'co2_saved_kg', 'net_metering_sar',
  'solar_utilization_pct', 'grid_dependency_pct',
  'total_cost_sar', 'total_co2_saved_kg', 'total_solar_kwh', 'total_grid_kwh',
];

function toCsvRow(s: SimulationState): string {
  return [
    s.timestamp, s.hour, s.season, s.interval, s.mode,
    s.solarKw.toFixed(2), s.loadKw.toFixed(2),
    s.batteryDischargeKw.toFixed(2), s.batteryChargeKw.toFixed(2),
    s.gridKw.toFixed(2), s.gridExportKw.toFixed(2), s.generatorKw.toFixed(2),
    s.batterySocPct.toFixed(1), s.gridAvailable ? 1 : 0,
    s.costSar.toFixed(2), s.co2SavedKg.toFixed(2), s.netMeteringRevenueSar.toFixed(2),
    s.solarUtilizationPct.toFixed(1), s.gridDependencyPct.toFixed(1),
    s.totalCostSar.toFixed(2), s.totalCo2SavedKg.toFixed(2),
    s.totalSolarKwh.toFixed(2), s.totalGridKwh.toFixed(2),
  ].join(',');
}

export function DataLogger({ history }: Props) {
  const { t } = useTranslation();

  function handleExport() {
    if (history.length === 0) return;
    const header = CSV_COLUMNS.join(',');
    const rows = history.map(toCsvRow);
    const csv = [header, ...rows].join('\n');
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
        <span className="data-logger__count">{history.length}</span>
        <span className="data-logger__label">{t('sim.loggedTicks')}</span>
        <span className="data-logger__cols">{CSV_COLUMNS.length} {t('sim.columns')}</span>
      </div>
      <button
        type="button"
        className="btn btn--green btn--sm"
        onClick={handleExport}
        disabled={history.length === 0}
      >
        ⬇ {t('sim.exportCsv')}
      </button>
    </div>
  );
}

/**
 * Kpis.tsx — financial summary cards + CAPEX breakdown + maintenance estimate + break-even.
 */

import type { CapexBreakdown, FinancialModel, GeneratorSpec, UserType } from '../types/api';

const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

export function Kpis({
  capex,
  financials,
  generator,
  userType,
}: {
  capex:      CapexBreakdown;
  financials: FinancialModel;
  generator:  GeneratorSpec | null;
  userType?:  UserType;
}) {
  const beText = financials.breakEvenYear
    ? `Year ${financials.breakEvenYear}`
    : 'Beyond 10 years';

  // Maintenance estimate — only for facilities and farms
  const showMaintenance = userType === 'facility' || userType === 'farm';
  const annualCleaningPct = 0.5;       // 0.5% of panel cost
  const annualInspectionPct = 0.3;     // 0.3% of total system
  const inverterReservePct = 2.0;      // 2% of inverter cost (replacement fund)
  const batteryMonitoringPct = 0.5;    // 0.5% of battery cost

  const cleaningCost = capex.panelsSar * (annualCleaningPct / 100);
  const inspectionCost = capex.totalSar * (annualInspectionPct / 100);
  const inverterReserve = capex.inverterSar * (inverterReservePct / 100);
  const batteryMonitoring = capex.batterySar * (batteryMonitoringPct / 100);
  const totalMaintenance = cleaningCost + inspectionCost + inverterReserve + batteryMonitoring;

  return (
    <div className="kpis">
      <div className="kpi-row">
        <KpiCard label="Total CAPEX"     value={`${fmt(capex.totalSar)} SAR`} />
        <KpiCard label="Monthly savings" value={`${fmt(financials.monthlySavingsSar)} SAR`} accent="green" />
        <KpiCard label="10-year savings" value={`${fmt(financials.year10SavingsSar)} SAR`} accent="green" />
        <KpiCard label="Break-even"       value={beText} accent={financials.breakEvenYear ? 'amber' : 'muted'} />
      </div>

      <div className="capex-breakdown">
        <h4 className="capex-breakdown__title">CAPEX breakdown</h4>
        <Row label="Panels"            value={capex.panelsSar} />
        <Row label="Inverter(s)"       value={capex.inverterSar} />
        <Row label="Battery"           value={capex.batterySar} />
        <Row label="Protection"        value={capex.protectionSar} />
        <Row label="Mounting + cable"  value={capex.bosSar} />
        <Row label="Total" value={capex.totalSar} bold />
      </div>

      {showMaintenance && totalMaintenance > 0 && (
        <div className="capex-breakdown">
          <h4 className="capex-breakdown__title">Estimated annual maintenance (OPEX)</h4>
          <Row label="Panel cleaning (biannual)"        value={cleaningCost} />
          <Row label="System inspection"                value={inspectionCost} />
          {capex.inverterSar > 0 && (
            <Row label="Inverter replacement reserve"   value={inverterReserve} />
          )}
          {capex.batterySar > 0 && (
            <Row label="Battery monitoring"             value={batteryMonitoring} />
          )}
          <Row label="Total annual maintenance" value={totalMaintenance} bold />
          <div className="capex-row" style={{ color: '#6B7280', fontSize: 11, fontStyle: 'italic', borderBottom: 'none', paddingTop: 6 }}>
            <span>≈ {((totalMaintenance / capex.totalSar) * 100).toFixed(1)}% of CAPEX per year</span>
            <span>{fmt(Math.round(totalMaintenance / 12))} SAR/month</span>
          </div>
        </div>
      )}

      {generator && (
        <div className="gen-block">
          <h4 className="capex-breakdown__title">Diesel generator</h4>
          <Row label="Rating"            value={`${generator.kva} kVA / ${generator.kwOutput} kW`} />
          <Row label="Fuel consumption"  value={`${generator.fuelConsumptionLph} L/h`} />
          <Row label="Est. annual OPEX"  value={`${fmt(generator.estimatedAnnualCostSar)} SAR`} />
        </div>
      )}
    </div>
  );
}

function KpiCard({
  label, value, accent,
}: { label: string; value: string; accent?: 'green' | 'amber' | 'muted' }) {
  return (
    <div className={`kpi-card ${accent ? `kpi-card--${accent}` : ''}`}>
      <div className="kpi-card__label">{label}</div>
      <div className="kpi-card__value">{value}</div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: number | string; bold?: boolean }) {
  const display = typeof value === 'number' ? `${fmt(value)} SAR` : value;
  return (
    <div className={`capex-row ${bold ? 'capex-row--bold' : ''}`}>
      <span>{label}</span>
      <span>{display}</span>
    </div>
  );
}

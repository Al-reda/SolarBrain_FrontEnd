/**
 * Kpis.tsx — financial summary cards + CAPEX breakdown + break-even callout.
 */

import type { CapexBreakdown, FinancialModel, GeneratorSpec } from '../types/api';

const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

export function Kpis({
  capex,
  financials,
  generator,
}: {
  capex:      CapexBreakdown;
  financials: FinancialModel;
  generator:  GeneratorSpec | null;
}) {
  const beText = financials.breakEvenYear
    ? `Year ${financials.breakEvenYear}`
    : 'Beyond 10 years';

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

// ── internal helpers ───────────────────────────────────────────────────────

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

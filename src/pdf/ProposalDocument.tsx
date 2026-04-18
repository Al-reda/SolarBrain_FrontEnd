/**
 * ProposalDocument.tsx — the PDF body.
 *
 * Takes a fully-resolved SystemDesign (with selected panel / inverter /
 * battery) and renders a 3-page branded proposal:
 *   Page 1 — Cover + facility summary + key metrics at a glance
 *   Page 2 — System design (sizing, components)
 *   Page 3 — Financials + environmental impact
 *
 * PDF always in English (demo scope). Arabic version can be added later by
 * embedding Tajawal TTF with Font.register().
 */

// Explicit React import so this file works under both the Vite automatic
// JSX runtime AND tsx's classic transform (used by our Node smoke test).
import React from 'react';
void React; // keep in scope for tsx classic-transform; harmless in browser build
import { Document, Page, Text, View } from '@react-pdf/renderer';
import type {
  SystemDesign, RankedBattery, RankedInverter, RankedPanel,
} from '../types/api';
import { styles, BRAND } from './pdfStyles';

interface ProposalProps {
  design:   SystemDesign;
  panel:    RankedPanel;
  inverter: RankedInverter;
  battery:  RankedBattery;
  date?:    string;
}

// ── Formatters ──────────────────────────────────────────────────────────

function fmtSAR(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' SAR';
}
function fmt(n: number, digits = 1): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: digits });
}
function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Environmental impact ────────────────────────────────────────────────
// FinancialYear doesn't carry CO2, so we compute it from productionKwh.
// Saudi grid carbon intensity ~0.6 kg CO₂/kWh (K.A.CARE / IEA approx).
const CO2_PER_KWH = 0.6;
function co2Kg(productionKwh: number): number { return productionKwh * CO2_PER_KWH; }

/** Rough translations for storytelling:
 *   1 tree absorbs ~21 kg CO₂/year
 *   1 Hajj round-trip flight ~ 1,800 kg CO₂
 *   1 car off road for a year ~ 4,600 kg CO₂
 */
function impactStats(co2KgYear: number) {
  return {
    trees:       Math.round(co2KgYear / 21),
    hajjFlights: Math.round(co2KgYear / 1800),
    cars:        Math.round(co2KgYear / 4600),
  };
}

export function ProposalDocument({ design, panel, inverter, battery, date }: ProposalProps) {
  const today = date ?? new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const p = design.profile;
  const r = design.requirements;
  const c = design.capexBreakdown;
  const f = design.financials;
  const g = design.generator;

  // Derived financials
  const breakEvenStr = f.breakEvenYear != null ? `Year ${f.breakEvenYear}` : '> 10 yrs';
  const netSavings10 = f.net10yrBenefitSar;                      // after CAPEX
  const roiPct10 = c.totalSar > 0 ? (netSavings10 / c.totalSar) * 100 : 0;

  // Environmental (from grid-offset production)
  const co2Year1  = f.yearlyData[0]   ? co2Kg(f.yearlyData[0].productionKwh)   : 0;
  const co2TenYr  = f.yearlyData.reduce((a, y) => a + co2Kg(y.productionKwh), 0);
  const impact    = impactStats(co2Year1);

  return (
    <Document
      title={`SolarBrain Proposal — ${capitalise(p.userType)} ${p.regionName}`}
      author="SolarBrain"
      subject="Hybrid solar + battery + grid system proposal"
    >
      {/* ═══════════════════════════════════════════════════════════
          PAGE 1 — COVER
      ═══════════════════════════════════════════════════════════ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverBar} />

        <Text style={styles.eyebrow}>Solar System Proposal</Text>
        <Text style={styles.coverTitle}>
          Hybrid energy for{'\n'}
          <Text style={styles.coverTitleAccent}>your {p.userType}.</Text>
        </Text>
        <Text style={styles.coverSub}>
          A complete PV + battery + grid system design for your facility in{' '}
          {p.regionName}. Engineered for Saudi Arabian climate, tuned for SEC
          tariffs, and ready for Vision 2030.
        </Text>

        <View style={styles.facilityCard}>
          <View style={styles.facilityRow}>
            <Text style={styles.facilityLabel}>Prepared for</Text>
            <Text style={styles.facilityValue}>
              {capitalise(p.userType)}, {p.regionName}
            </Text>
          </View>
          <View style={styles.facilityRow}>
            <Text style={styles.facilityLabel}>Grid scenario</Text>
            <Text style={styles.facilityValue}>
              {p.gridScenario === 'on_grid' ? 'On-grid' : 'Off-grid'}
            </Text>
          </View>
          <View style={styles.facilityRow}>
            <Text style={styles.facilityLabel}>Current monthly bill</Text>
            <Text style={styles.facilityValue}>{fmtSAR(p.monthlyBillSar)}</Text>
          </View>
          <View style={styles.facilityRow}>
            <Text style={styles.facilityLabel}>Peak load</Text>
            <Text style={styles.facilityValue}>{fmt(p.peakLoadKw)} kW</Text>
          </View>
          <View style={styles.facilityRow}>
            <Text style={styles.facilityLabel}>Date</Text>
            <Text style={styles.facilityValue}>{today}</Text>
          </View>
        </View>

        {/* Headline KPIs */}
        <View style={styles.kpiStrip}>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Total CAPEX</Text>
            <Text style={styles.kpiValue}>{fmtSAR(c.totalSar)}</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Break-even</Text>
            <Text style={styles.kpiValue}>{breakEvenStr}</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>10-yr net savings</Text>
            <Text style={styles.kpiValue}>{fmtSAR(netSavings10)}</Text>
          </View>
        </View>

        <Footer pageNumber={1} />
      </Page>

      {/* ═══════════════════════════════════════════════════════════
          PAGE 2 — SYSTEM DESIGN
      ═══════════════════════════════════════════════════════════ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>System design</Text>
            <Text style={styles.sectionNumber}>01 · SIZING</Text>
          </View>

          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableRowHead]}>
              <Text style={[styles.tableCell, styles.tableCellBold]}>Parameter</Text>
              <Text style={[styles.tableCellR, styles.tableCellBold]}>Value</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Tier</Text>
              <Text style={styles.tableCellR}>Tier {p.tier}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Daily load</Text>
              <Text style={styles.tableCellR}>{fmt(p.dailyLoadKwh)} kWh</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Regional GHI</Text>
              <Text style={styles.tableCellR}>{fmt(p.ghi)} kWh/m²/day</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>PV array required</Text>
              <Text style={styles.tableCellR}>{fmt(r.pvKwpRequired)} kWp</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Battery storage required</Text>
              <Text style={styles.tableCellR}>{fmt(r.batteryKwhRequired)} kWh</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Inverter capacity required</Text>
              <Text style={styles.tableCellR}>{fmt(r.inverterKwRequired)} kW</Text>
            </View>
            <View style={[styles.tableRow, styles.tableRowLast]}>
              <Text style={styles.tableCell}>Autonomy hours</Text>
              <Text style={styles.tableCellR}>{fmt(r.autonomyHours, 0)} h</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Selected components</Text>
            <Text style={styles.sectionNumber}>02 · EQUIPMENT</Text>
          </View>

          <ComponentCard
            tag="Solar panel"
            title={`${panel.brand} ${panel.model}`}
            metaLeft={`${panel.unitsRequired} units × ${panel.powerWp} W · ${fmt(panel.actualKwp)} kWp total`}
            metaRight={fmtSAR(panel.panelsCostSar)}
          />
          <ComponentCard
            tag="Inverter"
            title={`${inverter.brand} ${inverter.model}`}
            metaLeft={`${inverter.unitsRequired} units × ${inverter.capacityKw} kW · ${fmt(inverter.efficiencyPct)}% eff.`}
            metaRight={fmtSAR(inverter.inverterCostSar)}
          />
          <ComponentCard
            tag="Battery"
            title={`${battery.brand} ${battery.model}`}
            metaLeft={`${battery.unitsRequired} units × ${battery.capacityKwh} kWh · ${battery.chemistry}`}
            metaRight={fmtSAR(battery.batteryCostSar)}
          />

          {g && (
            <ComponentCard
              tag="Backup generator"
              title={`Diesel ${g.kva} kVA`}
              metaLeft={`${g.kwOutput} kW output · ${g.fuelConsumptionLph} L/h`}
              metaRight={`${fmt(g.estimatedAnnualCostSar, 0)} SAR/yr`}
            />
          )}
        </View>

        <Footer pageNumber={2} />
      </Page>

      {/* ═══════════════════════════════════════════════════════════
          PAGE 3 — FINANCIALS + IMPACT
      ═══════════════════════════════════════════════════════════ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>CAPEX breakdown</Text>
            <Text style={styles.sectionNumber}>03 · INVESTMENT</Text>
          </View>

          <View style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Solar panels</Text>
              <Text style={styles.tableCellR}>{fmtSAR(c.panelsSar)}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Inverter</Text>
              <Text style={styles.tableCellR}>{fmtSAR(c.inverterSar)}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Battery</Text>
              <Text style={styles.tableCellR}>{fmtSAR(c.batterySar)}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Protection &amp; safety</Text>
              <Text style={styles.tableCellR}>{fmtSAR(c.protectionSar)}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Balance of system</Text>
              <Text style={styles.tableCellR}>{fmtSAR(c.bosSar)}</Text>
            </View>
            <View style={[styles.tableRow, styles.tableRowTotal]}>
              <Text style={[styles.tableCell, styles.tableCellBold]}>Total CAPEX</Text>
              <Text style={[styles.tableCellR, styles.tableCellBold]}>{fmtSAR(c.totalSar)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>10-year projection</Text>
            <Text style={styles.sectionNumber}>04 · RETURNS</Text>
          </View>

          <View style={styles.kpiStrip}>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>Break-even</Text>
              <Text style={styles.kpiValue}>{breakEvenStr}</Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>Net savings</Text>
              <Text style={styles.kpiValue}>{fmtSAR(netSavings10)}</Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>ROI</Text>
              <Text style={styles.kpiValue}>{fmt(roiPct10, 0)}%</Text>
            </View>
          </View>

          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableRowHead]}>
              <Text style={[styles.tableCell, styles.tableCellBold]}>Year</Text>
              <Text style={[styles.tableCellR, styles.tableCellBold]}>Annual savings</Text>
              <Text style={[styles.tableCellR, styles.tableCellBold]}>Cumulative net</Text>
            </View>
            {f.yearlyData.map((y, i) => {
              const cumulativeNet = y.cumulativeSavingsSar - c.totalSar;
              return (
                <View
                  key={y.year}
                  style={[styles.tableRow, i === f.yearlyData.length - 1 ? styles.tableRowLast : {}]}
                >
                  <Text style={styles.tableCell}>Year {y.year}</Text>
                  <Text style={styles.tableCellR}>{fmtSAR(y.totalSavingsSar)}</Text>
                  <Text
                    style={[styles.tableCellR, cumulativeNet > 0 ? styles.tableCellBold : styles.tableCellDim]}
                  >
                    {fmtSAR(cumulativeNet)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <Footer pageNumber={3} />
      </Page>

      {/* ═══════════════════════════════════════════════════════════
          PAGE 4 — ENVIRONMENTAL IMPACT
      ═══════════════════════════════════════════════════════════ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Environmental impact</Text>
            <Text style={styles.sectionNumber}>05 · PLANET</Text>
          </View>

          <View style={styles.kpiStrip}>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>CO₂ avoided / yr</Text>
              <Text style={styles.kpiValue}>{fmt(co2Year1, 0)} kg</Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>CO₂ over 10 yr</Text>
              <Text style={styles.kpiValue}>{fmt(co2TenYr / 1000, 1)} t</Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>≈ Trees planted</Text>
              <Text style={styles.kpiValue}>{impact.trees.toLocaleString()}</Text>
            </View>
          </View>

          <Text style={{ fontSize: 10, color: BRAND.dim, marginTop: 4, lineHeight: 1.5 }}>
            In year one alone, this system avoids the same CO₂ emissions as{' '}
            <Text style={{ fontFamily: 'Helvetica-Bold', color: BRAND.text }}>
              {impact.trees.toLocaleString()} newly-planted trees absorbing carbon for a year
            </Text>
            , roughly equivalent to taking {impact.cars.toLocaleString()} cars off
            the road or offsetting {impact.hajjFlights.toLocaleString()}{' '}
            round-trip Hajj flights.
          </Text>
        </View>

        <Footer pageNumber={4} />
      </Page>
    </Document>
  );
}

/* ============================================================
   Sub-components
============================================================ */

interface CompCardProps {
  tag:       string;
  title:     string;
  metaLeft:  string;
  metaRight: string;
}
function ComponentCard({ tag, title, metaLeft, metaRight }: CompCardProps) {
  return (
    <View style={styles.componentCard}>
      <Text style={styles.componentTag}>{tag}</Text>
      <Text style={styles.componentTitle}>{title}</Text>
      <View style={styles.componentMetaRow}>
        <Text style={styles.componentMeta}>{metaLeft}</Text>
        <Text style={styles.componentMetaVal}>{metaRight}</Text>
      </View>
    </View>
  );
}

function Footer({ pageNumber }: { pageNumber: number }) {
  return (
    <View style={styles.footer} fixed>
      <Text>
        <Text style={styles.footerBrand}>SolarBrain</Text>
        {' · '}
        <Text>Hybrid solar energy design &amp; live optimization</Text>
      </Text>
      <Text style={styles.pageNumber}>Page {pageNumber} / 4</Text>
    </View>
  );
}

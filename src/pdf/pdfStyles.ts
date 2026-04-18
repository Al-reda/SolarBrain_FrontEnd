/**
 * pdfStyles.ts — earth-toned styles for the ProposalDocument.
 * All styles live in a single StyleSheet.create() call so TypeScript
 * knows every key statically.
 */

import { StyleSheet } from '@react-pdf/renderer';

export const BRAND = {
  navy:   '#0A1520',
  dark:   '#14212E',
  ink:    '#1C2B3A',
  sand:   '#E2B88F',
  gold:   '#C8932E',
  goldDk: '#A8771F',
  cream:  '#F5EEE0',
  oasis:  '#3D6B4E',
  bg:     '#FAF7F1',
  border: '#E4DFD3',
  muted:  '#F5F1E8',
  text:   '#14212E',
  dim:    '#6E6B62',
};

export const styles = StyleSheet.create({
  page: {
    paddingTop:    54,
    paddingBottom: 54,
    paddingLeft:   48,
    paddingRight:  48,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: BRAND.text,
    backgroundColor: '#FFFFFF',
  },

  /* Cover */
  coverBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0, height: 6,
    backgroundColor: BRAND.gold,
  },
  eyebrow: {
    fontSize: 8,
    letterSpacing: 3,
    color: BRAND.gold,
    textTransform: 'uppercase',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 18,
  },
  coverTitle: {
    fontSize: 32,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.navy,
    lineHeight: 1.1,
    marginBottom: 6,
  },
  coverTitleAccent: { color: BRAND.gold },
  coverSub: {
    fontSize: 11,
    color: BRAND.dim,
    marginBottom: 38,
    maxWidth: 400,
    lineHeight: 1.5,
  },

  /* Sections */
  section: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: BRAND.border,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.navy,
  },
  sectionNumber: {
    fontSize: 9,
    color: BRAND.dim,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
  },

  /* Facility summary card (on cover) */
  facilityCard: {
    backgroundColor: BRAND.muted,
    borderRadius: 6,
    padding: 18,
    borderLeftWidth: 3,
    borderLeftColor: BRAND.gold,
  },
  facilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  facilityLabel: { fontSize: 10, color: BRAND.dim },
  facilityValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: BRAND.text },

  /* Key-metric strip */
  kpiStrip: { flexDirection: 'row', gap: 10, marginVertical: 14 },
  kpiBox: {
    flex: 1,
    backgroundColor: BRAND.muted,
    padding: 10,
    borderRadius: 4,
  },
  kpiLabel: {
    fontSize: 8,
    color: BRAND.dim,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 15,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.navy,
  },
  kpiUnit: { fontSize: 9, color: BRAND.dim, marginLeft: 3 },

  /* Tables */
  table: { borderWidth: 0.5, borderColor: BRAND.border, borderRadius: 4, marginTop: 6 },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: BRAND.border,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  tableRowLast:  { borderBottomWidth: 0 },
  tableRowHead:  { backgroundColor: BRAND.muted },
  tableRowTotal: { backgroundColor: '#FCF6E5', borderBottomWidth: 0 },
  tableCell:     { fontSize: 9.5, color: BRAND.text, flex: 1 },
  tableCellR:    { fontSize: 9.5, color: BRAND.text, flex: 1, textAlign: 'right' },
  tableCellBold: { fontFamily: 'Helvetica-Bold' },
  tableCellDim:  { color: BRAND.dim },

  /* Component spec card */
  componentCard: {
    padding: 12,
    backgroundColor: BRAND.muted,
    borderRadius: 4,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: BRAND.oasis,
  },
  componentTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.navy,
    marginBottom: 4,
  },
  componentTag: {
    fontSize: 8,
    color: BRAND.oasis,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  componentMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  componentMeta:    { fontSize: 9, color: BRAND.dim },
  componentMetaVal: { fontSize: 9, color: BRAND.text, fontFamily: 'Helvetica-Bold' },

  /* Footer */
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    borderTopWidth: 0.5,
    borderTopColor: BRAND.border,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: BRAND.dim,
  },
  footerBrand: { fontFamily: 'Helvetica-Bold', color: BRAND.navy, fontSize: 8 },
  pageNumber:  { fontSize: 8, color: BRAND.dim },
});

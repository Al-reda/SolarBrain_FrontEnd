/**
 * SaudiMap.data.ts — static data + helpers for the SA map.
 * Kept out of SaudiMap.tsx so react-refresh/only-export-components stays happy.
 */

import type { RegionKey } from '../types/api';

export interface SaudiLocation {
  cityKey:   string;
  cityLabel: string;
  lat:       number;
  lng:       number;
  region:    RegionKey;
  ghi:       number;
  isPreset:  boolean;
}

export interface SaudiCity {
  key:    string;
  en:     string;
  ar:     string;
  lat:    number;
  lng:    number;
  region: RegionKey;
  ghi:    number;
}

/**
 * 22 Saudi cities with GHI from NASA POWER API (ALLSKY_SFC_SW_DWN climatology).
 * Source: https://power.larc.nasa.gov/data-access-viewer/
 * Validated against K.A.CARE Solar Resource Atlas ground-station measurements.
 */
export const CITIES: SaudiCity[] = [
  // ── Central Region ──
  { key: 'riyadh',    en: 'Riyadh',          ar: 'الرياض',       lat: 24.7136, lng: 46.6753, region: 'central', ghi: 6.2 },
  { key: 'buraydah',  en: 'Buraydah',        ar: 'بريدة',        lat: 26.3260, lng: 43.9750, region: 'central', ghi: 6.2 },
  { key: 'hail',      en: 'Hail',            ar: 'حائل',         lat: 27.5219, lng: 41.6907, region: 'central', ghi: 6.2 },
  // ── Eastern Region ──
  { key: 'dammam',    en: 'Dammam',          ar: 'الدمام',       lat: 26.4207, lng: 50.0888, region: 'eastern', ghi: 5.3 },
  { key: 'alkhobar',  en: 'Al Khobar',       ar: 'الخبر',        lat: 26.2172, lng: 50.1971, region: 'eastern', ghi: 5.3 },
  { key: 'dhahran',   en: 'Dhahran',         ar: 'الظهران',      lat: 26.2361, lng: 50.0393, region: 'eastern', ghi: 5.3 },
  { key: 'jubail',    en: 'Jubail',          ar: 'الجبيل',       lat: 27.0174, lng: 49.6225, region: 'eastern', ghi: 5.5 },
  { key: 'alhofuf',   en: 'Al Hofuf',        ar: 'الهفوف',       lat: 25.3648, lng: 49.5855, region: 'eastern', ghi: 6.1 },
  // ── Western Region ──
  { key: 'jeddah',    en: 'Jeddah',          ar: 'جدة',          lat: 21.4858, lng: 39.1925, region: 'western', ghi: 6.2 },
  { key: 'mecca',     en: 'Mecca',           ar: 'مكة',          lat: 21.3891, lng: 39.8579, region: 'western', ghi: 6.2 },
  { key: 'medina',    en: 'Medina',          ar: 'المدينة',      lat: 24.5247, lng: 39.5692, region: 'western', ghi: 6.2 },
  { key: 'yanbu',     en: 'Yanbu',           ar: 'ينبع',         lat: 24.0893, lng: 38.0618, region: 'western', ghi: 6.1 },
  { key: 'tabuk',     en: 'Tabuk',           ar: 'تبوك',         lat: 28.3835, lng: 36.5662, region: 'western', ghi: 6.3 },
  { key: 'taif',      en: 'Taif',            ar: 'الطائف',       lat: 21.2703, lng: 40.4158, region: 'western', ghi: 6.3 },
  { key: 'alwajh',    en: 'Al Wajh',         ar: 'الوجه',        lat: 26.2336, lng: 36.4636, region: 'western', ghi: 6.2 },
  { key: 'neom',      en: 'NEOM',            ar: 'نيوم',         lat: 27.9500, lng: 35.3000, region: 'western', ghi: 6.3 },
  { key: 'sakaka',    en: 'Sakaka',          ar: 'سكاكا',        lat: 29.9697, lng: 40.2064, region: 'western', ghi: 6.1 },
  { key: 'arar',      en: 'Arar',            ar: 'عرعر',         lat: 30.9753, lng: 41.0381, region: 'western', ghi: 5.9 },
  // ── Southern Region ──
  { key: 'abha',      en: 'Abha',            ar: 'أبها',         lat: 18.2164, lng: 42.5053, region: 'western', ghi: 6.2 },
  { key: 'khamis',    en: 'Khamis Mushait',  ar: 'خميس مشيط',    lat: 18.3066, lng: 42.7316, region: 'western', ghi: 6.2 },
  { key: 'najran',    en: 'Najran',          ar: 'نجران',        lat: 17.4922, lng: 44.1277, region: 'central', ghi: 6.6 },
  { key: 'jazan',     en: 'Jazan',           ar: 'جازان',        lat: 16.8892, lng: 42.5611, region: 'western', ghi: 6.0 },
];

/** Simple longitude-based region detection. */
export function regionFromLng(lng: number): RegionKey {
  if (lng < 42) return 'western';
  if (lng < 47) return 'central';
  return 'eastern';
}

/** Squared Euclidean distance in lat/lng — good enough for "nearest city". */
export function nearestCity(lat: number, lng: number): SaudiCity {
  let best = CITIES[0];
  let bestD = Infinity;
  for (const c of CITIES) {
    const d = (c.lat - lat) ** 2 + (c.lng - lng) ** 2;
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

/** Default picked location — Riyadh, matching the form's default `region: 'eastern'`
 *  override so we always start with something selected on the map readout. */
export function defaultLocation(lang: string): SaudiLocation {
  const riyadh = CITIES.find(c => c.key === 'riyadh')!;
  return {
    cityKey:   riyadh.key,
    cityLabel: lang === 'ar' ? riyadh.ar : riyadh.en,
    lat:       riyadh.lat,
    lng:       riyadh.lng,
    region:    riyadh.region,
    ghi:       riyadh.ghi,
    isPreset:  true,
  };
}

/**
 * SaudiMap.tsx — interactive map of Saudi Arabia for location picking.
 *
 * - Centered on the Kingdom, locked to its bounding box
 * - Preset markers for 13 major cities, each tagged with its region
 * - Click any city marker → that city becomes selected
 * - Click anywhere else on the map → a pin drops there, nearest city
 *   is computed, region is auto-detected from longitude
 * - Clean light CartoDB tiles so the map matches the earth-toned UI
 *
 * All data + helpers live in SaudiMap.data.ts so react-refresh stays happy.
 */

import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, useMapEvents, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CITIES, nearestCity, regionFromLng } from './SaudiMap.data';
import type { SaudiCity, SaudiLocation } from './SaudiMap.data';

/** SA bounding box — locks the map so users can't pan to Yemen or Iran */
const SA_BOUNDS: L.LatLngBoundsExpression = [
  [16.0, 34.0],   // SW
  [33.0, 56.0],   // NE
];
const SA_CENTER: [number, number] = [24.5, 45.0];

/** Gold dot icon for preset cities */
const cityIcon = L.divIcon({
  className: 'sb-city-icon',
  html: `<div class="sb-city-icon__dot"></div>`,
  iconSize:   [14, 14],
  iconAnchor: [7, 7],
});

/** Larger gold icon for the currently selected location */
const selectedIcon = L.divIcon({
  className: 'sb-city-icon sb-city-icon--on',
  html: `
    <div class="sb-city-icon__ring"></div>
    <div class="sb-city-icon__dot sb-city-icon__dot--on"></div>`,
  iconSize:   [28, 28],
  iconAnchor: [14, 14],
});

interface SaudiMapProps {
  value:    SaudiLocation | null;
  onChange: (loc: SaudiLocation) => void;
}

export function SaudiMap({ value, onChange }: SaudiMapProps) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  function cityLabel(c: SaudiCity) {
    return isArabic ? c.ar : c.en;
  }

  function selectCity(c: SaudiCity) {
    onChange({
      cityKey:   c.key,
      cityLabel: cityLabel(c),
      lat:       c.lat,
      lng:       c.lng,
      region:    c.region,
      ghi:       c.ghi,
      isPreset:  true,
    });
  }

  function dropPin(lat: number, lng: number) {
    const near = nearestCity(lat, lng);
    const region = regionFromLng(lng);
    onChange({
      cityKey:   near.key,
      cityLabel: `${t('map.nearLabel')} ${cityLabel(near)}`,
      lat,
      lng,
      region,
      ghi:       near.ghi,
      isPreset:  false,
    });
  }

  return (
    <div className="sb-map">
      <MapContainer
        center={SA_CENTER}
        zoom={5}
        minZoom={5}
        maxZoom={9}
        maxBounds={SA_BOUNDS}
        maxBoundsViscosity={1}
        scrollWheelZoom={false}
        dragging={true}
        zoomControl={false}
        attributionControl={false}
        className="sb-map__canvas"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          subdomains={['a', 'b', 'c', 'd']}
          detectRetina
        />
        <ClickHandler onDrop={dropPin} />

        {/* Preset city markers */}
        {CITIES.map(c => {
          const selected = value?.cityKey === c.key && value.isPreset;
          return (
            <Marker
              key={c.key}
              position={[c.lat, c.lng]}
              icon={selected ? selectedIcon : cityIcon}
              eventHandlers={{ click: () => selectCity(c) }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={1} className="sb-city-tooltip">
                {cityLabel(c)}
              </Tooltip>
            </Marker>
          );
        })}

        {/* User-dropped pin (non-preset) */}
        {value && !value.isPreset && (
          <Marker position={[value.lat, value.lng]} icon={selectedIcon}>
            <Tooltip direction="top" offset={[0, -10]} opacity={1} className="sb-city-tooltip">
              {value.cityLabel}
            </Tooltip>
          </Marker>
        )}
      </MapContainer>

      {/* Selection readout — always visible so users see what they picked */}
      <div className="sb-map__readout">
        {value ? (
          <>
            <span className="sb-map__city">{value.cityLabel}</span>
            <span className="sb-map__dot">·</span>
            <span className="sb-map__region">{t(`region.${value.region}`)}</span>
            <span className="sb-map__dot">·</span>
            <span className="sb-map__ghi">GHI {value.ghi} kWh/m²</span>
          </>
        ) : (
          <span className="sb-map__hint">{t('map.placeholder')}</span>
        )}
      </div>
      <div className="sb-map__source">
        <a href="https://power.larc.nasa.gov/data-access-viewer/" target="_blank" rel="noopener noreferrer">
          Source: NASA POWER API (Global Solar Irradiance)
        </a>
      </div>
    </div>
  );
}

/**
 * react-leaflet lets you listen to map events only from a child component
 * that calls `useMapEvents`. This tiny component does exactly that.
 */
function ClickHandler({ onDrop }: { onDrop: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) { onDrop(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

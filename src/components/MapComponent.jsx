import { useEffect, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { statusMeta, formatWhen, activeCount, isLive } from '../utils/games';
import { SportIcon } from './SportIcons';
import { MdNearMe } from 'react-icons/md';

const userLocationIcon = L.divIcon({
  className: "",
  html: '<div class="pulsing-dot" style="--dot-color: #1ca10d; --dot-shadow: rgba(28,161,13,0.6); --dot-shadow-end: rgba(28,161,13,0); --dot-spread: 30px;"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Minimal circular marker: the sport's line icon on a clean white chip, with a
// blinking red "live" badge when the game is underway.
function gameMarkerIcon(game) {
  const live = isLive(game);
  const iconSvg = renderToStaticMarkup(
    <SportIcon sport={game.sport} size={20} color="#111827" />
  );
  return L.divIcon({
    className: '',
    html: `
      <div class="game-marker-min">
        <div class="game-marker-min-chip">${iconSvg}</div>
        ${live ? '<span class="game-marker-live" title="Live now"></span>' : ''}
      </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });
}

// The card shown when a marker is clicked — mirrors the feed's game card.
function GamePopupCard({ game }) {
  const meta = statusMeta(game);
  const live = isLive(game);
  return (
    <div style={{ minWidth: 200, fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 16, textTransform: 'capitalize', color: '#1A1A1A' }}>
          <SportIcon sport={game.sport} size={18} color="#111827" />
          {game.sport}
        </strong>
        {live ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              background: '#FDE6E6',
              color: '#C81E1E',
              padding: '2px 8px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            <span className="game-marker-live" style={{ position: 'static', width: 8, height: 8, border: 'none' }} />
            LIVE
          </span>
        ) : (
          <span style={{ background: meta.bg, color: meta.color, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
            {meta.label}
          </span>
        )}
      </div>

      {game.description && (
        <p style={{ margin: '6px 0 0', color: '#555', fontSize: 13, lineHeight: 1.4 }}>
          {game.description}
        </p>
      )}

      <div style={{ marginTop: 8, fontSize: 13, color: '#444', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span>📍 {game.location}</span>
        <span>{formatWhen(game.start_time)}</span>
        <span>{activeCount(game)} / {game.max_players} players</span>
      </div>
    </div>
  );
}

const defaultPosition = [51.505, -0.09];

// The range slider maps a viewing radius (miles) to a zoom level: a wider range
// zooms out, a tighter range zooms in. Base 16 makes 5 mi land on zoom 14.
function zoomForRadius(radiusMiles) {
  return Math.max(10, Math.min(16, Math.round(16 - Math.log2(radiusMiles))));
}
const DEFAULT_RADIUS = 5;
const DEFAULT_ZOOM = zoomForRadius(DEFAULT_RADIUS); // 14

// Roughly converts a mile radius into a lat/lng bounding box around a center point
function getBoundsForRadius(center, radiusMiles) {
  const [lat, lng] = center;
  const milesPerDegreeLat = 69;
  const milesPerDegreeLng = 69 * Math.cos((lat * Math.PI) / 180);
  const latDelta = radiusMiles / milesPerDegreeLat;
  const lngDelta = radiusMiles / milesPerDegreeLng;
  return [
    [lat - latDelta, lng - lngDelta],
    [lat + latDelta, lng + lngDelta],
  ];
}

function MapRefSetter({ mapRef }) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);
  return null;
}

/**
 * Renders the discovery map. Games are passed in from the parent (PostsPage) so
 * the list and the map always show the same data. Each game with valid
 * coordinates becomes a marker.
 */
export default function MapComponent({
  games = [],
  height = '500px',
  userPosition = null,
  radiusMiles = DEFAULT_RADIUS,
  onRadiusChange,
}) {
  const mapRef = useRef(null);
  const hasCenteredOnUser = useRef(false);

  // Once we have both the map instance AND the user's position, snap to it (one time)
  useEffect(() => {
    if (userPosition && mapRef.current && !hasCenteredOnUser.current) {
      mapRef.current.setView(userPosition, zoomForRadius(radiusMiles));
      hasCenteredOnUser.current = true;
    }
  }, [userPosition, radiusMiles]);

  // Keep the map's bounds locked to the chosen radius around the user
  useEffect(() => {
    const center = userPosition || defaultPosition;
    if (mapRef.current) {
      const bounds = getBoundsForRadius(center, radiusMiles);
      mapRef.current.setMaxBounds(bounds);
    }
  }, [userPosition, radiusMiles]);

  function handleRecenter() {
    if (mapRef.current && userPosition) {
      mapRef.current.setView(userPosition, zoomForRadius(radiusMiles));
    }
  }

  // Slider drives both the pannable range (maxBounds, via the effect above) and
  // the zoom level: wider range → zoom out, tighter range → zoom in.
  function handleRangeChange(e) {
    const r = Number(e.target.value);
    onRadiusChange?.(r);
    if (mapRef.current) {
      mapRef.current.setZoom(zoomForRadius(r));
    }
  }

  const gamesWithCoords = games.filter(
    (g) => typeof g.latitude === 'number' && typeof g.longitude === 'number'
  );

  return (
    <div style={{ height, width: '100%', position: 'relative' }}>
      <MapContainer
        center={defaultPosition}
        zoom={DEFAULT_ZOOM}
        minZoom={9}
        zoomControl={false}
        scrollWheelZoom={true}
        maxBoundsViscosity={1.0}
        style={{ height: '100%', width: '100%', borderRadius: 16 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
          subdomains="abcd"
        />

        <MapRefSetter mapRef={mapRef} />

        {userPosition && (
          <Marker position={userPosition} icon={userLocationIcon}>
            <Popup>You are here</Popup>
          </Marker>
        )}

        {gamesWithCoords.map((game) => (
          <Marker key={game._id} position={[game.latitude, game.longitude]} icon={gameMarkerIcon(game)}>
            <Popup>
              <GamePopupCard game={game} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Recenter — a single navigation-arrow button */}
      <button
        onClick={handleRecenter}
        title="Recenter on my location"
        aria-label="Recenter on my location"
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 1000,
          width: 42,
          height: 42,
          borderRadius: '50%',
          border: 'none',
          background: '#FFFFFF',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <MdNearMe size={20} color="#1F6B3E" />
      </button>

      {/* Range slider — controls how far you can see (and the zoom) */}
      <div
        style={{
          position: 'absolute',
          left: 12,
          bottom: 20,
          zIndex: 1000,
          background: '#FFFFFF',
          borderRadius: 14,
          boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: '#1F6B3E', letterSpacing: 0.3 }}>
          RANGE
        </span>
        <input
          className="map-range"
          type="range"
          min={1}
          max={25}
          step={1}
          value={radiusMiles}
          onChange={handleRangeChange}
        />
        <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', minWidth: 44, textAlign: 'right' }}>
          {radiusMiles} mi
        </span>
      </div>
    </div>
  );
}

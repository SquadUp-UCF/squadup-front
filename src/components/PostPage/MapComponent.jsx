import { useEffect, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import "./MapComponent.css";
import L from 'leaflet';
import { statusMeta, formatWhen, activeCount, isLive, resolvePhotoUrl } from '../../utils/games';
import { SportIcon } from '../SportIcons';
import { MdNearMe } from 'react-icons/md';
import { FiMapPin, FiClock, FiUsers } from 'react-icons/fi';

function sportLabel(sport) {
  return String(sport || '').replace(/-/g, ' ');
}

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

// The card shown when a marker is clicked — a compact mirror of the feed's game
// card so a pin instantly reads as the same object seen in the list.
function GamePopupCard({ game, currentUserId, onJoin, joiningId, onLeave, leavingId }) {
  const meta = statusMeta(game);
  const live = isLive(game);
  const joined = activeCount(game);
  const ratio = game.max_players > 0 ? Math.min(1, joined / game.max_players) : 0;
  const barColor = ratio >= 0.8 ? '#E4572E' : '#2F8F4E';

  const isHost = currentUserId && game.host === currentUserId;
  const alreadyIn = (game.participants || []).some(
    (p) => p.user === currentUserId && p.status === 'joined'
  );
  const joinable =
    !isHost && !alreadyIn && game.status !== 'locked' &&
    game.status !== 'completed' && game.status !== 'cancelled';
  const joining = joiningId === game._id;
  const leaving = leavingId === game._id;

  return (
    <div className="map-popup-card">
      {/* Banner image (falls back to a gradient + sport icon, same as the
          feed card). Status/live badge floats top-left. */}
      <div
        className="map-popup-header"
        style={game.photo_url ? { backgroundImage: `url(${resolvePhotoUrl(game.photo_url)})` } : undefined}
      >
        {!game.photo_url && <SportIcon sport={game.sport} size={38} color="rgba(255,255,255,0.92)" />}
        <div className="map-popup-badge-wrap">
          {live ? (
            <span className="map-popup-live-badge">
              <span className="game-marker-live" style={{ position: 'static', width: 7, height: 7, border: 'none' }} />
              LIVE
            </span>
          ) : (
            <span
              className="map-popup-status-badge"
              style={{
                background: meta.bg,
                color: meta.color,
              }}
            >
              {meta.label}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="map-popup-body">
        {/* Sport category pill — same chip as the feed card */}
        <span
          className="map-popup-sport-pill"
          style={{
            background: meta.bg,
            color: meta.color,
          }}
        >
          <SportIcon sport={game.sport} size={14} color={meta.color} />
          {sportLabel(game.sport)}
        </span>

        {/* Location as the prominent heading */}
        <h3 className="map-popup-location">
          <FiMapPin size={16} color="#2F8F4E" className="map-popup-icon" />
          {game.location}
        </h3>

        {/* Icon + text rows */}
        <div className="map-popup-rows">
          <span className="map-popup-row">
            <FiClock size={14} color="#6B7280" className="map-popup-icon" />
            {formatWhen(game.start_time)}
          </span>
          <span className="map-popup-row-players">
            <FiUsers size={14} color="#6B7280" className="map-popup-icon" />
            {joined} / {game.max_players} players
          </span>
        </div>

        {/* Join-progress bar — mirrors the feed card */}
        <div className="map-popup-progress">
          <div
            className="map-popup-progress-fill"
            style={{
              width: `${ratio * 100}%`,
              background: barColor,
            }}
          />
        </div>

        {/* Primary CTA */}
        {!isHost && alreadyIn && onLeave && (
          <button
            disabled={leaving}
            onClick={() => onLeave(game)}
            className="game-popup-cta map-popup-cta"
            style={{ background: '#FDE6E6', color: '#C81E1E', cursor: leaving ? 'default' : 'pointer' }}
          >
            {leaving ? 'Leaving…' : "You're in — Leave"}
          </button>
        )}
        {!isHost && !alreadyIn && onJoin && (
          <button
            disabled={!joinable || joining}
            onClick={() => onJoin(game)}
            className="game-popup-cta map-popup-cta"
            style={{
              background: joinable ? '#2F8F4E' : '#E4E4E4',
              color: joinable ? '#FFFFFF' : '#999',
              cursor: joinable ? 'pointer' : 'default',
            }}
          >
            {game.status === 'locked'
              ? 'Full'
              : joining
                ? 'Joining…'
                : <>Join <span className="map-popup-arrow">→</span></>}
          </button>
        )}
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

// Leaflet caches its container's pixel size at init and never re-measures it
// on its own — when the surrounding layout resizes (compressing/expanding the
// window, or the mobile/desktop breakpoint swap remounting this component's
// wrapper), the map keeps using the stale size, which throws off panning/
// zoom math and can make it look like it's snapped to the wrong place.
// A ResizeObserver on the container calls invalidateSize() to re-measure.
function MapResizeHandler() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);
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
  currentUserId,
  onJoin,
  joiningId,
  onLeave,
  leavingId,
}) {
  const mapRef = useRef(null);
  // Starts true when userPosition is already known — MapContainer's initial
  // `center` prop above already placed it correctly, so the correction effect
  // below only needs to run when geolocation resolves *after* this mounts.
  const hasCenteredOnUser = useRef(Boolean(userPosition));

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
    <div className="map-container-wrap" style={{ height }}>
      <MapContainer
        // If the user's position is already known when this mounts (e.g. after
        // the mobile/desktop layout swap remounts this component), start there
        // directly instead of always flashing to the hardcoded London default.
        center={userPosition || defaultPosition}
        zoom={userPosition ? zoomForRadius(radiusMiles) : DEFAULT_ZOOM}
        minZoom={9}
        zoomControl={false}
        scrollWheelZoom={true}
        maxBoundsViscosity={1.0}
        className="map-leaflet"
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
          subdomains="abcd"
        />

        <MapRefSetter mapRef={mapRef} />
        <MapResizeHandler />

        {userPosition && (
          <Marker position={userPosition} icon={userLocationIcon}>
            <Popup>You are here</Popup>
          </Marker>
        )}

        {gamesWithCoords.map((game) => (
          <Marker key={game._id} position={[game.latitude, game.longitude]} icon={gameMarkerIcon(game)}>
            <Popup className="game-popup" closeButton minWidth={244} maxWidth={244}>
              <GamePopupCard
                game={game}
                currentUserId={currentUserId}
                onJoin={onJoin}
                joiningId={joiningId}
                onLeave={onLeave}
                leavingId={leavingId}
              />
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Recenter — a single navigation-arrow button */}
      <button
        onClick={handleRecenter}
        title="Recenter on my location"
        aria-label="Recenter on my location"
        className="map-recenter-btn"
      >
        <MdNearMe size={20} color="#1F6B3E" />
      </button>

      {/* Range slider — controls how far you can see (and the zoom) */}
      <div className="map-range-panel">
        <span className="map-range-label">
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
        <span className="map-range-value">
          {radiusMiles} mi
        </span>
      </div>
    </div>
  );
}

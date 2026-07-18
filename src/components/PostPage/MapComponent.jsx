import { useEffect, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import "./MapComponent.css";
import L from 'leaflet';
import {
  statusMeta,
  formatWhen,
  activeCount,
  isLive,
  resolvePhotoUrl,
  hasCustomBanner,
  UCF_CENTER,
  getBoundsForRadius,
  formatRadius,
  MIN_VIEW_RADIUS_MILES,
  MAX_VIEW_RADIUS_MILES,
  DEFAULT_VIEW_RADIUS_MILES,
} from '../../utils/games';
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
        style={hasCustomBanner(game) ? { backgroundImage: `url(${resolvePhotoUrl(game.photo_url)})` } : undefined}
      >
        {!hasCustomBanner(game) && <SportIcon sport={game.sport} size={38} color="rgba(255,255,255,0.92)" />}
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

const DEFAULT_RADIUS = DEFAULT_VIEW_RADIUS_MILES;

// The pannable area is always exactly the 5-mile UCF box — it never depends on
// the "range" slider, so it's computed once rather than re-derived on the fly.
const MAX_PAN_BOUNDS = getBoundsForRadius(UCF_CENTER, MAX_VIEW_RADIUS_MILES);

// The range slider's underlying value spans 10m-5mi, which is too wide a ratio
// for a linear control to give useful precision at the small end — a log scale
// keeps every part of the slider meaningfully draggable.
const SLIDER_STEPS = 1000;
const MIN_LOG = Math.log(MIN_VIEW_RADIUS_MILES);
const MAX_LOG = Math.log(MAX_VIEW_RADIUS_MILES);

function sliderPosForRadius(miles) {
  const t = (Math.log(miles) - MIN_LOG) / (MAX_LOG - MIN_LOG);
  return Math.round(Math.min(1, Math.max(0, t)) * SLIDER_STEPS);
}

function radiusForSliderPos(pos) {
  const t = pos / SLIDER_STEPS;
  return Math.exp(MIN_LOG + t * (MAX_LOG - MIN_LOG));
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

  // Zoom to exactly fit the chosen "range" around UCF — fitBounds asks Leaflet
  // for the precise zoom level itself, which matters a lot more now that range
  // can be as tight as 10 meters (a fixed log2-based formula couldn't keep up
  // across a 10m-5mi span). This also drives the *initial* zoom once the map
  // instance is ready, since MapRefSetter's effect (a descendant) commits
  // before this one.
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.fitBounds(getBoundsForRadius(UCF_CENTER, radiusMiles));
    }
  }, [radiusMiles]);

  function handleRecenter() {
    if (mapRef.current) {
      mapRef.current.fitBounds(getBoundsForRadius(UCF_CENTER, radiusMiles));
    }
  }

  // The pannable area is fixed at 5 miles (MAX_PAN_BOUNDS, a constant) — the
  // slider only ever changes the camera's zoom, never which games exist on
  // the map or how far you can pan.
  function handleRangeChange(e) {
    onRadiusChange?.(radiusForSliderPos(Number(e.target.value)));
  }

  const gamesWithCoords = games.filter(
    (g) => typeof g.latitude === 'number' && typeof g.longitude === 'number'
  );

  return (
    <div className="map-container-wrap" style={{ height }}>
      <MapContainer
        // Always opens locked onto UCF — never the viewer's own location.
        // Corrected precisely to DEFAULT_RADIUS by the fitBounds effect right
        // after mount; this is just a close starting guess to avoid a visible
        // zoom jump.
        center={UCF_CENTER}
        zoom={17}
        minZoom={9}
        maxZoom={20}
        // Zoom is exclusively driven by the range slider (via fitBounds) —
        // every other way to change it is turned off here.
        zoomControl={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        boxZoom={false}
        keyboard={false}
        maxBounds={MAX_PAN_BOUNDS}
        maxBoundsViscosity={1.0}
        className="map-leaflet"
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
          subdomains="abcd"
          maxZoom={20}
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
        title="Recenter on UCF"
        aria-label="Recenter on UCF"
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
          min={0}
          max={SLIDER_STEPS}
          step={1}
          value={sliderPosForRadius(radiusMiles)}
          onChange={handleRangeChange}
        />
        <span className="map-range-value">
          {formatRadius(radiusMiles)}
        </span>
      </div>
    </div>
  );
}

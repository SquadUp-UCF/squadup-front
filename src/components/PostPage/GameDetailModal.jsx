/**
 * Expanded view of a single game, opened by clicking its card in the feed.
 *
 * Shows everything the card doesn't have room for: the full description, a
 * small map centered on the pin, the roster (fetched per-participant via
 * GET /users/:id since the game document only stores participant ids), each
 * player's skill level for this sport (from the `skill_levels` map, falling
 * back to the legacy `preferred_positions`), a notifications toggle, and
 * the join/leave action.
 */
import { useEffect, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { FiMapPin, FiClock, FiUsers, FiBell, FiBellOff, FiX } from "react-icons/fi";
import "./PostGameModal.css";
import "./MapComponent.css";
import "./GameDetailModal.css";
import { SportIcon } from "../SportIcons";
import { statusMeta, formatWhen, activeCount, isLive, resolvePhotoUrl, hasCustomBanner } from "../../utils/games";

const API = import.meta.env.VITE_API_URL;
const DEVICE_TOKEN_KEY = "squadup_web_device_token";
const NOTIFICATIONS_KEY = "squadup_notifications_enabled";

function sportLabel(sport) {
  return String(sport || "").replace(/-/g, " ");
}

function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${localStorage.getItem("token")}`, ...extra };
}

const pinIconSvg = renderToStaticMarkup(<FiMapPin size={18} color="#1F6B3E" />);
const pinIcon = L.divIcon({
  className: "",
  html: `<div class="game-marker-min"><div class="game-marker-min-chip">${pinIconSvg}</div></div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
});

// A stable per-browser id so repeat "enable notifications" clicks register
// the same row (upsert) instead of piling up duplicates.
function getOrCreateDeviceToken() {
  let token = localStorage.getItem(DEVICE_TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(DEVICE_TOKEN_KEY, token);
  }
  return token;
}

function PlayerRow({ userId, isHost, sport }) {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/users/${userId}`, { headers: authHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const skill = profile?.skill_levels?.[sport] ?? profile?.preferred_positions?.[sport];

  return (
    <div className="gdm-player-row">
      <span className="gdm-player-avatar">
        {profile?.profile_picture ? (
          <img src={resolvePhotoUrl(profile.profile_picture)} alt="" />
        ) : (
          (profile?.username || "?").slice(0, 2).toUpperCase()
        )}
      </span>
      <span className="gdm-player-name">
        {profile?.username || "Loading…"}
        {isHost && <span className="gdm-player-host-badge">Host</span>}
      </span>
      {skill && <span className="gdm-player-skill">{skill}</span>}
    </div>
  );
}

export default function GameDetailModal({ game, currentUserId, onClose, onJoin, onLeave, joiningId, leavingId }) {
  const [notifsEnabled, setNotifsEnabled] = useState(
    () => localStorage.getItem(NOTIFICATIONS_KEY) === "true"
  );
  const [notifMessage, setNotifMessage] = useState("");

  const meta = statusMeta(game);
  const live = isLive(game);
  const joined = activeCount(game);
  const isHost = currentUserId && game.host === currentUserId;
  const alreadyIn = (game.participants || []).some(
    (p) => p.user === currentUserId && p.status === "joined"
  );
  const joinable =
    !isHost && !alreadyIn && game.status !== "locked" &&
    game.status !== "completed" && game.status !== "cancelled";
  const roster = (game.participants || []).filter((p) => p.status === "joined");
  const hasCoords = typeof game.latitude === "number" && typeof game.longitude === "number";

  async function handleToggleNotifications() {
    setNotifMessage("");

    if (notifsEnabled) {
      setNotifsEnabled(false);
      localStorage.setItem(NOTIFICATIONS_KEY, "false");
      return;
    }

    if (!("Notification" in window)) {
      setNotifMessage("This browser doesn't support notifications.");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setNotifMessage("Notifications were blocked — enable them in your browser settings.");
      return;
    }

    try {
      const res = await fetch(`${API}/notifications/device-token`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ token: getOrCreateDeviceToken(), platform: "web" }),
      });
      if (!res.ok) {
        setNotifMessage("Could not register this device for notifications.");
        return;
      }
      setNotifsEnabled(true);
      localStorage.setItem(NOTIFICATIONS_KEY, "true");
    } catch {
      setNotifMessage("Network error: is the API reachable?");
    }
  }

  return (
    <div onClick={onClose} className="pgm-overlay">
      <div onClick={(e) => e.stopPropagation()} className="pgm-modal gdm-modal">
        <div
          className="gdm-hero"
          style={hasCustomBanner(game) ? { backgroundImage: `url(${resolvePhotoUrl(game.photo_url)})` } : undefined}
        >
          {!hasCustomBanner(game) && (
            <span className="gdm-hero-placeholder">
              <SportIcon sport={game.sport} size={56} color="rgba(255,255,255,0.55)" />
            </span>
          )}
          <span className="gdm-hero-status" style={{ background: meta.bg, color: meta.color }}>
            {live ? "LIVE" : meta.label}
          </span>
          <button onClick={onClose} aria-label="Close" className="pgm-hero-close">
            <FiX size={18} />
          </button>
        </div>

        <div className="gdm-body">
          <span className="gdm-sport-pill">
            <SportIcon sport={game.sport} size={16} color="#1F6B3E" />
            {sportLabel(game.sport)}
          </span>

          <h3 className="gdm-location">
            <FiMapPin size={18} color="#2F8F4E" />
            {game.location}
          </h3>

          {hasCoords && (
            <div className="gdm-map-wrap">
              <MapContainer
                center={[game.latitude, game.longitude]}
                zoom={15}
                zoomControl={false}
                dragging={false}
                scrollWheelZoom={false}
                doubleClickZoom={false}
                className="gdm-map"
              >
                <TileLayer
                  attribution='&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
                  subdomains="abcd"
                />
                <Marker position={[game.latitude, game.longitude]} icon={pinIcon} />
              </MapContainer>
            </div>
          )}

          {game.description && <p className="gdm-description">{game.description}</p>}

          <div className="gdm-meta-row">
            <span className="gdm-meta-item">
              <FiClock size={15} /> {formatWhen(game.start_time)}
            </span>
            <span className="gdm-meta-item">
              <FiUsers size={15} /> {joined} / {game.max_players} players
            </span>
          </div>

          <button type="button" onClick={handleToggleNotifications} className="gdm-notif-btn">
            {notifsEnabled ? <FiBell size={16} /> : <FiBellOff size={16} />}
            {notifsEnabled ? "Notifications on" : "Enable notifications"}
          </button>
          {notifMessage && <p className="pgm-error">{notifMessage}</p>}

          <div className="gdm-roster">
            <span className="pgm-label">Players ({roster.length})</span>
            <div className="gdm-roster-list">
              {roster.map((p) => (
                <PlayerRow key={p.user} userId={p.user} isHost={p.user === game.host} sport={game.sport} />
              ))}
            </div>
          </div>

          {!isHost && alreadyIn && (
            <button
              disabled={leavingId === game._id}
              onClick={() => onLeave(game)}
              className="pgm-submit gdm-leave-btn"
            >
              {leavingId === game._id ? "Leaving…" : "You're in — Leave"}
            </button>
          )}
          {!isHost && !alreadyIn && (
            <button
              disabled={!joinable || joiningId === game._id}
              onClick={() => onJoin(game)}
              className="pgm-submit"
              style={!joinable ? { background: "#E4E4E4", color: "#999" } : undefined}
            >
              {game.status === "locked"
                ? "Full"
                : joiningId === game._id
                  ? "Joining…"
                  : "Join game"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

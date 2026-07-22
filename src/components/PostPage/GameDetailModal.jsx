/**
 * Expanded view of a single game, opened by clicking its card in the feed.
 *
 * Shows everything the card doesn't have room for: the full description, a
 * small map centered on the pin, the roster (fetched per-participant via
 * GET /users/:id since the game document only stores participant ids), each
 * player's skill level for this sport (from the `skill_levels` map), and the
 * join/leave action. Registered players open their public profile
 * (PlayerProfileModal) on click. Any joined player — not just the host — can
 * add a guest and set their own position; a guest can be removed by the host
 * or by whichever player brought them. Only the host can mark the game
 * completed (which is what makes it eligible for post-game ratings).
 */
import { useEffect, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { FiMapPin, FiClock, FiUsers, FiX, FiUserPlus, FiCheck, FiChevronRight } from "react-icons/fi";
import "./PostGameModal.css";
import "./MapComponent.css";
import "./GameDetailModal.css";
import { SportIcon } from "../SportIcons";
import PlayerProfileModal from "./PlayerProfileModal";
import { positionsForSport } from "../../utils/positions";
import { statusMeta, formatWhen, activeCount, isLive, hasStarted, resolvePhotoUrl, bannerUrl } from "../../utils/games";

const API = import.meta.env.VITE_API_URL;

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

function PlayerRow({ userId, isHost, sport, position, onOpenProfile }) {
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

  const skill = profile?.skill_levels?.[sport];

  return (
    <button
      type="button"
      onClick={() => onOpenProfile(userId)}
      className="gdm-player-row gdm-player-row--clickable"
    >
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
        {position && <span className="gdm-player-position">{position}</span>}
      </span>
      {skill && <span className="gdm-player-skill">{skill}</span>}
      <FiChevronRight size={16} className="gdm-player-chevron" />
    </button>
  );
}

// A pre-added roster entry with no linked account (`name` set instead of
// `user`) — the host can remove these; registered players leave on their own.
function GuestRow({ name, position, canRemove, onRemove, removing }) {
  return (
    <div className="gdm-player-row">
      <span className="gdm-player-avatar">{(name || "?").slice(0, 2).toUpperCase()}</span>
      <span className="gdm-player-name">
        {name}
        <span className="gdm-player-guest-badge">Guest</span>
        {position && <span className="gdm-player-position">{position}</span>}
      </span>
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          className="gdm-guest-remove"
          aria-label={`Remove ${name}`}
        >
          <FiX size={14} />
        </button>
      )}
    </div>
  );
}

export default function GameDetailModal({
  game,
  currentUserId,
  onClose,
  onJoin,
  onLeave,
  joiningId,
  leavingId,
  onUpdated = () => {},
}) {
  const [viewProfileUserId, setViewProfileUserId] = useState(null);

  const [guestName, setGuestName] = useState("");
  const [guestPosition, setGuestPosition] = useState("");
  const [addingGuest, setAddingGuest] = useState(false);
  const [guestError, setGuestError] = useState("");
  const [removingGuestIndex, setRemovingGuestIndex] = useState(null);

  const [savingPosition, setSavingPosition] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [actionError, setActionError] = useState("");

  const meta = statusMeta(game);
  const live = isLive(game);
  const joined = activeCount(game);
  const isHost = currentUserId && game.host === currentUserId;
  const isTerminal = game.status === "completed" || game.status === "cancelled";
  const alreadyIn = (game.participants || []).some(
    (p) => p.user === currentUserId && p.status === "joined"
  );
  const started = hasStarted(game);
  const joinable = !isHost && !alreadyIn && !started && game.status !== "locked" && !isTerminal;
  // Keep each entry's real index in `game.participants` (needed for
  // removeGuest, which addresses guests by roster position) even after
  // filtering down to just the joined ones for display.
  const roster = (game.participants || [])
    .map((p, index) => ({ ...p, _index: index }))
    .filter((p) => p.status === "joined");
  const myEntry = roster.find((p) => p.user === currentUserId);
  const [myPosition, setMyPosition] = useState(myEntry?.position || "");
  const hasCoords = typeof game.latitude === "number" && typeof game.longitude === "number";
  const sportPositions = positionsForSport(game.sport);

  async function handleAddGuest(e) {
    e.preventDefault();
    setGuestError("");
    if (!guestName.trim()) {
      setGuestError("Guest name is required.");
      return;
    }
    setAddingGuest(true);
    try {
      const res = await fetch(`${API}/games/${game._id}/guests`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          name: guestName.trim(),
          position: guestPosition.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
        setGuestError(msg || "Could not add guest.");
        return;
      }
      onUpdated(data);
      setGuestName("");
      setGuestPosition("");
    } catch {
      setGuestError("Network error: is the API reachable?");
    } finally {
      setAddingGuest(false);
    }
  }

  async function handleRemoveGuest(index) {
    setRemovingGuestIndex(index);
    try {
      const res = await fetch(`${API}/games/${game._id}/guests/${index}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data) onUpdated(data);
    } catch {
      // swallow — the button simply resets; a refresh will reconcile
    } finally {
      setRemovingGuestIndex(null);
    }
  }

  async function handleSavePosition() {
    setSavingPosition(true);
    setActionError("");
    try {
      const res = await fetch(`${API}/games/${game._id}/position`, {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ position: myPosition.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
        setActionError(msg || "Could not save your position.");
        return;
      }
      onUpdated(data);
    } catch {
      setActionError("Network error: is the API reachable?");
    } finally {
      setSavingPosition(false);
    }
  }

  async function handleComplete() {
    setCompleting(true);
    setActionError("");
    try {
      const res = await fetch(`${API}/games/${game._id}/complete`, {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
        setActionError(msg || "Could not mark the game as completed.");
        return;
      }
      onUpdated(data);
    } catch {
      setActionError("Network error: is the API reachable?");
    } finally {
      setCompleting(false);
    }
  }

  const banner = bannerUrl(game);

  return (
    <div onClick={onClose} className="pgm-overlay">
      <div onClick={(e) => e.stopPropagation()} className="pgm-modal gdm-modal">
        <div
          className="gdm-hero"
          style={banner ? { backgroundImage: `url(${banner})` } : undefined}
        >
          {!banner && (
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

          <div className="gdm-roster">
            <span className="pgm-label">Players ({roster.length})</span>
            <div className="gdm-roster-list">
              {roster.map((p) =>
                p.user ? (
                  <PlayerRow
                    key={p.user}
                    userId={p.user}
                    isHost={p.user === game.host}
                    sport={game.sport}
                    position={p.position}
                    onOpenProfile={setViewProfileUserId}
                  />
                ) : (
                  <GuestRow
                    key={`guest-${p._index}`}
                    name={p.name}
                    position={p.position}
                    // The host manages the whole roster; anyone else may only
                    // take back a guest they personally brought (mirrors the
                    // backend's removeGuest rule).
                    canRemove={(isHost || p.added_by === currentUserId) && !isTerminal}
                    removing={removingGuestIndex === p._index}
                    onRemove={() => handleRemoveGuest(p._index)}
                  />
                )
              )}
            </div>

            {(isHost || alreadyIn) && !isTerminal && (
              <form onSubmit={handleAddGuest} className="gdm-guest-form">
                <input
                  className="pgm-input gdm-guest-input"
                  placeholder="Guest name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                />
                {sportPositions.length > 0 && (
                  <select
                    className="pgm-input gdm-guest-input"
                    value={guestPosition}
                    onChange={(e) => setGuestPosition(e.target.value)}
                  >
                    <option value="">No position</option>
                    {sportPositions.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                )}
                <button type="submit" disabled={addingGuest} className="gdm-guest-add-btn">
                  <FiUserPlus size={14} /> {addingGuest ? "Adding…" : "Add guest"}
                </button>
              </form>
            )}
            {guestError && <p className="pgm-error">{guestError}</p>}
          </div>

          {myEntry && !isTerminal && sportPositions.length > 0 && (
            <div className="gdm-position-row">
              <span className="pgm-label">Your position</span>
              <div className="gdm-position-edit">
                <select
                  className="pgm-input gdm-position-input"
                  value={myPosition}
                  onChange={(e) => setMyPosition(e.target.value)}
                >
                  <option value="">No position</option>
                  {sportPositions.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleSavePosition}
                  disabled={savingPosition || myPosition === (myEntry.position || "")}
                  className="gdm-position-save-btn"
                >
                  <FiCheck size={14} /> {savingPosition ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          )}

          {isHost && !isTerminal && (
            <button type="button" onClick={handleComplete} disabled={completing} className="gdm-complete-btn">
              {completing ? "Marking completed…" : "Mark as completed"}
            </button>
          )}
          {actionError && <p className="pgm-error">{actionError}</p>}

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
                : started
                  ? "In progress"
                  : joiningId === game._id
                    ? "Joining…"
                    : "Join game"}
            </button>
          )}
        </div>
      </div>

      {viewProfileUserId && (
        <PlayerProfileModal userId={viewProfileUserId} onClose={() => setViewProfileUserId(null)} />
      )}
    </div>
  );
}

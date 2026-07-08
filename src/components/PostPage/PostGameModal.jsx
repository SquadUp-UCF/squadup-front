/**
 * Modal form for hosting a new game (POST /api/games).
 *
 * The game's coordinates are chosen on a map (LocationPicker) that opens on the
 * user's current position, so the host can look around nearby and drop a pin on
 * the exact spot. The host is taken from the JWT server-side, so we only send
 * game details here.
 */
import { useEffect, useState } from "react";
import "./PostGameModal.css";
import LocationPicker from "./LocationPicker";
import { availableSports } from "../SportIcons";

const API = import.meta.env.VITE_API_URL;

// Pretty label for a sport key, e.g. "table-tennis" -> "Table Tennis".
function sportLabel(key) {
  return key.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function toLocalInputValue(date) {
  // datetime-local wants "YYYY-MM-DDTHH:mm" in local time
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

// When `game` is provided the modal edits it (PATCH); otherwise it hosts a new
// one (POST). `onSaved` receives the created/updated game either way.
export default function PostGameModal({ onClose, onSaved, game = null }) {
  const isEdit = Boolean(game);
  const defaultStart = new Date(Date.now() + 60 * 60 * 1000); // one hour out

  // Sport is a dropdown of known sports plus an "Other" option that reveals a
  // free-text field. When editing, preselect the dropdown if the game's sport is
  // known, otherwise fall into "Other" with the value pre-filled.
  const knownInitial = game ? availableSports.includes((game.sport || "").toLowerCase()) : false;
  const [sportChoice, setSportChoice] = useState(
    game ? (knownInitial ? game.sport.toLowerCase() : "other") : ""
  );
  const [customSport, setCustomSport] = useState(knownInitial ? "" : game?.sport ?? "");
  const sport = sportChoice === "other" ? customSport : sportChoice;
  const [location, setLocation] = useState(game?.location ?? "");
  const [description, setDescription] = useState(game?.description ?? "");
  const [startTime, setStartTime] = useState(
    toLocalInputValue(game?.start_time ? new Date(game.start_time) : defaultStart)
  );
  const [minPlayers, setMinPlayers] = useState(game?.min_players ?? 2);
  const [maxPlayers, setMaxPlayers] = useState(game?.max_players ?? 10);
  const [userPosition, setUserPosition] = useState(null); // where the user is now
  const [picked, setPicked] = useState(
    game && typeof game.latitude === "number" ? [game.latitude, game.longitude] : null
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here = [pos.coords.latitude, pos.coords.longitude];
        setUserPosition(here);
        // Default the pin to the user's spot until they move it.
        setPicked((prev) => prev || here);
      },
      () => {}
    );
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!sport.trim() || !location.trim()) {
      setError("Sport and location are required.");
      return;
    }
    if (!picked) {
      setError("Pick the game's spot on the map.");
      return;
    }
    if (Number(minPlayers) > Number(maxPlayers)) {
      setError("Min players can't exceed max players.");
      return;
    }
    const startIso = new Date(startTime);
    if (Number.isNaN(startIso.getTime())) {
      setError("Enter a valid start time.");
      return;
    }
    // New games must start in the future; edits may touch already-started games.
    if (!isEdit && startIso.getTime() <= Date.now()) {
      setError("Start time must be in the future.");
      return;
    }

    const [latitude, longitude] = picked;

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/games${isEdit ? `/${game._id}` : ""}`, {
        method: isEdit ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          sport: sport.trim(),
          description: description.trim() || undefined,
          location: location.trim(),
          start_time: startIso.toISOString(),
          latitude,
          longitude,
          min_players: Number(minPlayers),
          max_players: Number(maxPlayers),
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
        setError(msg || (isEdit ? "Could not save changes." : "Could not create the game."));
        return;
      }

      onSaved(data);
      onClose();
    } catch (err) {
      setError("Network error: is the API reachable?");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div onClick={onClose} className="pgm-overlay">
      <div onClick={(e) => e.stopPropagation()} className="pgm-modal">
        <div className="pgm-header">
          <h2 className="pgm-title">{isEdit ? "Edit game" : "Post a game"}</h2>
          <button onClick={onClose} aria-label="Close" className="pgm-close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="pgm-form">
          <div>
            <label className="pgm-label">Sport</label>
            <select
              className="pgm-input pgm-select"
              value={sportChoice}
              onChange={(e) => setSportChoice(e.target.value)}
            >
              <option value="" disabled>
                Select a sport…
              </option>
              {availableSports.map((key) => (
                <option key={key} value={key}>
                  {sportLabel(key)}
                </option>
              ))}
              <option value="other">Other (type your own)</option>
            </select>

            {sportChoice === "other" && (
              <input
                className="pgm-input pgm-custom-sport"
                value={customSport}
                onChange={(e) => setCustomSport(e.target.value)}
                placeholder="Enter a sport"
                autoFocus
              />
            )}
          </div>

          <div>
            <label className="pgm-label">Location</label>
            <input
              className="pgm-input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. RWC Courts, UCF"
            />
          </div>

          <div>
            <label className="pgm-label">Pin the spot</label>
            <LocationPicker userPosition={userPosition} value={picked} onPick={setPicked} />
            <p className="pgm-hint">
              {picked
                ? "Tap the map or drag the pin to adjust."
                : "Tap the map to drop a pin where the game is."}
            </p>
          </div>

          <div>
            <label className="pgm-label">Description (optional)</label>
            <textarea
              className="pgm-input pgm-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Casual pickup, all levels welcome."
            />
          </div>

          <div>
            <label className="pgm-label">Start time</label>
            <input
              type="datetime-local"
              className="pgm-input"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          <div className="pgm-row">
            <div className="pgm-col">
              <label className="pgm-label">Min players</label>
              <input
                type="number"
                min={1}
                className="pgm-input"
                value={minPlayers}
                onChange={(e) => setMinPlayers(e.target.value)}
              />
            </div>
            <div className="pgm-col">
              <label className="pgm-label">Max players</label>
              <input
                type="number"
                min={1}
                className="pgm-input"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="pgm-error">{error}</p>}

          <button type="submit" disabled={submitting} className="pgm-submit">
            {submitting ? "Saving…" : isEdit ? "Save changes" : "Post game"}
          </button>
        </form>
      </div>
    </div>
  );
}

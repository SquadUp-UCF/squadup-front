/**
 * Modal form for hosting a new game (POST /api/games).
 *
 * The game's coordinates are chosen on a map (LocationPicker) that opens on the
 * user's current position, so the host can look around nearby and drop a pin on
 * the exact spot. The host is taken from the JWT server-side, so we only send
 * game details here.
 */
import { useEffect, useState } from "react";
import LocationPicker from "./LocationPicker";
import { availableSports } from "./SportIcons";

const API = import.meta.env.VITE_API_URL;

// Pretty label for a sport key, e.g. "table-tennis" -> "Table Tennis".
function sportLabel(key) {
  return key.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #D6E4D6",
  fontSize: 14,
  fontFamily: "inherit",
  boxSizing: "border-box",
};

const labelStyle = { display: "block", fontSize: 13, fontWeight: 600, color: "#1A1A1A", marginBottom: 6 };

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
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 2000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#FFFFFF",
          borderRadius: 20,
          padding: 28,
          width: "100%",
          maxWidth: 460,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 22, color: "#1A1A1A" }}>{isEdit ? "Edit game" : "Post a game"}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#888", lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>Sport</label>
            <select
              style={{ ...inputStyle, cursor: "pointer" }}
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
                style={{ ...inputStyle, marginTop: 10 }}
                value={customSport}
                onChange={(e) => setCustomSport(e.target.value)}
                placeholder="Enter a sport"
                autoFocus
              />
            )}
          </div>

          <div>
            <label style={labelStyle}>Location</label>
            <input
              style={inputStyle}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. RWC Courts, UCF"
            />
          </div>

          <div>
            <label style={labelStyle}>Pin the spot</label>
            <LocationPicker userPosition={userPosition} value={picked} onPick={setPicked} />
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "#888" }}>
              {picked
                ? "Tap the map or drag the pin to adjust."
                : "Tap the map to drop a pin where the game is."}
            </p>
          </div>

          <div>
            <label style={labelStyle}>Description (optional)</label>
            <textarea
              style={{ ...inputStyle, resize: "vertical", minHeight: 70 }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Casual pickup, all levels welcome."
            />
          </div>

          <div>
            <label style={labelStyle}>Start time</label>
            <input
              type="datetime-local"
              style={inputStyle}
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Min players</label>
              <input
                type="number"
                min={1}
                style={inputStyle}
                value={minPlayers}
                onChange={(e) => setMinPlayers(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Max players</label>
              <input
                type="number"
                min={1}
                style={inputStyle}
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(e.target.value)}
              />
            </div>
          </div>

          {error && <p style={{ margin: 0, color: "#A81B1B", fontSize: 14 }}>{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            style={{
              background: "#2F8F4E",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 12,
              padding: "12px 0",
              fontWeight: 700,
              fontSize: 15,
              cursor: submitting ? "default" : "pointer",
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? "Saving…" : isEdit ? "Save changes" : "Post game"}
          </button>
        </form>
      </div>
    </div>
  );
}

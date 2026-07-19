/**
 * Modal form for hosting/editing a game (POST or PATCH /api/games).
 *
 * Styled to read like GameDetailModal (banner up top, then sport/location/
 * description/time laid out the same way). The banner is always the sport's
 * default icon/gradient — games have no custom banner upload.
 *
 * The game's coordinates are chosen on a map (LocationPicker) that opens on
 * the user's current position, so the host can look around nearby and drop a
 * pin on the exact spot. The host is taken from the JWT server-side, so we
 * only send game details here.
 */
import { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FiMapPin, FiClock, FiUsers } from "react-icons/fi";
import "./PostGameModal.css";
import LocationPicker from "./LocationPicker";
import { SportIcon, availableSports } from "../SportIcons";
import {
  milesBetween,
  UCF_CENTER,
  MAX_GAME_CREATION_RADIUS_MILES,
  GAME_SKILL_LEVELS,
  skillLabel,
} from "../../utils/games";
import { positionsForSport } from "../../utils/positions";

const API = import.meta.env.VITE_API_URL;

// Pretty label for a sport key, e.g. "table-tennis" -> "Table Tennis".
function sportLabel(key) {
  return key.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// When `game` is provided the modal edits it (PATCH); otherwise it hosts a new
// one (POST). `onSaved` receives the created/updated game either way.

// Rounds up to the next 15-minute mark, matching the time picker's own
// `timeIntervals={15}` options — otherwise a default like "12:19" never
// matches any option in the list, so nothing shows as selected there even
// though a valid date/time IS set.
function roundUpToQuarterHour(date) {
  const rounded = new Date(date);
  rounded.setSeconds(0, 0);
  const remainder = rounded.getMinutes() % 15;
  if (remainder !== 0) {
    rounded.setMinutes(rounded.getMinutes() + (15 - remainder));
  }
  return rounded;
}

export default function PostGameModal({ onClose, onSaved, game = null }) {
  const isEdit = Boolean(game);
  const defaultStart = roundUpToQuarterHour(new Date(Date.now() + 60 * 60 * 1000)); // one hour out

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
  const [startDate, setStartDate] = useState(
    game?.start_time ? new Date(game.start_time) : defaultStart
  );
  const [minPlayers, setMinPlayers] = useState(game?.min_players ?? 2);
  const [maxPlayers, setMaxPlayers] = useState(game?.max_players ?? 10);
  const [skillLevel, setSkillLevel] = useState(game?.skill_level || "all");
  // The host's own position — only offered at creation (once a game exists,
  // any joined player including the host sets/changes their own position
  // from the game's detail view instead).
  const [hostPosition, setHostPosition] = useState("");
  const [userPosition, setUserPosition] = useState(null); // where the user is now
  const [picked, setPicked] = useState(
    game && typeof game.latitude === "number" ? [game.latitude, game.longitude] : null
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const sportPositions = positionsForSport(sport);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here = [pos.coords.latitude, pos.coords.longitude];
        setUserPosition(here);
        // Default the pin to the user's spot, but only when that's actually a
        // legal game location — games are UCF-only, so a host browsing from
        // across town/state shouldn't get a pin silently placed somewhere
        // that'll fail the distance check the moment they hit submit.
        if (milesBetween(UCF_CENTER, here) <= MAX_GAME_CREATION_RADIUS_MILES) {
          setPicked((prev) => prev || here);
        }
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
    if (milesBetween(UCF_CENTER, picked) > MAX_GAME_CREATION_RADIUS_MILES) {
      setError(`Games can only be created within ${MAX_GAME_CREATION_RADIUS_MILES} miles of UCF.`);
      return;
    }
    if (Number(minPlayers) > Number(maxPlayers)) {
      setError("Min players can't exceed max players.");
      return;
    }
    if (Number.isNaN(startDate?.getTime?.())) {
      setError("Enter a valid start time.");
      return;
    }
    // New games must start in the future; edits may touch already-started games.
    if (!isEdit && startDate.getTime() <= Date.now()) {
      setError("Start time must be in the future.");
      return;
    }

    const [latitude, longitude] = picked;

    const body = {
      sport: sport.trim(),
      description: description.trim() || undefined,
      location: location.trim(),
      start_time: startDate.toISOString(),
      latitude,
      longitude,
      min_players: Number(minPlayers),
      max_players: Number(maxPlayers),
      skill_level: skillLevel,
    };
    // Guests are never seeded here — the host adds them manually afterward
    // from the game's detail view ("Add guest"). Only the host's own
    // position is collected at creation time.
    if (!isEdit && hostPosition) {
      body.host_position = hostPosition;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/games${isEdit ? `/${game._id}` : ""}`, {
        method: isEdit ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(body),
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
      <div onClick={(e) => e.stopPropagation()} className="pgm-modal pgm-modal--editor">
        <div className="pgm-hero-wrap">
          <div className="pgm-hero">
            <span className="pgm-hero-placeholder">
              <SportIcon sport={sport} size={56} color="rgba(255,255,255,0.55)" />
            </span>
          </div>
          <button onClick={onClose} aria-label="Close" className="pgm-hero-close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="pgm-form">
          <span className="pgm-eyebrow">{isEdit ? "Edit game" : "New game"}</span>

          <div className="pgm-inline-row">
            <SportIcon sport={sport} size={18} color="#1F6B3E" />
            <select
              className="pgm-inline-input pgm-inline-select"
              value={sportChoice}
              onChange={(e) => {
                setSportChoice(e.target.value);
                setHostPosition("");
              }}
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
          </div>
          {sportChoice === "other" && (
            <input
              className="pgm-input pgm-custom-sport"
              value={customSport}
              onChange={(e) => setCustomSport(e.target.value)}
              placeholder="Enter a sport"
              autoFocus
            />
          )}

          <div className="pgm-inline-row">
            <FiUsers size={18} color="#1F6B3E" />
            <select
              className="pgm-inline-input pgm-inline-select"
              value={skillLevel}
              onChange={(e) => setSkillLevel(e.target.value)}
            >
              <option value="all">Open to all skill levels</option>
              {GAME_SKILL_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {skillLabel(level)} only
                </option>
              ))}
            </select>
          </div>

          <div className="pgm-inline-row">
            <FiMapPin size={18} color="#2F8F4E" />
            <input
              className="pgm-inline-input pgm-inline-input--heading"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Where's it happening?"
            />
          </div>

          <div>
            <LocationPicker userPosition={userPosition} value={picked} onPick={setPicked} />
            <p className="pgm-hint">
              {picked
                ? "Tap the map or drag the pin to adjust."
                : "Tap the map to drop a pin where the game is."}
            </p>
          </div>

          <textarea
            className="pgm-inline-input pgm-inline-textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description…"
          />

          <div className="pgm-section">
            <span className="pgm-label">
              <FiClock size={14} /> When
            </span>
            <p className="pgm-datepicker-value">
              {startDate.toLocaleString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
            <DatePicker
              selected={startDate}
              onChange={setStartDate}
              showTimeSelect
              timeIntervals={15}
              timeCaption="Time"
              // Applies during edit too, not just creation — otherwise the
              // calendar lets you scroll to and pick any past date while
              // editing, even though the same picker refuses one at
              // creation. An already-started game's existing (past) time
              // stays displayed/selected without forcing a change; this
              // only stops picking an *earlier* one going forward.
              minDate={new Date()}
              inline
              calendarClassName="pgm-datepicker-calendar"
            />
          </div>

          <div className="pgm-section">
            <span className="pgm-label">
              <FiUsers size={14} /> Players
            </span>
            <div className="pgm-players-row">
              <div className="pgm-player-field">
                <label className="pgm-player-field-label">Min players</label>
                <input
                  type="number"
                  min={1}
                  className="pgm-input pgm-player-field-input"
                  value={minPlayers}
                  onChange={(e) => setMinPlayers(e.target.value)}
                />
              </div>
              <div className="pgm-player-field">
                <label className="pgm-player-field-label">Max players</label>
                <input
                  type="number"
                  min={1}
                  className="pgm-input pgm-player-field-input"
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(e.target.value)}
                />
              </div>
            </div>
            {!isEdit && (
              <p className="pgm-hint">
                Add guests once the game is created, from its detail view ("Add guest").
              </p>
            )}
          </div>

          {!isEdit && sportPositions.length > 0 && (
            <div className="pgm-section">
              <span className="pgm-label">
                <FiMapPin size={14} /> Your position (optional)
              </span>
              <select
                className="pgm-input"
                value={hostPosition}
                onChange={(e) => setHostPosition(e.target.value)}
              >
                <option value="">No position</option>
                {sportPositions.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="pgm-error">{error}</p>}

          <button type="submit" disabled={submitting} className="pgm-submit">
            {submitting ? "Saving…" : isEdit ? "Save changes" : "Post game"}
          </button>
        </form>
      </div>
    </div>
  );
}

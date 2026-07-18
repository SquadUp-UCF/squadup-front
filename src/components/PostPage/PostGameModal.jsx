/**
 * Modal form for hosting/editing a game (POST or PATCH /api/games).
 *
 * Styled to read like GameDetailModal (banner up top, then sport/location/
 * description/time laid out the same way) but every part is directly
 * editable in place — clicking the banner picks a new image, clicking any
 * other field edits it, same as the read view just live.
 *
 * The game's coordinates are chosen on a map (LocationPicker) that opens on
 * the user's current position, so the host can look around nearby and drop a
 * pin on the exact spot. The host is taken from the JWT server-side, so we
 * only send game details here.
 */
import { useEffect, useState } from "react";
import { FiMapPin, FiClock, FiUsers } from "react-icons/fi";
import "./PostGameModal.css";
import LocationPicker from "./LocationPicker";
import BannerCropModal from "./BannerCropModal";
import { SportIcon, availableSports } from "../SportIcons";
import {
  resolvePhotoUrl,
  hasCustomBanner,
  milesBetween,
  UCF_CENTER,
  MAX_GAME_CREATION_RADIUS_MILES,
  GAME_SKILL_LEVELS,
  skillLabel,
} from "../../utils/games";

const API = import.meta.env.VITE_API_URL;

function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${localStorage.getItem("token")}`, ...extra };
}

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
  const [skillLevel, setSkillLevel] = useState(game?.skill_level || "all");
  const [userPosition, setUserPosition] = useState(null); // where the user is now
  const [picked, setPicked] = useState(
    game && typeof game.latitude === "number" ? [game.latitude, game.longitude] : null
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Banner: a newly-picked file, uploaded after the game itself is saved.
  // The banner is only ever *changed* here (clicking it opens a file picker)
  // — there's no separate remove control; a custom banner just gets replaced
  // the next time someone clicks it and picks a new image.
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [cropFile, setCropFile] = useState(null); // raw picked file, awaiting the crop editor
  const existingBannerUrl = game && hasCustomBanner(game) ? resolvePhotoUrl(game.photo_url) : null;
  const bannerUrl = bannerPreview || existingBannerUrl;

  useEffect(() => {
    if (!bannerFile) {
      setBannerPreview(null);
      return;
    }
    const url = URL.createObjectURL(bannerFile);
    setBannerPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [bannerFile]);

  function handleBannerChange(file) {
    if (!file) return;
    // Opens the crop editor first — `bannerFile` (what actually gets
    // uploaded) is only set once the host confirms a crop, already resized
    // and compressed to a fixed resolution regardless of the source photo's
    // size.
    setCropFile(file);
  }

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
          skill_level: skillLevel,
        }),
      });
      let data = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
        setError(msg || (isEdit ? "Could not save changes." : "Could not create the game."));
        return;
      }

      // The banner is a separate upload, applied only after the game itself
      // is safely saved (mirrors the profile-picture flow: create/update
      // first, then attach the file to the now-known id).
      if (bannerFile) {
        const body = new FormData();
        body.append("photo", bannerFile);
        const photoRes = await fetch(`${API}/games/${data._id}/photo`, {
          method: "PUT",
          headers: authHeaders(),
          body,
        });
        const photoData = await photoRes.json().catch(() => null);
        if (photoRes.ok && photoData) {
          data = photoData;
        } else {
          setError("Game saved, but the banner upload failed.");
        }
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
          <label
            className="pgm-hero"
            style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : undefined}
          >
            {!bannerUrl && (
              <span className="pgm-hero-placeholder">
                <SportIcon sport={sport} size={56} color="rgba(255,255,255,0.55)" />
              </span>
            )}
            <span className="pgm-hero-prompt">
              {bannerUrl ? "Change image" : "Upload an image"}
            </span>
            <input
              type="file"
              accept="image/*"
              className="pgm-file"
              onChange={(e) => handleBannerChange(e.target.files?.[0] || null)}
            />
          </label>
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

          <div className="pgm-meta-edit-row">
            <div className="pgm-inline-row">
              <FiClock size={15} color="#555" />
              <input
                type="datetime-local"
                className="pgm-inline-input"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>

            <div className="pgm-inline-row">
              <FiUsers size={15} color="#555" />
              <input
                type="number"
                min={1}
                className="pgm-inline-input pgm-inline-input--number"
                value={minPlayers}
                onChange={(e) => setMinPlayers(e.target.value)}
              />
              <span className="pgm-meta-slash">/</span>
              <input
                type="number"
                min={1}
                className="pgm-inline-input pgm-inline-input--number"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(e.target.value)}
              />
              <span className="pgm-meta-label">players</span>
            </div>
          </div>

          {error && <p className="pgm-error">{error}</p>}

          <button type="submit" disabled={submitting} className="pgm-submit">
            {submitting ? "Saving…" : isEdit ? "Save changes" : "Post game"}
          </button>
        </form>
      </div>

      {cropFile && (
        <BannerCropModal
          file={cropFile}
          onCancel={() => setCropFile(null)}
          onConfirm={(croppedFile) => {
            setBannerFile(croppedFile);
            setCropFile(null);
          }}
        />
      )}
    </div>
  );
}

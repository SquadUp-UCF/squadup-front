import { useEffect, useState } from "react";
import "./AuthShell.css";
import "./ProfileSetup.css";
import Logo from "../Logo";
import HeroPanel from "./HeroPanel";
import { SportIcon, availableSports } from "../SportIcons";
import AvatarCropModal from "../shared/AvatarCropModal";

// Turn a registry slug ("table-tennis") into a readable label ("Table Tennis").
function sportLabel(slug) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function ProfileSetup({ username, sport, pfpFile, onUsernameChange, onSportChange, onPfpChange, onSubmit, message }) {
  const [preview, setPreview] = useState(null);
  const [cropFile, setCropFile] = useState(null); // raw picked file, awaiting the crop editor

  // Local object-URL preview for the chosen picture (revoked on change/unmount).
  useEffect(() => {
    if (!pfpFile) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(pfpFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [pfpFile]);

  const API = import.meta.env.VITE_API_URL;
  // "checking" | "available" | "taken" | null
  const [availability, setAvailability] = useState(null);
  useEffect(() => {
    const name = username.trim();
    if (name.length < 3) { setAvailability(null); return; }
    setAvailability("checking");

    // Debounce so you don't hit the API on every keystroke
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API}/users/username-available?username=${encodeURIComponent(name)}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        if (!res.ok) { setAvailability(null); return; }
        const data = await res.json();
        setAvailability(data.available === true ? "available" : "taken");
      } catch {
        setAvailability(null);
      }
    }, 400);


    return () => clearTimeout(t); // cancels the stale check when they keep typing
  }, [username]);

  const initial = username.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="su-auth">
      <HeroPanel />

      <div className="su-panel">
        <div className="su-form-wrap">
          {/* Mobile-only logo (hidden on desktop where the hero shows it) */}
          <div className="su-mobile-logo">
            <span className="su-mobile-logo-badge">
              <Logo size={24} />
            </span>
            <span className="su-mobile-logo-text">Squad-Up</span>
          </div>

          <div className="su-head">
            <h2 className="su-head-title">Personalize your account</h2>
            <p className="su-head-sub">Pick a username and your main sport to get started.</p>
          </div>

          <form className="su-form" onSubmit={onSubmit}>
            <div className="su-field">
              <label className="su-label">Username</label>
              <input
              className="su-input"
              placeholder="username"
              value={username}
              required
              minLength={3}
              maxLength={30}
              onChange={(e) => onUsernameChange(e.target.value)}
            />


              {/* Only render once we have a real status — a null/error state
                  must not show a misleading red dot with no label. */}
              {username.trim().length >= 3 && availability && (
                <div className="indicator-row">
                  <span className={`indicator-dot ${availability === "available" ? "met" : ""}`} />
                  {availability === "checking"  ? "Checking…"
                    : availability === "available" ? "Username is available"
                    : availability === "taken"     ? "Username is taken"
                    : "\u00A0"}
                </div>
              )}
            </div>


            <div className="su-field">
              <label className="su-label">Main sport</label>
              <div className="ps-select-wrap">
                <span className="ps-select-icon">
                  <SportIcon sport={sport} size={18} color={sport ? "var(--su-green)" : "var(--su-muted)"} />
                </span>
                <select
                  className="su-input ps-select"
                  value={sport}
                  required
                  onChange={(e) => onSportChange(e.target.value)}
                >
                  <option value="" disabled>
                    Choose a sport
                  </option>
                  {availableSports.map((s) => (
                    <option key={s} value={s}>
                      {sportLabel(s)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="su-field">
              <label className="su-label">Profile picture (optional)</label>
              <label className="ps-upload">
                <span className="ps-avatar">
                  {preview ? (
                    <img src={preview} alt="Profile preview" />
                  ) : (
                    <span className="ps-avatar-initial">{initial}</span>
                  )}
                </span>
                <span className="ps-upload-text">
                  <span className="ps-upload-title">
                    {pfpFile ? "Change photo" : "Upload a photo"}
                  </span>
                  <span className="ps-upload-sub">
                    {pfpFile ? pfpFile.name : "PNG or JPG"}
                  </span>
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="ps-file"
                  onChange={(e) => {
                    const picked = e.target.files?.[0] || null;
                    e.target.value = ""; // allow picking the same file again later
                    if (picked) setCropFile(picked);
                  }}
                />
              </label>
            </div>

            <button type="submit" className="su-submit">
              Finish
            </button>

            {message && <p className="su-message">{message}</p>}
          </form>
        </div>
      </div>

      {cropFile && (
        <AvatarCropModal
          file={cropFile}
          onCancel={() => setCropFile(null)}
          onConfirm={(croppedFile) => {
            onPfpChange(croppedFile);
            setCropFile(null);
          }}
        />
      )}
    </div>
  );
}

export default ProfileSetup;

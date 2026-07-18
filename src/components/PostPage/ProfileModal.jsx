/**
 * Modal for viewing/editing the authenticated user's profile.
 *
 * Layered on the same GET/PATCH `/users/me` + `/users/me/avatar` endpoints
 * PostsPage's login flow already uses. "Skill level per favorite sport" is
 * stored in the `skill_levels` map (keyed by sport slug, value is the skill
 * label "Beginner"/"Intermediate"/"Pro"). Older profiles kept skill in the
 * legacy `preferred_positions` map, so reads fall back to it.
 *
 * Password changes happen on a dedicated page (/change-password) rather than
 * inline here, since a successful change retires the current session (see
 * ChangePasswordPage) — that's a bigger interruption than a modal should own.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PostGameModal.css";
import "./ConfirmModal.css";
import "./ProfileModal.css";
import { SportIcon, availableSports } from "../SportIcons";
import { resolvePhotoUrl } from "../../utils/games";

const API = import.meta.env.VITE_API_URL;

const SKILL_LEVELS = ["Beginner", "Intermediate", "Pro"];

function sportLabel(key) {
  return key.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Extract a readable API error ({ message } is a string OR array in Nest).
function errorMessage(data, fallback) {
  if (!data) return fallback;
  const m = Array.isArray(data.message) ? data.message.join(", ") : data.message;
  return m || fallback;
}

function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${localStorage.getItem("token")}`, ...extra };
}

function GameStrip({ games, loading, emptyLabel, onLeave, leavingId }) {
  if (loading) {
    return <p className="pfm-strip-status">Loading…</p>;
  }
  if (!games.length) {
    return <p className="pfm-strip-status">{emptyLabel}</p>;
  }
  return (
    <div className="pfm-strip">
      {games.map((game) => (
        <div key={game._id} className="pfm-strip-card">
          <span className="pfm-strip-sport">
            <SportIcon sport={game.sport} size={14} />
            {sportLabel(String(game.sport || "").toLowerCase())}
          </span>
          <p className="pfm-strip-location">{game.location}</p>
          <p className="pfm-strip-meta">
            {new Date(game.start_time).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </p>
          {/* {onLeave && (
            <button
              type="button"
              className="pfm-strip-leave"
              disabled={leavingId === game._id}
              onClick={() => onLeave(game)}
            >
              {leavingId === game._id ? "Leaving…" : "Leave"}
            </button>
          )} */}
        </div>
      ))}
    </div>
  );
}

export default function ProfileModal({ user, onClose, onSaved }) {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("settings"); // "settings" | "games"

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [profile, setProfile] = useState(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [favoriteSports, setFavoriteSports] = useState({}); // { [sport]: skillLabel }

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileMessageOk, setProfileMessageOk] = useState(false);

  const [avatarUploading, setAvatarUploading] = useState(false);

  const [activeSkillSport, setActiveSkillSport] = useState(null); // sport awaiting a skill pick

  const [joinedGames, setJoinedGames] = useState([]);
  const [createdGames, setCreatedGames] = useState([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [leavingGameId, setLeavingGameId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`${API}/users/me`, { headers: authHeaders() })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => {
        if (cancelled) return;
        setProfile(data);
        setFirstName(data.first_name || "");
        setLastName(data.last_name || "");
        setUsername(data.username || "");
        setFavoriteSports(data.skill_levels || data.preferred_positions || {});
      })
      .catch(() => {
        if (!cancelled) setLoadError("Could not load your profile.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    Promise.all([
      fetch(`${API}/games/mine?role=playing`, { headers: authHeaders() }).then((r) =>
        r.ok ? r.json() : []
      ),
      fetch(`${API}/games/mine?role=hosting`, { headers: authHeaders() }).then((r) =>
        r.ok ? r.json() : []
      ),
    ])
      .then(([playing, hosting]) => {
        if (cancelled) return;
        setJoinedGames(Array.isArray(playing) ? playing : []);
        setCreatedGames(Array.isArray(hosting) ? hosting : []);
      })
      .finally(() => {
        if (!cancelled) setGamesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again later
    if (!file) return;

    setAvatarUploading(true);
    setProfileMessage("");
    setProfileMessageOk(false);
    try {
      const body = new FormData();
      body.append("avatar", file);
      const res = await fetch(`${API}/users/me/avatar`, {
        method: "PUT",
        headers: authHeaders(),
        body,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setProfileMessage(errorMessage(data, "Could not upload photo."));
        return;
      }
      setProfile((prev) => ({ ...prev, profile_picture: data.profile_picture }));
      onSaved?.({ profile_picture: data.profile_picture });
    } catch {
      setProfileMessage("Network error: is the API reachable?");
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleRemoveAvatar() {
    setAvatarUploading(true);
    setProfileMessage("");
    try {
      const res = await fetch(`${API}/users/me/avatar`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.ok) {
        setProfile((prev) => ({ ...prev, profile_picture: null }));
        onSaved?.({ profile_picture: null });
      }
    } finally {
      setAvatarUploading(false);
    }
  }

  function toggleFavorite(sport) {
    // Whether it's already a favorite or brand new, open the popover — this
    // is also how an existing favorite's skill level gets changed.
    setActiveSkillSport(sport);
  }

  function removeFavorite(sport, e) {
    e.stopPropagation();
    setFavoriteSports((prev) => {
      const next = { ...prev };
      delete next[sport];
      return next;
    });
  }

  function pickSkillLevel(level) {
    setFavoriteSports((prev) => ({ ...prev, [activeSkillSport]: level }));
    setActiveSkillSport(null);
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setProfileMessage("");
    setProfileMessageOk(false);

    if (username.trim().length < 3 || username.trim().length > 30) {
      setProfileMessage("Username must be 3-30 characters");
      return;
    }

    setSavingProfile(true);
    try {
      const res = await fetch(`${API}/users/me`, {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          username: username.trim(),
          skill_levels: favoriteSports,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setProfileMessage(errorMessage(data, "Could not save changes."));
        return;
      }
      setProfile(data);
      setProfileMessage("Profile updated.");
      setProfileMessageOk(true);
      onSaved?.({
        name: `${data.first_name} ${data.last_name}`,
        username: data.username,
        profile_picture: data.profile_picture,
      });
    } catch {
      setProfileMessage("Network error: is the API reachable?");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleLeaveGame(game) {
    setLeavingGameId(game._id);
    try {
      const res = await fetch(`${API}/games/${game._id}/leave`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (res.ok) {
        setJoinedGames((prev) => prev.filter((g) => g._id !== game._id));
      }
    } catch {
      // swallow — the button simply resets; reopening the modal reconciles
    } finally {
      setLeavingGameId(null);
    }
  }

  function goToChangePassword() {
    onClose();
    navigate("/change-password");
  }

  const initial = (profile?.first_name || user?.username || "?").charAt(0).toUpperCase();
  const isActive = profile?.account_status === "active";

  return (
    <div onClick={onClose} className="pfm-overlay">
      <div onClick={(e) => e.stopPropagation()} className="pfm-modal">
        <div className="pfm-header">
          <h2 className="pfm-title">Edit profile</h2>
          <button onClick={onClose} aria-label="Close" className="pfm-close">
            ×
          </button>
        </div>

        {loading ? (
          <p className="pfm-status">Loading your profile…</p>
        ) : loadError ? (
          <p className="pgm-error">{loadError}</p>
        ) : (
          <>
            <div className="pfm-tabs">
              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                className={`pfm-tab ${activeTab === "settings" ? "pfm-tab--active" : ""}`}
              >
                Edit settings
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("games")}
                className={`pfm-tab ${activeTab === "games" ? "pfm-tab--active" : ""}`}
              >
                Games
              </button>
            </div>

            {activeTab === "settings" && (
              <div className="pfm-body">
                {/* Avatar + presence */}
                <div className="pfm-avatar-row">
                  <div className="pfm-avatar-wrap">
                    <label className="pfm-avatar" title="Change profile photo">
                      {profile?.profile_picture ? (
                        <img src={resolvePhotoUrl(profile.profile_picture)} alt="Profile" />
                      ) : (
                        <span className="pfm-avatar-initial">{initial}</span>
                      )}
                      {avatarUploading && <span className="pfm-avatar-spinner" />}
                      <input
                        type="file"
                        accept="image/*"
                        className="pfm-file"
                        onChange={handleAvatarChange}
                        disabled={avatarUploading}
                      />
                    </label>
                    <span
                      className={`pfm-presence-dot ${isActive ? "pfm-presence-dot--active" : ""}`}
                      title={isActive ? "Active" : profile?.account_status}
                    />
                  </div>

                  <div className="pfm-avatar-actions">
                    <label className="pfm-link-btn">
                      Change profile photo
                      <input
                        type="file"
                        accept="image/*"
                        className="pfm-file"
                        onChange={handleAvatarChange}
                        disabled={avatarUploading}
                      />
                    </label>
                    {profile?.profile_picture && (
                      <button
                        type="button"
                        className="pfm-link-btn pfm-link-btn--danger"
                        onClick={handleRemoveAvatar}
                        disabled={avatarUploading}
                      >
                        Remove photo
                      </button>
                    )}
                  </div>
                </div>

                <form onSubmit={handleSaveProfile} className="pfm-form">
                  <div className="pgm-row">
                    <div className="pgm-col">
                      <label className="pgm-label">First name</label>
                      <input
                        className="pgm-input"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </div>
                    <div className="pgm-col">
                      <label className="pgm-label">Last name</label>
                      <input
                        className="pgm-input"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="pgm-label">Username</label>
                    <input
                      className="pgm-input"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoCapitalize="none"
                      autoCorrect="off"
                    />
                  </div>

                  <div>
                    <label className="pgm-label">Favorite sports</label>
                    <div className="pfm-sport-grid">
                      {availableSports.map((sport) => {
                        const skill = favoriteSports[sport];
                        const isFavorite = Boolean(skill);
                        return (
                          <button
                            type="button"
                            key={sport}
                            onClick={() => toggleFavorite(sport)}
                            className={`pfm-sport-chip ${isFavorite ? "pfm-sport-chip--active" : ""}`}
                          >
                            <SportIcon sport={sport} size={16} color={isFavorite ? "#ffffff" : "#2F8F4E"} />
                            {sportLabel(sport)}
                            {isFavorite && <span className="pfm-sport-skill">{skill}</span>}
                            {isFavorite && (
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={(e) => removeFavorite(sport, e)}
                                className="pfm-sport-remove"
                              >
                                ×
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {profileMessage && (
                    <p className={profileMessageOk ? "pgm-success" : "pgm-error"}>{profileMessage}</p>
                  )}

                  <button type="submit" disabled={savingProfile} className="pgm-submit">
                    {savingProfile ? "Saving…" : "Save changes"}
                  </button>
                </form>

                <div className="pfm-divider" />

                <button type="button" onClick={goToChangePassword} className="pfm-expand-row">
                  <span>Update password</span>
                  <span className="pfm-expand-chevron">›</span>
                </button>
              </div>
            )}

            {activeTab === "games" && (
              <div className="pfm-body">
                <div>
                  <label className="pgm-label">Games joined</label>
                  <GameStrip
                    games={joinedGames}
                    loading={gamesLoading}
                    emptyLabel="No games joined yet."
                    onLeave={handleLeaveGame}
                    leavingId={leavingGameId}
                  />
                </div>

                <div>
                  <label className="pgm-label">Games created</label>
                  <GameStrip games={createdGames} loading={gamesLoading} emptyLabel="No games created yet." />
                </div>
              </div>
            )}
          </>
        )}

        {activeSkillSport && (
          <div onClick={() => setActiveSkillSport(null)} className="cm-overlay pfm-skill-overlay">
            <div onClick={(e) => e.stopPropagation()} className="cm-dialog pfm-skill-dialog">
              <h2 className="cm-title">{sportLabel(activeSkillSport)}</h2>
              <p className="cm-message">Pick a skill level.</p>
              <div className="pfm-skill-options">
                {SKILL_LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => pickSkillLevel(level)}
                    className={`pfm-skill-option ${
                      favoriteSports[activeSkillSport] === level ? "pfm-skill-option--chosen" : ""
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setActiveSkillSport(null)} className="cm-btn cm-btn-cancel">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

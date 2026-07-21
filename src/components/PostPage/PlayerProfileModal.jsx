/**
 * Read-only public profile for another player, opened by clicking their name
 * in a game's roster (GameDetailModal). Shows stats — reputation, games
 * played, games hosted — plus per-sport skill levels. Mirrors squadup-app's
 * `app/user/[id].tsx`, as a modal instead of a routed screen (routing is out
 * of scope for the web client).
 */
import { useEffect, useState } from "react";
import { FiStar, FiX } from "react-icons/fi";
import "./ProfileModal.css";
import "./PlayerProfileModal.css";
import { SportIcon } from "../SportIcons";
import { resolvePhotoUrl } from "../../utils/games";

const API = import.meta.env.VITE_API_URL;

function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${localStorage.getItem("token")}`, ...extra };
}

function sportLabel(key) {
  return key.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function PlayerProfileModal({ userId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(`${API}/users/${userId}`, { headers: authHeaders() })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load this profile.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const initial = (profile?.first_name || profile?.username || "?").charAt(0).toUpperCase();
  const skills = profile ? Object.entries(profile.skill_levels || {}) : [];

  return (
    <div onClick={onClose} className="pfm-overlay">
      <div onClick={(e) => e.stopPropagation()} className="pfm-modal ppm-modal">
        <div className="pfm-header">
          <h2 className="pfm-title">Player profile</h2>
          <button onClick={onClose} aria-label="Close" className="pfm-close">
            <FiX size={20} />
          </button>
        </div>

        {loading ? (
          <p className="pfm-status">Loading profile…</p>
        ) : error ? (
          <p className="pgm-error">{error}</p>
        ) : (
          <div className="pfm-body">
            <div className="ppm-header">
              <div className="ppm-avatar">
                {profile.profile_picture ? (
                  <img src={resolvePhotoUrl(profile.profile_picture)} alt="" />
                ) : (
                  <span className="ppm-avatar-initial">{initial}</span>
                )}
              </div>
              <h3 className="ppm-name">
                {profile.first_name} {profile.last_name}
              </h3>
              <p className="ppm-username">@{profile.username}</p>
            </div>

            <div className="ppm-stats-row">
              <div className="ppm-stat">
                <span className="ppm-stat-value">{profile.games_joined}</span>
                <span className="ppm-stat-label">Games played</span>
              </div>
              <div className="ppm-stat">
                <span className="ppm-stat-value">{profile.games_created}</span>
                <span className="ppm-stat-label">Games hosted</span>
              </div>
              <div className="ppm-stat">
                <span className="ppm-stat-value ppm-stat-value--rep">
                  <FiStar size={15} />
                  {profile.reputation.toFixed(1)}
                </span>
                <span className="ppm-stat-label">Reputation</span>
              </div>
            </div>

            {skills.length > 0 && (
              <div>
                <span className="pgm-label">Sports</span>
                <div className="ppm-skill-list">
                  {skills.map(([sport, skill]) => (
                    <div key={sport} className="ppm-skill-row">
                      <SportIcon sport={sport} size={16} color="#1F6B3E" />
                      <span className="ppm-skill-sport">{sportLabel(sport)}</span>
                      {skill && <span className="ppm-skill-level">{skill}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

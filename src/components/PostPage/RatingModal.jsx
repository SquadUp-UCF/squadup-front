/**
 * Post-game player rating: thumbs up/down for the other registered players of
 * a completed game. Shown after loading the feed when the caller has
 * completed games they haven't rated yet (GET /games/pending-ratings).
 * Submitting records the game as rated (POST /games/:id/ratings) so it stops
 * being prompted, even if no thumbs were chosen. Mirrors squadup-app's
 * `components/games/rating-modal.tsx`.
 */
import { useEffect, useMemo, useState } from "react";
import { FiThumbsUp, FiThumbsDown } from "react-icons/fi";
import "./ConfirmModal.css";
import "./RatingModal.css";

const API = import.meta.env.VITE_API_URL;

function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${localStorage.getItem("token")}`, ...extra };
}

function sportLabel(sport) {
  return String(sport || "").replace(/-/g, " ");
}

export default function RatingModal({ game, currentUserId, busy = false, onSubmit, onClose }) {
  const ratees = useMemo(
    () =>
      game
        ? (game.participants || []).filter(
            (p) => p.user && p.status === "joined" && p.user !== currentUserId
          )
        : [],
    [game, currentUserId]
  );

  const [names, setNames] = useState({});
  const [ratings, setRatings] = useState({});

  useEffect(() => {
    setRatings({});
    if (!game) return;
    let active = true;
    ratees.forEach((p) => {
      fetch(`${API}/users/${p.user}`, { headers: authHeaders() })
        .then((res) => (res.ok ? res.json() : null))
        .then((profile) => {
          if (active && profile) setNames((prev) => ({ ...prev, [p.user]: profile.username }));
        })
        .catch(() => {});
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);

  if (!game) return null;

  function setRating(user, value) {
    setRatings((prev) => {
      if (prev[user] === value) {
        const next = { ...prev };
        delete next[user];
        return next;
      }
      return { ...prev, [user]: value };
    });
  }

  function submit() {
    onSubmit(Object.entries(ratings).map(([user, value]) => ({ user, value })));
  }

  return (
    <div className="cm-overlay">
      <div className="cm-dialog rm-dialog">
        <h2 className="cm-title">Rate your teammates</h2>
        <p className="cm-message">
          {sportLabel(game.sport)} at {game.location}
        </p>

        {ratees.length === 0 ? (
          <p className="rm-empty">No other players to rate.</p>
        ) : (
          <div className="rm-list">
            {ratees.map((p) => {
              const choice = ratings[p.user];
              return (
                <div key={p.user} className="rm-row">
                  <span className="rm-name">{names[p.user] || "Player"}</span>
                  <div className="rm-thumbs">
                    <button
                      type="button"
                      onClick={() => setRating(p.user, "up")}
                      className={`rm-thumb ${choice === "up" ? "rm-thumb--up-active" : ""}`}
                    >
                      <FiThumbsUp size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRating(p.user, "down")}
                      className={`rm-thumb ${choice === "down" ? "rm-thumb--down-active" : ""}`}
                    >
                      <FiThumbsDown size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="cm-actions">
          <button type="button" onClick={onClose} disabled={busy} className="cm-btn cm-btn-cancel">
            Later
          </button>
          <button type="button" onClick={submit} disabled={busy} className="cm-btn cm-btn-confirm">
            {busy ? "Submitting…" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

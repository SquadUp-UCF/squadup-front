/**
 * The scrollable feed of games shown to the left of the map. Each game is an
 * image-topped card with a join-progress bar; the whole thing is driven by
 * props so the parent (PostsPage) owns the data and list + map stay in sync.
 */
import { useState } from "react";
import { FiMapPin, FiClock, FiUsers, FiHeart, FiEdit2, FiTrash2 } from "react-icons/fi";
import { SportIcon } from "./SportIcons";
import { statusMeta, formatWhen, activeCount, isLive } from "../utils/games";

// A game created within this window shows a "NEW" badge.
const NEW_WINDOW_MS = 24 * 60 * 60 * 1000;

function sportLabel(sport) {
  return String(sport || "").replace(/-/g, " ");
}

function GameCard({ game, currentUserId, onJoin, joiningId, onEdit, onDelete, deletingId }) {
  const [liked, setLiked] = useState(false);
  const meta = statusMeta(game);
  const joined = activeCount(game);
  const live = isLive(game);
  const ratio = game.max_players > 0 ? Math.min(1, joined / game.max_players) : 0;
  const fillingUp = ratio >= 0.8 && game.status !== "locked" && game.status !== "completed";
  const barColor = ratio >= 0.8 ? "#E4572E" : "#2F8F4E";
  const isNew =
    game.createdAt && Date.now() - new Date(game.createdAt).getTime() < NEW_WINDOW_MS;

  const isHost = currentUserId && game.host === currentUserId;
  const alreadyIn = (game.participants || []).some(
    (p) => p.user === currentUserId && p.status === "joined"
  );
  const joinable =
    !isHost && !alreadyIn && game.status !== "locked" &&
    game.status !== "completed" && game.status !== "cancelled";

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
      }}
    >
      {/* Image / placeholder header */}
      <div
        style={{
          position: "relative",
          height: 150,
          background: game.photo_url
            ? `center/cover no-repeat url(${game.photo_url})`
            : "linear-gradient(135deg, #2F8F4E 0%, #1F6B3E 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {!game.photo_url && (
          <SportIcon sport={game.sport} size={64} color="rgba(255,255,255,0.55)" />
        )}

        {/* Top-left badges */}
        <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 8 }}>
          {live ? (
            <Badge bg="#FDE6E6" color="#C81E1E">
              <span className="game-marker-live" style={{ position: "static", width: 7, height: 7, border: "none" }} />
              LIVE
            </Badge>
          ) : (
            isNew && <Badge bg="#E4F3E8" color="#1F6B3E">✨ NEW</Badge>
          )}
          {fillingUp && <Badge bg="#E4572E" color="#FFFFFF">Filling up</Badge>}
        </div>

        {/* Top-right actions */}
        <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 8 }}>
          {isHost ? (
            <>
              <IconButton title="Edit" onClick={() => onEdit(game)}>
                <FiEdit2 size={16} color="#1F6B3E" />
              </IconButton>
              <IconButton
                title="Delete"
                disabled={deletingId === game._id}
                onClick={() => onDelete(game)}
              >
                <FiTrash2 size={16} color="#C81E1E" />
              </IconButton>
            </>
          ) : (
            <IconButton title="Save" onClick={() => setLiked((v) => !v)}>
              <FiHeart size={16} color={liked ? "#E4572E" : "#666"} fill={liked ? "#E4572E" : "none"} />
            </IconButton>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: 18 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: meta.bg,
            color: meta.color,
            padding: "5px 12px",
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 600,
            textTransform: "capitalize",
          }}
        >
          <SportIcon sport={game.sport} size={16} color={meta.color} />
          {sportLabel(game.sport)}
        </span>

        <h3
          style={{
            margin: "12px 0 10px",
            fontSize: 20,
            fontWeight: 700,
            color: "#1A1A1A",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <FiMapPin size={18} color="#2F8F4E" style={{ flexShrink: 0 }} />
          {game.location}
        </h3>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#555",
            fontSize: 14,
            marginBottom: 14,
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <FiClock size={15} /> {formatWhen(game.start_time)}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700, color: "#1A1A1A" }}>
            <FiUsers size={15} /> {joined} / {game.max_players}
          </span>
        </div>

        {/* Join-progress bar */}
        <div style={{ height: 8, borderRadius: 6, background: "#EDEDED", overflow: "hidden" }}>
          <div
            style={{
              width: `${ratio * 100}%`,
              height: "100%",
              borderRadius: 6,
              background: barColor,
              transition: "width 0.3s ease",
            }}
          />
        </div>

        {!isHost && (
          <button
            disabled={!joinable || joiningId === game._id}
            onClick={() => onJoin(game)}
            style={{
              width: "100%",
              marginTop: 16,
              background: joinable ? "#2F8F4E" : "#E4E4E4",
              color: joinable ? "#FFFFFF" : "#999",
              border: "none",
              borderRadius: 12,
              padding: "11px 0",
              fontWeight: 600,
              cursor: joinable ? "pointer" : "default",
            }}
          >
            {alreadyIn
              ? "You're in"
              : game.status === "locked"
                ? "Full"
                : joiningId === game._id
                  ? "Joining…"
                  : "Join game"}
          </button>
        )}
      </div>
    </div>
  );
}

function Badge({ bg, color, children }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: bg,
        color,
        padding: "4px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 700,
        boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
      }}
    >
      {children}
    </span>
  );
}

function IconButton({ title, onClick, disabled, children }) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 34,
        height: 34,
        borderRadius: "50%",
        border: "none",
        background: "rgba(255,255,255,0.92)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "default" : "pointer",
        boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}

export default function PostsList({ games, loading, error, currentUserId, onJoin, joiningId, onEdit, onDelete, deletingId }) {
  if (loading) {
    return <p style={{ color: "#555" }}>Loading games…</p>;
  }
  if (error) {
    return <p style={{ color: "#A81B1B" }}>{error}</p>;
  }
  if (!games.length) {
    return (
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 16,
          padding: 32,
          textAlign: "center",
          color: "#555",
        }}
      >
        <p style={{ margin: 0, fontWeight: 600, color: "#1A1A1A" }}>No games yet</p>
        <p style={{ margin: "8px 0 0", fontSize: 14 }}>
          Be the first — hit “Post a game” to host one.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {games.map((game) => (
        <GameCard
          key={game._id}
          game={game}
          currentUserId={currentUserId}
          onJoin={onJoin}
          joiningId={joiningId}
          onEdit={onEdit}
          onDelete={onDelete}
          deletingId={deletingId}
        />
      ))}
    </div>
  );
}

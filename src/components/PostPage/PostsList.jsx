/**
 * The scrollable feed of games shown to the left of the map. Each game is an
 * image-topped card with a join-progress bar; the whole thing is driven by
 * props so the parent (PostsPage) owns the data and list + map stay in sync.
 */
import "./PostsList.css";
import { FiMapPin, FiClock, FiUsers, FiHeart, FiEdit2, FiTrash2, FiTarget } from "react-icons/fi";
import { SportIcon } from "../SportIcons";
import { useSavedGames } from "../../contexts/SavedGamesContext";
import { statusMeta, formatWhen, activeCount, isLive, hasStarted, bannerUrl, skillLabel } from "../../utils/games";

// A game created within this window shows a "NEW" badge.
const NEW_WINDOW_MS = 24 * 60 * 60 * 1000;

function sportLabel(sport) {
  return String(sport || "").replace(/-/g, " ");
}

function GameCard({ game, currentUserId, onJoin, joiningId, onLeave, leavingId, onEdit, onDelete, deletingId, onSelect }) {
  const { isSaved, toggleSaved } = useSavedGames();
  const liked = isSaved(game._id);
  const meta = statusMeta(game);
  const joined = activeCount(game);
  const live = isLive(game);
  const ratio = game.max_players > 0 ? Math.min(1, joined / game.max_players) : 0;
  const fillingUp = ratio >= 0.8 && game.status !== "locked" && game.status !== "completed";
  const barColor = ratio >= 0.8 ? "#E4572E" : "#2F8F4E";
  const isNew =
    game.createdAt && Date.now() - new Date(game.createdAt).getTime() < NEW_WINDOW_MS;

  const banner = bannerUrl(game);
  const isHost = currentUserId && game.host === currentUserId;
  const alreadyIn = (game.participants || []).some(
    (p) => p.user === currentUserId && p.status === "joined"
  );
  const started = hasStarted(game);
  const joinable =
    !isHost && !alreadyIn && !started && game.status !== "locked" &&
    game.status !== "completed" && game.status !== "cancelled";

  return (
    <div className="pl-card pl-card--clickable" onClick={() => onSelect?.(game)}>
      {/* Image / placeholder header */}
      <div
        className="pl-card-header"
        style={{
          background: banner
            ? `center/cover no-repeat url(${banner})`
            : "linear-gradient(135deg, #2F8F4E 0%, #1F6B3E 100%)",
        }}
      >
        {!banner && (
          <SportIcon sport={game.sport} size={64} color="rgba(255,255,255,0.55)" />
        )}

        {/* Top-left badges */}
        <div className="pl-badges pl-badges-left">
          {live ? (
            <Badge bg="#FDE6E6" color="#C81E1E">
              <span className="game-marker-live pl-live-dot" />
              LIVE
            </Badge>
          ) : (
            isNew && <Badge bg="#E4F3E8" color="#1F6B3E">✨ NEW</Badge>
          )}
          {fillingUp && <Badge bg="#E4572E" color="#FFFFFF">Filling up</Badge>}
        </div>

        {/* Top-right actions */}
        <div className="pl-badges pl-badges-right">
          {isHost ? (
            <>
              <IconButton title="Edit" onClick={(e) => { e.stopPropagation(); onEdit(game); }}>
                <FiEdit2 size={16} color="#1F6B3E" />
              </IconButton>
              <IconButton
                title="Delete"
                disabled={deletingId === game._id}
                onClick={(e) => { e.stopPropagation(); onDelete(game); }}
              >
                <FiTrash2 size={16} color="#C81E1E" />
              </IconButton>
            </>
          ) : (
            <IconButton title="Save" onClick={(e) => { e.stopPropagation(); toggleSaved(game._id); }}>
              <FiHeart size={16} color={liked ? "#E4572E" : "#666"} fill={liked ? "#E4572E" : "none"} />
            </IconButton>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="pl-body">
        <span
          className="pl-sport-pill"
          style={{ background: meta.bg, color: meta.color }}
        >
          <SportIcon sport={game.sport} size={16} color={meta.color} />
          {sportLabel(game.sport)}
        </span>
        {game.skill_level && game.skill_level !== "all" && (
          <span className="pl-skill-pill">{skillLabel(game.skill_level)}</span>
        )}

        <h3 className="pl-title">
          <FiMapPin size={18} color="#2F8F4E" className="pl-title-pin" />
          {game.location}
        </h3>

        <div className="pl-meta-row">
          <span className="pl-meta-item">
            <FiClock size={15} /> {formatWhen(game.start_time)}
          </span>
          <div className="pl-meta-counts">
            {game.min_players > 0 && (
              <span className="pl-meta-item pl-min-label">
                <FiTarget size={13} /> Min {game.min_players}
              </span>
            )}
            <span className="pl-meta-item pl-meta-count">
              <FiUsers size={15} /> {joined} / {game.max_players}
            </span>
          </div>
        </div>

        {/* Join-progress bar — the tick marks where min_players falls, so
            hosts/joiners can see how close the game is to actually confirming,
            not just to filling up. */}
        <div className="pl-bar-track">
          <div
            className="pl-bar-fill"
            style={{
              width: `${ratio * 100}%`,
              background: barColor,
            }}
          />
          {game.max_players > 0 && game.min_players > 0 && (
            <div
              className="pl-bar-min-marker"
              title={`Needs ${game.min_players} to confirm`}
              style={{
                left: `${Math.min(100, (game.min_players / game.max_players) * 100)}%`,
              }}
            />
          )}
        </div>

        {!isHost && alreadyIn && (
          <button
            disabled={leavingId === game._id}
            onClick={(e) => { e.stopPropagation(); onLeave(game); }}
            className="pl-join pl-leave"
          >
            {leavingId === game._id ? "Leaving…" : "You're in — Leave"}
          </button>
        )}
        {!isHost && !alreadyIn && (
          <button
            disabled={!joinable || joiningId === game._id}
            onClick={(e) => { e.stopPropagation(); onJoin(game); }}
            className={`pl-join ${joinable ? "pl-join--enabled" : "pl-join--disabled"}`}
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
  );
}

function Badge({ bg, color, children }) {
  return (
    <span className="pl-badge" style={{ background: bg, color }}>
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
      className={`pl-icon-btn ${disabled ? "pl-icon-btn--disabled" : ""}`}
    >
      {children}
    </button>
  );
}

export default function PostsList({ games, loading, error, currentUserId, onJoin, joiningId, onLeave, leavingId, onEdit, onDelete, deletingId, onSelect }) {
  if (loading) {
    return <p className="pl-status">Loading games…</p>;
  }
  if (error) {
    return <p className="pl-error">{error}</p>;
  }
  if (!games.length) {
    return (
      <div className="pl-empty">
        <p className="pl-empty-title">No games yet</p>
        <p className="pl-empty-sub">
          Be the first — hit “Post a game” to host one.
        </p>
      </div>
    );
  }

  return (
    <div className="pl-list">
      {games.map((game) => (
        <GameCard
          key={game._id}
          game={game}
          currentUserId={currentUserId}
          onJoin={onJoin}
          joiningId={joiningId}
          onLeave={onLeave}
          leavingId={leavingId}
          onEdit={onEdit}
          onDelete={onDelete}
          deletingId={deletingId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

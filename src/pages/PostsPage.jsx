import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import MapComponent from "../components/PostPage/MapComponent";
import PostsList from "../components/PostPage/PostsList";
import PostGameModal from "../components/PostPage/PostGameModal";
import ConfirmModal from "../components/PostPage/ConfirmModal";
import ProfileModal from "../components/PostPage/ProfileModal";
import GameDetailModal from "../components/PostPage/GameDetailModal";
import JoinPartySizeModal from "../components/PostPage/JoinPartySizeModal";
import Logo from "../components/Logo";
import {
  isActive,
  milesBetween,
  resolvePhotoUrl,
  DEFAULT_VIEW_RADIUS_MILES,
  matchesSkillFilter,
} from "../utils/games";
import PostsFilterBar from "../components/PostPage/PostsFilterBar";
import "./PostsPage.css";

const DEFAULT_RADIUS = DEFAULT_VIEW_RADIUS_MILES;

const API = import.meta.env.VITE_API_URL;
const NARROW_BREAKPOINT = 900;

// Tracks whether the viewport is below the breakpoint where the layout collapses
// from side-by-side (list + map) into a single toggled column.
function useIsNarrow(breakpoint = NARROW_BREAKPOINT) {
  const [isNarrow, setIsNarrow] = useState(
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = (e) => setIsNarrow(e.matches);
    setIsNarrow(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [breakpoint]);
  return isNarrow;
}

function PostsPage() {
  const location = useLocation();
  const user = location.state?.user;
  const navigate = useNavigate();

  const isNarrow = useIsNarrow();
  const [mobileView, setMobileView] = useState("posts"); // "posts" | "map"
  // Swipe-to-switch between the two mobile panes. `dragOffset` is the live
  // finger-follow distance while a touch is in progress (0 the rest of the
  // time, including mid-snap-back), so the track only skips its transition
  // (for 1:1 tracking) during an actual drag.
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const swipeTouchStartX = useRef(null);
  const swipeViewportWidth = useRef(0);
  const swipeViewportRef = useRef(null);
  // Mirrors `dragOffset` but read synchronously in the touchend handler —
  // `dragOffset` state can still be stale there (React hasn't necessarily
  // re-rendered between a touchmove and a touchend fired in the same tick,
  // e.g. on a very fast flick), which would silently drop the gesture.
  const dragOffsetRef = useRef(0);

  function handleSwipeTouchStart(e) {
    swipeTouchStartX.current = e.touches[0].clientX;
    swipeViewportWidth.current = swipeViewportRef.current?.offsetWidth || 1;
    setIsDragging(true);
  }

  function handleSwipeTouchMove(e) {
    if (swipeTouchStartX.current == null) return;
    const delta = e.touches[0].clientX - swipeTouchStartX.current;
    // Clamp so you can't drag past whichever pane isn't adjacent (posts can
    // only drag left toward map; map can only drag right toward posts).
    const min = mobileView === "posts" ? -swipeViewportWidth.current : 0;
    const max = mobileView === "map" ? swipeViewportWidth.current : 0;
    const clamped = Math.min(max, Math.max(min, delta));
    dragOffsetRef.current = clamped;
    setDragOffset(clamped);
  }

  function handleSwipeTouchEnd() {
    const threshold = swipeViewportWidth.current * 0.2;
    const delta = dragOffsetRef.current;
    if (delta <= -threshold && mobileView === "posts") {
      setMobileView("map");
    } else if (delta >= threshold && mobileView === "map") {
      setMobileView("posts");
    }
    dragOffsetRef.current = 0;
    setDragOffset(0);
    setIsDragging(false);
    swipeTouchStartX.current = null;
  }
  const [showModal, setShowModal] = useState(false);
  const [editingGame, setEditingGame] = useState(null); // game being edited, or null
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  // Local copy of the router-state user so the header (name + avatar initials/
  // photo) reflects edits made in ProfileModal without a full reload.
  const [profile, setProfile] = useState(user);

  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joiningId, setJoiningId] = useState(null);
  const [leavingId, setLeavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // game pending deletion
  const [selectedGameId, setSelectedGameId] = useState(null); // expanded game detail modal
  const [joinTargetId, setJoinTargetId] = useState(null); // game pending a party-size choice
  const [joinError, setJoinError] = useState("");
  const [userPosition, setUserPosition] = useState(null); // [lat, lng] or null
  const [radiusMiles, setRadiusMiles] = useState(DEFAULT_RADIUS);

  // Posts filter bar — all client-side over the fetched `games`. "Range" here
  // is distance from the viewer's own device, distinct from the map's
  // UCF-anchored "range" slider (radiusMiles above).
  const [sportFilter, setSportFilter] = useState("all");
  const [skillFilter, setSkillFilter] = useState("all");
  const [rangeFilter, setRangeFilter] = useState(null); // miles, or null for "any"

  // Find the user once so we can filter posts to those within the chosen range.
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPosition([pos.coords.latitude, pos.coords.longitude]),
      () => {}
    );
  }, []);

  const token = () => localStorage.getItem("token");

  // The router-state user only carries {id, name, username} — fetch the full
  // profile once so the header avatar can show the real picture, not just
  // initials.
  useEffect(() => {
    fetch(`${API}/users/me`, { headers: { Authorization: `Bearer ${token()}` } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setProfile((prev) => ({ ...prev, ...data }));
      })
      .catch(() => {});
  }, []);

  const loadGames = useCallback(() => {
    setLoading(true);
    setError("");
    // Fetch upcoming AND in-progress games (upcoming=false lifts the future-only
    // filter), then keep just the ones still relevant — upcoming or live now.
    fetch(`${API}/games?upcoming=false`, {
      headers: { Authorization: `Bearer ${token()}` },
    })
      .then((res) => {
        // An expired/invalid token (e.g. after the DB was reset) can't be
        // recovered — clear it and send the user back to log in fresh.
        if (res.status === 401) {
          localStorage.removeItem("token");
          navigate("/");
          return Promise.reject("unauthorized");
        }
        return res.ok ? res.json() : Promise.reject(res.status);
      })
      .then((data) => setGames(Array.isArray(data) ? data.filter((g) => isActive(g)) : []))
      .catch((err) => {
        if (err !== "unauthorized") {
          setError("Could not load games. Please try again.");
        }
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  function logout() {
    localStorage.removeItem("token");
    navigate("/");
  }

  function handleSaved(savedGame) {
    // Update in place when editing, otherwise prepend the new game. Refetch to
    // reconcile ordering and any filtering (e.g. an edited-past game).
    setGames((prev) => {
      const exists = prev.some((g) => g._id === savedGame._id);
      return exists
        ? prev.map((g) => (g._id === savedGame._id ? savedGame : g))
        : [savedGame, ...prev];
    });
    loadGames();
  }

  async function handleDeleteConfirmed() {
    const game = confirmDelete;
    if (!game) return;
    setDeletingId(game._id);
    try {
      const res = await fetch(`${API}/games/${game._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) {
        setGames((prev) => prev.filter((g) => g._id !== game._id));
      }
    } catch {
      // swallow — a refresh will reconcile
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  }

  // Opens the party-size picker rather than joining immediately — the actual
  // request fires from there, once the caller confirms a headcount.
  function requestJoin(game) {
    setJoinError("");
    setJoinTargetId(game._id);
  }

  async function handleJoin(game, partySize = 1) {
    setJoiningId(game._id);
    try {
      const res = await fetch(`${API}/games/${game._id}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({ party_size: partySize }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data) {
        setGames((prev) => prev.map((g) => (g._id === data._id ? data : g)));
        setJoinTargetId(null);
      } else {
        const msg = Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
        setJoinError(msg || "Could not join the game.");
      }
    } catch {
      setJoinError("Network error: is the API reachable?");
    } finally {
      setJoiningId(null);
    }
  }

  async function handleLeave(game) {
    setLeavingId(game._id);
    try {
      const res = await fetch(`${API}/games/${game._id}/leave`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data) {
        setGames((prev) => prev.map((g) => (g._id === data._id ? data : g)));
      }
    } catch {
      // swallow — the button simply resets; a refresh will reconcile
    } finally {
      setLeavingId(null);
    }
  }

  const currentUserId = profile?._id || profile?.id;
  // Derived (not stored) from `games` so join/leave updates are reflected
  // immediately in the open modal instead of showing stale participant data.
  const selectedGame = games.find((g) => g._id === selectedGameId) || null;
  const joinTarget = games.find((g) => g._id === joinTargetId) || null;

  // The map's own "range" slider is purely a zoom control now — it no longer
  // hides games (see MapComponent). All active games are shown; only the
  // filter bar's sport/skill/range-from-you picks narrow what's visible.
  const visibleGames = useMemo(() => {
    return games.filter((g) => {
      if (typeof g.latitude !== "number" || typeof g.longitude !== "number") return false;
      if (sportFilter !== "all" && (g.sport || "").toLowerCase() !== sportFilter) return false;
      if (!matchesSkillFilter(g, skillFilter)) return false;
      if (rangeFilter !== null) {
        if (!userPosition) return false;
        if (milesBetween(userPosition, [g.latitude, g.longitude]) > rangeFilter) return false;
      }
      return true;
    });
  }, [games, sportFilter, skillFilter, rangeFilter, userPosition]);

  const postsPanel = (
    <PostsList
      games={visibleGames}
      loading={loading}
      error={error}
      currentUserId={currentUserId}
      onJoin={requestJoin}
      joiningId={joiningId}
      onLeave={handleLeave}
      leavingId={leavingId}
      onEdit={setEditingGame}
      onDelete={setConfirmDelete}
      deletingId={deletingId}
      onSelect={(game) => setSelectedGameId(game._id)}
    />
  );

  const mapPanel = (
    <MapComponent
      games={visibleGames}
      userPosition={userPosition}
      radiusMiles={radiusMiles}
      onRadiusChange={setRadiusMiles}
      currentUserId={currentUserId}
      onJoin={requestJoin}
      joiningId={joiningId}
      onLeave={handleLeave}
      leavingId={leavingId}
      height={isNarrow ? "calc(100vh - 200px)" : "calc(100vh - 140px)"}
    />
  );

  return (
    <div className="pp-page">
      {/* Top nav */}
      <div className="pp-nav">
        <div className="pp-brand">
          <span className="pp-logo-badge">
            <Logo size={40} style={{ objectFit: "cover" }} />
          </span>
          <span className="pp-brand-name">
            Squad-Up
          </span>
        </div>

        <div className="pp-nav-actions">
          <button
            onClick={() => setShowModal(true)}
            className="pp-post-btn"
          >
            + Post a game
          </button>

          <div className="pp-avatar-wrap">
            <div
              title={profile ? profile.name : "Profile"}
              onClick={() => setShowAccountMenu((v) => !v)}
              className="pp-avatar"
            >
              {profile?.profile_picture ? (
                <img src={resolvePhotoUrl(profile.profile_picture)} alt="" className="pp-avatar-img" />
              ) : profile?.username ? (
                profile.username.slice(0, 2).toUpperCase()
              ) : (
                "?"
              )}
            </div>

            {showAccountMenu && (
              <>
                <div className="pp-menu-backdrop" onClick={() => setShowAccountMenu(false)} />
                <div className="pp-account-menu">
                  <button
                    className="pp-account-menu-item"
                    onClick={() => {
                      setShowAccountMenu(false);
                      setShowProfileModal(true);
                    }}
                  >
                    Profile
                  </button>
                  <button
                    className="pp-account-menu-item pp-account-menu-item--danger"
                    onClick={() => {
                      setShowAccountMenu(false);
                      logout();
                    }}
                  >
                    Log out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Hero banner */}
      <div className="pp-hero">
        <div>
          <span className="pp-live-badge">
            <span className="pulsing-dot pp-live-dot" />
            LIVE - UCF verified only
          </span>
          <h1 className="pp-hero-title">
            Welcome{profile?.username ? `, ${profile.username}` : ""}
          </h1>
          <p className="pp-hero-subtitle">
            Tap a game to join, or post your own.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="pp-hero-btn"
        >
          Post a game
        </button>
      </div>

      {/* Filters — apply to both the feed and the map, since they share visibleGames */}
      <div className="pp-filter-wrap">
        <PostsFilterBar
          sportFilter={sportFilter}
          onSportFilterChange={setSportFilter}
          skillFilter={skillFilter}
          onSkillFilterChange={setSkillFilter}
          rangeFilter={rangeFilter}
          onRangeFilterChange={setRangeFilter}
          hasUserPosition={Boolean(userPosition)}
        />
      </div>

      {/* Narrow-screen toggle between the posts feed and the map */}
      {isNarrow && (
        <div className="pp-toggle-wrap">
          <div className="pp-toggle">
            {["posts", "map"].map((view) => {
              const active = mobileView === view;
              return (
                <button
                  key={view}
                  onClick={() => setMobileView(view)}
                  className={`pp-toggle-btn${active ? " pp-toggle-btn--active" : ""}`}
                >
                  {view === "posts" ? "Posts" : "Map"}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main content */}
      {isNarrow ? (
        <div className="pp-mobile-content">
          <div
            className="pp-swipe-viewport"
            ref={swipeViewportRef}
            onTouchStart={handleSwipeTouchStart}
            onTouchMove={handleSwipeTouchMove}
            onTouchEnd={handleSwipeTouchEnd}
          >
            <div
              className={`pp-swipe-track${isDragging ? "" : " pp-swipe-track--animated"}`}
              style={{
                transform: `translateX(calc(${mobileView === "posts" ? "0%" : "-50%"} + ${dragOffset}px))`,
              }}
            >
              <div className="pp-swipe-pane">{postsPanel}</div>
              <div className="pp-swipe-pane">{mapPanel}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="pp-content">
          <div className="pp-posts-col">{postsPanel}</div>
          <div className="pp-map-col">
            {mapPanel}
          </div>
        </div>
      )}

      {(showModal || editingGame) && (
        <PostGameModal
          game={editingGame}
          onClose={() => {
            setShowModal(false);
            setEditingGame(null);
          }}
          onSaved={handleSaved}
        />
      )}

      {showProfileModal && (
        <ProfileModal
          user={profile}
          onClose={() => setShowProfileModal(false)}
          onSaved={(updated) => setProfile((prev) => ({ ...prev, ...updated }))}
        />
      )}

      {selectedGame && (
        <GameDetailModal
          game={selectedGame}
          currentUserId={currentUserId}
          onClose={() => setSelectedGameId(null)}
          onJoin={requestJoin}
          onLeave={handleLeave}
          joiningId={joiningId}
          leavingId={leavingId}
        />
      )}

      {joinTarget && (
        <JoinPartySizeModal
          game={joinTarget}
          onClose={() => setJoinTargetId(null)}
          onConfirm={(partySize) => handleJoin(joinTarget, partySize)}
          busy={joiningId === joinTarget._id}
          error={joinError}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete this game?"
          message={`Your ${confirmDelete.sport} game at ${confirmDelete.location} will be permanently removed. This can't be undone.`}
          confirmLabel="Delete"
          danger
          busy={deletingId === confirmDelete._id}
          onConfirm={handleDeleteConfirmed}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

export default PostsPage;

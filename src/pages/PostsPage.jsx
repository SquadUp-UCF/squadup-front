import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiBell, FiPlus } from "react-icons/fi";
import MapComponent from "../components/PostPage/MapComponent";
import PostsList from "../components/PostPage/PostsList";
import PostGameModal from "../components/PostPage/PostGameModal";
import ConfirmModal from "../components/PostPage/ConfirmModal";
import ProfileModal from "../components/PostPage/ProfileModal";
import GameDetailModal from "../components/PostPage/GameDetailModal";
import JoinGuestsModal from "../components/PostPage/JoinGuestsModal";
import RatingModal from "../components/PostPage/RatingModal";
import NotificationsPanel from "../components/PostPage/NotificationsPanel";
import Logo from "../components/Logo";
import { useSavedGames } from "../contexts/SavedGamesContext";
import {
  isActive,
  milesBetween,
  resolvePhotoUrl,
  DEFAULT_VIEW_RADIUS_MILES,
  matchesSkillFilter,
  activeCount,
} from "../utils/games";
import { getNotifications, markAllNotificationsRead, clearAllNotifications } from "../utils/notifications";
import PostsFilterBar from "../components/PostPage/PostsFilterBar";
import "./PostsPage.css";

// How often to re-poll for new notifications while the tab is open — mirrors
// squadup-app's NotificationsProvider polling interval.
const NOTIF_POLL_MS = 30_000;

// How often to silently re-fetch games/pending-ratings so other people's
// changes (someone joining, a game filling up or completing) show up on
// their own, without the user needing to reload the page.
const GAMES_POLL_MS = 15_000;

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
  const { isSaved } = useSavedGames();

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
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(true);
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

  // Posts filter bar — all client-side over the fetched `games`.
  const [sportFilter, setSportFilter] = useState("all");
  const [skillFilter, setSkillFilter] = useState("all");
  // When on, narrows the feed + map to only games the user has saved.
  const [savedOnly, setSavedOnly] = useState(false);

  // Sort — "distance"/"recent"/"players", applied on top of the filters
  // above. Distinct from the sport/skill/range filters: this only reorders
  // visibleGames, never hides anything.
  const [sortBy, setSortBy] = useState("recent");
  const [sortDir, setSortDir] = useState("desc");

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

  // `silent` skips the loading flag for background polls — otherwise every
  // periodic refresh would flash "Loading games…" and blank the feed.
  const loadGames = useCallback(({ silent = false } = {}) => {
    if (!silent) setLoading(true);
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
        if (err !== "unauthorized" && !silent) {
          setError("Could not load games. Please try again.");
        }
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }, [navigate]);

  useEffect(() => {
    loadGames();
    // Auto-refresh so other people's changes (new games, someone joining,
    // a game filling up/completing) show up without a manual page reload.
    const interval = setInterval(() => loadGames({ silent: true }), GAMES_POLL_MS);
    return () => clearInterval(interval);
  }, [loadGames]);

  // Completed games the caller played in but hasn't rated yet. Shown one at a
  // time via RatingModal; re-fetched after loadGames and whenever a game is
  // marked completed (handleGameUpdated), since that's what makes a game
  // newly eligible.
  const [pendingRatings, setPendingRatings] = useState([]);
  const [ratingBusy, setRatingBusy] = useState(false);

  const loadPendingRatings = useCallback(() => {
    fetch(`${API}/games/pending-ratings`, { headers: { Authorization: `Bearer ${token()}` } })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setPendingRatings(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadPendingRatings();
    const interval = setInterval(loadPendingRatings, GAMES_POLL_MS);
    return () => clearInterval(interval);
  }, [loadPendingRatings]);

  async function handleRateSubmit(ratings) {
    const target = pendingRatings[0];
    if (!target) return;
    setRatingBusy(true);
    try {
      await fetch(`${API}/games/${target._id}/ratings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({ ratings }),
      });
    } catch {
      // swallow — worst case this game is offered again next load
    } finally {
      setRatingBusy(false);
      setPendingRatings((prev) => prev.slice(1));
    }
  }

  // "Later" — dismiss for this session only; the game re-appears in
  // pending-ratings on the next load until it's actually rated.
  function handleRateLater() {
    setPendingRatings((prev) => prev.slice(1));
  }

  // Notifications — polled in the background (like squadup-app) so the
  // bell's unread badge updates even while the dropdown is closed.
  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  const loadNotifications = useCallback(() => {
    getNotifications().then((data) => {
      setNotifications(data);
      setNotifLoading(false);
    });
  }, []);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, NOTIF_POLL_MS);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  function toggleNotifPanel() {
    setShowNotifPanel((wasOpen) => {
      const willOpen = !wasOpen;
      if (willOpen) {
        setShowAccountMenu(false);
        loadNotifications();
      } else if (notifications.some((n) => !n.read)) {
        // Mirrors squadup-app: closing the panel marks everything read,
        // rather than requiring a per-item "mark read" action.
        markAllNotificationsRead();
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
      return willOpen;
    });
  }

  function handleClearNotifications() {
    clearAllNotifications();
    setNotifications([]);
  }

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

  // Reconciles an in-place game update (guest add/remove, position change,
  // marking completed) coming back from GameDetailModal — no refetch needed
  // since the API already returns the full updated document.
  function handleGameUpdated(updatedGame) {
    setGames((prev) => prev.map((g) => (g._id === updatedGame._id ? updatedGame : g)));
    if (updatedGame.status === "completed") loadPendingRatings();
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

  // Opens the guest picker rather than joining immediately — the actual
  // request fires from there, once the caller confirms who (if anyone)
  // they're bringing.
  function requestJoin(game) {
    setJoinError("");
    setJoinTargetId(game._id);
  }

  async function handleJoin(game, guests = []) {
    setJoiningId(game._id);
    try {
      const res = await fetch(`${API}/games/${game._id}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({ guests }),
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
  // filter bar's sport/skill picks narrow what's visible.
  const visibleGames = useMemo(() => {
    return games.filter((g) => {
      if (typeof g.latitude !== "number" || typeof g.longitude !== "number") return false;
      if (sportFilter !== "all" && (g.sport || "").toLowerCase() !== sportFilter) return false;
      if (!matchesSkillFilter(g, skillFilter)) return false;
      if (savedOnly && !isSaved(g._id)) return false;
      return true;
    });
  }, [games, sportFilter, skillFilter, savedOnly, isSaved]);

  // Sort pass — layered on top of the filtered set above, never hides games.
  // "Distance" falls back to leaving order unchanged when the viewer's
  // location isn't known yet (the pill itself is disabled in that case).
  const sortedVisibleGames = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    const withKey = visibleGames.map((g) => {
      let key;
      if (sortBy === "distance" && userPosition) {
        key = milesBetween(userPosition, [g.latitude, g.longitude]);
      } else if (sortBy === "players") {
        key = activeCount(g);
      } else {
        key = new Date(g.createdAt || g.start_time).getTime();
      }
      return { g, key };
    });
    withKey.sort((a, b) => (a.key - b.key) * dir);
    return withKey.map((x) => x.g);
  }, [visibleGames, sortBy, sortDir, userPosition]);

  const postsPanel = (
    <PostsList
      games={sortedVisibleGames}
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
          <div className="pp-bell-wrap">
            <button
              onClick={toggleNotifPanel}
              aria-label="Notifications"
              className="pp-bell-btn"
            >
              <FiBell size={20} />
              {unreadNotifCount > 0 && (
                <span className="pp-bell-badge">{unreadNotifCount > 9 ? "9+" : unreadNotifCount}</span>
              )}
            </button>

            {showNotifPanel && (
              <>
                <div className="pp-menu-backdrop" onClick={toggleNotifPanel} />
                <NotificationsPanel
                  notifications={notifications}
                  loading={notifLoading}
                  onClear={handleClearNotifications}
                />
              </>
            )}
          </div>

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
      </div>

      {/* Filters — apply to both the feed and the map, since they share visibleGames */}
      <div className="pp-filter-wrap">
        <PostsFilterBar
          sportFilter={sportFilter}
          onSportFilterChange={setSportFilter}
          skillFilter={skillFilter}
          onSkillFilterChange={setSkillFilter}
          savedOnly={savedOnly}
          onSavedOnlyChange={setSavedOnly}
          hasUserPosition={Boolean(userPosition)}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
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
          onUpdated={handleGameUpdated}
        />
      )}

      {joinTarget && (
        <JoinGuestsModal
          game={joinTarget}
          onClose={() => setJoinTargetId(null)}
          onConfirm={(guests) => handleJoin(joinTarget, guests)}
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

      {pendingRatings[0] && (
        <RatingModal
          game={pendingRatings[0]}
          currentUserId={currentUserId}
          busy={ratingBusy}
          onSubmit={handleRateSubmit}
          onClose={handleRateLater}
        />
      )}

      <button
        onClick={() => setShowModal(true)}
        aria-label="Create game"
        className="pp-fab"
      >
        <FiPlus size={20} />
        Create game
      </button>
    </div>
  );
}

export default PostsPage;

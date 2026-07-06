import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import MapComponent from "../components/MapComponent";
import PostsList from "../components/PostsList";
import PostGameModal from "../components/PostGameModal";
import ConfirmModal from "../components/ConfirmModal";
import Logo from "../components/Logo";
import { isActive, milesBetween } from "../utils/games";

const DEFAULT_RADIUS = 5;

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
  const [showModal, setShowModal] = useState(false);
  const [editingGame, setEditingGame] = useState(null); // game being edited, or null

  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joiningId, setJoiningId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // game pending deletion
  const [userPosition, setUserPosition] = useState(null); // [lat, lng] or null
  const [radiusMiles, setRadiusMiles] = useState(DEFAULT_RADIUS);

  // Find the user once so we can filter posts to those within the chosen range.
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPosition([pos.coords.latitude, pos.coords.longitude]),
      () => {}
    );
  }, []);

  const token = () => localStorage.getItem("token");

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

  async function handleJoin(game) {
    setJoiningId(game._id);
    try {
      const res = await fetch(`${API}/games/${game._id}/join`, {
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
      setJoiningId(null);
    }
  }

  const currentUserId = user?._id || user?.id;

  // Only show games within the selected range of the user. Without a known
  // location we can't measure distance, so everything is shown.
  const visibleGames = useMemo(() => {
    if (!userPosition) return games;
    return games.filter(
      (g) =>
        typeof g.latitude === "number" &&
        typeof g.longitude === "number" &&
        milesBetween(userPosition, [g.latitude, g.longitude]) <= radiusMiles
    );
  }, [games, userPosition, radiusMiles]);

  const postsPanel = (
    <PostsList
      games={visibleGames}
      loading={loading}
      error={error}
      currentUserId={currentUserId}
      onJoin={handleJoin}
      joiningId={joiningId}
      onEdit={setEditingGame}
      onDelete={setConfirmDelete}
      deletingId={deletingId}
    />
  );

  const mapPanel = (
    <MapComponent
      games={visibleGames}
      userPosition={userPosition}
      radiusMiles={radiusMiles}
      onRadiusChange={setRadiusMiles}
      height={isNarrow ? "calc(100vh - 200px)" : "calc(100vh - 140px)"}
    />
  );

  return (
    <div style={{ minHeight: "100vh", background: "#E9F5E4", fontFamily: "sans-serif" }}>
      {/* Top nav */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 32px",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#FFFFFF",
              boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
            }}
          >
            <Logo size={28} />
          </span>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#1A1A1A" }}>
            Squad-Up
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={() => setShowModal(true)}
            style={{
              background: "#2F8F4E",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 20,
              padding: "10px 20px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + Post a game
          </button>

          <div
            title={user ? user.name : "Profile"}
            onClick={logout}
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "#CDEBCD",
              color: "#1F6B3E",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {user?.username ? user.username.slice(0, 2).toUpperCase() : "?"}
          </div>
        </div>
      </div>

      {/* Hero banner */}
      <div
        style={{
          margin: "0 32px 24px",
          background: "#1F6B3E",
          borderRadius: 16,
          padding: "32px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 20,
        }}
      >
        <div>
          <span
            style={{
              background: "rgba(255,255,255,0.15)",
              color: "#FFFFFF",
              padding: "4px 12px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              className="pulsing-dot"
              style={{
                width: 8,
                height: 8,
                border: "none",
                "--dot-spread": "8px",
              }}
            />
            LIVE - UCF verified only
          </span>
          <h1
            style={{
              color: "#FFFFFF",
              fontSize: 36,
              margin: "12px 0 8px",
            }}
          >
            Welcome{user?.username ? `, ${user.username}` : ""}
          </h1>
          <p style={{ color: "#D9EFD9", margin: 0 }}>
            Tap a game to join, or post your own.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          style={{
            background: "#FFFFFF",
            color: "#1F6B3E",
            border: "none",
            borderRadius: 20,
            padding: "12px 24px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Post a game
        </button>
      </div>

      {/* Narrow-screen toggle between the posts feed and the map */}
      {isNarrow && (
        <div style={{ padding: "0 32px 16px" }}>
          <div
            style={{
              display: "flex",
              background: "#FFFFFF",
              borderRadius: 12,
              padding: 4,
              gap: 4,
            }}
          >
            {["posts", "map"].map((view) => {
              const active = mobileView === view;
              return (
                <button
                  key={view}
                  onClick={() => setMobileView(view)}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: "pointer",
                    textTransform: "capitalize",
                    background: active ? "#2F8F4E" : "transparent",
                    color: active ? "#FFFFFF" : "#1F6B3E",
                  }}
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
        <div style={{ padding: "0 32px 32px" }}>
          {mobileView === "posts" ? postsPanel : mapPanel}
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            gap: 24,
            padding: "0 32px 32px",
            alignItems: "flex-start",
          }}
        >
          <div style={{ flex: "1 1 400px", minWidth: 0 }}>{postsPanel}</div>
          <div style={{ flex: "1 1 500px", minWidth: 0, position: "sticky", top: 24 }}>
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

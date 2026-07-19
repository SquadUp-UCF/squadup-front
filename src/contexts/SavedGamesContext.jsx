/**
 * Tracks which games the signed-in user has "saved" (bookmarked), so the
 * heart on any game card reflects the same state everywhere. Loaded once
 * (GET /users/me/saved-games) and kept in sync optimistically as the user
 * toggles (POST/DELETE /users/me/saved-games/:gameId). Mirrors
 * squadup-app's `contexts/saved-games-context.tsx`.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const API = import.meta.env.VITE_API_URL;

function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${localStorage.getItem("token")}`, ...extra };
}

const SavedGamesContext = createContext(null);

export function SavedGamesProvider({ children }) {
  const [savedIds, setSavedIds] = useState(new Set());
  // Guards against overlapping toggles on the same game double-firing requests.
  const inFlight = useRef(new Set());

  useEffect(() => {
    let active = true;
    fetch(`${API}/users/me/saved-games`, { headers: authHeaders() })
      .then((res) => (res.ok ? res.json() : []))
      .then((games) => {
        if (!active) return;
        const ids = Array.isArray(games) ? games.map((g) => g._id) : [];
        setSavedIds(new Set(ids));
      })
      .catch(() => {
        // Non-fatal — hearts just start empty until the next successful load.
      });
    return () => {
      active = false;
    };
  }, []);

  const isSaved = useCallback((id) => savedIds.has(id), [savedIds]);

  const toggleSaved = useCallback(
    async (id) => {
      if (inFlight.current.has(id)) return;
      const wasSaved = savedIds.has(id);
      inFlight.current.add(id);
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.delete(id);
        else next.add(id);
        return next;
      });
      try {
        const res = await fetch(`${API}/users/me/saved-games/${id}`, {
          method: wasSaved ? "DELETE" : "POST",
          headers: authHeaders(),
        });
        if (!res.ok) throw new Error("request failed");
      } catch {
        // Revert on failure.
        setSavedIds((prev) => {
          const next = new Set(prev);
          if (wasSaved) next.add(id);
          else next.delete(id);
          return next;
        });
      } finally {
        inFlight.current.delete(id);
      }
    },
    [savedIds]
  );

  const value = useMemo(
    () => ({ savedIds, isSaved, toggleSaved }),
    [savedIds, isSaved, toggleSaved]
  );

  return <SavedGamesContext.Provider value={value}>{children}</SavedGamesContext.Provider>;
}

export function useSavedGames() {
  const context = useContext(SavedGamesContext);
  if (!context) {
    throw new Error("useSavedGames must be used within a SavedGamesProvider");
  }
  return context;
}

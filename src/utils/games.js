/**
 * Shared helpers for presenting games in the feed and on the map, so the list
 * card and the map popup stay consistent.
 */

const API = import.meta.env.VITE_API_URL;
const STATIC_BASE = API.replace(/\/api\/?$/, "");

// A game runs for roughly this long; used to decide when it stops being "live".
export const LIVE_WINDOW_MS = 2 * 60 * 60 * 1000;

/**
 * `game.photo_url` is stored as a path relative to the API origin (e.g.
 * `/sports/soccer.svg` or `/uploads/game-banners/<id>.jpg`), not the
 * frontend's — resolving it as-is only works when both are deployed behind
 * the same origin. Prefix it with the API's static origin so it also
 * resolves correctly when the frontend is served separately (e.g. local dev,
 * where the app runs on a different port than the API).
 */
export function resolvePhotoUrl(photoUrl) {
  if (!photoUrl) return null;
  if (/^https?:\/\//i.test(photoUrl)) return photoUrl;
  return `${STATIC_BASE}${photoUrl}`;
}

/**
 * Whether a game has a real, host-uploaded banner rather than the stock
 * per-sport default the backend always falls back to (see squadup-api
 * bannerForSport/isStockBanner). The feed card, map popup, and detail modal
 * all use this — same rule the post editor already uses — so "no banner"
 * means the same thing everywhere: show the sport-icon placeholder instead
 * of trying to render a photo.
 */
export function hasCustomBanner(game) {
  return Boolean(game.photo_url) && !game.photo_url.startsWith("/sports/");
}

export const STATUS_META = {
  open: { bg: "#E4F3E8", color: "#1F6B3E", label: "Open", pin: "#2F8F4E" },
  confirmed: { bg: "#DCEAFB", color: "#1B5FA8", label: "Confirmed", pin: "#1B5FA8" },
  locked: { bg: "#FBE9DC", color: "#A85B1B", label: "Full", pin: "#A85B1B" },
  completed: { bg: "#ECECEC", color: "#555", label: "Completed", pin: "#888888" },
  cancelled: { bg: "#F8DCDC", color: "#A81B1B", label: "Cancelled", pin: "#A81B1B" },
};

export function statusMeta(game) {
  return STATUS_META[game.status] || STATUS_META.open;
}

const SPORT_EMOJI = {
  basketball: "🏀",
  soccer: "⚽",
  football: "🏈",
  tennis: "🎾",
  volleyball: "🏐",
  baseball: "⚾",
  golf: "⛳",
  hockey: "🏒",
  cricket: "🏏",
  pickleball: "🥒",
  running: "🏃",
  swimming: "🏊",
};

export function sportEmoji(sport) {
  return SPORT_EMOJI[(sport || "").toLowerCase()] || "⚡";
}

export function formatWhen(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Sums party_size across joined participants — one account can RSVP for a
// group, so headcount isn't always 1-per-roster-entry (see squadup-api
// GamesService.activePartySize).
export function activeCount(game) {
  return (game.participants || [])
    .filter((p) => p.status === "joined")
    .reduce((sum, p) => sum + (p.party_size || 1), 0);
}

/** A game is "live" while it's underway: started, within the window, not ended. */
export function isLive(game, now = Date.now()) {
  if (game.status === "completed" || game.status === "cancelled") return false;
  const start = new Date(game.start_time).getTime();
  if (Number.isNaN(start)) return false;
  return start <= now && now <= start + LIVE_WINDOW_MS;
}

/** Great-circle distance in miles between two [lat, lng] points (haversine). */
export function milesBetween([lat1, lng1], [lat2, lng2]) {
  const R = 3958.8; // Earth radius in miles
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Shown in the feed/map: upcoming or currently live, never terminal/long-past. */
export function isActive(game, now = Date.now()) {
  if (game.status === "completed" || game.status === "cancelled") return false;
  const start = new Date(game.start_time).getTime();
  if (Number.isNaN(start)) return false;
  return start + LIVE_WINDOW_MS >= now;
}

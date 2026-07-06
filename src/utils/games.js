/**
 * Shared helpers for presenting games in the feed and on the map, so the list
 * card and the map popup stay consistent.
 */

// A game runs for roughly this long; used to decide when it stops being "live".
export const LIVE_WINDOW_MS = 2 * 60 * 60 * 1000;

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

export function activeCount(game) {
  return (game.participants || []).filter((p) => p.status === "joined").length;
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

/**
 * Shared helpers for presenting games in the feed and on the map, so the list
 * card and the map popup stay consistent.
 */

const API = import.meta.env.VITE_API_URL;

// A game runs for roughly this long; used to decide when it stops being "live".
export const LIVE_WINDOW_MS = 2 * 60 * 60 * 1000;

// This is a UCF-only app: the discovery map always anchors here (never on the
// viewer's live location), and it's the reference point new games are capped
// to being created near.
export const UCF_CENTER = [28.6024, -81.2001];

// A host can only drop a game pin within this many miles of campus.
export const MAX_GAME_CREATION_RADIUS_MILES = 5;

export const METERS_PER_MILE = 1609.344;

// The discovery map's "range" (view radius) can't be zoomed out past the same
// 5-mile cap games are confined to, and can be zoomed in as tight as 10 meters.
export const MAX_VIEW_RADIUS_MILES = MAX_GAME_CREATION_RADIUS_MILES;
export const MIN_VIEW_RADIUS_MILES = 10 / METERS_PER_MILE;

// The map no longer hides games outside the chosen range (see PostsPage's
// visibleGames), so there's no reason to default the slider to the widest
// possible view — a tighter starting zoom reads better and is still just a
// starting point the slider can widen back out to MAX_VIEW_RADIUS_MILES.
export const DEFAULT_VIEW_RADIUS_MILES = 0.3;

export function milesToMeters(miles) {
  return miles * METERS_PER_MILE;
}

export function metersToMiles(meters) {
  return meters / METERS_PER_MILE;
}

/** Human label for a radius, in meters below 0.1mi and miles above it. */
export function formatRadius(miles) {
  const meters = milesToMeters(miles);
  if (miles < 0.1) {
    return `${Math.round(meters)} m`;
  }
  return `${miles.toFixed(1)} mi`;
}

/** Roughly converts a mile radius into a lat/lng bounding box around a center point. */
export function getBoundsForRadius(center, radiusMiles) {
  const [lat, lng] = center;
  const milesPerDegreeLat = 69;
  const milesPerDegreeLng = 69 * Math.cos((lat * Math.PI) / 180);
  const latDelta = radiusMiles / milesPerDegreeLat;
  const lngDelta = radiusMiles / milesPerDegreeLng;
  return [
    [lat - latDelta, lng - lngDelta],
    [lat + latDelta, lng + lngDelta],
  ];
}

/**
 * `game.photo_url` / a user's `profile_picture` is stored as a path relative
 * to the API origin (e.g. `/sports/soccer.svg` or
 * `/uploads/game-banners/<id>.jpg`), not the frontend's — resolving it as-is
 * only works when both are deployed behind the same origin.
 *
 * In production the API sits behind a reverse proxy that forwards only
 * `/api/*` to it (see squadup-api's main.ts) — a bare `${origin}/uploads/...`
 * URL 404s there even though it works in local dev. The backend also mounts
 * the same static files under `/api/uploads` and `/api/sports` in every
 * environment specifically for this reason, so resolving through the API
 * base (which already ends in `/api`) instead of stripping it off is what
 * makes images load in both dev and prod.
 */
export function resolvePhotoUrl(photoUrl) {
  if (!photoUrl) return null;
  if (/^https?:\/\//i.test(photoUrl)) return photoUrl;
  return `${API}${photoUrl}`;
}

/**
 * Whether a game has a real, host-uploaded banner rather than the stock
 * per-sport default the backend always falls back to (see squadup-api
 * bannerForSport/isStockBanner). The feed card, map popup, and detail modal
 * all use this — same rule the post editor already uses — so "no banner"
 * means the same thing everywhere: show the sport-icon placeholder instead
 * of trying to render a photo.
 */
/**
 * Resolved banner image URL for a game — either the host's custom upload or
 * the backend's default `/sports/<sport>.svg` banner (a 1200×400 sport
 * illustration). Returns null only when the game has no photo at all, in which
 * case callers fall back to the gradient + sport icon. The mobile app renders
 * these default sport banners, so the web feed/map/detail views do too.
 */
export function bannerUrl(game) {
  return game?.photo_url ? resolvePhotoUrl(game.photo_url) : null;
}

// Mirrors squadup-api's `GameSkillLevel` enum (games/schemas/game.schema.ts) —
// "all" means the host welcomes any skill, same as leaving it unset.
export const GAME_SKILL_LEVELS = ["beginner", "intermediate", "pro"];

export function skillLabel(level) {
  if (!level || level === "all") return "All levels";
  return level.charAt(0).toUpperCase() + level.slice(1);
}

/** Whether a game (given its own skill_level) matches a viewer's filter pick. */
export function matchesSkillFilter(game, skillFilter) {
  if (!skillFilter || skillFilter === "all") return true;
  const level = (game.skill_level || "all").toLowerCase();
  return level === "all" || level === skillFilter;
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

/**
 * Whether a game's start time has already passed — mirrors squadup-api's own
 * `join()` check ("Game has already started"), so the UI can disable the
 * join button proactively instead of only finding out from a failed request.
 */
export function hasStarted(game, now = Date.now()) {
  const start = new Date(game.start_time).getTime();
  return !Number.isNaN(start) && start <= now;
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

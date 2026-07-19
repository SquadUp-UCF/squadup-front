/**
 * Notification API helpers + presentation data. Mirrors squadup-app's
 * `services/notifications.ts` (fetch/mark-read) and
 * `components/notifications/notification-icon.tsx` (icon/color per type) so
 * both clients read the same way. The 6 `NotificationType` values here are
 * exactly squadup-api's schema enum (`notifications/schemas/notification.schema.ts`) —
 * there is no dedicated unread-count or delete-one endpoint, so unread count
 * is derived client-side and "clear" uses the (new) DELETE /notifications
 * clear-all route.
 */
import { FiCheckCircle, FiLock, FiUserPlus, FiXCircle, FiTrendingUp, FiClock, FiFlag } from "react-icons/fi";

const API = import.meta.env.VITE_API_URL;

function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${localStorage.getItem("token")}`, ...extra };
}

export async function getNotifications() {
  const res = await fetch(`${API}/notifications`, { headers: authHeaders() });
  if (!res.ok) return [];
  const data = await res.json().catch(() => []);
  return Array.isArray(data) ? data : [];
}

export async function markAllNotificationsRead() {
  await fetch(`${API}/notifications/read-all`, {
    method: "PATCH",
    headers: authHeaders(),
  });
}

export async function clearAllNotifications() {
  await fetch(`${API}/notifications`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}

// Icon + color per type — same palette as elsewhere in the app (statusMeta's
// confirmed/locked/open colors), matching squadup-app's mapping exactly.
export const NOTIFICATION_ICONS = {
  game_confirmed: { Icon: FiCheckCircle, color: "#1B5FA8", bg: "#DCEAFB" },
  game_locked: { Icon: FiLock, color: "#A85B1B", bg: "#FBE9DC" },
  player_joined: { Icon: FiUserPlus, color: "#1b7a32", bg: "#E4F3E8" },
  game_cancelled: { Icon: FiXCircle, color: "#A81B1B", bg: "#F8DCDC" },
  game_filling_up: { Icon: FiTrendingUp, color: "#E4572E", bg: "#FBE9DC" },
  game_starting_soon: { Icon: FiClock, color: "#1b7a32", bg: "#E4F3E8" },
  game_completed: { Icon: FiFlag, color: "#555555", bg: "#ECECEC" },
};

export function notificationIcon(type) {
  return NOTIFICATION_ICONS[type] || { Icon: FiClock, color: "#1b7a32", bg: "#E4F3E8" };
}

/** "now" / "2m" / "3h" / "5d" / "Jul 3" — mirrors squadup-app's formatRelativeTime. */
export function formatRelativeTime(iso) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(then).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

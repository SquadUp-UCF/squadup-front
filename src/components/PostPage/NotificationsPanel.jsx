/**
 * Notification dropdown, opened from the bell icon in PostsPage's nav.
 * Mirrors squadup-app's notifications screen: an icon per type (colored to
 * match squadup-app's `notification-icon.tsx`), title/body/relative time,
 * and unread rows visually marked. "Clear notifications" permanently deletes
 * all of them (DELETE /notifications) rather than just marking them read, so
 * the list doesn't just keep growing — see utils/notifications.js.
 */
import "./NotificationsPanel.css";
import { notificationIcon, formatRelativeTime } from "../../utils/notifications";

export default function NotificationsPanel({ notifications, loading, onClear }) {
  return (
    <div className="pp-notif-panel">
      <div className="pp-notif-header">
        <span className="pp-notif-title">Notifications</span>
        {notifications.length > 0 && (
          <button type="button" className="pp-notif-clear" onClick={onClear}>
            Clear notifications
          </button>
        )}
      </div>

      <div className="pp-notif-list">
        {loading ? (
          <p className="pp-notif-status">Loading…</p>
        ) : notifications.length === 0 ? (
          <p className="pp-notif-status">No notifications yet.</p>
        ) : (
          notifications.map((n) => {
            const { Icon, color, bg } = notificationIcon(n.type);
            return (
              <div
                key={n._id}
                className={`pp-notif-row ${!n.read ? "pp-notif-row--unread" : ""}`}
              >
                <span className="pp-notif-icon" style={{ background: bg, color }}>
                  <Icon size={16} />
                </span>
                <span className="pp-notif-body">
                  <span className="pp-notif-row-title">{n.title}</span>
                  <span className="pp-notif-row-text">{n.body}</span>
                </span>
                <span className="pp-notif-time">{formatRelativeTime(n.createdAt)}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

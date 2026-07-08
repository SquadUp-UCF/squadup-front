import "./ConfirmModal.css";
/**
 * A small confirmation dialog styled to match PostGameModal, used in place of
 * the browser's default confirm() for destructive actions like deleting a game.
 */
export default function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  busy = false,
  onConfirm,
  onClose,
}) {
  return (
    <div
      onClick={busy ? undefined : onClose}
      className="cm-overlay"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="cm-dialog"
      >
        <h2 className="cm-title">{title}</h2>
        <p className="cm-message">{message}</p>

        <div className="cm-actions">
          <button
            onClick={onClose}
            disabled={busy}
            className="cm-btn cm-btn-cancel"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`cm-btn cm-btn-confirm ${danger ? "cm-btn--danger" : ""}`}
          >
            {busy ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

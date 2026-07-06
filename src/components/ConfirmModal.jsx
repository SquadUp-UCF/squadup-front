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
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 2100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#FFFFFF",
          borderRadius: 20,
          padding: 28,
          width: "100%",
          maxWidth: 400,
          boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
        }}
      >
        <h2 style={{ margin: "0 0 10px", fontSize: 20, color: "#1A1A1A" }}>{title}</h2>
        <p style={{ margin: "0 0 24px", color: "#555", fontSize: 14, lineHeight: 1.5 }}>{message}</p>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={onClose}
            disabled={busy}
            style={{
              flex: 1,
              background: "#F1F1F1",
              color: "#333",
              border: "none",
              borderRadius: 12,
              padding: "11px 0",
              fontWeight: 600,
              cursor: busy ? "default" : "pointer",
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            style={{
              flex: 1,
              background: danger ? "#C81E1E" : "#2F8F4E",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 12,
              padding: "11px 0",
              fontWeight: 700,
              cursor: busy ? "default" : "pointer",
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

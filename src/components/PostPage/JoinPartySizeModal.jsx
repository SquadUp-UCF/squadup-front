import { useState } from "react";
import "./ConfirmModal.css";
import "./JoinPartySizeModal.css";
import { activeCount } from "../../utils/games";

/**
 * Shown when "Join game" is clicked, before the actual join request fires —
 * lets the caller RSVP for a group instead of just themselves. `party_size`
 * is capped at however many spots are actually left (see
 * squadup-api GamesService.join, which enforces the same cap server-side).
 */
export default function JoinPartySizeModal({ game, onClose, onConfirm, busy = false, error = "" }) {
  const remaining = Math.max(1, game.max_players - activeCount(game));
  const [partySize, setPartySize] = useState(1);

  return (
    <div onClick={busy ? undefined : onClose} className="cm-overlay">
      <div onClick={(e) => e.stopPropagation()} className="cm-dialog">
        <h2 className="cm-title">How many are joining?</h2>
        <p className="cm-message">
          Include yourself in the count. {remaining} spot{remaining === 1 ? "" : "s"} left.
        </p>

        <div className="jps-stepper">
          <button
            type="button"
            className="jps-stepper-btn"
            onClick={() => setPartySize((n) => Math.max(1, n - 1))}
            disabled={partySize <= 1}
            aria-label="Fewer people"
          >
            −
          </button>
          <span className="jps-stepper-value">{partySize}</span>
          <button
            type="button"
            className="jps-stepper-btn"
            onClick={() => setPartySize((n) => Math.min(remaining, n + 1))}
            disabled={partySize >= remaining}
            aria-label="More people"
          >
            +
          </button>
        </div>

        {error && <p className="jps-error">{error}</p>}

        <div className="cm-actions">
          <button onClick={onClose} disabled={busy} className="cm-btn cm-btn-cancel">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(partySize)}
            disabled={busy}
            className="cm-btn cm-btn-confirm"
          >
            {busy ? "Joining…" : partySize === 1 ? "Join game" : `Join with ${partySize - 1} more`}
          </button>
        </div>
      </div>
    </div>
  );
}

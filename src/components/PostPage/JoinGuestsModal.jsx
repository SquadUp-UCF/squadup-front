import { useState } from "react";
import "./ConfirmModal.css";
import "./JoinGuestsModal.css";
import { FiUserPlus, FiX } from "react-icons/fi";
import { activeCount } from "../../utils/games";
import { positionsForSport } from "../../utils/positions";

/**
 * Shown when "Join game" is clicked, before the actual join request fires —
 * lets the caller bring named guests along instead of just joining alone.
 * Anyone can be added here, not only the host after the fact (mirrors the
 * "Add guest" capability any joined player has from the game's detail view;
 * see squadup-api GamesService.join, which accepts the same `guests` list).
 * There's no plain headcount/party-size option anymore — every extra person
 * is a real named entry on the roster.
 */
export default function JoinGuestsModal({ game, onClose, onConfirm, busy = false, error = "" }) {
  const remaining = Math.max(1, game.max_players - activeCount(game));
  const sportPositions = positionsForSport(game.sport);

  const [guests, setGuests] = useState([]); // { name, position }
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");

  // The caller takes one spot themselves, so the guest list can't exceed
  // however many are left after that.
  const atCapacity = guests.length >= remaining - 1;

  function addGuest(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || atCapacity) return;
    setGuests((prev) => [...prev, { name: trimmed, position: position || undefined }]);
    setName("");
    setPosition("");
  }

  function removeGuest(index) {
    setGuests((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div onClick={busy ? undefined : onClose} className="cm-overlay">
      <div onClick={(e) => e.stopPropagation()} className="cm-dialog">
        <h2 className="cm-title">Bringing anyone with you?</h2>
        <p className="cm-message">
          Add anyone by name — you'll be joined either way. {remaining} spot{remaining === 1 ? "" : "s"} left.
        </p>

        {guests.length > 0 && (
          <ul className="jgm-guest-list">
            {guests.map((g, i) => (
              <li key={i} className="jgm-guest-row">
                <span className="jgm-guest-name">{g.name}</span>
                {g.position && <span className="jgm-guest-position">{g.position}</span>}
                <button
                  type="button"
                  onClick={() => removeGuest(i)}
                  className="jgm-guest-remove"
                  aria-label={`Remove ${g.name}`}
                >
                  <FiX size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {atCapacity ? (
          <p className="jgm-capacity-hint">No more room for guests — every remaining spot is used.</p>
        ) : (
          <form onSubmit={addGuest} className="jgm-add-form">
            <input
              className="pgm-input jgm-add-input"
              placeholder="Guest name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {sportPositions.length > 0 && (
              <select
                className="pgm-input jgm-add-input"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              >
                <option value="">No position</option>
                {sportPositions.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            )}
            <button type="submit" className="jgm-add-btn">
              <FiUserPlus size={14} /> Add
            </button>
          </form>
        )}

        {error && <p className="jps-error">{error}</p>}

        <div className="cm-actions">
          <button onClick={onClose} disabled={busy} className="cm-btn cm-btn-cancel">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(guests)}
            disabled={busy}
            className="cm-btn cm-btn-confirm"
          >
            {busy
              ? "Joining…"
              : guests.length > 0
                ? `Join with ${guests.length} guest${guests.length === 1 ? "" : "s"}`
                : "Join game"}
          </button>
        </div>
      </div>
    </div>
  );
}

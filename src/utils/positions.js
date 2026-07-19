/**
 * Per-sport position vocabulary. Mirrors squadup-app's
 * `src/constants/positions.tsx` exactly, so both clients offer the same
 * choices for the same sport — there's no backend endpoint for this (checked:
 * squadup-api has no `/positions` route), it's just shared client-side data.
 * Sports not listed here (golf, running, etc.) have no positions to offer.
 */
export const POSITIONS_BY_SPORT = {
  soccer: ["Goalkeeper", "Defender", "Midfielder", "Forward"],
  football: [
    "Quarterback",
    "Running Back",
    "Wide Receiver",
    "Offensive Line",
    "Defensive Line",
    "Linebacker",
    "Defensive Back",
  ],
  basketball: ["Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Center"],
  baseball: ["Pitcher", "Catcher", "Infield", "Outfield"],
  tennis: ["Singles", "Doubles"],
  hockey: ["Goaltender", "Defense", "Center", "Wing"],
  volleyball: ["Setter", "Outside Hitter", "Middle Blocker", "Opposite", "Libero"],
  rugby: ["Forward", "Back"],
  cricket: ["Batter", "Bowler", "All-rounder", "Wicketkeeper"],
  "table-tennis": ["Singles", "Doubles"],
  badminton: ["Singles", "Doubles"],
};

/** The position list for a sport slug, or an empty array when it has none. */
export function positionsForSport(sport) {
  return POSITIONS_BY_SPORT[(sport || "").toLowerCase()] ?? [];
}

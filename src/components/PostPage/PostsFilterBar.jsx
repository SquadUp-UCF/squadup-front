/**
 * Filter row shown above the posts feed. All three filters are purely
 * client-side (see PostsPage's `visibleGames`): sport and skill level filter
 * against each game's own fields, while "range" filters by the viewer's
 * actual device location — a separate concept from the map's own UCF-anchored
 * view radius.
 */
import "./PostsFilterBar.css";
import { availableSports } from "../SportIcons";
import { GAME_SKILL_LEVELS, skillLabel } from "../../utils/games";

function sportLabel(key) {
  return key.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// "Any distance" is represented as null.
const RANGE_FILTER_OPTIONS = [0.5, 1, 3, 5, 10];

export default function PostsFilterBar({
  sportFilter,
  onSportFilterChange,
  skillFilter,
  onSkillFilterChange,
  rangeFilter,
  onRangeFilterChange,
  hasUserPosition,
}) {
  const isFiltered = sportFilter !== "all" || skillFilter !== "all" || rangeFilter !== null;

  function reset() {
    onSportFilterChange("all");
    onSkillFilterChange("all");
    onRangeFilterChange(null);
  }

  return (
    <div className="pfb-bar">
      <div className="pfb-field">
        <label className="pfb-label" htmlFor="pfb-sport">Sport</label>
        <select
          id="pfb-sport"
          className="pfb-select"
          value={sportFilter}
          onChange={(e) => onSportFilterChange(e.target.value)}
        >
          <option value="all">All sports</option>
          {availableSports.map((s) => (
            <option key={s} value={s}>{sportLabel(s)}</option>
          ))}
        </select>
      </div>

      <div className="pfb-field">
        <label className="pfb-label" htmlFor="pfb-skill">Skill level</label>
        <select
          id="pfb-skill"
          className="pfb-select"
          value={skillFilter}
          onChange={(e) => onSkillFilterChange(e.target.value)}
        >
          <option value="all">All levels</option>
          {GAME_SKILL_LEVELS.map((level) => (
            <option key={level} value={level}>{skillLabel(level)}</option>
          ))}
        </select>
      </div>

      <div className="pfb-field">
        <label className="pfb-label" htmlFor="pfb-range">Range (from you)</label>
        <select
          id="pfb-range"
          className="pfb-select"
          value={rangeFilter === null ? "any" : String(rangeFilter)}
          onChange={(e) => {
            const v = e.target.value;
            onRangeFilterChange(v === "any" ? null : Number(v));
          }}
          disabled={!hasUserPosition}
          title={hasUserPosition ? undefined : "Enable location access to use this filter"}
        >
          <option value="any">Any distance</option>
          {RANGE_FILTER_OPTIONS.map((mi) => (
            <option key={mi} value={mi}>Within {mi} mi</option>
          ))}
        </select>
        {!hasUserPosition && (
          <span className="pfb-hint">Enable location to use this</span>
        )}
      </div>

      {isFiltered && (
        <button type="button" className="pfb-reset" onClick={reset}>
          Clear filters
        </button>
      )}
    </div>
  );
}

/**
 * Filter/sort row shown above the posts feed. Two separate concerns:
 *  - "Sort" (the chevron toggle + pill row): Distance / Most Recent /
 *    Player Count — picks which field PostsPage's `sortedVisibleGames` is
 *    ordered by; the chevron flips ascending/descending on the active pill.
 *    Only reorders the feed, never hides a game.
 *  - "Filter" (the funnel toggle): the sport/skill dropdowns plus a "Saved
 *    games only" toggle — these genuinely exclude games, narrowing PostsPage's
 *    `visibleGames` (which feeds both the feed and the map).
 */
import { useState } from "react";
import "./PostsFilterBar.css";
import { FiFilter, FiChevronsDown } from "react-icons/fi";
import { availableSports } from "../SportIcons";
import { GAME_SKILL_LEVELS, skillLabel } from "../../utils/games";

function sportLabel(key) {
  return key.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const SORT_OPTIONS = [
  { value: "distance", label: "Distance" },
  { value: "recent", label: "Most Recent" },
  { value: "players", label: "Player Count" },
];

export default function PostsFilterBar({
  sportFilter,
  onSportFilterChange,
  skillFilter,
  onSkillFilterChange,
  savedOnly,
  onSavedOnlyChange,
  hasUserPosition,
  sortBy,
  onSortByChange,
  sortDir,
  onSortDirChange,
}) {
  const [showFilters, setShowFilters] = useState(false);
  const isFiltered = sportFilter !== "all" || skillFilter !== "all" || savedOnly;

  function reset() {
    onSportFilterChange("all");
    onSkillFilterChange("all");
    onSavedOnlyChange(false);
  }

  return (
    <div className="pfb-wrap">
      <div className="pfb-toolbar">
        <div className="pfb-sort-wrap">
          <button
            type="button"
            className={`pfb-toolbar-btn ${isFiltered ? "pfb-toolbar-btn--active" : ""}`}
            onClick={() => setShowFilters((v) => !v)}
          >
            <FiFilter size={16} />
            Filter
            {isFiltered && <span className="pfb-filter-dot" />}
          </button>

          {showFilters && (
            <>
              <div className="pfb-panel-backdrop" onClick={() => setShowFilters(false)} />
              <div className="pfb-panel">
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

                <label className="pfb-check">
                  <input
                    type="checkbox"
                    checked={savedOnly}
                    onChange={(e) => onSavedOnlyChange(e.target.checked)}
                  />
                  Saved games only
                </label>

                {isFiltered && (
                  <button type="button" className="pfb-reset" onClick={reset}>
                    Clear filters
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          className="pfb-toolbar-btn pfb-sort-btn"
          onClick={() => onSortDirChange(sortDir === "asc" ? "desc" : "asc")}
          title={sortDir === "asc" ? "Ascending" : "Descending"}
        >
          <FiChevronsDown
            size={16}
            className="pfb-sort-icon"
            style={{ transform: sortDir === "asc" ? "rotate(180deg)" : undefined }}
          />
          Sort
        </button>
      </div>

      <div className="pfb-pills">
        {SORT_OPTIONS.map((opt) => {
          const disabled = opt.value === "distance" && !hasUserPosition;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              title={disabled ? "Enable location access to sort by distance" : undefined}
              onClick={() => onSortByChange(opt.value)}
              className={`pfb-pill ${sortBy === opt.value ? "pfb-pill--active" : ""}`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

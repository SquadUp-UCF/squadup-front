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

// Add/remove a value from a multi-select filter array (OR semantics).
function toggleValue(list, value) {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

export default function PostsFilterBar({
  sportFilters,
  onSportFiltersChange,
  skillFilters,
  onSkillFiltersChange,
  savedOnly,
  onSavedOnlyChange,
  hasUserPosition,
  sortBy,
  onSortByChange,
  sortDir,
  onSortDirChange,
}) {
  const [showFilters, setShowFilters] = useState(false);
  const isFiltered = sportFilters.length > 0 || skillFilters.length > 0 || savedOnly;

  function reset() {
    onSportFiltersChange([]);
    onSkillFiltersChange([]);
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
                  <span className="pfb-label">Sport</span>
                  <div className="pfb-chips">
                    {availableSports.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={`pfb-chip ${sportFilters.includes(s) ? "pfb-chip--active" : ""}`}
                        onClick={() => onSportFiltersChange(toggleValue(sportFilters, s))}
                      >
                        {sportLabel(s)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pfb-field">
                  <span className="pfb-label">Skill level</span>
                  <div className="pfb-chips">
                    {GAME_SKILL_LEVELS.map((level) => (
                      <button
                        key={level}
                        type="button"
                        className={`pfb-chip ${skillFilters.includes(level) ? "pfb-chip--active" : ""}`}
                        onClick={() => onSkillFiltersChange(toggleValue(skillFilters, level))}
                      >
                        {skillLabel(level)}
                      </button>
                    ))}
                  </div>
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

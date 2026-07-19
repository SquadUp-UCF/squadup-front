/**
 * Filter/sort row shown above the posts feed.
 *
 * Two concerns, kept visually and functionally separate:
 *  - "Filter" (the chevron toggle + pill row): Distance / Most Recent /
 *    Player Count / Favorites — picks which field PostsPage's
 *    `sortedVisibleGames` is ordered by; the chevron button flips
 *    ascending/descending on whichever pill is active (it never hides a
 *    game, only reorders the feed).
 *  - "Sort" (the funnel toggle): the sport/skill dropdowns (purely
 *    client-side, see PostsPage's `visibleGames`) tucked behind a toggle
 *    instead of always taking up a full row.
 * (Naming intentionally mirrors what's asked for, not strictly what each
 * control does underneath — see PostsPage for the actual filter-vs-sort
 * mechanics.)
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
  { value: "favorites", label: "Favorites" },
];

export default function PostsFilterBar({
  sportFilter,
  onSportFilterChange,
  skillFilter,
  onSkillFilterChange,
  hasUserPosition,
  sortBy,
  onSortByChange,
  sortDir,
  onSortDirChange,
}) {
  const [showSortFields, setShowSortFields] = useState(false);
  const isFiltered = sportFilter !== "all" || skillFilter !== "all";

  function reset() {
    onSportFilterChange("all");
    onSkillFilterChange("all");
  }

  return (
    <div className="pfb-wrap">
      <div className="pfb-toolbar">
        <button
          type="button"
          className="pfb-toolbar-btn pfb-filter-btn"
          onClick={() => onSortDirChange(sortDir === "asc" ? "desc" : "asc")}
          title={sortDir === "asc" ? "Ascending" : "Descending"}
        >
          <FiChevronsDown
            size={16}
            className="pfb-sort-icon"
            style={{ transform: sortDir === "asc" ? "rotate(180deg)" : undefined }}
          />
          Filter
        </button>

        <div className="pfb-sort-wrap">
          <button
            type="button"
            className={`pfb-toolbar-btn ${isFiltered ? "pfb-toolbar-btn--active" : ""}`}
            onClick={() => setShowSortFields((v) => !v)}
          >
            <FiFilter size={16} />
            Sort
            {isFiltered && <span className="pfb-filter-dot" />}
          </button>

          {showSortFields && (
            <>
              <div className="pfb-panel-backdrop" onClick={() => setShowSortFields(false)} />
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

                {isFiltered && (
                  <button type="button" className="pfb-reset" onClick={reset}>
                    Clear filters
                  </button>
                )}
              </div>
            </>
          )}
        </div>
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

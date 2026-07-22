import { useEffect, useRef, useState } from "react";
import { FiHeart, FiClock, FiMapPin, FiUsers } from "react-icons/fi";
import "./HeroPanel.css";
import Logo from "../Logo";
import { SportIcon } from "../SportIcons";
import { skillLabel } from "../../utils/games";
// The live board renders the product's real game-card component look (the pl-*
// styles from PostsList.css) so the auth preview matches the in-app feed. Data
// here is still mock — only the presentation is the real card.
import "../PostPage/PostsList.css";

// Mock games for the always-scrolling "live board" — decorative social proof,
// shaped to what the real GameCard renders (banner image + sport + skill +
// location + fill bar). Banners point at the frontend's own /public/games
// assets, so they load in dev and prod without the API.
const BOARD_GAMES = [
    { sport: "basketball", label: "Basketball", image: "/games/basketball.jpg", location: "UCF Rec Center Courts", time: "Today, 6:30 PM", joined: 6, max: 10, skill: "intermediate", live: true },
    { sport: "soccer", label: "Soccer", image: "/games/soccer.jpg", location: "Blanchard Soccer Fields", time: "Tomorrow, 7:00 PM", joined: 8, max: 14, isNew: true },
    { sport: "volleyball", label: "Beach Volleyball", image: "/games/volleyball.jpg", location: "Lake Claire Courts", time: "Today, 7:00 PM", joined: 9, max: 10, skill: "beginner", isNew: true },
    { sport: "tennis", label: "Tennis Doubles", image: "/games/tennis.jpg", location: "UCF Tennis Complex", time: "Fri, 5:30 PM", joined: 2, max: 4, skill: "intermediate" },
    { sport: "table-tennis", label: "Table Tennis", image: "/games/table-tennis.jpg", location: "Union Table Tennis", time: "Sat, 9:00 AM", joined: 3, max: 4, skill: "beginner" },
    { sport: "running", label: "Running", image: "/games/running.jpg", location: "Riverwalk 5K Club", time: "Thu, 6:00 AM", joined: 22, max: 40 },
];

// Decorative mirror of the in-app PostsList GameCard (same pl-* markup/styles).
// No handlers — the board is a non-interactive auto-scrolling marquee.
function GameCard({ g }) {
    const ratio = g.max > 0 ? Math.min(1, g.joined / g.max) : 0;
    const fillingUp = ratio >= 0.8 && !g.live;
    const barColor = ratio >= 0.8 ? "#E4572E" : "#2F8F4E";

    return (
        <div className="pl-card">
            <div
                className="pl-card-header"
                style={{ background: `center/cover no-repeat url(${g.image})` }}
            >
                <div className="pl-badges pl-badges-left">
                    {g.live ? (
                        <span className="pl-badge" style={{ background: "#FDE6E6", color: "#C81E1E" }}>
                            <span className="game-marker-live pl-live-dot" />
                            LIVE
                        </span>
                    ) : (
                        g.isNew && (
                            <span className="pl-badge" style={{ background: "#E4F3E8", color: "#1F6B3E" }}>✨ NEW</span>
                        )
                    )}
                    {fillingUp && (
                        <span className="pl-badge" style={{ background: "#E4572E", color: "#FFFFFF" }}>Filling up</span>
                    )}
                </div>
                <div className="pl-badges pl-badges-right">
                    <span className="pl-icon-btn"><FiHeart size={16} color="#666" /></span>
                </div>
            </div>

            <div className="pl-body">
                <span className="pl-sport-pill" style={{ background: "#E4F3E8", color: "#1F6B3E" }}>
                    <SportIcon sport={g.sport} size={16} color="#1F6B3E" />
                    {g.label}
                </span>
                {g.skill && <span className="pl-skill-pill">{skillLabel(g.skill)}</span>}

                <h3 className="pl-title">
                    <FiMapPin size={18} color="#2F8F4E" className="pl-title-pin" />
                    {g.location}
                </h3>

                <div className="pl-meta-row">
                    <span className="pl-meta-item"><FiClock size={15} /> {g.time}</span>
                    <span className="pl-meta-item pl-meta-count">
                        <FiUsers size={15} /> {g.joined} / {g.max}
                    </span>
                </div>

                <div className="pl-bar-track">
                    <div className="pl-bar-fill" style={{ width: `${ratio * 100}%`, background: barColor }} />
                </div>

                <button className="pl-join pl-join--enabled" tabIndex={-1}>Join game</button>
            </div>
        </div>
    );
}

// ─── Left hero panel ──────────────────────────────────────────────────────────
// Shared across every auth step (sign in/up, OTP verification, profile setup)
// so all three screens present the same split-panel "setup style".

function HeroPanel() {
    const [gamesLive, setGamesLive] = useState(40);
    const spotRef = useRef(null);

    // Live-ticking "games near you" counter for the top pill — social-proof
    // theatre. The stats row below is intentionally static so it stays in sync
    // with the landing page's numbers.
    useEffect(() => {
        const a = setInterval(() => setGamesLive((v) => Math.max(28, Math.min(60, v + (Math.random() < 0.5 ? -1 : 1)))), 3000);
        return () => clearInterval(a);
    }, []);

    // Move a soft green glow with the cursor over the hero background.
    function handleMove(e) {
        const el = spotRef.current;
        if (!el) return;
        const r = e.currentTarget.getBoundingClientRect();
        el.style.background = `radial-gradient(460px circle at ${e.clientX - r.left}px ${e.clientY - r.top}px, rgba(163,230,53,0.16), transparent 62%)`;
    }

    return (
        <div className="su-hero" onMouseMove={handleMove}>
            <div className="su-hero-glow" aria-hidden="true" />
            <div ref={spotRef} className="su-hero-spotlight" aria-hidden="true" />

            <div className="su-hero-top">
                <div className="su-hero-logo">
                    <span className="su-hero-logo-badge">
                        <Logo size={28} />
                    </span>
                    <span className="su-hero-logo-text">Squad-Up</span>
                </div>
                <div className="su-live-pill">
                    <span className="lp-live-dot su-live-pill-dot" />
                    <b>{gamesLive}</b> GAMES LIVE WITHIN 5 MILES
                </div>
            </div>

            <div className="su-hero-copy">
                <h1 className="su-hero-title">
                    Find your next
                    <span className="su-hero-title-accent">game. Right now.</span>
                </h1>
                <p className="su-hero-sub">
                    Connect with local players and discover pickup games nearby.
                </p>
            </div>

            <div className="su-board">
                <div className="su-board-head">
                    <span>▸ LIVE BOARD · NEAR YOU</span>
                </div>
                <div className="lp-marquee su-board-scroll">
                    <div className="lp-marquee-track">
                        {[...BOARD_GAMES, ...BOARD_GAMES].map((g, i) => (
                            <GameCard key={i} g={g} />
                        ))}
                    </div>
                </div>
            </div>

            <div className="su-hero-stats">
                <div className="su-stat">
                    <div className="su-stat-value">12.5K</div>
                    <div className="su-stat-label">STUDENTS CONNECTED</div>
                </div>
                <div className="su-stat">
                    <div className="su-stat-value">380+</div>
                    <div className="su-stat-label">WEEKLY EVENTS</div>
                </div>
                <div className="su-stat">
                    <div className="su-stat-value">48,147</div>
                    <div className="su-stat-label">GAMES CREATED</div>
                </div>
            </div>
        </div>
    );
}

export default HeroPanel;

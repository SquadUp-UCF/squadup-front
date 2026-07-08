import { useEffect, useRef, useState } from "react";
import "./HeroPanel.css";
import Logo from "../Logo";
import { SportIcon } from "../SportIcons";

// Fake games for the always-scrolling "live board" — decorative social proof.
const BOARD_GAMES = [
    { sport: "basketball", title: "Basketball 5v5", place: "Dolores Park · Court 2", dist: "0.4 mi", time: "6:30 PM", joined: 10, max: 10, badge: "TONIGHT", kind: "lime" },
    { sport: "soccer", title: "Soccer 7v7", place: "Mission Playground", dist: "1.1 mi", time: "Tomorrow 7:00 PM", joined: 10, max: 14, badge: "OPEN", kind: "muted" },
    { sport: "table-tennis", title: "Table Tennis", place: "Alta Plaza · Court 3", dist: "2.3 mi", time: "Sat 9:00 AM", joined: 4, max: 4, badge: "FILLING", kind: "orange" },
    { sport: "tennis", title: "Tennis Doubles", place: "Riverside Courts", dist: "0.8 mi", time: "Fri 5:30 PM", joined: 2, max: 4, badge: "OPEN", kind: "muted" },
    { sport: "volleyball", title: "Beach Volleyball", place: "Lake Clara Beach", dist: "3.0 mi", time: "Sun 4:00 PM", joined: 8, max: 12, badge: "NEW", kind: "lime" },
    { sport: "baseball", title: "Softball Pickup", place: "Grady Field", dist: "1.7 mi", time: "Sat 11:00 AM", joined: 12, max: 18, badge: "OPEN", kind: "muted" },
    { sport: "hockey", title: "Street Hockey", place: "Eastside Rink", dist: "2.9 mi", time: "Wed 8:00 PM", joined: 9, max: 10, badge: "FILLING", kind: "orange" },
    { sport: "running", title: "5K Run Club", place: "Riverwalk Loop", dist: "0.6 mi", time: "Thu 6:00 AM", joined: 22, max: 40, badge: "OPEN", kind: "muted" },
];

const BADGE_STYLES = {
    lime: { background: "#a3e635", color: "#0d2b18" },
    orange: { background: "#e8833a", color: "#ffffff" },
    muted: { background: "rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.85)" },
};

function formatK(n) {
    return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}

function BoardRow({ g }) {
    const ratio = g.max > 0 ? Math.min(1, g.joined / g.max) : 0;
    const full = ratio >= 1;
    const barColor = full ? "#e8833a" : "#a3e635";
    const spots = g.max - g.joined;

    return (
        <div className="su-board-row">
            <div className="su-board-top">
                <span className="su-board-icon">
                    <SportIcon sport={g.sport} size={20} color="#ffffff" />
                </span>
                <div className="su-board-info">
                    <div className="su-board-title-row">
                        <span className="su-board-title">{g.title}</span>
                        <span className="su-board-badge" style={BADGE_STYLES[g.kind]}>{g.badge}</span>
                    </div>
                    <div className="su-board-place">{g.place} · {g.dist}</div>
                </div>
                <div className="su-board-when">
                    <div className="su-board-time">{g.time}</div>
                    <div className="su-board-spots">{spots} spot{spots === 1 ? "" : "s"} left</div>
                </div>
            </div>
            <div className="su-board-bottom">
                <div className="su-board-bar">
                    <div className="su-board-bar-fill" style={{ width: `${ratio * 100}%`, background: barColor }} />
                </div>
                <span className="su-board-count">{g.joined}/{g.max}</span>
                <span className="su-board-rsvp">RSVP</span>
            </div>
        </div>
    );
}

// ─── Left hero panel ──────────────────────────────────────────────────────────
// Shared across every auth step (sign in/up, OTP verification, profile setup)
// so all three screens present the same split-panel "setup style".

function HeroPanel() {
    const [gamesLive, setGamesLive] = useState(40);
    const [players, setPlayers] = useState(12428);
    const [created, setCreated] = useState(48120);
    const spotRef = useRef(null);

    // Live-updating counters — social-proof theatre for the landing/auth hero.
    useEffect(() => {
        const a = setInterval(() => setGamesLive((v) => Math.max(28, Math.min(60, v + (Math.random() < 0.5 ? -1 : 1)))), 3000);
        const b = setInterval(() => setPlayers((v) => v + Math.floor(Math.random() * 5) + 1), 1300);
        const c = setInterval(() => setCreated((v) => v + Math.floor(Math.random() * 3) + 1), 900);
        return () => { clearInterval(a); clearInterval(b); clearInterval(c); };
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
                            <BoardRow key={i} g={g} />
                        ))}
                    </div>
                </div>
            </div>

            <div className="su-hero-stats">
                <div className="su-stat">
                    <div className="su-stat-value">{formatK(players)}</div>
                    <div className="su-stat-label">PLAYERS</div>
                </div>
                <div className="su-stat">
                    <div className="su-stat-value">380</div>
                    <div className="su-stat-label">GAMES / WK</div>
                </div>
                <div className="su-stat">
                    <div className="su-stat-value">{created.toLocaleString()}</div>
                    <div className="su-stat-label">GAMES CREATED</div>
                </div>
            </div>
        </div>
    );
}

export default HeroPanel;

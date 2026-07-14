import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MdLocationOn, MdAddCircle, MdGroups, MdCalendarToday, MdEmojiEvents } from "react-icons/md";
import { FiHeart, FiClock, FiMapPin, FiUsers, FiArrowRight, FiPlus } from "react-icons/fi";

import Logo from "../components/Logo";
import "./landingPage.css";

const SPORT_COLOR = {
    tennis: "#8FBF6B",
    basketball: "#E0A85C",
    volleyball: "#6BC5D9",
    soccer: "#7FBF7F",
    "table-tennis": "#C77DD1",
    running: "#E8833A",
};

const FEED_GAMES = [
    { sport: "tennis", label: "Tennis", image: "/games/tennis.jpg", title: "UCF Tennis Complex", time: "Today, 6:00 PM", distance: "0.8 mi", players: "3 / 8 Players", isNew: true },
    { sport: "volleyball", label: "Beach Volleyball", image: "/games/volleyball.jpg", title: "Lake Claire Courts", time: "Today, 7:00 PM", distance: "1.2 mi", players: "5 / 10 Players", isNew: true },
    { sport: "soccer", label: "Soccer", image: "/games/soccer.jpg", title: "Blanchard Soccer Fields", time: "Tomorrow, 9:00 AM", distance: "1.2 mi", players: "8 / 14 Players", isNew: true },
    { sport: "basketball", label: "Basketball", image: "/games/basketball.jpg", title: "UCF Rec Center Courts", time: "Tomorrow, 11:00 AM", distance: "2.1 mi", players: "4 / 10 Players", isNew: true },
    { sport: "table-tennis", label: "Table Tennis", image: "/games/table-tennis.jpg", title: "Union Table Tennis", time: "Mon, 6:00 PM", distance: "0.3 mi", players: "2 / 4 Players", isNew: false },
    { sport: "running", label: "Running", image: "/games/running.jpg", title: "Riverwalk 5K Club", time: "Thu, 6:00 AM", distance: "0.8 mi", players: "18 / 40 Players", isNew: false },
];

const ABOUT_POINTS = [
    { Icon: MdLocationOn, title: "Find games nearby", body: "Browse pickup games happening around campus and the city, filtered by sport, time, and distance." },
    { Icon: MdAddCircle, title: "Post your own", body: "Short a few players? Post a game in seconds and let Squad-Up fill your roster." },
    { Icon: MdGroups, title: "Meet your squad", body: "Play with old friends or meet new ones — Squad-Up is built around showing up together." },
];

const TEAM = [
    { initials: "GB", name: "Grant Bonzo", role: "Mobile frontend" },
    { initials: "ML", name: "Maxwell Lokshin", role: "Database, backend, project manager" },
    { initials: "AZ", name: "Aleksandar Zivkovic", role: "Frontend" },
    { initials: "TB", name: "Tiago Bressar Sabbioni de Lima", role: "Backend/API" },
    { initials: "WG", name: "Will Goodale", role: "Frontend web" },
];

function GameCard({ game }) {
    return (
        <div className="lp-card">
            <div className="lp-card-photo" style={{ backgroundImage: `url(${game.image})` }}>
                {game.isNew && <span className="lp-card-new">NEW</span>}
                <span className="lp-card-heart"><FiHeart size={13} /></span>
            </div>
            <div className="lp-card-body">
                <span className="lp-card-sport" style={{ color: SPORT_COLOR[game.sport] }}>
                    <span className="lp-card-sport-dot" style={{ background: SPORT_COLOR[game.sport] }} />
                    {game.label}
                </span>
                <p className="lp-card-title">{game.title}</p>
                <div className="lp-card-meta">
                    <span className="lp-card-meta-item"><FiClock size={12} /> {game.time}</span>
                    <span className="lp-card-meta-item"><FiMapPin size={12} /> {game.distance}</span>
                    <span className="lp-card-meta-item lp-card-players"><FiUsers size={12} /> {game.players}</span>
                </div>
            </div>
        </div>
    );
}

function LandingPage() {
    const navigate = useNavigate();
    const aboutRef = useRef(null);
    const teamRef = useRef(null);

    const scrollTo = (ref) => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    return (
        <div className="lp-page">
            {/* Top nav */}
            <div className="lp-nav">
                <div className="lp-nav-brand">
                    <span className="lp-nav-logo-badge"><Logo size={36} /></span>
                    <span className="lp-nav-brand-text">Squad-Up</span>
                </div>
                <div className="lp-nav-links">
                    <button className="lp-nav-link" onClick={() => scrollTo(aboutRef)}>About Us</button>
                    <button className="lp-nav-link" onClick={() => scrollTo(teamRef)}>Meet the Team</button>
                    <button className="lp-nav-cta" onClick={() => navigate("/auth")}>Log In / Sign Up</button>
                </div>
            </div>

            {/* Hero — pinned to exactly one screen; the marquee inside never
                lets the user scroll manually, it only runs on its own. */}
            <section className="lp-hero">
                <div className="lp-feed-panel">
                    <div className="lp-feed-head">
                        <span className="lp-feed-pill">
                            <span className="lp-live-dot" /> 6 games nearby
                        </span>
                    </div>

                    <div className="lp-feed-scroll">
                        <div className="lp-marquee-track">
                            {[...FEED_GAMES, ...FEED_GAMES].map((game, i) => (
                                <GameCard key={i} game={game} />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="lp-cta-panel">
                    <span className="lp-live-chip">
                        <span className="lp-live-chip-dot" /> 36 GAMES LIVE WITHIN 5 MILES
                    </span>
                    <h1 className="lp-cta-title">
                        Find your next<br />
                        game. <span className="lp-cta-title-accent">Right now.</span>
                    </h1>
                    <p className="lp-cta-sub">
                        Connect with local players and discover pickup games happening near you.
                    </p>

                    <div className="lp-stats-row">
                        <div className="lp-stat">
                            <MdGroups className="lp-stat-icon" size={22} />
                            <span className="lp-stat-num">12.5K</span>
                            <span className="lp-stat-label">Players</span>
                        </div>
                        <div className="lp-stat">
                            <MdCalendarToday className="lp-stat-icon" size={20} />
                            <span className="lp-stat-num">380</span>
                            <span className="lp-stat-label">Games / Week</span>
                        </div>
                        <div className="lp-stat">
                            <MdEmojiEvents className="lp-stat-icon" size={22} />
                            <span className="lp-stat-num">48,147</span>
                            <span className="lp-stat-label">Games Created</span>
                        </div>
                    </div>

                    <button className="lp-cta-button" onClick={() => navigate("/auth")}>
                        Sign In to Find Matches <FiArrowRight size={17} />
                    </button>
                    <p className="lp-cta-signup">
                        Don't have an account? <button onClick={() => navigate("/auth")}>Sign up free</button>
                    </p>
                </div>

                <button className="lp-fab" onClick={() => navigate("/auth")} aria-label="Post a game">
                    <FiPlus size={24} />
                </button>
            </section>

            {/* About Us — normal document flow, revealed by scrolling past the hero */}
            <div ref={aboutRef} className="lp-about">
                <div className="lp-about-inner">
                    <h2 className="lp-section-title">About Us</h2>
                    <p className="lp-about-sub">
                        We built Squad-Up because organizing a pickup game shouldn't take a group chat
                        with twenty unanswered texts. Post it, fill it, play it.
                    </p>
                    <div className="lp-about-grid">
                        {ABOUT_POINTS.map(({ Icon, title, body }) => (
                            <div className="lp-about-card" key={title}>
                                <div className="lp-about-icon"><Icon size={22} color="#ffffff" /></div>
                                <h3 className="lp-about-card-title">{title}</h3>
                                <p className="lp-about-card-body">{body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Meet the Team */}
            <div ref={teamRef} className="lp-team">
                <h2 className="lp-section-title lp-team-title">Meet the Team</h2>
                <p className="lp-team-sub">The people building Squad-Up</p>
                <div className="lp-team-grid">
                    {TEAM.map((member) => (
                        <div className="lp-team-card" key={member.name}>
                            <div className="lp-team-avatar">{member.initials}</div>
                            <p className="lp-team-name">{member.name}</p>
                            <p className="lp-team-role">{member.role}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="lp-footer">© {new Date().getFullYear()} Squad-Up. All rights reserved.</div>
        </div>
    );
}

export default LandingPage;

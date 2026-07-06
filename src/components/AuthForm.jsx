import { useEffect, useRef, useState } from "react";
import "./AuthForm.css";
import Logo from "./Logo";
import { SportIcon } from "./SportIcons";

// ─── Inline icons (no external icon dependency) ───────────────────────────────

function IconEye({ size = 16 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

function IconEyeOff({ size = 16 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.4M6.6 6.6A13.3 13.3 0 0 0 2 11s3.5 7 10 7a9.1 9.1 0 0 0 5.4-1.6" />
            <path d="M14.1 14.1A3 3 0 0 1 9.9 9.9" />
            <line x1="2" y1="2" x2="22" y2="22" />
        </svg>
    );
}

function IconArrowRight({ size = 16 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
        </svg>
    );
}

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
                <div style={{ flex: 1, minWidth: 0 }}>
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
                    <div style={{ width: `${ratio * 100}%`, height: "100%", borderRadius: 6, background: barColor }} />
                </div>
                <span className="su-board-count">{g.joined}/{g.max}</span>
                <span className="su-board-rsvp">RSVP</span>
            </div>
        </div>
    );
}

// ─── Left hero panel ──────────────────────────────────────────────────────────

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

// ─── Auth form (drop-in replacement; identical props to the original) ─────────

function AuthForm({
    mode,
    firstName, lastName,
    email, password, confirmPassword,
    message,
    onFirstNameChange, onLastNameChange,
    onEmailChange, onPasswordChange, onConfirmPasswordChange,
    onSubmit, onToggleMode,
    onForgotPassword,
}) {
    const [showPass, setShowPass] = useState(false);
    const isSignUp = mode === "register";

    const hasLength = password.length >= 8 && password.length <= 20;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-+=~`[\]/\\;']/.test(password);
    const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

    return (
        <div className="su-auth">
            <HeroPanel />

            <div className="su-panel">
                <div className="su-form-wrap">
                    {/* Mobile-only logo (hidden on desktop where the hero shows it) */}
                    <div className="su-mobile-logo">
                        <span className="su-mobile-logo-badge">
                            <Logo size={24} />
                        </span>
                        <span className="su-mobile-logo-text">Squad-Up</span>
                    </div>

                    <div className="su-head">
                        <h2 className="su-head-title">
                            {isSignUp ? "Create account" : "Welcome back"}
                        </h2>
                        <p className="su-head-sub">
                            {isSignUp
                                ? "Join thousands of players near you."
                                : "Sign in to find your next game."}
                        </p>
                    </div>

                    <form className="su-form" onSubmit={onSubmit}>
                        {isSignUp && (
                            <div className="su-name-row">
                                <div className="su-field">
                                    <label className="su-label">First name</label>
                                    <input
                                        className="su-input"
                                        placeholder="Marcus"
                                        value={firstName}
                                        required
                                        onChange={(e) => onFirstNameChange(e.target.value)}
                                    />
                                </div>
                                <div className="su-field">
                                    <label className="su-label">Last name</label>
                                    <input
                                        className="su-input"
                                        placeholder="Reed"
                                        value={lastName}
                                        required
                                        onChange={(e) => onLastNameChange(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="su-field">
                            <label className="su-label">Email</label>
                            <input
                                className="su-input"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                required
                                onChange={(e) => onEmailChange(e.target.value)}
                            />
                        </div>

                        <div className="su-field">
                            <div className="su-label-row">
                                <label className="su-label">Password</label>
                                {!isSignUp && (
                                    <button
                                        type="button"
                                        className="su-forgot"
                                        onClick={onForgotPassword}
                                    >
                                        Forgot password?
                                    </button>
                                )}
                            </div>
                            <div className="su-input-wrap">
                                <input
                                    className="su-input su-input-pass"
                                    type={showPass ? "text" : "password"}
                                    placeholder={isSignUp ? "At least 8 characters" : "••••••••"}
                                    value={password}
                                    required
                                    minLength={isSignUp ? 8 : undefined}
                                    maxLength={isSignUp ? 20 : undefined}
                                    onChange={(e) => onPasswordChange(e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="su-eye"
                                    onClick={() => setShowPass((v) => !v)}
                                    aria-label={showPass ? "Hide password" : "Show password"}
                                >
                                    {showPass ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                                </button>
                            </div>
                        </div>

                        {isSignUp && (
                            <div className="su-checks">
                                <div className="indicator-row">
                                    <span className={`indicator-dot ${hasLength ? "met" : ""}`} />
                                    8–20 characters
                                </div>
                                <div className="indicator-row">
                                    <span className={`indicator-dot ${hasUpper ? "met" : ""}`} />
                                    1 uppercase letter
                                </div>
                                <div className="indicator-row">
                                    <span className={`indicator-dot ${hasLower ? "met" : ""}`} />
                                    1 lowercase letter
                                </div>
                                <div className="indicator-row">
                                    <span className={`indicator-dot ${hasNumber ? "met" : ""}`} />
                                    1 number
                                </div>
                                <div className="indicator-row">
                                    <span className={`indicator-dot ${hasSpecial ? "met" : ""}`} />
                                    1 special character
                                </div>
                            </div>
                        )}

                        {isSignUp && (
                            <div className="su-field">
                                <label className="su-label">Confirm password</label>
                                <input
                                    className="su-input"
                                    type="password"
                                    placeholder="Re-enter your password"
                                    value={confirmPassword}
                                    required
                                    onChange={(e) => onConfirmPasswordChange(e.target.value)}
                                />
                                <div className="indicator-row su-match">
                                    <span className={`indicator-dot ${passwordsMatch ? "met" : ""}`} />
                                    {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                                </div>
                            </div>
                        )}

                        {isSignUp && (
                            <label className="su-terms">
                                <input type="checkbox" required className="su-terms-box" />
                                <span className="su-terms-text">
                                    I agree to the{" "}
                                    <span className="su-link-inline">Terms of Service</span> and{" "}
                                    <span className="su-link-inline">Privacy Policy</span>
                                </span>
                            </label>
                        )}

                        <button type="submit" className="su-submit">
                            {isSignUp ? "Create Account" : "Sign In"}
                            <IconArrowRight size={16} />
                        </button>

                        {message && <p className="su-message">{message}</p>}
                    </form>

                    <p className="su-toggle">
                        {isSignUp ? "Already have an account? " : "Don't have an account? "}
                        <button type="button" className="su-toggle-btn" onClick={onToggleMode}>
                            {isSignUp ? "Sign in" : "Sign up free"}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default AuthForm;
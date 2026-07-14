import { useState } from "react";
import "./AuthShell.css";
import "./AuthForm.css";
import Logo from "../Logo";
import HeroPanel from "./HeroPanel";

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

    // Restricted to the NID format (two letters + six digits) — keep in sync
    // with the copy of this pattern in AuthPage.jsx.
    const UCF_EMAIL = /^[a-z]{2}\d{6}@ucf\.edu$/i;


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
                                placeholder="ab123456@ucf.edu"
                                value={email}
                                required
                                onChange={(e) => onEmailChange(e.target.value)}
                            />
                            <div className="indicator-row su-match">
                                <span className={`indicator-dot ${UCF_EMAIL.test(email) ? "met" : ""}`} />
                                {UCF_EMAIL.test(email) ? "Valid UCF email" : "Not valid UCF email"}
                            </div>
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
                            </div>
                        )}


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
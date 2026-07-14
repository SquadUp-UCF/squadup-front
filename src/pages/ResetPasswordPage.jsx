/**
 * Landing page for the link emailed by POST /auth/forgot-password — the
 * backend builds it as `${FRONTEND_URL}/reset-password?token=...` (see
 * squadup-api AuthService.forgotPassword), so this route has to exist
 * standalone rather than as a step in AuthPage's in-memory flow: the user
 * arrives here straight from their email client with no prior app state.
 */
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "../components/AuthPage/AuthShell.css";
import "../components/AuthPage/AuthForm.css";
import Logo from "../components/Logo";
import HeroPanel from "../components/AuthPage/HeroPanel";

const API = import.meta.env.VITE_API_URL;

function errorMessage(data, fallback) {
  if (!data) return fallback;
  const m = Array.isArray(data.message) ? data.message.join(", ") : data.message;
  return m || fallback;
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const hasLength = newPassword.length >= 8 && newPassword.length <= 20;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-+=~`[\]/\\;']/.test(newPassword);
  const passwordsMatch = confirmNewPassword.length > 0 && newPassword === confirmNewPassword;

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    if (!token) {
      setMessage("This reset link is missing its token. Request a new one.");
      return;
    }
    if (!hasLength || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      setMessage("Password must be 8-20 characters with an uppercase, lowercase, number, and symbol");
      return;
    }
    if (!passwordsMatch) {
      setMessage("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: newPassword }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setMessage(errorMessage(data, "Could not reset password."));
        return;
      }

      navigate("/auth", { state: { message: "Password reset. Please log in." } });
    } catch {
      setMessage("Network error: is the API reachable?");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="su-auth">
      <HeroPanel />

      <div className="su-panel">
        <div className="su-form-wrap">
          <div className="su-mobile-logo">
            <span className="su-mobile-logo-badge">
              <Logo size={24} />
            </span>
            <span className="su-mobile-logo-text">Squad-Up</span>
          </div>

          <div className="su-head">
            <h2 className="su-head-title">Set a new password</h2>
            <p className="su-head-sub">Choose a new password for your account.</p>
          </div>

          {!token ? (
            <p className="su-message">This reset link is invalid or missing its token.</p>
          ) : (
            <form className="su-form" onSubmit={handleSubmit}>
              <div className="su-field">
                <label className="su-label">New password</label>
                <input
                  className="su-input"
                  type="password"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  required
                  minLength={8}
                  maxLength={20}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

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

              <div className="su-field">
                <label className="su-label">Confirm new password</label>
                <input
                  className="su-input"
                  type="password"
                  placeholder="Re-enter your new password"
                  value={confirmNewPassword}
                  required
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                />
                <div className="indicator-row su-match">
                  <span className={`indicator-dot ${passwordsMatch ? "met" : ""}`} />
                  {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                </div>
              </div>

              <button type="submit" className="su-submit" disabled={submitting}>
                {submitting ? "Resetting…" : "Reset password"}
              </button>

              {message && <p className="su-message">{message}</p>}
            </form>
          )}

          <p className="su-toggle">
            <button type="button" className="su-toggle-btn" onClick={() => navigate("/auth")}>
              Back to log in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

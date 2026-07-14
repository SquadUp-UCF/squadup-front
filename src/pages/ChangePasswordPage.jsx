/**
 * Dedicated page for changing the authenticated user's password, reached from
 * ProfileModal's "Update password" row.
 *
 * A separate page (rather than a modal) because a successful change stamps
 * `password_changed_at` server-side, which retires the current JWT — the user
 * is signed out and sent back to log in, the same interruption a full page
 * navigation implies but a modal wouldn't.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

export default function ChangePasswordPage() {
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Same policy AuthForm checks against at registration: 8-20 chars, upper,
  // lower, number, symbol.
  const hasLength = newPassword.length >= 8 && newPassword.length <= 20;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-+=~`[\]/\\;']/.test(newPassword);
  const passwordsMatch = confirmNewPassword.length > 0 && newPassword === confirmNewPassword;

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    if (!hasLength || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      setMessage("Password must be 8-20 characters with an uppercase, lowercase, number, and symbol");
      return;
    }
    if (!passwordsMatch) {
      setMessage("New passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/auth/change-password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setMessage(errorMessage(data, "Could not change password."));
        return;
      }

      // The change retires the current JWT — send them back to log in.
      localStorage.removeItem("token");
      navigate("/auth", { state: { message: "Password changed. Please log in again." } });
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
            <h2 className="su-head-title">Update password</h2>
            <p className="su-head-sub">Choose a new password for your account.</p>
          </div>

          <form className="su-form" onSubmit={handleSubmit}>
            <div className="su-field">
              <label className="su-label">Current password</label>
              <input
                className="su-input"
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                required
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

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
              {submitting ? "Updating…" : "Update password"}
            </button>

            {message && <p className="su-message">{message}</p>}
          </form>

          <p className="su-toggle">
            <button type="button" className="su-toggle-btn" onClick={() => navigate(-1)}>
              Cancel
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

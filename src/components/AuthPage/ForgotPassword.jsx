import "./AuthShell.css";
import Logo from "../Logo";
import HeroPanel from "./HeroPanel";

// Step shown after "Forgot password?" — collects the email and calls
// POST /auth/forgot-password. The backend always answers with the same
// generic message (sent or not) so this screen can't be used to tell whether
// an email is registered; see squadup-api AuthService.forgotPassword.
function ForgotPassword({ email, onEmailChange, onSubmit, onBack, message, submitting }) {
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
            <h2 className="su-head-title">Reset your password</h2>
            <p className="su-head-sub">
              Enter your UCF email and we'll send you a link to reset your password.
            </p>
          </div>

          <form className="su-form" onSubmit={onSubmit}>
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
            </div>

            <button type="submit" className="su-submit" disabled={submitting}>
              {submitting ? "Sending…" : "Send reset link"}
            </button>

            {message && <p className="su-message">{message}</p>}
          </form>

          <p className="su-toggle">
            <button type="button" className="su-toggle-btn" onClick={onBack}>
              Back to log in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;

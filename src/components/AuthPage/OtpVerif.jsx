import { useEffect, useRef, useState } from "react";
import "./AuthShell.css";
import "./OtpVerif.css";
import Logo from "../Logo";
import HeroPanel from "./HeroPanel";

const OTP_LENGTH = 6;

function OtpVerification({ email, code, onCodeChange, onSubmit, onResend, message }) {
  const [secondsLeft, setSecondsLeft] = useState(60);
  const inputsRef = useRef([]);

  useEffect(() => {
    if (secondsLeft <= 0) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsLeft]);

  function handleResend() {
    if (secondsLeft > 0) return;
    onResend();
    setSecondsLeft(60);
  }

  // The parent keeps `code` as a plain string; derive a fixed 6-slot view so the
  // boxes always reflect it and paste/auto-advance can rebuild it cleanly.
  const boxes = Array.from({ length: OTP_LENGTH }, (_, i) => code[i] || "");
  const filled = boxes.filter(Boolean).length;

  function commit(arr) {
    onCodeChange(arr.join("").slice(0, OTP_LENGTH));
  }

  function focusBox(i) {
    const el = inputsRef.current[i];
    if (el) el.focus();
  }

  // Typing a digit: replace this box and auto-advance to the next.
  function handleChange(i, e) {
    const val = e.target.value.replace(/\D/g, "");
    if (!val) return; // ignore non-digits; deletion is handled on keydown
    const arr = boxes.slice();
    arr[i] = val.slice(-1);
    commit(arr);
    if (i < OTP_LENGTH - 1) focusBox(i + 1);
  }

  function handleKeyDown(i, e) {
    if (e.key === "Backspace") {
      e.preventDefault();
      const arr = boxes.slice();
      if (arr[i]) {
        arr[i] = "";
        commit(arr);
      } else if (i > 0) {
        arr[i - 1] = "";
        commit(arr);
        focusBox(i - 1);
      }
    } else if (e.key === "ArrowLeft" && i > 0) {
      focusBox(i - 1);
    } else if (e.key === "ArrowRight" && i < OTP_LENGTH - 1) {
      focusBox(i + 1);
    }
  }

  // Paste the whole code at once (e.g. straight from the email).
  function handlePaste(e) {
    e.preventDefault();
    const text = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!text) return;
    commit(Array.from({ length: OTP_LENGTH }, (_, k) => text[k] || ""));
    focusBox(Math.min(text.length, OTP_LENGTH - 1));
  }

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
            <h2 className="su-head-title">Verify your email</h2>
            <p className="su-head-sub">
              We sent a one-time code to <b>{email}</b>. Enter it below.
            </p>
          </div>

          <form className="su-form" onSubmit={onSubmit}>
            <div className="otp-boxes" onPaste={handlePaste}>
              {boxes.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => (inputsRef.current[i] = el)}
                  className="otp-box"
                  type="text"
                  inputMode="numeric"
                  autoComplete={i === 0 ? "one-time-code" : "off"}
                  aria-label={`Digit ${i + 1}`}
                  value={d}
                  onChange={(e) => handleChange(i, e)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onFocus={(e) => e.target.select()}
                />
              ))}
            </div>

            <button className="su-submit" type="submit" disabled={filled < OTP_LENGTH}>
              Verify
            </button>

            {message && <p className="su-message">{message}</p>}
          </form>

          <p className="su-toggle">
            Didn't get a code?{" "}
            <button
              type="button"
              className="su-toggle-btn"
              onClick={handleResend}
              disabled={secondsLeft > 0}
            >
              {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : "Resend code"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default OtpVerification;

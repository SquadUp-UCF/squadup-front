import { useEffect, useState } from "react";

function OtpVerification({ email, code, onCodeChange, onSubmit, onResend, message }) {
  const [secondsLeft, setSecondsLeft] = useState(60);

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

  return (
    <div style={{ padding: 40, maxWidth: 320 }}>
      <h2>Verify your email</h2>
      <p style={{ fontSize: 14, color: "#666" }}>
        We sent a one-time code to {email}. Enter it below.
      </p>

      <form onSubmit={onSubmit}>
        <input
          placeholder="6-digit code"
          value={code}
          required
          maxLength={6}
          onChange={(e) => onCodeChange(e.target.value)}
        />
        <br />
        <button type="submit">Verify</button>
      </form>

      <p>
        Didn't get a code?{" "}
        <button onClick={handleResend} disabled={secondsLeft > 0}>
          {secondsLeft > 0 ? `Resend (${secondsLeft}s)` : "Resend"}
        </button>
      </p>

      {message && <p style={{ color: "crimson" }}>{message}</p>}
    </div>
  );
}

export default OtpVerification;
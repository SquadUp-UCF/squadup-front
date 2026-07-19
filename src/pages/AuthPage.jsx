import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import AuthForm from "../components/AuthPage/AuthForm";
import OtpVerification from "../components/AuthPage/OtpVerif";
import ProfileSetup from "../components/AuthPage/ProfileSetup";
import ForgotPassword from "../components/AuthPage/ForgotPassword";

const API = import.meta.env.VITE_API_URL;

// Backend requires 8-20 chars, 1 upper, 1 lower, 1 number, 1 symbol
const PASSWORD_RULE =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_\-+=~`[\]/\\;']).{8,20}$/;
// MUST BE UCF EMAIL — restricted to the NID format (two letters + six
// digits), stricter than the backend's own check (any local part ending in
// @ucf.edu). Keep AuthForm.jsx's copy of this pattern in sync.
const UCF_EMAIL = /^[a-z]{2}\d{6}@ucf\.edu$/i;

// Extract a readable API error ({ message } is a string OR array in Nest).
function errorMessage(data, fallback) {
    if (!data) return fallback;
    const m = Array.isArray(data.message) ? data.message.join(", ") : data.message;
    return m || fallback;
}

// The backend requires a unique username (3-30 chars) at registration. The user
// picks their real one later (after verification), so generate a temporary,
// collision-resistant handle from their name for now.
function makeTempUsername(first, last) {
    const base = `${first}${last}`.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
    const suffix = Math.floor(1000 + Math.random() * 9000); // 4 digits
    return `${base || "user"}${suffix}`;
}

function AuthPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [mode, setMode] = useState("login"); // "login" or "register"
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    // Seeded from router state (e.g. ChangePasswordPage redirects here with a
    // "please log in again" note after a successful password change).
    const [message, setMessage] = useState(location.state?.message || "");

    const [step, setStep] = useState("auth"); // "auth" | "verify" | "profile"
    const [otpCode, setOtpCode] = useState("");
    const [username, setUsername] = useState("");
    const [sport, setSport] = useState("");
    const [pfpFile, setPfpFile] = useState(null);
    const [pendingUser, setPendingUser] = useState(null); // holds user/token between steps
    const [forgotSubmitting, setForgotSubmitting] = useState(false);

    // HANDLES SUBMITTING THE USER BY CHECKING EMAIL AND PASSWORD regex
    async function handleSubmit(e) {
        e.preventDefault();
        setMessage("");

        if (mode === "register") {
            if (!PASSWORD_RULE.test(password)) {
                setMessage(
                    "Password must be 8-20 characters with an uppercase, lowercase, number, and symbol"
                );
                return;
            }
            if (password !== confirmPassword) {
                setMessage("Passwords do not match");
                return;
            }
            if (!UCF_EMAIL.test(email)) {
                setMessage("You must use a valid ucf.edu email to register");
                return;
            }
        }

        const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
        const body =
            mode === "login"
                ? { email, password }
                : {
                      first_name: firstName,
                      last_name: lastName,
                      username: makeTempUsername(firstName, lastName),
                      email,
                      password,
                  };

        try {
            const res = await fetch(`${API}${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();

            if (!res.ok) {
                const msg = errorMessage(data, "Something went wrong");
                setMessage(msg);
                // A login blocked only because the account was never verified
                // (e.g. the OTP send failed after an earlier registration attempt,
                // see the register branch below) would otherwise dead-end here with
                // no way back to the OTP screen — send a fresh code and take them
                // there instead of leaving them stuck on a login error forever.
                if (mode === "login" && /verify your email/i.test(msg)) {
                    setStep("verify");
                    fetch(`${API}/auth/send-code`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email }),
                    })
                        .then((codeRes) => codeRes.ok || codeRes.json())
                        .then((codeData) => {
                            if (codeData) setMessage(errorMessage(codeData, "Could not send verification code"));
                        })
                        .catch(() => setMessage("Could not send verification code"));
                }
                return;
            }

            localStorage.setItem("token", data.token);
            setPendingUser(data.user);

            if (mode === "register") {
                // The account now exists (pending) regardless of what happens next —
                // always land on the OTP step so a failed send doesn't strand the
                // user: going back to "auth" here would mean re-submitting register
                // later just 409s on the email/username that already exists, with no
                // way back to verification. "Resend code" on that screen retries the
                // send.
                setStep("verify");
                const codeRes = await fetch(`${API}/auth/send-code`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email }),
                });
                if (!codeRes.ok) {
                    const codeData = await codeRes.json().catch(() => null);
                    setMessage(errorMessage(codeData, "Could not send verification code"));
                }
            } else {
                navigate("/posts", { state: { user: data.user } });
            }
        } catch (err) {
            setMessage("Network error: is the API reachable?");
        }
    }

    // VERIFICATION CODE HANDLING
    async function handleVerifyOtp(e) {
        e.preventDefault();
        setMessage("");

        try {
            const res = await fetch(`${API}/auth/verify-code`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, code: otpCode }),
            });
            const data = await res.json();

            if (!res.ok) {
                setMessage(errorMessage(data, "Invalid code"));
                return;
            }

            setStep("profile");
        } catch (err) {
            setMessage("Network error: is the API reachable?");
        }
    }

    // RESENDING VERIFICATION CODE (60s cooldown on the backend -> may 429)
    async function handleResendOtp() {
        setMessage("");
        try {
            const res = await fetch(`${API}/auth/send-code`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => null);
                setMessage(errorMessage(data, "Could not resend code"));
            }
        } catch (err) {
            setMessage("Could not resend code");
        }
    }

    // FORGOT PASSWORD: emails a single-use reset link (POST /auth/forgot-password).
    // The backend always answers with the same generic message whether or not the
    // email is registered, so that's just shown as-is.
    async function handleForgotPassword(e) {
        e.preventDefault();
        setMessage("");
        setForgotSubmitting(true);
        try {
            const res = await fetch(`${API}/auth/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const data = await res.json().catch(() => null);
            setMessage(errorMessage(data, res.ok ? "If that email exists, a reset link has been sent." : "Something went wrong"));
        } catch (err) {
            setMessage("Network error: is the API reachable?");
        } finally {
            setForgotSubmitting(false);
        }
    }

    // SUBMITS PROFILE AFTER VERIFICATION: this is where the user sets their real
    // username (PATCH /users/me). If a profile picture was chosen (already
    // cropped/resized by AvatarCropModal), it's uploaded right after via
    // PUT /users/me/avatar — same "save parent, then attach file" pattern
    // PostGameModal used for banners.
    async function handleProfileSubmit(e) {
        e.preventDefault();
        setMessage("");

        if (username.length < 3 || username.length > 30) {
            setMessage("Username must be 3-30 characters");
            return;
        }

        const body = { username };
        if (sport) body.skill_levels = { [sport]: "" };

        try {
            const res = await fetch(`${API}/users/me`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify(body),
            });
            let data = await res.json();

            if (!res.ok) {
                setMessage(errorMessage(data, "Something went wrong"));
                return;
            }

            if (pfpFile) {
                const avatarBody = new FormData();
                avatarBody.append("avatar", pfpFile);
                const avatarRes = await fetch(`${API}/users/me/avatar`, {
                    method: "PUT",
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                    body: avatarBody,
                });
                const avatarData = await avatarRes.json().catch(() => null);
                if (avatarRes.ok && avatarData) {
                    data = avatarData;
                }
                // A failed avatar upload doesn't block finishing setup — the
                // profile itself already saved; the picture can be added later.
            }

            navigate("/posts", { state: { user: data || pendingUser } });
        } catch (err) {
            setMessage("Network error: is the API reachable?");
        }
    }

    function toggleMode() {
        setMode(mode === "login" ? "register" : "login");
        setPassword("");
        setConfirmPassword("");
        setMessage("");
    }

    if (step === "verify") {
        return (
            <OtpVerification
                email={email}
                code={otpCode}
                onCodeChange={setOtpCode}
                onSubmit={handleVerifyOtp}
                onResend={handleResendOtp}
                message={message}
            />
        );
    }

    if (step === "forgot") {
        return (
            <ForgotPassword
                email={email}
                onEmailChange={setEmail}
                onSubmit={handleForgotPassword}
                onBack={() => {
                    setStep("auth");
                    setMessage("");
                }}
                message={message}
                submitting={forgotSubmitting}
            />
        );
    }

    if (step === "profile") {
        return (
            <ProfileSetup
                username={username}
                sport={sport}
                pfpFile={pfpFile}
                onUsernameChange={setUsername}
                onSportChange={setSport}
                onPfpChange={setPfpFile}
                onSubmit={handleProfileSubmit}
                message={message}
            />
        );
    }

    return (
        <AuthForm
            mode={mode}
            firstName={firstName}
            lastName={lastName}
            email={email}
            password={password}
            confirmPassword={confirmPassword}
            message={message}
            onFirstNameChange={setFirstName}
            onLastNameChange={setLastName}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onConfirmPasswordChange={setConfirmPassword}
            onSubmit={handleSubmit}
            onToggleMode={toggleMode}
            onForgotPassword={() => {
                setMessage("");
                setStep("forgot");
            }}
        />
        // <OtpVerification
        //         email={email}
        //         code={otpCode}
        //         onCodeChange={setOtpCode}
        //         onSubmit={handleVerifyOtp}
        //         onResend={handleResendOtp}
        //         message={message}
        //     />

        // <ProfileSetup
        //         username={username}
        //         sport={sport}
        //         pfpFile={pfpFile}
        //         onUsernameChange={setUsername}
        //         onSportChange={setSport}
        //         onPfpChange={setPfpFile}
        //         onSubmit={handleProfileSubmit}
        //         message={message}
        //     />
    );
}

export default AuthPage;

import { useState } from "react";
import { useNavigate } from "react-router-dom";

import AuthForm from "../components/AuthForm";
import OtpVerification from "../components/OtpVerif";
import ProfileSetup from "../components/ProfileSetup";

const API = import.meta.env.VITE_API_URL;

// Backend requires 8-20 chars, 1 upper, 1 lower, 1 number, 1 symbol
const PASSWORD_RULE =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_\-+=~`[\]/\\;']).{8,20}$/;
// MUST BE UCF EMAIL
const UCF_EMAIL = /^[a-zA-Z0-9._%+-]+@ucf\.edu$/i;

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
    const [mode, setMode] = useState("login"); // "login" or "register"
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState("");

    const [step, setStep] = useState("auth"); // "auth" | "verify" | "profile"
    const [otpCode, setOtpCode] = useState("");
    const [username, setUsername] = useState("");
    const [sport, setSport] = useState("");
    const [pfpFile, setPfpFile] = useState(null);
    const [pendingUser, setPendingUser] = useState(null); // holds user/token between steps

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
                setMessage(errorMessage(data, "Something went wrong"));
                return;
            }

            localStorage.setItem("token", data.token);
            setPendingUser(data.user);

            if (mode === "register") {
                // Email the 6-digit verification code, then move to the OTP step.
                const codeRes = await fetch(`${API}/auth/send-code`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email }),
                });
                if (!codeRes.ok) {
                    const codeData = await codeRes.json().catch(() => null);
                    setMessage(errorMessage(codeData, "Could not send verification code"));
                    return;
                }
                setStep("verify");
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

    // SUBMITS PROFILE AFTER VERIFICATION: this is where the user sets their real
    // username (PATCH /users/me). Note: the backend has no pfp/photo field yet,
    // so the picture is collected but not uploaded.
    async function handleProfileSubmit(e) {
        e.preventDefault();
        setMessage("");

        if (username.length < 3 || username.length > 30) {
            setMessage("Username must be 3-30 characters");
            return;
        }

        const body = { username };
        if (sport) body.preferred_positions = { [sport]: "" };

        try {
            const res = await fetch(`${API}/users/me`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify(body),
            });
            const data = await res.json();

            if (!res.ok) {
                setMessage(errorMessage(data, "Something went wrong"));
                return;
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
        />
    );
}

export default AuthPage;

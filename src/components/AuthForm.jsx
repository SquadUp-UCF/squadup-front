function AuthForm({ mode, 
    firstName, lastName, 
    email, password, confirmPassword, 
    message, 
    onFirstNameChange, onLastNameChange, 
    onEmailChange, onPasswordChange, onConfirmPasswordChange, 
    onSubmit, onToggleMode,
}) {
    const hasLength = password.length >= 8 && password.length <= 20;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-+=~`[\]/\\;']/.test(password);
    const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

    return (
        <div style={{ padding: 40, maxWidth: 320 }}>
            <h2>{mode === "login" ? "Log In" : "Register"}</h2>

            <form onSubmit={onSubmit}>
                {mode === "register" && (
                    <>
                        <input
                            placeholder="First name"
                            value={firstName}
                            required
                            onChange={(e) => onFirstNameChange(e.target.value)}
                        />
                        <br />
                        <input
                            placeholder="Last name"
                            value={lastName}
                            required
                            onChange={(e) => onLastNameChange(e.target.value)}
                        />
                        <br />
                    </>
                )}

                <input
                    placeholder="Enter email"
                    type="email"
                    value={email}
                    required
                    onChange={(e) => onEmailChange(e.target.value)}
                />

                <br />

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    required
                    minLength={mode === "register" ? 8 : undefined}
                    maxLength={mode === "register" ? 20 : undefined}
                    onChange={(e) => onPasswordChange(e.target.value)}
                />

                {mode === "register" && (
                    <div style={{ margin: "6px 0 10px" }}>
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

                {mode === "register" && (
                    <>
                        <input
                            type="password"
                            placeholder="Confirm Password"
                            value={confirmPassword}
                            required
                            onChange={(e) => onConfirmPasswordChange(e.target.value)}
                        />
                        <div style={{ margin: "6px 0 10px" }}>
                            <div className="indicator-row">
                                <span className={`indicator-dot ${passwordsMatch ? "met" : ""}`} />
                                {passwordsMatch ? "Match" : "No match"}
                            </div>
                        </div>
                    </>
                )}

                <button type="submit">
                    {mode === "login" ? "Log In" : "Register"}
                </button>
            </form>

            <p>
                {mode === "login" ? "No account?" : "Have an account?"}{" "}
                <button onClick={onToggleMode}>
                    Switch to {mode === "login" ? "Register" : "Log In"}
                </button>
            </p>

            {message && <p style={{ color: "crimson" }}>{message}</p>}
        </div>
    );
}

export default AuthForm;
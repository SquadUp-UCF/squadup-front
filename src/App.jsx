import { useState } from "react";

const API = import.meta.env.VITE_API_URL; // https://squad-up-ucf.net/api

export default function App() {
  const [mode, setMode] = useState("login"); // "login" or "register"
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [user, setUser] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
    const body =
      mode === "login"
        ? { email, password }
        : { first_name: firstName, last_name: lastName, email, password };

    try {
      const res = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.msg || "Something went wrong");
        return;
      }

      // success: store the token and show the user
      localStorage.setItem("token", data.token);
      setUser(data.user);
      setMessage(`Success! Logged in as ${data.user.name}`);
    } catch (err) {
      setMessage("Network error — is the API reachable?");
    }
  }

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
    setMessage("Logged out");
  }

  // if logged in, show a simple logged-in view
  if (user) {
    return (
      <div style={{ padding: 40 }}>
        <h2>Welcome, {user.name}</h2>
        <p>User ID: {user.id}</p>
        <button onClick={logout}>Log out</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 40, maxWidth: 320 }}>
      <h2>{mode === "login" ? "Log In" : "Register"}</h2>

      <form onSubmit={handleSubmit}>
        {mode === "register" && (
          <>
            <input
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <br />
            <input
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
            <br />
          </>
        )}

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <br />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <br />
        <button type="submit">
          {mode === "login" ? "Log In" : "Register"}
        </button>
      </form>

      <p>
        {mode === "login" ? "No account?" : "Have an account?"}{" "}
        <button
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setMessage("");
          }}
        >
          Switch to {mode === "login" ? "Register" : "Log In"}
        </button>
      </p>

      {message && <p>{message}</p>}
    </div>
  );
}
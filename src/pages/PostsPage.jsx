import { useLocation, useNavigate } from "react-router-dom";
import MapComponent from "../components/MapComponent";

function PostsPage() {
  const location = useLocation();
  const user = location.state?.user;
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem("token");
    navigate("/");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#E9F5E4", fontFamily: "sans-serif" }}>
      {/* Top nav */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 32px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 24 }}>⚡</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#1A1A1A" }}>
            Squad-Up
          </span>
        </div>


        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            style={{
              background: "#2F8F4E",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 20,
              padding: "10px 20px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + Post a game
          </button>

          <div
            title={user ? user.name : "Profile"}
            onClick={logout}
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "#CDEBCD",
              color: "#1F6B3E",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {user?.username ? user.username.slice(0, 2).toUpperCase() : "?"}
          </div>
        </div>
      </div>

      {/* Hero banner */}
      <div
        style={{
          margin: "0 32px 24px",
          background: "#1F6B3E",
          borderRadius: 16,
          padding: "32px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 20,
        }}
      >
        <div>
          <span
            style={{
              background: "rgba(255,255,255,0.15)",
              color: "#FFFFFF",
              padding: "4px 12px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              className="pulsing-dot"
              style={{
                width: 8,
                height: 8,
                border: "none",
                "--dot-spread": "8px",
              }}
            />
            LIVE - UCF verified only
          </span>
          <h1
            style={{
              color: "#FFFFFF",
              fontSize: 36,
              margin: "12px 0 8px",
            }}
          >
            Welcome{user?.username ? `, ${user.username}` : ""}
          </h1>
          <p style={{ color: "#D9EFD9", margin: 0 }}>
            Tap a game to join, or post your own.
          </p>
        </div>

        <button
          style={{
            background: "#FFFFFF",
            color: "#1F6B3E",
            border: "none",
            borderRadius: 20,
            padding: "12px 24px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Post a game
        </button>
      </div>

      {/* Main content: map on the right */}
        <div
        style={{
            display: "flex",
            gap: 24,
            padding: "0 32px 32px",
            flexWrap: "wrap",
        }}
        >
        <div style={{ flex: "1 1 400px" }}>
            {/* feed/list content will go here */}
        </div>

        <div style={{ flex: "1 1 500px" }}>
            <MapComponent />
        </div>
        </div>
    </div>
  );
}

export default PostsPage;
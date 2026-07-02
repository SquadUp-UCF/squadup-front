const SPORTS = ["Soccer", "Basketball", "Volleyball", "Tennis", "Pickleball", "Ultimate", "Flag Football", "Baseball"];

function ProfileSetup({ username, sport, pfpFile, onUsernameChange, onSportChange, onPfpChange, onSubmit, message }) {
  return (
    <div style={{ padding: 40, maxWidth: 320 }}>
      <h2>Personalize your account</h2>

      <form onSubmit={onSubmit}>
        <input
          placeholder="Username"
          value={username}
          required
          onChange={(e) => onUsernameChange(e.target.value)}
        />
        <br />

        <select value={sport} required onChange={(e) => onSportChange(e.target.value)}>
          <option value="" disabled>Choose a sport</option>
          {SPORTS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <br />

        <label style={{ fontSize: 13, color: "#666" }}>
          Profile picture (optional)
        </label>
        <br />
        <input
          type="file"
          accept="image/*"
          onChange={(e) => onPfpChange(e.target.files?.[0] || null)}
        />
        <br />

        <button type="submit">Finish</button>
      </form>

      {message && <p style={{ color: "crimson" }}>{message}</p>}
    </div>
  );
}

export default ProfileSetup;
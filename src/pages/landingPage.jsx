import { useNavigate } from "react-router-dom";

function LandingPage() {

    const navigate = useNavigate();

    return (
        <div>
            <button onClick={() => navigate("/auth")}> Log in / Register</button>
            <h1>Welcome home!!</h1>

        </div>
    )
}

export default LandingPage;
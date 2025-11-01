import { useAuthContext } from "../hooks/useAuthContext";
import { useLogout } from "../hooks/useLogout";
import { useNavigate } from "react-router-dom";

function Header() {
  const { user } = useAuthContext();
  const { logout } = useLogout();
  const navigate = useNavigate();
  return (
    <div className="header">
      <div className="team-name" onClick={() => navigate("/")}>
        3TL Team
      </div>
      {user && (
        <div className="header-state">
          <div className="welcome">
            <span>
              <strong>{user.username}</strong>
            </span>
            <span>{user.email}</span>
          </div>
          <button className="button logout-button" onClick={() => logout()}>
            Logout
          </button>
        </div>
      )}
      {!user && (
        <div className="header-state">
          <button
            className="button login-button"
            onClick={() => navigate("/login")}
          >
            Login
          </button>
          <button
            className="button signup-button"
            onClick={() => navigate("/signup")}
          >
            Signup
          </button>
        </div>
      )}
    </div>
  );
}
export default Header;

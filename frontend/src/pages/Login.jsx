import { useState } from "react";
import { useLogin } from "../hooks/useLogin";
function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, error, isLoading } = useLogin();
  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(email, password);
  };
  return (
    <div className="login-page">
      <form className="login-form" onSubmit={handleSubmit}>
        <h1>Login</h1>
        <label>Email: </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="email-input"
        />
        <label>Password: </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="password-input"
        />
        <button type="submit" className="button login-button">
          Login
        </button>
      </form>
      {isLoading && <div className="loading">Loading...</div>}
      {error && (
        <div className="error">
          Error: <strong>{error}</strong>
        </div>
      )}
    </div>
  );
}
export default Login;

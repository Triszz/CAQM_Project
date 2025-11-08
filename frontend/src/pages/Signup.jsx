import { useState } from "react";
import { useSignup } from "../hooks/useSignup";
function Signup() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const { signup, error, isLoading } = useSignup();
  const handleSubmit = async (e) => {
    e.preventDefault();
    await signup(username, email, password, phoneNumber);
  };
  return (
    <div className="signup-page">
      <form className="signup-form" onSubmit={handleSubmit}>
        <h1>Signup</h1>
        <label>Username: </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="username-input"
        />
        <label>Phone number: </label>
        <input
          type="text"
          className="phone-number-input"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />
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
        <button type="submit" className="button signup-button">
          Signup
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
export default Signup;

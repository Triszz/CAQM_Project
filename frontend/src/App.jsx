import "./App.css";
import Home from "./pages/Home";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import { useAuthContext } from "./hooks/useAuthContext";
import Header from "./components/Header";
import Settings from "./pages/Settings";
function App() {
  const { user, isLoading } = useAuthContext();
  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }
  return (
    <BrowserRouter>
      <Header />
      <div className="pages">
        <Routes>
          <Route
            path="/"
            element={user ? <Home /> : <Navigate to="/login" />}
          ></Route>
          <Route
            path="/signup"
            element={!user ? <Signup /> : <Navigate to="/" />}
          ></Route>
          <Route
            path="/login"
            element={!user ? <Login /> : <Navigate to="/" />}
          ></Route>
          <Route
            path="/settings"
            element={user ? <Settings /> : <Navigate to="/login" />}
          ></Route>
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;

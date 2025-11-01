import "./App.css";
import Home from "./pages/Home";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import { useAuthContext } from "./hooks/useAuthContext";
import Header from "./components/Header";
function App() {
  const { user } = useAuthContext();
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
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;

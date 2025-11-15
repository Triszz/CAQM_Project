import "./App.css";
import { useState } from "react";
import Home from "./pages/Home";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import { useAuthContext } from "./hooks/useAuthContext";
import Header from "./components/Header";
import Settings from "./pages/Settings";
function App() {
  const { user, isLoading } = useAuthContext();
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      text: "Xin chào! Tôi là AI Assistant. Tôi có thể giúp gì cho bạn về chất lượng không khí?",
      sender: "bot",
      timestamp: new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);
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
            element={
              user ? (
                <Home
                  chatMessages={chatMessages}
                  setChatMessages={setChatMessages}
                />
              ) : (
                <Navigate to="/login" />
              )
            }
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
            element={
              user ? (
                <Settings
                  chatMessages={chatMessages}
                  setChatMessages={setChatMessages}
                />
              ) : (
                <Navigate to="/login" />
              )
            }
          ></Route>
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;

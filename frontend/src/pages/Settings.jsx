import { useState } from "react";
import { Link } from "react-router-dom";
import ChatBot from "../components/ChatBot";

function Settings({ chatMessages, setChatMessages }) {
  const [beep, setBeep] = useState(3);
  const [brightness, setBrightness] = useState(75);
  const [showChatbot, setShowChatbot] = useState(false);

  return (
    <div className="settings-page">
      <div className="dashboard-settings">
        <Link to="/" style={{ color: "#68758c" }}>
          Dashboard
        </Link>
        <Link to="/settings" className="active">
          Settings
        </Link>
      </div>
      <div className="buzzer-setting-container">
        <div className="buzzer-setting-title">
          <h2>Cài đặt Buzzer</h2>
          <span>Điều chỉnh số lần beep khi có cảnh báo</span>
        </div>
        <form className="buzzer-setting-form">
          <label>
            <strong>Số lần beep</strong>
          </label>
          <input
            type="number"
            className="buzzer-input"
            min={0}
            value={beep}
            onChange={(e) => setBeep(e.target.value)}
          />
          <span className="buzzer-note">Từ 1 đến 10 lần beep</span>
          <div className="buzzer-setting-buttons">
            <button className="button test-buzzer">Test</button>
            <button className="button save-buzzer">Lưu cài đặt</button>
          </div>
        </form>
      </div>
      <div className="led-setting-container">
        <div className="led-setting-title">
          <h2>Cài đặt Độ sáng</h2>
          <span>Điều chỉnh độ sáng đèn led</span>
        </div>
        <form className="led-setting-form">
          <div className="led-setting-info">
            <label>
              <strong>Độ sáng</strong>
            </label>
            <span>{brightness}%</span>
          </div>
          <input
            type="range"
            className="led-input"
            min={0}
            max={100}
            value={brightness}
            onChange={(e) => setBrightness(e.target.value)}
          />
          <span className="led-note">
            Kéo để điều chỉnh độ sáng từ 0% đến 100%
          </span>
          <div className="led-setting-buttons">
            <button className="button save-led">Lưu cài đặt</button>
          </div>
        </form>
      </div>
      {!showChatbot && (
        <button
          className="chatbot-toggle-button"
          onClick={() => setShowChatbot(true)}
          title="Mở AI Assistant"
        >
          💬
        </button>
      )}
      {showChatbot && (
        <ChatBot
          onClose={() => setShowChatbot(false)}
          messages={chatMessages}
          setMessages={setChatMessages}
        />
      )}
    </div>
  );
}
export default Settings;

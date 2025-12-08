import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import ChatBot from "../components/ChatBot";
import { DeviceStateAPI } from "../services/api";
import { useAuthContext } from "../hooks/useAuthContext";

function Settings({ chatMessages, setChatMessages }) {
  const { user } = useAuthContext();
  const [beep, setBeep] = useState(3);
  const [brightness, setBrightness] = useState(75);
  const [showChatbot, setShowChatbot] = useState(false);
  const [loading, setLoading] = useState({
    buzzerTest: false,
    buzzerSave: false,
    ledSave: false,
  });

  // ✅ Load config từ DB khi component mount
  useEffect(() => {
    const loadDeviceStates = async () => {
      if (!user?.token) return;

      try {
        // Load buzzer config
        const buzzerResponse = await DeviceStateAPI.getDeviceState("buzzer");
        if (buzzerResponse.data.data?.buzzerState) {
          setBeep(buzzerResponse.data.data.buzzerState.beepCount);
        }

        // Load LED brightness
        const ledResponse = await DeviceStateAPI.getDeviceState("led");
        if (ledResponse.data.data?.ledState) {
          setBrightness(ledResponse.data.data.ledState.brightness);
        }

        console.log("✅ Device states loaded");
      } catch (error) {
        console.error("❌ Failed to load device states:", error);
      }
    };

    loadDeviceStates();
  }, [user?.token]);

  // ✅ Test buzzer với số lần beep từ input
  const handleTestBuzzer = async (e) => {
    e.preventDefault();

    // Validate
    if (beep < 1 || beep > 10) {
      alert("Số lần beep phải từ 1 đến 10!");
      return;
    }

    setLoading({ ...loading, buzzerTest: true });

    try {
      // ✅ Gửi beepCount từ state (input của user)
      const response = await DeviceStateAPI.testBuzzer({
        beepCount: parseInt(beep),
        beepDuration: 200, // Mặc định
        interval: 100, // Mặc định
      });

      console.log("✅ Buzzer test sent:", response.data);
      alert(`Đã gửi lệnh test: ${beep} lần beep!`);
    } catch (error) {
      console.error("❌ Failed to test buzzer:", error);
      alert("Không thể test buzzer. Vui lòng thử lại!");
    } finally {
      setLoading({ ...loading, buzzerTest: false });
    }
  };

  // ✅ Lưu config buzzer
  const handleSaveBuzzer = async (e) => {
    e.preventDefault();

    if (beep < 1 || beep > 10) {
      alert("Số lần beep phải từ 1 đến 10!");
      return;
    }

    setLoading({ ...loading, buzzerSave: true });

    try {
      const response = await DeviceStateAPI.updateBuzzerConfig({
        beepCount: parseInt(beep),
        beepDuration: 200, // Mặc định
        interval: 100, // Mặc định
      });
      console.log("✅ Buzzer config saved:", response.data);
      alert("Đã lưu cài đặt buzzer thành công!");
    } catch (error) {
      console.error("❌ Failed to save buzzer config:", error);
      alert("Không thể lưu cài đặt. Vui lòng thử lại!");
    } finally {
      setLoading({ ...loading, buzzerSave: false });
    }
  };

  // ✅ Lưu brightness LED
  const handleSaveLED = async (e) => {
    e.preventDefault();
    setLoading({ ...loading, ledSave: true });

    try {
      const response = await DeviceStateAPI.updateLedBrightness({
        brightness: parseInt(brightness),
      });
      console.log("✅ LED brightness saved:", response.data);
      alert(`Đã lưu độ sáng LED: ${brightness}%`);
    } catch (error) {
      console.error("❌ Failed to save LED brightness:", error);
      alert("Không thể lưu độ sáng. Vui lòng thử lại!");
    } finally {
      setLoading({ ...loading, ledSave: false });
    }
  };

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

      {/* ✅ Buzzer Settings */}
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
            min={1}
            max={10}
            value={beep}
            onChange={(e) => setBeep(e.target.value)}
          />
          <span className="buzzer-note">Từ 1 đến 10 lần beep</span>
          <div className="buzzer-setting-buttons">
            <button
              className="button test-buzzer"
              onClick={handleTestBuzzer}
              disabled={loading.buzzerTest}
            >
              {loading.buzzerTest ? "Đang test..." : "Test"}
            </button>
            <button
              className="button save-buzzer"
              onClick={handleSaveBuzzer}
              disabled={loading.buzzerSave}
            >
              {loading.buzzerSave ? "Đang lưu..." : "Lưu cài đặt"}
            </button>
          </div>
        </form>
      </div>

      {/* ✅ LED Settings */}
      <div className="led-setting-container">
        <div className="led-setting-title">
          <h2>Cài đặt Độ sáng</h2>
          <span>Điều chỉnh độ sáng đèn led (3 đèn: Xanh, Đỏ, Vàng)</span>
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
            <button
              className="button save-led"
              onClick={handleSaveLED}
              disabled={loading.ledSave}
            >
              {loading.ledSave ? "Đang lưu..." : "Lưu cài đặt"}
            </button>
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

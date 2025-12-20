import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Gauge from "../components/Gauge";
import ChatBot from "../components/ChatBot";
import { SensorAPI, AirQualityAPI } from "../services/api";
import { useAuthContext } from "../hooks/useAuthContext";
import RealTimeChart from "../components/RealTimeChart";
function Home({ chatMessages, setChatMessages }) {
  const { user } = useAuthContext();
  const [quality, setQuality] = useState("Tốt");
  const [temperature, setTemperature] = useState(24.5);
  const [humidity, setHumidity] = useState(62);
  const [co2, setCo2] = useState(850);
  const [co, setCo] = useState(12);
  const [pm25, setPm25] = useState(18);
  const [showChatbot, setShowChatbot] = useState(false);

  const [realtimeData, setRealtimeData] = useState([]);
  const maxRealtimePoints = 1200;
  //useEffect 1: Load và update Air Quality mỗi 3 giây
  useEffect(() => {
    if (!user?.token) return;

    const loadAirQuality = async () => {
      try {
        console.log("Loading air quality...");
        const response = await AirQualityAPI.getCurrentAirQuality();
        const airQuality = response.data.data.quality;

        setQuality(airQuality);
        console.log(`Air Quality: ${airQuality}`);
      } catch (error) {
        console.error("Failed to load air quality:", error);
        // Nếu chưa có dữ liệu, giữ giá trị mặc định
        if (error.response?.status === 404) {
          setQuality("Tốt"); // Default
        }
      }
    };

    loadAirQuality();

    const airQualityInterval = setInterval(loadAirQuality, 3000);

    return () => clearInterval(airQualityInterval);
  }, [user?.token]);

  // useEffect 2: Load dữ liệu 1 giờ ban đầu
  useEffect(() => {
    const loadInitialData = async () => {
      if (!user?.token) return;

      try {
        console.log("Loading last hour data...");
        const response = await SensorAPI.getSensorReadingLastHour();
        const result = response.data;

        if (result.data && result.data.length > 0) {
          const formattedData = result.data.map((item) => ({
            time: new Date(item.timestamp).toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              timeZone: "Asia/Ho_Chi_Minh",
            }),
            co2: item.co2,
            temperature: item.temperature,
            humidity: item.humidity,
            pm25: item.pm25,
            co: item.co,
          }));

          console.log(`Loaded ${formattedData.length} historical points`);
          setRealtimeData(formattedData.slice(-maxRealtimePoints));

          // Cập nhật gauge với điểm mới nhất
          const latest = result.data[result.data.length - 1];
          setTemperature(latest.temperature);
          setHumidity(latest.humidity);
          setCo2(latest.co2);
          setCo(latest.co);
          setPm25(latest.pm25);
        } else {
          console.log("No data available in last hour");
        }
      } catch (error) {
        console.error("Failed to load initial data:", error);
      }
    };

    loadInitialData();
  }, [user?.token, maxRealtimePoints]);

  // useEffect 3: Cập nhật CẢ GAUGE VÀ CHART mỗi 3 giây
  useEffect(() => {
    if (!user?.token) return;

    const updateSensorData = async () => {
      try {
        const response = await SensorAPI.getLatestSensorReading();
        const data = response.data.data;

        // 1. Update gauges
        setTemperature(data.temperature);
        setHumidity(data.humidity);
        setCo2(data.co2);
        setCo(data.co);
        setPm25(data.pm25);

        // 2. Update chart
        const newPoint = {
          time: new Date().toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          co2: data.co2,
          temperature: data.temperature,
          humidity: data.humidity,
          pm25: data.pm25,
          co: data.co,
        };

        setRealtimeData((prev) => {
          const updated = [...prev, newPoint];
          // Giữ tối đa maxRealtimePoints điểm
          if (updated.length > maxRealtimePoints) {
            return updated.slice(-maxRealtimePoints);
          }
          return updated;
        });

        console.log(
          `[${new Date().toLocaleTimeString()}] Gauges & Chart updated`
        );
      } catch (error) {
        console.error("❌ Failed to update sensor data:", error);
      }
    };

    updateSensorData();

    const sensorInterval = setInterval(updateSensorData, 3000);

    return () => clearInterval(sensorInterval);
  }, [user?.token, maxRealtimePoints]);

  return (
    <div className="home-page">
      <div className="dashboard-settings">
        <Link to="/" className="active">
          Dashboard
        </Link>
        <Link to="/settings" style={{ color: "#68758c" }}>
          Settings
        </Link>
      </div>
      {quality === "Tốt" ? (
        <div className="quality-container good-quality-container">
          <h3>Chất lượng không khí {quality}</h3>
        </div>
      ) : quality === "Trung bình" ? (
        <div className="quality-container medium-quality-container">
          <h3>Chất lượng không khí {quality}</h3>
        </div>
      ) : quality === "Kém" ? (
        <div className="quality-container bad-quality-container">
          <h3>Chất lượng không khí {quality}</h3>
        </div>
      ) : (
        <div className="quality-container">
          <h3>Chất lượng không khí {quality}</h3>
        </div>
      )}
      <div className="charts-grid">
        <Gauge
          id="co2-gauge"
          title="CO₂"
          value={co2}
          minValue={0}
          maxValue={2500}
          unit="ppm"
          customThresholds={[800, 1000]}
        />
        <Gauge
          id="co-gauge"
          title="CO"
          value={co}
          minValue={0}
          maxValue={50}
          unit="ppm"
          customThresholds={[5, 9]}
        />
        <Gauge
          id="temp-gauge"
          title="Nhiệt độ"
          value={temperature}
          minValue={15}
          maxValue={45}
          unit="°C"
          customThresholds={[30, 34]}
        />
        <Gauge
          id="humidity-gauge"
          title="Độ ẩm"
          value={humidity}
          minValue={0}
          maxValue={100}
          unit="%"
          humidityMode={true}
        />
        <Gauge
          id="pm25-gauge"
          title="PM2.5"
          value={pm25}
          minValue={0}
          maxValue={200}
          unit="µg/m³"
          customThresholds={[25, 35]}
        />
      </div>
      <div className="realtime-section">
        <RealTimeChart data={realtimeData} />
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
export default Home;

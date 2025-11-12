import { useState } from "react";

import Chart from "../components/Chart";
function Home() {
  const [quality, setQuality] = useState("TỐT");
  const [temperature, setTemperature] = useState(24.5);
  const [temperatureQuality, setTemperatureQuality] = useState("TỐT");
  const [humidity, setHumidity] = useState(62);
  const [humidityQuality, setHumidityQuality] = useState("TỐT");
  const [co2, setCo2] = useState(850);
  const [co2Quality, setCo2Quality] = useState("TỐT");
  const [co, setCo] = useState(12);
  const [coQuality, setCoQuality] = useState("TỐT");
  const [pm25, setPm25] = useState(18);
  const [pmQuality, setPmQuality] = useState("TỐT");
  return (
    <div className="home-page">
      <header className="home-page-header">
        <h1>IAQM - Indoor Air Quality Monitor</h1>
        <span>Giám sát và phân tích chất lượng không khí trong phòng</span>
      </header>
      <div className="dashboard-settings">
        <a href="/" className="active">
          Dashboard
        </a>
        <a href="/settings" style={{ color: "#68758c" }}>
          Settings
        </a>
      </div>
      {quality === "TỐT" ? (
        <div className="quality-container good-quality-container">
          <h3>Chất lượng không khí {quality}</h3>
        </div>
      ) : quality === "TRUNG BÌNH" ? (
        <div className="quality-container medium-quality-container">
          <h3>Chất lượng không khí {quality}</h3>
        </div>
      ) : quality === "TỆ" ? (
        <div className="quality-container bad-quality-container">
          <h3>Chất lượng không khí {quality}</h3>
        </div>
      ) : (
        <div className="quality-container">
          <h3>Chất lượng không khí {quality}</h3>
        </div>
      )}
      <div className="charts-grid">
        <Chart
          id="co2-gauge"
          title="Nồng độ CO₂"
          value={co2}
          minValue={0}
          maxValue={2000}
          unit="ppm"
        />
        <Chart
          id="co-gauge"
          title="Nồng độ CO"
          value={co}
          minValue={0}
          maxValue={50}
          unit="ppm"
        />
        <Chart
          id="temp-gauge"
          title="Nhiệt độ"
          value={temperature}
          minValue={0}
          maxValue={50}
          unit="°C"
        />
        <Chart
          id="humidity-gauge"
          title="Độ ẩm"
          value={humidity}
          minValue={0}
          maxValue={100}
          unit="%"
        />
        <Chart
          id="pm25-gauge"
          title="Bụi mịn PM2.5"
          value={pm25}
          minValue={0}
          maxValue={100}
          unit="µg/m³"
        />
      </div>
    </div>
  );
}
export default Home;

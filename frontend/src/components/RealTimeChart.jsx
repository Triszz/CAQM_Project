import React, { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

function RealTimeChart({ data }) {
  const [selectedSensor, setSelectedSensor] = useState("co2");

  const sensorConfig = {
    co2: {
      name: "Nồng độ CO₂",
      unit: "ppm",
      color: "#8884d8",
      dataKey: "co2",
      yAxisDomain: [0, 2000],
    },
    temperature: {
      name: "Nhiệt độ",
      unit: "°C",
      color: "#82ca9d",
      dataKey: "temperature",
      yAxisDomain: [0, 50],
    },
    humidity: {
      name: "Độ ẩm",
      unit: "%",
      color: "#ffc658",
      dataKey: "humidity",
      yAxisDomain: [0, 100],
    },
    pm25: {
      name: "Bụi mịn PM2.5",
      unit: "µg/m³",
      color: "#ff7c7c",
      dataKey: "pm25",
      yAxisDomain: [0, 100],
    },
    co: {
      name: "Nồng độ CO",
      unit: "ppm",
      color: "#a28fd0",
      dataKey: "co",
      yAxisDomain: [0, 50],
    },
  };

  const currentSensor = sensorConfig[selectedSensor];

  return (
    <div className="realtime-chart-container">
      <div className="realtime-header">
        {/* ✅ Thay đổi title */}
        <h3>Dữ liệu cảm biến trong 1 giờ gần nhất</h3>

        <div className="sensor-selector">
          <label htmlFor="realtime-sensor-select">Chọn cảm biến:</label>
          <select
            id="realtime-sensor-select"
            value={selectedSensor}
            onChange={(e) => setSelectedSensor(e.target.value)}
            className="sensor-dropdown"
          >
            <option value="co2">Nồng độ CO₂</option>
            <option value="temperature">Nhiệt độ</option>
            <option value="humidity">Độ ẩm</option>
            <option value="pm25">Bụi mịn PM2.5</option>
            <option value="co">Nồng độ CO</option>
          </select>
        </div>
      </div>

      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={350}>
          <LineChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10 }} // ✅ Giảm font size vì nhiều điểm hơn
              interval="preserveStartEnd"
              minTickGap={80} // ✅ Tăng khoảng cách giữa labels
            />
            <YAxis
              domain={currentSensor.yAxisDomain}
              label={{
                value: `${currentSensor.name} (${currentSensor.unit})`,
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 14, fontWeight: 600 },
              }}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                border: `2px solid ${currentSensor.color}`,
                borderRadius: "8px",
                padding: "10px",
              }}
              formatter={(value) => [
                `${value} ${currentSensor.unit}`,
                currentSensor.name,
              ]}
            />
            <Legend iconType="line" />
            <Line
              type="monotone"
              dataKey={currentSensor.dataKey}
              stroke={currentSensor.color}
              strokeWidth={2}
              name={`${currentSensor.name} (${currentSensor.unit})`}
              // dot={{ r: 2, fill: currentSensor.color }}
              dot={false}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="no-data-message">
          <p>Đang chờ dữ liệu...</p>
        </div>
      )}

      {data.length > 0 && (
        <div className="realtime-info">
          <p>
            {/* ✅ Cập nhật text hiển thị */}
            🕒 Cập nhật mỗi 3 giây • Hiển thị {data.length} điểm dữ liệu (
            {Math.floor((data.length * 3) / 60)} phút)
          </p>
        </div>
      )}
    </div>
  );
}

export default RealTimeChart;

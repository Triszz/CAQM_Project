import { PieChart, Pie, Cell } from "recharts";

function Gauge({
  id,
  title,
  value,
  minValue = 0,
  maxValue = 100,
  unit = "",
  thresholds = [0.33, 0.67, 1], // Mặc định 33%, 67%, 100%
  customThresholds = null, // Ngưỡng tuyệt đối (không phải %)
  humidityMode = false,
}) {
  // Tính percent dựa trên customThresholds hoặc thresholds
  let colorCategory = "green"; // "green", "yellow", "red"

  if (humidityMode) {
    // Logic đặc biệt cho độ ẩm (2 khoảng)
    if (value >= 70 && value <= 85) {
      colorCategory = "green"; // Tốt: 70-85%
    } else if ((value >= 65 && value < 70) || (value > 85 && value <= 92)) {
      colorCategory = "yellow"; // Trung bình: 65-70% hoặc 85-92%
    } else {
      colorCategory = "red"; // Kém: <65% hoặc >92%
    }
  } else if (customThresholds) {
    // Logic thông thường
    const [goodMax, moderateMax] = customThresholds;

    if (value <= goodMax) {
      colorCategory = "green";
    } else if (value <= moderateMax) {
      colorCategory = "yellow";
    } else {
      colorCategory = "red";
    }
  } else {
    // Dùng ngưỡng % (code cũ)
    const percent = Math.max(0, Math.min(1, (value - minValue) / (maxValue - minValue)));

    if (percent < thresholds[0]) {
      colorCategory = "green";
    } else if (percent < thresholds[1]) {
      colorCategory = "yellow";
    } else {
      colorCategory = "red";
    }
  }

  const getColor = () => {
    const colors = {
      green: "#5BE12C",
      yellow: "#F5CD19",
      red: "#EA4228",
    };
    return colors[colorCategory];
  };

  // Tính percent cho hiển thị gauge (luôn dựa trên minValue/maxValue)
  const displayPercent = Math.max(0, Math.min(1, (value - minValue) / (maxValue - minValue)));

  const data = [
    { name: "value", value: displayPercent * 100 },
    { name: "remaining", value: (1 - displayPercent) * 100 },
  ];

  const COLORS = [getColor(), "#E0E0E0"];

  return (
    <div className="chart-container">
      <h3 className="chart-title">{title}</h3>
      <div className="gauge-wrapper">
        <PieChart width={200} height={120}>
          <Pie
            id={id}
            data={data}
            cx={100}
            cy={100}
            startAngle={180}
            endAngle={0}
            innerRadius={60}
            outerRadius={80}
            paddingAngle={0}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index]} />
            ))}
          </Pie>
        </PieChart>
        <div className="gauge-value">
          <span className="value-number">{value}</span>
          <span className="value-unit">{unit}</span>
        </div>
      </div>
      <div className="chart-info">
        <span className="value-range">
          Khoảng: {minValue} - {maxValue} {unit}
        </span>
      </div>
    </div>
  );
}

export default Gauge;

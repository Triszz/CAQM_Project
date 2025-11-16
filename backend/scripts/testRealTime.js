const mongoose = require("mongoose");
const Sensor = require("../models/sensor.model"); // Sửa đường dẫn cho đúng
require("dotenv").config();
// Kết nối database
mongoose.connect(process.env.MONGODB_URI);

console.log("🚀 Starting real-time data simulation...\n");

// Giá trị ban đầu
let baseValues = {
  temperature: 25,
  humidity: 65,
  co2: 850,
  co: 5,
  pm25: 20,
};

// Hàm tạo biến động tự nhiên
const randomChange = (base, range) => {
  const change = (Math.random() - 0.5) * range;
  return Math.max(0, base + change);
};

// Hàm thêm 1 reading
async function addReading() {
  try {
    // Tạo biến động nhỏ cho mỗi giá trị
    baseValues.temperature = randomChange(baseValues.temperature, 1);
    baseValues.humidity = randomChange(baseValues.humidity, 2);
    baseValues.co2 = randomChange(baseValues.co2, 50);
    baseValues.co = randomChange(baseValues.co, 1);
    baseValues.pm25 = randomChange(baseValues.pm25, 3);

    // Giới hạn trong khoảng hợp lý
    baseValues.temperature = Math.max(20, Math.min(30, baseValues.temperature));
    baseValues.humidity = Math.max(50, Math.min(80, baseValues.humidity));
    baseValues.co2 = Math.max(400, Math.min(1500, baseValues.co2));
    baseValues.co = Math.max(2, Math.min(15, baseValues.co));
    baseValues.pm25 = Math.max(10, Math.min(50, baseValues.pm25));

    const reading = await Sensor.create({
      timestamp: new Date(),
      temperature: parseFloat(baseValues.temperature.toFixed(1)),
      humidity: parseFloat(baseValues.humidity.toFixed(1)),
      co2: Math.round(baseValues.co2),
      co: parseFloat(baseValues.co.toFixed(1)),
      pm25: parseFloat(baseValues.pm25.toFixed(1)),
    });

    const timeStr = new Date().toLocaleTimeString("vi-VN");
    console.log(
      `✅ [${timeStr}] Added: CO2=${reading.co2}ppm, Temp=${reading.temperature}°C`
    );
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

// Chạy ngay 1 lần
addReading();

// Chạy mỗi 3 giây
const interval = setInterval(addReading, 1000);

// Dừng sau 1 giờ (3600 giây / 3 = 1200 readings)
setTimeout(() => {
  clearInterval(interval);
  console.log("\n✅ Simulation complete! Added 1200 readings (1 hour)");
  mongoose.connection.close();
  process.exit(0);
}, 3600 * 1000);

console.log("📊 Adding new reading every 3 seconds...");
console.log("⏱️  Will run for 1 hour. Press Ctrl+C to stop.\n");

// Handle Ctrl+C
process.on("SIGINT", () => {
  console.log("\n\n🛑 Stopped by user");
  clearInterval(interval);
  mongoose.connection.close();
  process.exit(0);
});

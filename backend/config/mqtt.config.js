// config/mqtt.config.js
const STUDENT_ID = "23127503"; // Hoặc lấy từ .env

const MQTT_TOPICS = {
  // Topic nhận sensor data từ ESP32
  SENSOR_DATA: `sensor/data/${STUDENT_ID}`,

  // Topic gửi lệnh điều khiển đến ESP32
  DEVICE_CONTROL: `device/control/${STUDENT_ID}`,
};

module.exports = MQTT_TOPICS;

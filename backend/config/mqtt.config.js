const STUDENT_ID = "23127503";

const MQTT_TOPICS = {
  // Topic nhận sensor data
  SENSOR_DATA: `sensor/data/${STUDENT_ID}`,

  // Topic gửi lệnh điều khiển
  DEVICE_CONTROL: `device/control/${STUDENT_ID}`,
};

module.exports = MQTT_TOPICS;

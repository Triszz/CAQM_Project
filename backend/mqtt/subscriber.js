require("dotenv").config();
const mqtt = require("mqtt");
const Sensor = require("../models/sensor.model");
const { processSensorData } = require("../services/airQualityService");
const MQTT_TOPICS = require("../config/mqtt.config");

const client = mqtt.connect(
  process.env.MQTT_BROKER_URL || "mqtt://broker.hivemq.com"
);

client.on("connect", () => {
  console.log("✅ MQTT Subscriber connected");
  client.subscribe(MQTT_TOPICS.SENSOR_DATA, { qos: 1 });
  console.log(`📡 Subscribed to: ${MQTT_TOPICS.SENSOR_DATA}`);
});

client.on("message", async (topic, message) => {
  try {
    const data = JSON.parse(message.toString());

    console.log(`📥 Sensor data received:`, data);

    // 1. Lưu vào Sensor collection
    await Sensor.create({
      timestamp: new Date(),
      temperature: data.temperature,
      humidity: data.humidity,
      co2: data.co2,
      co: data.co,
      pm25: data.pm25,
    });

    // 2. Xử lý qua AI → LED + Buzzer tự động
    const result = await processSensorData(data);

    console.log(
      `✅ Quality: ${result.quality}, LED: ${result.ledColor}, Buzzer: ${result.buzzerTriggered}`
    );
  } catch (error) {
    console.error("❌ Error processing MQTT message:", error);
  }
});

client.on("error", (err) => {
  console.error("❌ MQTT error:", err);
});

module.exports = client;

require("dotenv").config();
const mqtt = require("mqtt");
const Sensor = require("../models/sensor.model");
const { processSensorData } = require("../services/airQualityService");
const MQTT_TOPICS = require("../config/mqtt.config");
const { getMqttClient } = require("../config/mqtt.client");

const client = getMqttClient();
// Đăng ký message handler
client.on("message", async (topic, message) => {
  try {
    if (topic !== MQTT_TOPICS.SENSOR_DATA) {
      return;
    }

    const data = JSON.parse(message.toString());

    console.log("Sensor data received:", data);

    await Sensor.create({
      timestamp: new Date(),
      temperature: data.temperature,
      humidity: data.humidity,
      co2: data.co2,
      co: data.co,
      pm25: data.pm25,
    });

    const result = await processSensorData(data);

    console.log(
      `Quality: ${result.quality}, LED: ${result.ledColor}, Buzzer: ${result.buzzerTriggered}`
    );
  } catch (error) {
    console.error("Error processing MQTT message:", error);
  }
});

module.exports = client;

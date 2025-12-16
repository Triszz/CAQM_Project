// config/mqtt.client.js

const mqtt = require("mqtt");
const MQTT_TOPICS = require("./mqtt.config");

let mqttClient = null;
let isConnected = false;

function initMqttClient() {
  if (mqttClient) {
    return mqttClient;
  }

  console.log("🔌 Initializing shared MQTT client...");

<<<<<<< HEAD
  mqttClient = mqtt.connect(
    process.env.MQTT_BROKER_URL || "mqtt://broker.hivemq.com",
    {
      clientId: `backend_${Math.random().toString(16).slice(2, 10)}`,
      clean: true,
      reconnectPeriod: 1000,
    }
  );
=======
  mqttClient = mqtt.connect(process.env.MQTT_BROKER_URL || "mqtt://broker.hivemq.com", {
    clientId: `backend_${Math.random().toString(16).slice(2, 10)}`,
    clean: true,
    reconnectPeriod: 1000,
  });
>>>>>>> 4e3ec5cec005068e6be43333af78688d9dedd5ea

  mqttClient.on("connect", () => {
    isConnected = true;
    console.log("✅ Shared MQTT client connected");
<<<<<<< HEAD
    console.log(
      "   Broker:",
      process.env.MQTT_BROKER_URL || "mqtt://broker.hivemq.com"
    );
=======
    console.log("   Broker:", process.env.MQTT_BROKER_URL || "mqtt://broker.hivemq.com");
>>>>>>> 4e3ec5cec005068e6be43333af78688d9dedd5ea

    // ✅ THÊM: Auto-subscribe sensor data khi connect
    mqttClient.subscribe(MQTT_TOPICS.SENSOR_DATA, { qos: 1 }, (err) => {
      if (err) {
        console.error("❌ Subscribe error:", err);
      } else {
        console.log(`📡 Subscribed to: ${MQTT_TOPICS.SENSOR_DATA}`);
      }
    });
  });

  mqttClient.on("error", (err) => {
    isConnected = false;
    console.error("❌ Shared MQTT client error:", err);
  });

  mqttClient.on("close", () => {
    isConnected = false;
    console.warn("⚠️ Shared MQTT client disconnected");
  });

  mqttClient.on("reconnect", () => {
    console.log("🔄 Shared MQTT client reconnecting...");
  });

  mqttClient.on("offline", () => {
    isConnected = false;
    console.warn("⚠️ Shared MQTT client offline");
  });

  return mqttClient;
}

function getMqttClient() {
  if (!mqttClient) {
<<<<<<< HEAD
    throw new Error(
      "MQTT client not initialized! Call initMqttClient() in index.js first."
    );
=======
    throw new Error("MQTT client not initialized! Call initMqttClient() in index.js first.");
>>>>>>> 4e3ec5cec005068e6be43333af78688d9dedd5ea
  }
  return mqttClient;
}

function isMqttConnected() {
  return isConnected && mqttClient && mqttClient.connected;
}

module.exports = {
  initMqttClient,
  getMqttClient,
  isMqttConnected,
};

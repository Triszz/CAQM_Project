const AirQuality = require("../models/airQuality.model");
const DeviceState = require("../models/deviceState.model");
const mqtt = require("mqtt");
const MQTT_TOPICS = require("../config/mqtt.config");

const mqttClient = mqtt.connect(
  process.env.MQTT_BROKER_URL || "mqtt://broker.hivemq.com"
);

mqttClient.on("connect", () => {
  console.log("✅ MQTT connected (airQualityService)");
});

// ✅ Hàm gọi AI (tạm thời dùng logic đơn giản)
async function predictAirQuality(sensorData) {
  try {
    const { co2, co, pm25, temperature, humidity } = sensorData;

    // TODO: Thay bằng AI prediction thật từ bạn của bạn
    // Có thể gọi API Python Flask/FastAPI hoặc load model TensorFlow.js

    let quality;
    let confidence;

    // Logic tạm thời (THAY BẰNG AI)
    if (co2 > 1000 || co > 9 || pm25 > 35) {
      quality = "Kém";
      confidence = 0.9;
    } else if (co2 > 800 || co > 5 || pm25 > 25) {
      quality = "Trung bình";
      confidence = 0.85;
    } else {
      quality = "Tốt";
      confidence = 0.95;
    }

    /* 
    // ✅ KHI TÍCH HỢP AI THẬT (Python API):
    const response = await fetch('http://localhost:5000/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sensorData)
    });
    const result = await response.json();
    quality = result.quality;
    confidence = result.confidence;
    */

    return { quality, confidence };
  } catch (error) {
    console.error("❌ AI prediction error:", error);
    throw error;
  }
}

// ✅ Map chất lượng → màu LED
function getColorForQuality(quality) {
  const colorMap = {
    Tốt: "green",
    "Trung bình": "yellow",
    Kém: "red",
  };
  return colorMap[quality] || "green";
}

// ✅ Xử lý sensor data: AI + LED + Buzzer
async function processSensorData(sensorData) {
  try {
    // 1. Gọi AI prediction
    const { quality, confidence } = await predictAirQuality(sensorData);

    console.log(`🤖 AI: ${quality} (confidence: ${confidence})`);

    // 2. Xác định màu LED
    const ledColor = getColorForQuality(quality);
    const ledState = await DeviceState.findOne({ deviceType: "led" });
    const currentBrightness = ledState?.ledState?.brightness || 75;
    // 3. Gửi lệnh LED đổi màu
    const ledPayload = {
      device: "led",
      action: "set_color",
      color: ledColor,
      brightness: currentBrightness,
      quality: quality,
      timestamp: new Date().toISOString(),
    };

    mqttClient.publish(MQTT_TOPICS.DEVICE_CONTROL, JSON.stringify(ledPayload), {
      qos: 1,
    });
    console.log(`💡 LED changed to: ${ledColor}`);
    await DeviceState.findOneAndUpdate(
      { deviceType: "led" },
      {
        $set: {
          "ledState.currentColor": ledColor,
          lastUpdated: new Date(),
        },
      },
      { upsert: true }
    );

    // 4. Nếu "Kém" → Trigger buzzer
    let buzzerTriggered = false;
    let buzzerConfig = null;

    if (quality === "Kém") {
      const buzzerState = await DeviceState.findOne({ deviceType: "buzzer" });

      if (buzzerState) {
        const { beepCount, beepDuration, interval } = buzzerState.buzzerState;

        const buzzerPayload = {
          device: "buzzer",
          action: "alert",
          reason: "poor_air_quality",
          quality: quality,
          config: {
            beepCount,
            beepDuration,
            interval,
          },
          timestamp: new Date().toISOString(),
        };

        mqttClient.publish(
          MQTT_TOPICS.DEVICE_CONTROL,
          JSON.stringify(buzzerPayload),
          {
            qos: 1,
          }
        );

        buzzerTriggered = true;
        buzzerConfig = { beepCount, beepDuration, interval };

        console.log(`🚨 Buzzer triggered: ${beepCount} beeps`);

        // Cập nhật lastTriggered
        await DeviceState.findOneAndUpdate(
          { deviceType: "buzzer" },
          { $set: { "buzzerState.lastTriggered": new Date() } }
        );
      }
    }

    // 5. Lưu vào database
    await AirQuality.create({
      sensorData,
      quality,
      confidence,
      ledColor,
      buzzerTriggered,
      buzzerConfig,
      timestamp: new Date(),
    });

    return { quality, confidence, ledColor, buzzerTriggered };
  } catch (error) {
    console.error("❌ Error processing sensor data:", error);
    throw error;
  }
}

module.exports = {
  predictAirQuality,
  processSensorData,
};

// services/airQualityService.js

const AirQuality = require("../models/airQuality.model");
const DeviceState = require("../models/deviceState.model");
const mqtt = require("mqtt");
const MQTT_TOPICS = require("../config/mqtt.config");
const { sendAirQualityAlert } = require("./emailService"); // ✅ ĐÃ CÓ

const mqttClient = mqtt.connect(
  process.env.MQTT_BROKER_URL || "mqtt://broker.hivemq.com"
);

mqttClient.on("connect", () => {
  console.log("✅ MQTT connected (airQualityService)");
});

// ✅ THÊM: Biến lưu trạng thái email (tránh spam)
let lastEmailSent = 0;
const EMAIL_COOLDOWN = 5 * 60 * 1000; // 5 phút

// ✅ Hàm gọi AI (tạm thời dùng logic đơn giản)
async function predictAirQuality(sensorData) {
  try {
    const { co2, co, pm25, temperature, humidity } = sensorData;

    // Validate input
    if (
      co2 === undefined ||
      co === undefined ||
      pm25 === undefined ||
      temperature === undefined ||
      humidity === undefined
    ) {
      throw new Error("Missing required sensor fields");
    }

    // 🔗 Gọi Python Decision Tree API
    const response = await fetch(
      process.env.AI_SERVICE_URL || "http://localhost:5000/predict",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          co2,
          co,
          pm25,
          temperature,
          humidity,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `AI Service error: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();

    return {
      quality: result.quality,
      confidence: result.confidence,
      problematicSensors: result.problematic_sensors || [],
    };
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

// ✅ Xử lý sensor data: AI + LED + Buzzer + EMAIL
async function processSensorData(sensorData) {
  try {
    // 1. Gọi AI prediction
    const { quality, confidence, problematicSensors } = await predictAirQuality(
      sensorData
    );

    console.log(
      `🤖 AI: ${quality} (confidence: ${confidence}) - Problematic sensors: ${
        problematicSensors.length > 0
          ? problematicSensors.map((s) => s.sensor).join(", ")
          : "None"
      }`
    );

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

    // 4. Nếu "Kém" → Trigger buzzer + GỬI EMAIL
    let buzzerTriggered = false;
    let buzzerConfig = null;
    let emailSent = false;

    if (quality === "Kém") {
      const buzzerState = await DeviceState.findOne({ deviceType: "buzzer" });

      // ✅ 4.1. Trigger Buzzer
      if (buzzerState) {
        const { beepCount, beepDuration, interval } = buzzerState.buzzerState;

        const buzzerPayload = {
          device: "buzzer",
          action: "alert",
          reason: "poor_air_quality",
          quality: quality,
          problematicSensors: problematicSensors,
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

        console.log(
          `🚨 Buzzer triggered: ${beepCount} beeps (Problematic sensors: ${problematicSensors
            .map((s) => s.sensor)
            .join(", ")})`
        );

        // Cập nhật lastTriggered
        await DeviceState.findOneAndUpdate(
          { deviceType: "buzzer" },
          { $set: { "buzzerState.lastTriggered": new Date() } }
        );
      }

      // ✅ 4.2. GỬI EMAIL CẢNH BÁO (với cooldown)
      const now = Date.now();

      if (now - lastEmailSent >= EMAIL_COOLDOWN) {
        console.log("📧 Sending air quality alert email...");

        try {
          // TODO: Lấy email user từ database (hiện tại dùng env)
          const userEmail = process.env.ALERT_EMAIL || process.env.EMAIL_USER;
          const username = "User"; // TODO: Lấy từ user collection

          const emailResult = await sendAirQualityAlert(userEmail, username, {
            temperature: sensorData.temperature,
            humidity: sensorData.humidity,
            co2: sensorData.co2,
            co: sensorData.co,
            pm25: sensorData.pm25,
            quality: quality,
          });

          if (emailResult.success) {
            lastEmailSent = now;
            emailSent = true;
            console.log(`✅ Alert email sent to ${userEmail}`);
          } else {
            console.error("❌ Failed to send alert email:", emailResult.error);
          }
        } catch (emailError) {
          console.error("❌ Email sending error:", emailError);
        }
      } else {
        const timeLeft = Math.ceil(
          (EMAIL_COOLDOWN - (now - lastEmailSent)) / 1000
        );
        console.log(
          `⏳ Email cooldown: ${timeLeft}s remaining (prevents spam)`
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
      problematicSensors,
      emailSent,
      timestamp: new Date(),
    });

    return {
      quality,
      confidence,
      ledColor,
      buzzerTriggered,
      problematicSensors,
      emailSent,
    };
  } catch (error) {
    console.error("❌ Error processing sensor data:", error);
    throw error;
  }
}

module.exports = {
  predictAirQuality,
  processSensorData,
};

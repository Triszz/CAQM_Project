// services/airQualityService.js

const AirQuality = require("../models/airQuality.model");
const DeviceState = require("../models/deviceState.model");
const mqtt = require("mqtt");
const MQTT_TOPICS = require("../config/mqtt.config");
const { sendAirQualityAlert } = require("./emailService"); // ✅ ĐÃ CÓ
const { getMqttClient, isMqttConnected } = require("../config/mqtt.client");

// ✅ THÊM: Biến lưu trạng thái email (tránh spam)
let lastEmailSent = 0;
const EMAIL_COOLDOWN = 5 * 60 * 1000; // 5 phút

// ✅ Hàm gọi AI
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

    // ✅ TEST MODE: Force "Kém" để test buzzer + LED + email
    // console.log("🧪 TEST MODE: Forcing quality to 'Kém'");
    // return {
    //   quality: "Kém",
    //   confidence: 0.95,
    //   problematicSensors: [
    //     {
    //       sensor: "CO2",
    //       value: co2,
    //       unit: "ppm",
    //       threshold: 1000,
    //       severity: "cao",
    //     },
    //     {
    //       sensor: "PM2.5",
    //       value: pm25,
    //       unit: "μg/m³",
    //       threshold: 35,
    //       severity: "cao",
    //     },
    //   ],
    // };
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
// services/airQualityService.js

async function processSensorData(sensorData) {
  try {
    const mqttClient = getMqttClient();

    // 1. AI prediction
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

    // 2. LED đổi màu
    const ledColor = getColorForQuality(quality);
    const ledState = await DeviceState.findOne({ deviceType: "led" });
    const currentBrightness = ledState?.ledState?.brightness || 75;

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

    // 3. Buzzer + Email
    let buzzerTriggered = false;
    let buzzerConfig = null;
    let emailSent = false;

    if (quality === "Kém") {
      console.log("\n========== POOR AIR QUALITY DETECTED ==========");
      console.log("🔍 MQTT connected?", isMqttConnected());

      if (!isMqttConnected()) {
        console.error("❌ MQTT not connected! Cannot send buzzer alert.");
        console.log("   Skipping buzzer trigger...");
      } else {
        console.log("✅ MQTT is connected");

        const buzzerState = await DeviceState.findOne({ deviceType: "buzzer" });

        console.log("🔍 Buzzer state:", buzzerState);

        if (buzzerState) {
          const { beepCount, beepDuration, interval } = buzzerState.buzzerState;

          console.log("🔍 Buzzer config:", {
            beepCount,
            beepDuration,
            interval,
          });

          const buzzerPayload = {
            device: "buzzer",
            action: "alert",
            reason: "poor_air_quality",
            quality: quality,
            problematicSensors: problematicSensors,
            config: {
              beepCount: parseInt(beepCount),
              beepDuration: parseInt(beepDuration),
              interval: parseInt(interval),
            },
            timestamp: new Date().toISOString(),
          };

          console.log("📤 Publishing buzzer alert to MQTT...");
          console.log("   Topic:", MQTT_TOPICS.DEVICE_CONTROL);
          console.log("   Payload:", JSON.stringify(buzzerPayload, null, 2));

          await new Promise((resolve) => setTimeout(resolve, 500));

          mqttClient.publish(
            MQTT_TOPICS.DEVICE_CONTROL,
            JSON.stringify(buzzerPayload),
            { qos: 1 },
            (err) => {
              if (err) {
                console.error("❌ MQTT publish error:", err);
              } else {
                console.log("✅ Buzzer alert published successfully!");
              }
            }
          );

          buzzerTriggered = true;
          buzzerConfig = { beepCount, beepDuration, interval };

          // ✅ DI CHUYỂN LOG VÀO ĐÂY
          console.log(`🚨 Buzzer alert SENT: ${beepCount} beeps`);

          await DeviceState.findOneAndUpdate(
            { deviceType: "buzzer" },
            { $set: { "buzzerState.lastTriggered": new Date() } }
          );
        } else {
          console.error("❌ Buzzer state not found in DB!");
          console.log("   Creating default buzzer state...");

          // ✅ THÊM: Tạo default buzzer state nếu chưa có
          await DeviceState.create({
            deviceType: "buzzer",
            buzzerState: {
              beepCount: 5,
              beepDuration: 300,
              interval: 200,
              lastTriggered: null,
            },
            isActive: true,
            lastUpdated: new Date(),
          });

          console.log("✅ Default buzzer state created. Retry on next cycle.");
        }
      }

      console.log("===============================================\n");

      // 4. Email
      const now = Date.now();

      if (now - lastEmailSent >= EMAIL_COOLDOWN) {
        console.log("📧 Sending air quality alert email...");

        try {
          const userEmail = process.env.ALERT_EMAIL || process.env.EMAIL_USER;
          const username = "User";

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

// services/airQualityService.js

const AirQuality = require("../models/airQuality.model");
const DeviceState = require("../models/deviceState.model");
const mqtt = require("mqtt");
const MQTT_TOPICS = require("../config/mqtt.config");
const { sendAirQualityAlert } = require("./emailService");
const { getMqttClient, isMqttConnected } = require("../config/mqtt.client");
const { sendPushsaferAlert } = require("./pushsafer.service");

// THEM: Biến lưu trạng thái email (tránh spam)
const EMAIL_COOLDOWN = 5 * 60 * 1000; // 5 phút

// Hàm gọi AI
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

    // Gọi Python Decision Tree API
    const response = await fetch(process.env.AI_SERVICE_URL || "http://localhost:5000/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        co2,
        co,
        pm25,
        temperature,
        humidity,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI Service error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    return {
      quality: result.quality,
      confidence: result.confidence,
      problematicSensors: result.problematic_sensors || [],
    };
  } catch (error) {
    console.error("AI prediction error:", error);
    throw error;
  }
}

// Map chất lượng -> màu LED
function getColorForQuality(quality) {
  const colorMap = {
    Tốt: "green",
    "Trung bình": "yellow",
    Kém: "red",
  };
  return colorMap[quality] || "green";
}

async function canSendEmailNow() {
  try {
    const now = new Date();
    const cooldownTime = new Date(now.getTime() - EMAIL_COOLDOWN);

    // Tìm email cuối cùng GỬI TRONG 5 PHÚT QUA
    const recentAlert = await AirQuality.findOne({
      emailSent: true,
      timestamp: { $gte: cooldownTime }, // Trong 5 phút qua
    }).sort({ timestamp: -1 });

    if (recentAlert) {
      const timeLeft = Math.ceil((EMAIL_COOLDOWN - (now.getTime() - new Date(recentAlert.timestamp).getTime())) / 1000);
      console.log(
        `[Email Cooldown] Last email sent ${Math.floor(
          (now.getTime() - new Date(recentAlert.timestamp).getTime()) / 1000
        )}s ago. Cooldown: ${timeLeft}s remaining.`
      );
      return { canSend: false, timeLeft };
    }

    console.log("[Email Cooldown] No recent emails found. Can send.");
    return { canSend: true, timeLeft: 0 };
  } catch (error) {
    console.error("Error checking email cooldown:", error);
    return { canSend: false, timeLeft: 300 }; // THAY DOI: Mặc định KHÔNG cho phép gửi nếu lỗi
  }
}

// Xử lý sensor data: AI + LED + Buzzer + EMAIL
async function processSensorData(sensorData) {
  try {
    const mqttClient = getMqttClient();

    // 1. AI prediction
    const { quality, confidence, problematicSensors } = await predictAirQuality(sensorData);

    console.log(
      `AI: ${quality} (confidence: ${confidence}) - Problematic sensors: ${
        problematicSensors.length > 0 ? problematicSensors.map((s) => s.sensor).join(", ") : "None"
      }`
    );

    // 2. LED đổi màu (giữ nguyên)
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
    console.log(`LED changed to: ${ledColor}`);

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
      console.log("MQTT connected?", isMqttConnected());

      // 3.1 BUZZER (giữ nguyên code cũ)
      if (!isMqttConnected()) {
        console.error("MQTT not connected! Cannot send buzzer alert.");
        console.log("   Skipping buzzer trigger...");
      } else {
        console.log("MQTT is connected");

        const buzzerState = await DeviceState.findOne({ deviceType: "buzzer" });

        if (buzzerState) {
          const { beepCount, beepDuration, interval } = buzzerState.buzzerState;

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

          console.log("Publishing buzzer alert to MQTT...");
          console.log("   Topic:", MQTT_TOPICS.DEVICE_CONTROL);
          console.log("   Payload:", JSON.stringify(buzzerPayload, null, 2));

          await new Promise((resolve) => setTimeout(resolve, 500));

          mqttClient.publish(MQTT_TOPICS.DEVICE_CONTROL, JSON.stringify(buzzerPayload), { qos: 1 }, (err) => {
            if (err) {
              console.error("MQTT publish error:", err);
            } else {
              console.log("Buzzer alert published successfully!");
            }
          });

          buzzerTriggered = true;
          buzzerConfig = { beepCount, beepDuration, interval };
          console.log(`Buzzer alert SENT: ${beepCount} beeps`);

          await DeviceState.findOneAndUpdate(
            { deviceType: "buzzer" },
            { $set: { "buzzerState.lastTriggered": new Date() } }
          );
        } else {
          console.error("Buzzer state not found in DB!");
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
          console.log("Default buzzer state created. Retry on next cycle.");
        }
      }

      console.log("===============================================\n");

      // 3.2 EMAIL - SUA: Kiểm tra cooldown TRƯỚC KHI gửi
      const cooldownStatus = await canSendEmailNow();

      if (cooldownStatus.canSend) {
        console.log("\n═══════════════════════════════════════════════════════");
        console.log("EMAIL & PUSHSAFER ALERT BLOCK");
        console.log("═══════════════════════════════════════════════════════");

        // THEM: LƯU VÀO DB TRƯỚC KHI GỬI EMAIL (để block các requests tiếp theo)
        const preEmailRecord = await AirQuality.create({
          sensorData,
          quality,
          confidence,
          ledColor,
          buzzerTriggered,
          buzzerConfig,
          problematicSensors,
          emailSent: false, // <- Chưa gửi, nhưng đã reserve slot
          timestamp: new Date(),
        });

        console.log("Pre-email record created (ID:", preEmailRecord._id, ")");

        try {
          const userEmail = process.env.ALERT_EMAIL || process.env.EMAIL_USER;
          const username = "User";

          console.log("\n--- 4.1 EMAIL ATTEMPT ---");

          // Gửi email
          const emailResult = await sendAirQualityAlert(userEmail, username, {
            temperature: sensorData.temperature,
            humidity: sensorData.humidity,
            co2: sensorData.co2,
            co: sensorData.co,
            pm25: sensorData.pm25,
            quality: quality,
            problematicSensors: problematicSensors,
          });

          console.log("\n--- 4.1 EMAIL RESULT ---");
          console.log("Success:", emailResult.success);
          console.log("Message ID:", emailResult.messageId || "N/A");

          // UPDATE: Cập nhật record sau khi gửi email
          if (emailResult.success) {
            await AirQuality.findByIdAndUpdate(preEmailRecord._id, {
              emailSent: true, // <- Gửi thành công
            });
            emailSent = true;
            console.log("\nAlert email sent to:", userEmail);
          } else {
            // Nếu gửi thất bại, xóa record để không block lần sau
            await AirQuality.findByIdAndDelete(preEmailRecord._id);
            console.error("\nFailed to send email. Record deleted.");
          }

          console.log("\n--- 4.2 PUSHSAFER ATTEMPT ---");

          // Gửi Pushsafer
          const pushsaferResult = await sendPushsaferAlert(
            {
              ...sensorData,
              problematicSensors: problematicSensors,
            },
            quality
          );

          console.log("\n--- 4.2 PUSHSAFER RESULT ---");
          console.log("Success:", pushsaferResult.success);
          console.log("Sent:", pushsaferResult.sent);
          console.log("Message:", pushsaferResult.message);

          console.log("═══════════════════════════════════════════════════════\n");
        } catch (emailError) {
          console.error("\nEmail/Pushsafer block error:", emailError);

          // Nếu có lỗi, xóa record để không block lần sau
          await AirQuality.findByIdAndDelete(preEmailRecord._id);
          console.log("   Pre-email record deleted due to error.");

          console.log("═══════════════════════════════════════════════════════\n");
        }

        // KHONG CAN tạo record mới vì đã tạo preEmailRecord ở trên
        return {
          quality,
          confidence,
          ledColor,
          buzzerTriggered,
          problematicSensors,
          emailSent,
        };
      } else {
        console.log(`[Alert] Cooldown active: ${cooldownStatus.timeLeft}s remaining (prevents spam)`);
      }
    }

    // 5. Lưu vào database (CHỈ khi KHÔNG GỬI email hoặc không phải "Kém")
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
    console.error("Error processing sensor data:", error);
    throw error;
  }
}

module.exports = {
  predictAirQuality,
  processSensorData,
};

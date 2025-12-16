// services/pushsafer.service.js
const Pushsafer = require("pushsafer-notifications");

const pushsaferClient = new Pushsafer({
  k: process.env.PUSHSAFER_PRIVATE_KEY,
  debug: false,
});

// ✅ Biến lưu trạng thái pushsafer (tránh spam)
let lastPushsaferSent = 0;
const PUSHSAFER_COOLDOWN = 5 * 60 * 1000; // 5 phút

/**
 * Gửi cảnh báo chất lượng không khí qua Pushsafer
 * @param {Object} sensorData - Dữ liệu cảm biến
 * @param {String} quality - Chất lượng không khí
 * @param {String} [deviceId] - ID thiết bị Pushsafer (rỗng = tất cả devices trong account)
 * @returns {Object} - { success, sent, message, messageId, etc }
 */
async function sendPushsaferAlert(sensorData, quality, deviceId = "") {
  try {
    const now = Date.now();
    const { temperature, humidity, co2, co, pm25 } = sensorData;

    // ✅ DEBUG: Log input
    console.log("📱 [Pushsafer] Starting sendPushsaferAlert...");
    console.log("   Device ID:", deviceId || process.env.PUSHSAFER_DEVICE_ID || "all devices");
    console.log("   Quality:", quality);
    console.log("   Data:", { temperature, humidity, co2, co, pm25 });

    // ✅ Kiểm tra cooldown (giống email)
    if (now - lastPushsaferSent < PUSHSAFER_COOLDOWN) {
      const timeLeft = Math.ceil((PUSHSAFER_COOLDOWN - (now - lastPushsaferSent)) / 1000);
      console.log(`⏳ [Pushsafer] Cooldown active: ${timeLeft}s remaining (prevents spam)`);
      return {
        success: false,
        sent: false,
        reason: "cooldown",
        timeLeft,
        message: `Đang chờ ${timeLeft}s trước khi gửi pushsafer tiếp theo`,
      };
    }

    // ✅ DEBUG: Log cooldown check passed
    console.log("✅ [Pushsafer] Cooldown check passed - proceeding to send");

    const message = `🚨 CẢNH BÁO: Chất lượng không khí ${quality.toUpperCase()}

📊 Dữ liệu cảm biến:
🌡️ Nhiệt độ: ${temperature.toFixed(1)}°C
💧 Độ ẩm: ${humidity.toFixed(1)}%
🏭 CO₂: ${co2} ppm
☠️ CO: ${co.toFixed(1)} ppm
💨 PM2.5: ${pm25.toFixed(1)} µg/m³

Thời gian: ${new Date().toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
    })}`;

    const msg = {
      m: message,
      t: "IAQM - ⚠️ Cảnh báo không khí",
      d: deviceId || process.env.PUSHSAFER_DEVICE_ID || "",
      s: "1", // sound
      v: "1", // vibrate
      pr: "2", // high priority
    };

    // ✅ DEBUG: Log message details
    console.log("📝 [Pushsafer] Message config:");
    console.log("   Title:", msg.t);
    console.log("   Device ID:", msg.d);
    console.log("   Priority:", msg.pr);
    console.log("   Sound:", msg.s);
    console.log("   Vibrate:", msg.v);
    console.log("   Message preview:", message.substring(0, 50) + "...");

    return new Promise((resolve) => {
      console.log("🔄 [Pushsafer] Sending via Pushsafer API...");

      pushsaferClient.send(msg, (err, result) => {
        if (err) {
          console.error("❌ [Pushsafer] Send error:", err);
          console.error("   Error message:", err.message);
          console.error("   Error code:", err.code);

          return resolve({
            success: false,
            sent: false,
            error: err.message,
            errorCode: err.code,
            message: "❌ Không thể gửi pushsafer",
          });
        }

        // ✅ Cập nhật thời gian gửi thành công (giống email)
        lastPushsaferSent = now;

        console.log("✅ [Pushsafer] Sent successfully!");
        console.log("   Response:", result);

        // Parse result if it's a string
        let parsedResult = result;
        if (typeof result === "string") {
          try {
            parsedResult = JSON.parse(result);
          } catch (e) {
            parsedResult = result;
          }
        }

        resolve({
          success: true,
          sent: true,
          result: parsedResult,
          messageId: parsedResult?.message_ids || "unknown",
          message: "✅ Pushsafer sent successfully",
        });
      });
    });
  } catch (error) {
    console.error("❌ [Pushsafer] Unexpected error:", error);
    console.error("   Error type:", error.constructor.name);
    console.error("   Error message:", error.message);

    return {
      success: false,
      sent: false,
      error: error.message,
      message: "❌ Lỗi không mong đợi khi gửi pushsafer",
    };
  }
}

/**
 * Reset cooldown (chỉ dùng cho test hoặc admin)
 */
function resetPushsaferCooldown() {
  lastPushsaferSent = 0;
  console.log("✅ Pushsafer cooldown reset");
}

module.exports = { sendPushsaferAlert, resetPushsaferCooldown };

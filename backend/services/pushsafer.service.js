const Pushsafer = require("pushsafer-notifications");

const pushsaferClient = new Pushsafer({
  k: process.env.PUSHSAFER_PRIVATE_KEY,
  debug: false,
});

async function sendPushsaferAlert(sensorData, quality, deviceId = "") {
  try {
    const now = Date.now();
    const { problematicSensors = [] } = sensorData;

    console.log("[Pushsafer] Starting sendPushsaferAlert...");
    console.log(
      "   Device ID:",
      deviceId || process.env.PUSHSAFER_DEVICE_ID || "all devices"
    );
    console.log("   Quality:", quality);
    console.log("   Data:", sensorData);

    if (problematicSensors.length === 0) {
      console.log(
        "[Pushsafer] No problematic sensors detected. Skipping notification."
      );
      return {
        success: false,
        sent: false,
        skipped: true,
        message: "No problematic sensors to report",
      };
    }

    // Kiểm tra cooldown

    console.log("[Pushsafer] Cooldown check passed - proceeding to send");

    const problematicText = problematicSensors
      .map((s) => {
        const displayValue =
          typeof s.value === "number" ? s.value.toFixed(1) : s.value;
        return `- ${s.sensor}: ${displayValue} ${s.unit}`;
      })
      .join("\n");

    const message = `CẢNH BÁO: Chất lượng không khí ${quality.toUpperCase()}

${problematicSensors.length} sensor vượt ngưỡng:
${problematicText}

Khuyến nghị:
• Mở cửa sổ thông gió
• Bật máy lọc không khí
• Đeo khẩu trang khi cần

Thời gian: ${new Date().toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
    })}`;

    const msg = {
      m: message,
      t: `CẢNH BÁO: ${
        problematicSensors.length
      } sensor vượt ngưỡng - ${quality.toUpperCase()}`,
      d: deviceId || process.env.PUSHSAFER_DEVICE_ID || "",
      s: "1", // sound
      v: "1", // vibrate
      pr: "2", // high priority
    };

    console.log("[Pushsafer] Message config:");
    console.log("   Title:", msg.t);
    console.log("   Device ID:", msg.d);
    console.log("   Priority:", msg.pr);
    console.log("   Sound:", msg.s);
    console.log("   Vibrate:", msg.v);
    console.log("   Message preview:", message.substring(0, 100) + "...");
    console.log(
      "   Problematic sensors:",
      problematicSensors.map((s) => `${s.sensor}=${s.value}${s.unit}`)
    );

    return new Promise((resolve) => {
      console.log("[Pushsafer] Sending via Pushsafer API...");

      pushsaferClient.send(msg, (err, result) => {
        if (err) {
          console.error("[Pushsafer] Send error:", err);
          console.error("   Error message:", err.message);
          console.error("   Error code:", err.code);

          return resolve({
            success: false,
            sent: false,
            error: err.message,
            errorCode: err.code,
            message: "Không thể gửi pushsafer",
          });
        }

        console.log("[Pushsafer] Sent successfully!");
        console.log("   Response:", result);

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
          message: "Pushsafer sent successfully",
        });
      });
    });
  } catch (error) {
    console.error("[Pushsafer] Unexpected error:", error);
    console.error("   Error type:", error.constructor.name);
    console.error("   Error message:", error.message);

    return {
      success: false,
      sent: false,
      error: error.message,
      message: "Lỗi không mong đợi khi gửi pushsafer",
    };
  }
}

module.exports = { sendPushsaferAlert };

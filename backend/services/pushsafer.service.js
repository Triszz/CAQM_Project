// services/pushsafer.service.js
const Pushsafer = require("pushsafer-notifications");

const pushsaferClient = new Pushsafer({
  k: process.env.PUSHSAFER_PRIVATE_KEY,
  debug: false,
});

/**
 * Gửi cảnh báo chất lượng không khí qua Pushsafer
 * @param {Object} sensorData
 * @param {String} quality
 * @param {String} [deviceId] - ID thiết bị Pushsafer (rỗng = tất cả devices trong account)
 */
async function sendPushsaferAlert(sensorData, quality, deviceId = "") {
  const { temperature, humidity, co2, co, pm25 } = sensorData;

  const message = `CẢNH BÁO: Chất lượng không khí ${quality.toUpperCase()}
Nhiệt độ: ${temperature.toFixed(1)}°C
Độ ẩm: ${humidity.toFixed(1)}%
CO₂: ${co2} ppm
CO: ${co.toFixed(1)} ppm
PM2.5: ${pm25.toFixed(1)} µg/m³`;

  const msg = {
    m: message,
    t: "IAQM - Cảnh báo không khí",
    d: deviceId || process.env.PUSHSAFER_DEVICE_ID || "",
    s: "1", // sound
    v: "1", // vibrate
    pr: "2", // high priority
  };

  return new Promise((resolve, reject) => {
    pushsaferClient.send(msg, (err, result) => {
      if (err) {
        console.error("❌ Pushsafer error:", err);
        return reject(err);
      }
      console.log("✅ Pushsafer sent:", result);
      resolve(result);
    });
  });
}

module.exports = { sendPushsaferAlert };

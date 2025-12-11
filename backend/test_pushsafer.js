require("dotenv").config();
const { sendPushsaferAlert } = require("./services/pushsafer.service");

async function main() {
  const fakeSensorData = {
    temperature: 30,
    humidity: 70,
    co2: 2000,
    co: 15,
    pm25: 80,
  };

  try {
    await sendPushsaferAlert(fakeSensorData, "Kém");
    console.log("✅ Test Pushsafer OK");
  } catch (err) {
    console.error("❌ Test Pushsafer FAILED:", err);
  }
}

main();

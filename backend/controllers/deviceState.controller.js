const DeviceState = require("../models/deviceState.model");
const mqtt = require("mqtt");
const MQTT_TOPICS = require("../config/mqtt.config");
const { getMqttClient } = require("../config/mqtt.client");

// ✅ Cập nhật độ sáng LED (GIỮ MÀU HIỆN TẠI)
const updateLedBrightness = async (req, res) => {
  try {
    const { brightness } = req.body;

    // Validate
    if (brightness === undefined || brightness < 0 || brightness > 100) {
      return res.status(400).json({
        success: false,
        error: "Brightness must be between 0 and 100",
      });
    }

    // ✅ Lấy màu hiện tại từ DB
    const currentState = await DeviceState.findOne({ deviceType: "led" });
    const currentColor = currentState?.ledState?.currentColor || "green";

    // ✅ Cập nhật brightness, giữ nguyên màu
    const deviceState = await DeviceState.findOneAndUpdate(
      { deviceType: "led" },
      {
        $set: {
          "ledState.brightness": brightness,
          isActive: brightness > 0,
          lastUpdated: new Date(),
        },
      },
      { new: true, upsert: true }
    );

    // ✅ Gửi lệnh qua MQTT (bao gồm CẢ brightness VÀ color)
    const mqttPayload = {
      device: "led",
      action: "set_brightness",
      brightness: brightness,
      color: currentColor, // Giữ nguyên màu hiện tại
      timestamp: new Date().toISOString(),
    };
    const mqttClient = getMqttClient();
    mqttClient.publish(
      MQTT_TOPICS.DEVICE_CONTROL,
      JSON.stringify(mqttPayload),
      { qos: 1 }
    );

    console.log(
      `✅ LED brightness updated: ${brightness}% (color: ${currentColor})`
    );

    res.status(200).json({
      success: true,
      message: "LED brightness updated",
      data: deviceState,
    });
  } catch (error) {
    console.error("❌ Error updating LED brightness:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// ✅ Cập nhật cấu hình Buzzer
const updateBuzzerConfig = async (req, res) => {
  try {
    const { beepCount, beepDuration, interval } = req.body;

    // Validate
    if (beepCount === undefined || beepCount < 1 || beepCount > 10) {
      return res.status(400).json({
        success: false,
        error: "beepCount must be between 1 and 10",
      });
    }

    // ✅ Cập nhật database
    const deviceState = await DeviceState.findOneAndUpdate(
      { deviceType: "buzzer" },
      {
        $set: {
          "buzzerState.beepCount": beepCount,
          "buzzerState.beepDuration": beepDuration || 200,
          "buzzerState.interval": interval || 100,
          lastUpdated: new Date(),
        },
      },
      { new: true, upsert: true }
    );

    console.log(`✅ Buzzer config saved: ${beepCount} beeps`);

    res.status(200).json({
      success: true,
      message: "Buzzer config saved",
      data: deviceState,
    });
  } catch (error) {
    console.error("❌ Error updating buzzer config:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// ✅ Test buzzer với config từ frontend (không lưu vào DB)
const testBuzzer = async (req, res) => {
  try {
    // ✅ Lấy config từ request body (từ frontend)
    const { beepCount, beepDuration, interval } = req.body;
    console.log("📥 Request body:", req.body);
    // Validate beepCount
    if (!beepCount || beepCount < 1 || beepCount > 10) {
      return res.status(400).json({
        success: false,
        error: "beepCount must be between 1 and 10",
      });
    }

    // ✅ Gửi lệnh test qua MQTT với config từ user
    const mqttPayload = {
      device: "buzzer",
      action: "test",
      config: {
        beepCount: parseInt(beepCount),
        beepDuration: parseInt(beepDuration) || 200, // Default 200ms
        interval: parseInt(interval) || 100, // Default 100ms
      },
      timestamp: new Date().toISOString(),
    };

    console.log("📤 MQTT Payload (Test Buzzer):");
    console.log(JSON.stringify(mqttPayload, null, 2));
    const mqttClient = getMqttClient();
    mqttClient.publish(
      MQTT_TOPICS.DEVICE_CONTROL,
      JSON.stringify(mqttPayload),
      {
        qos: 1,
      }
    );

    console.log(
      `✅ Buzzer test triggered: ${beepCount} beeps (not saved to DB)`
    );

    res.status(200).json({
      success: true,
      message: `Buzzer test sent: ${beepCount} beeps`,
      config: mqttPayload.config,
    });
  } catch (error) {
    console.error("❌ Error testing buzzer:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// ✅ Lấy trạng thái hiện tại của device
const getDeviceState = async (req, res) => {
  try {
    const { deviceType } = req.params;

    const deviceState = await DeviceState.findOne({ deviceType });

    if (!deviceState) {
      return res.status(404).json({
        success: false,
        error: "Device state not found",
      });
    }

    res.status(200).json({
      success: true,
      data: deviceState,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// ✅ Lấy tất cả trạng thái devices
const getAllDeviceStates = async (req, res) => {
  try {
    const deviceStates = await DeviceState.find();

    res.status(200).json({
      success: true,
      data: deviceStates,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

module.exports = {
  updateLedBrightness,
  updateBuzzerConfig,
  testBuzzer,
  getDeviceState,
  getAllDeviceStates,
};

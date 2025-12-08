const express = require("express");
const router = express.Router();
const {
  updateLedBrightness,
  updateBuzzerConfig,
  testBuzzer,
  getDeviceState,
  getAllDeviceStates,
} = require("../controllers/deviceState.controller");
const requireAuth = require("../middlewares/requireAuth");

// ✅ Lấy tất cả trạng thái
router.get("/", requireAuth, getAllDeviceStates);

// ✅ Lấy trạng thái của 1 device
router.get("/:deviceType", requireAuth, getDeviceState);

// ✅ Cập nhật LED brightness
router.put("/led/brightness", requireAuth, updateLedBrightness);

// ✅ Cập nhật Buzzer config
router.put("/buzzer/config", requireAuth, updateBuzzerConfig);

// ✅ Test buzzer
router.post("/buzzer/test", requireAuth, testBuzzer);

module.exports = router;

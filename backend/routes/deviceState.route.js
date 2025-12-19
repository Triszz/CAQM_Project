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

router.use(requireAuth);
//Lấy tất cả trạng thái
router.get("/", getAllDeviceStates);

//Lấy trạng thái của 1 device
router.get("/:deviceType", getDeviceState);

//Cập nhật LED brightness
router.put("/led/brightness", updateLedBrightness);

//Cập nhật Buzzer config
router.put("/buzzer/config", updateBuzzerConfig);

//Test buzzer
router.post("/buzzer/test", testBuzzer);

module.exports = router;

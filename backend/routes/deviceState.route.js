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

router.get("/", getAllDeviceStates);

router.get("/:deviceType", getDeviceState);

router.put("/led/brightness", updateLedBrightness);

router.put("/buzzer/config", updateBuzzerConfig);

router.post("/buzzer/test", testBuzzer);

module.exports = router;

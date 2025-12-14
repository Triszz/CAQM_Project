const express = require("express");
const router = express.Router();
const {
  getCurrentAirQuality,
  getAirQualityHistory,
} = require("../controllers/airQuality.controller");
const requireAuth = require("../middlewares/requireAuth");

router.use(requireAuth);
router.get("/current", getCurrentAirQuality);
router.get("/history", getAirQualityHistory);

module.exports = router;

const express = require("express");
const router = express.Router();
const {
  addSensorReading,
  getLatestSensorReading,
  getSensorReadingByRange,
  getSensorReadingToday,
  deleteOldReadings,
  getSensorReadingLastHour,
} = require("../controllers/sensor.controller");

router.post("/add", addSensorReading);
router.get("/latest", getLatestSensorReading);
router.get("/range", getSensorReadingByRange);
router.get("/today", getSensorReadingToday);
router.delete("/old", deleteOldReadings);
router.get("/last-hour", getSensorReadingLastHour);

module.exports = router;

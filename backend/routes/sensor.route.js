const express = require("express");
const router = express.Router();
const {
  addSensorReading,
  getLatestSensorReading,
  getSensorReadingByRange,
  deleteOldReadings,
} = require("../controllers/sensor.controller");

router.post("/add", addSensorReading);
router.get("/latest", getLatestSensorReading);
router.get("/range", getSensorReadingByRange);
router.delete("/old", deleteOldReadings);

module.exports = router;

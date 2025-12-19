const Sensor = require("../models/sensor.model");
const moment = require("moment-timezone");
const sensorDataService = require("../services/sensorDataService");

const addSensorReading = async (req, res) => {
  try {
    const { timestamp, temperature, humidity, co2, co, pm25 } = req.body;

    if (
      timestamp === undefined ||
      temperature === undefined ||
      humidity === undefined ||
      co2 === undefined ||
      co === undefined ||
      pm25 === undefined
    ) {
      return res
        .status(400)
        .json({ error: "All sensor fields must be filled!" });
    }

    const sensorReading = await Sensor.create({
      timestamp,
      temperature,
      humidity,
      co2,
      co,
      pm25,
    });

    res.status(201).json(sensorReading);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getLatestSensorReading = async (req, res) => {
  try {
    const latestReading = await sensorDataService.getLatestData();

    if (!latestReading) {
      return res.status(404).json({
        success: false,
        error: "No sensor readings found!",
      });
    }

    res.status(200).json({
      success: true,
      data: latestReading,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

const getSensorReadingToday = async (req, res) => {
  try {
    const startOfDay = moment.tz("Asia/Ho_Chi_Minh").startOf("day").toDate();
    const now = moment.tz("Asia/Ho_Chi_Minh").endOf("day").toDate();

    const readings = await Sensor.find({
      timestamp: { $gte: startOfDay, $lte: now },
    }).sort({ timestamp: 1 });

    res.status(200).json({
      count: readings.length,
      data: readings,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getSensorReadingByRange = async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res
        .status(400)
        .json({ error: "From and to timestamps must be provided!" });
    }

    const fromDate = new Date(parseInt(from));
    const toDate = new Date(parseInt(to));

    const readings = await Sensor.find({
      timestamp: { $gte: fromDate, $lte: toDate },
    }).sort({ timestamp: 1 });

    if (readings.length === 0) {
      return res
        .status(404)
        .json({ error: "No sensor readings found in this range!" });
    }

    res.status(200).json(readings);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteOldReadings = async (req, res) => {
  try {
    const { days } = req.query;

    if (!days) {
      return res
        .status(400)
        .json({ error: "Days parameter must be provided!" });
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    const result = await Sensor.deleteMany({
      timestamp: { $lt: cutoffDate },
    });

    res.status(200).json({
      message: `Deleted ${result.deletedCount} old readings`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
const getSensorReadingLastHour = async (req, res) => {
  try {
    const now = moment.tz("Asia/Ho_Chi_Minh");
    const oneHourAgo = moment.tz("Asia/Ho_Chi_Minh").subtract(1, "hour");

    const nowUTC = now.utc().toDate();
    const oneHourAgoUTC = oneHourAgo.utc().toDate();

    console.log(`Querying from ${oneHourAgo.format()} to ${now.format()}`);

    const readings = await Sensor.find({
      timestamp: { $gte: oneHourAgoUTC, $lte: nowUTC },
    }).sort({ timestamp: 1 });

    console.log(`Found ${readings.length} readings in last hour`);

    res.status(200).json({
      success: true,
      count: readings.length,
      data: readings,
      timeRange: {
        from: oneHourAgoUTC.toISOString(),
        to: nowUTC.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error in getSensorReadingLastHour:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const getSensorAverages = async (req, res) => {
  try {
    const hours = req.query.hours ? parseInt(req.query.hours) : null;

    console.log("Calculating sensor averages...");
    if (hours) {
      console.log(`Filtering data from last ${hours} hours`);
    }

    const result = await sensorDataService.calculateAverages(hours);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "No sensor data found",
      });
    }

    res.status(200).json({
      success: true,
      message: hours
        ? `Sensor averages for last ${hours} hours`
        : "Sensor averages for all data",
      data: result,
    });
  } catch (error) {
    console.error("Error calculating sensor averages:", error);
    res.status(500).json({
      success: false,
      message: "Failed to calculate sensor averages",
      error: error.message,
    });
  }
};

module.exports = {
  addSensorReading,
  getLatestSensorReading,
  getSensorReadingByRange,
  getSensorReadingToday,
  deleteOldReadings,
  getSensorReadingLastHour,
  getSensorAverages,
};

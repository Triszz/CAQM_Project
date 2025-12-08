const AirQuality = require("../models/airQuality.model");

// Lấy air quality hiện tại
const getCurrentAirQuality = async (req, res) => {
  try {
    const current = await AirQuality.findOne().sort({ timestamp: -1 });

    if (!current) {
      return res.status(404).json({
        success: false,
        error: "No air quality data available",
      });
    }

    res.status(200).json({
      success: true,
      data: current,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Lấy lịch sử
const getAirQualityHistory = async (req, res) => {
  try {
    const { limit = 100 } = req.query;

    const history = await AirQuality.find()
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

module.exports = {
  getCurrentAirQuality,
  getAirQualityHistory,
};

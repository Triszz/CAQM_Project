const Sensor = require("../models/sensor.model");

async function getLatestData() {
  try {
    const latestData = await Sensor.findOne()
      .sort({ timestamp: -1 })
      .limit(1)
      .lean();

    if (!latestData) {
      return null;
    }

    return {
      temperature: parseFloat(latestData.temperature?.toFixed(2) || 0),
      humidity: parseFloat(latestData.humidity?.toFixed(2) || 0),
      co2: Math.round(latestData.co2 || 0),
      co: parseFloat(latestData.co?.toFixed(2) || 0),
      pm25: parseFloat(latestData.pm25?.toFixed(2) || 0),
      timestamp: latestData.timestamp,
    };
  } catch (error) {
    throw new Error(`Failed to get latest data: ${error.message}`);
  }
}

async function calculateAverages(hours = null) {
  try {
    const pipeline = [];

    if (hours) {
      const timeLimit = new Date(Date.now() - hours * 60 * 60 * 1000);
      pipeline.push({
        $match: { timestamp: { $gte: timeLimit } },
      });
    }

    pipeline.push({
      $group: {
        _id: null,
        avgTemperature: { $avg: "$temperature" },
        avgHumidity: { $avg: "$humidity" },
        avgCO2: { $avg: "$co2" },
        avgCO: { $avg: "$co" },
        avgPM25: { $avg: "$pm25" },
        totalRecords: { $sum: 1 },
        oldestRecord: { $min: "$timestamp" },
        newestRecord: { $max: "$timestamp" },
      },
    });

    const averages = await Sensor.aggregate(pipeline);

    if (!averages || averages.length === 0) {
      return null;
    }

    const result = averages[0];

    return {
      temperature: parseFloat(result.avgTemperature?.toFixed(2) || 0),
      humidity: parseFloat(result.avgHumidity?.toFixed(2) || 0),
      co2: Math.round(result.avgCO2 || 0),
      co: parseFloat(result.avgCO?.toFixed(2) || 0),
      pm25: parseFloat(result.avgPM25?.toFixed(2) || 0),
      totalRecords: result.totalRecords || 0,
      timeRange: {
        from: result.oldestRecord || null,
        to: result.newestRecord || null,
      },
    };
  } catch (error) {
    throw new Error(`Failed to calculate averages: ${error.message}`);
  }
}

module.exports = {
  getLatestData,
  calculateAverages,
};

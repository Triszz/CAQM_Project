const Sensor = require("../models/sensor.model");
const moment = require("moment-timezone");

const addSensorReading = async (req, res) => {
  try {
    // Destructuring: rút ra các trường từ body
    const { timestamp, temperature, humidity, co2, co, pm25 } = req.body;

    // Validate: kiểm tra tất cả trường bắt buộc có giá trị không
    // undefined === không cung cấp; null === cung cấp null
    if (
      timestamp === undefined ||
      temperature === undefined ||
      humidity === undefined ||
      co2 === undefined ||
      co === undefined ||
      pm25 === undefined
    ) {
      return res.status(400).json({ error: "All sensor fields must be filled!" });
    }
    // Tạo bản ghi mới trong MongoDB
    // Mongoose schema sẽ validate:
    // - temperature phải >= -50 và <= 100
    // - humidity phải >= 0 và <= 100
    // - co2, co, pm25 phải >= 0
    // Nếu không hợp lệ -> throw error
    const sensorReading = await Sensor.create({
      timestamp,
      temperature,
      humidity,
      co2,
      co,
      pm25,
      // createdAt, updatedAt tự động thêm vì timestamps: true
    });

    res.status(201).json(sensorReading);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getLatestSensorReading = async (req, res) => {
  try {
    const latestReading = await Sensor.findOne().sort({ timestamp: -1 }).limit(1);

    if (!latestReading) {
      return res.status(404).json({
        success: false,
        error: "No sensor readings found!",
      });
    }

    // SUA: Wrap trong { success: true, data: ... }
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
    // Rút từ query string: /api/sensor/range?from=...&to=...
    const { from, to } = req.query;

    // Validate: từ và đến phải có cả 2
    if (!from || !to) {
      return res.status(400).json({ error: "From and to timestamps must be provided!" });
    }

    // Chuyển string milliseconds thành Date objects
    // parseInt: "1731535800000" -> 1731535800000 (number)
    // new Date(milliseconds): milliseconds -> Date object
    const fromDate = new Date(parseInt(from));
    const toDate = new Date(parseInt(to));

    // Truy vấn: tìm tất cả documents có timestamp trong [fromDate, toDate]
    // $gte: >=, $lte: <=
    // sort({ timestamp: 1 }): tăng dần = cũ -> mới (phù hợp vẽ chart)
    const readings = await Sensor.find({
      timestamp: { $gte: fromDate, $lte: toDate },
    }).sort({ timestamp: 1 });

    // Kiểm tra có dữ liệu không
    if (readings.length === 0) {
      return res.status(404).json({ error: "No sensor readings found in this range!" });
    }

    // Trả mảng documents
    res.status(200).json(readings);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteOldReadings = async (req, res) => {
  try {
    const { days } = req.query;

    // Validate: days phải có giá trị
    if (!days) {
      return res.status(400).json({ error: "Days parameter must be provided!" });
    }

    // Tính ngày cutoff
    // Ví dụ: hôm nay là 14/11, days=30 -> cutoff = 15/10
    // Xóa tất cả data < 15/10 (cũ hơn 30 ngày)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    // deleteMany: xóa tất cả documents match condition
    // { timestamp: { $lt: cutoffDate } }:
    // - $lt = less than (<)
    // - xóa tất cả documents có timestamp < cutoffDate
    const result = await Sensor.deleteMany({
      timestamp: { $lt: cutoffDate },
    });

    // result.deletedCount: số documents đã xóa
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
    // Lấy thời điểm hiện tại và 1 giờ trước (theo giờ VN)
    const now = moment.tz("Asia/Ho_Chi_Minh");
    const oneHourAgo = moment.tz("Asia/Ho_Chi_Minh").subtract(1, "hour");

    // Chuyển sang UTC để query MongoDB
    const nowUTC = now.utc().toDate();
    const oneHourAgoUTC = oneHourAgo.utc().toDate();

    console.log(`Querying from ${oneHourAgo.format()} to ${now.format()}`);

    // Query database
    const readings = await Sensor.find({
      timestamp: { $gte: oneHourAgoUTC, $lte: nowUTC },
    }).sort({ timestamp: 1 }); // Sắp xếp tăng dần

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
// THEM: Lấy giá trị trung bình tất cả cảm biến
const getSensorAverages = async (req, res) => {
  try {
    // THEM: Lấy hours từ query params
    const hours = req.query.hours ? parseInt(req.query.hours) : null;

    console.log("Calculating sensor averages...");
    if (hours) {
      console.log(`Filtering data from last ${hours} hours`);
    }

    // THEM: Build aggregation pipeline với optional time filter
    const pipeline = [];

    // THEM: Match stage nếu có hours
    if (hours) {
      const timeLimit = new Date(Date.now() - hours * 60 * 60 * 1000);
      pipeline.push({
        $match: {
          timestamp: { $gte: timeLimit },
        },
      });
    }

    // Group stage
    pipeline.push({
      $group: {
        _id: null,
        avgTemperature: { $avg: "$temperature" },
        avgHumidity: { $avg: "$humidity" },
        avgCO2: { $avg: "$co2" },
        avgCO: { $avg: "$co" },
        avgPM25: { $avg: "$pm25" },
        totalRecords: { $sum: 1 },
        oldestRecord: { $min: "$timestamp" }, // THEM
        newestRecord: { $max: "$timestamp" }, // THEM
      },
    });

    // Execute aggregation
    const averages = await Sensor.aggregate(pipeline);

    // Kiểm tra có data không
    if (!averages || averages.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No sensor data found",
        data: {
          temperature: 0,
          humidity: 0,
          co2: 0,
          co: 0,
          pm25: 0,
          totalRecords: 0,
        },
      });
    }

    const result = averages[0];

    // Format kết quả
    const formattedResult = {
      temperature: parseFloat(result.avgTemperature?.toFixed(2) || 0),
      humidity: parseFloat(result.avgHumidity?.toFixed(2) || 0),
      co2: Math.round(result.avgCO2 || 0),
      co: parseFloat(result.avgCO?.toFixed(2) || 0),
      pm25: parseFloat(result.avgPM25?.toFixed(2) || 0),
      totalRecords: result.totalRecords || 0,
      timeRange: {
        // THEM
        from: result.oldestRecord || null,
        to: result.newestRecord || null,
      },
    };

    console.log("Sensor averages calculated:", formattedResult);

    res.status(200).json({
      success: true,
      message: hours ? `Sensor averages for last ${hours} hours` : "Sensor averages for all data",
      data: formattedResult,
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
/**
 * ============ EXPORT TẤT CẢ HÀM ============
 * QUAN TRỌNG: Nếu không export, route sẽ không tìm thấy function
 * Sẽ báo lỗi: "argument handler must be a function"
 */
module.exports = {
  addSensorReading,
  getLatestSensorReading,
  getSensorReadingByRange,
  getSensorReadingToday,
  deleteOldReadings,
  getSensorReadingLastHour,
  getSensorAverages,
};

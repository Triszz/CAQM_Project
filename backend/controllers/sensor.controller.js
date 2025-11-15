const Sensor = require("../models/sensor.model");

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
    // - temperature phải ≥ -50 và ≤ 100
    // - humidity phải ≥ 0 và ≤ 100
    // - co2, co, pm25 phải ≥ 0
    // Nếu không hợp lệ → throw error
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

    // Kiểm tra có dữ liệu không
    if (!latestReading) {
      return res.status(404).json({ error: "No sensor readings found!" });
    }

    // Trả document mới nhất
    res.status(200).json(latestReading);
  } catch (error) {
    res.status(400).json({ error: error.message });
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
    // parseInt: "1731535800000" → 1731535800000 (number)
    // new Date(milliseconds): milliseconds → Date object
    const fromDate = new Date(parseInt(from));
    const toDate = new Date(parseInt(to));

    // Truy vấn: tìm tất cả documents có timestamp trong [fromDate, toDate]
    // $gte: >=, $lte: <=
    // sort({ timestamp: 1 }): tăng dần = cũ → mới (phù hợp vẽ chart)
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
    // Ví dụ: hôm nay là 14/11, days=30 → cutoff = 15/10
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

/**
 * ============ EXPORT TẤT CẢ HÀM ============
 * QUAN TRỌNG: Nếu không export, route sẽ không tìm thấy function
 * Sẽ báo lỗi: "argument handler must be a function"
 */
module.exports = {
  addSensorReading,
  getLatestSensorReading,
  getSensorReadingByRange,
  deleteOldReadings,
};

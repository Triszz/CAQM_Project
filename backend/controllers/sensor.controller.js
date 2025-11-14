const Sensor = require("../models/sensor.model");

/**
 * ============ CONTROLLER GIẢI THÍCH ============
 * Controller chứa các hàm xử lý request từ client
 * - Nhận dữ liệu từ req.body (body gửi lên)
 * - Xử lý logic (validate, lưu DB, tính toán, ...)
 * - Trả kết quả qua res.json()
 *
 * HTTP STATUS CODE:
 * 201 = Created (tạo thành công)
 * 200 = OK (truy vấn thành công)
 * 400 = Bad Request (dữ liệu sai/thiếu)
 * 404 = Not Found (không tìm thấy dữ liệu)
 */

/**
 * FUNCTION 1: addSensorReading
 * =============================
 * ENDPOINT: POST /api/sensor/add
 *
 * MỤC ĐÍCH: ESP32 gửi dữ liệu cảm biến lên server
 *
 * REQUEST BODY (ví dụ):
 * {
 *   "timestamp": "2025-11-14T20:30:00Z",
 *   "temperature": 27.5,
 *   "humidity": 65.2,
 *   "co2": 850,
 *   "co": 2.1,
 *   "pm25": 18.5
 * }
 *
 * RESPONSE (thành công):
 * Status: 201 Created
 * {
 *   "_id": "...",
 *   "timestamp": "2025-11-14T20:30:00Z",
 *   "temperature": 27.5,
 *   ...
 *   "createdAt": "...",
 *   "updatedAt": "..."
 * }
 *
 * RESPONSE (thất bại):
 * Status: 400
 * { "error": "All sensor fields must be filled!" }
 *
 * FLOW:
 * 1. ESP32 đọc cảm biến (CO2, PM2.5, nhiệt độ, ...)
 * 2. ESP32 gửi HTTP POST tới /api/sensor/add với JSON
 * 3. Backend nhận request
 * 4. Validate: tất cả trường bắt buộc có giá trị?
 * 5. Nếu hợp lệ → lưu vào MongoDB (Sensor.create)
 * 6. Trả lại ID và dữ liệu cho ESP32 (xác nhận lưu thành công)
 */
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

    // Trả lại dữ liệu vừa tạo
    res.status(201).json(sensorReading);
  } catch (error) {
    // Bắt lỗi: validation, duplicate key, connection, ...
    res.status(400).json({ error: error.message });
  }
};

/**
 * FUNCTION 2: getLatestSensorReading
 * ===================================
 * ENDPOINT: GET /api/sensor/latest
 *
 * MỤC ĐÍCH: Lấy bản ghi mới nhất để hiển thị realtime (text/gauge)
 *
 * RESPONSE (thành công):
 * Status: 200
 * {
 *   "_id": "...",
 *   "timestamp": "2025-11-14T20:30:00Z",
 *   "temperature": 27.5,
 *   "humidity": 65.2,
 *   "co2": 850,
 *   "co": 2.1,
 *   "pm25": 18.5,
 *   "createdAt": "...",
 *   "updatedAt": "..."
 * }
 *
 * RESPONSE (không có dữ liệu):
 * Status: 404
 * { "error": "No sensor readings found!" }
 *
 * DÙNG TRONG:
 * - Dashboard realtime: hiển thị số đo hiện tại
 * - Text: "Nhiệt độ: 27.5°C, Độ ẩm: 65%, CO2: 850ppm"
 * - Gauge: kim chỉ CO2 ở 850ppm, màu xanh
 *
 * FLOW:
 * 1. FE gọi GET /api/sensor/latest
 * 2. Backend query MongoDB: tìm 1 document, sort timestamp giảm dần
 * 3. Lấy document có timestamp lớn nhất (mới nhất)
 * 4. Trả JSON về FE
 * 5. FE render gauge/text từ dữ liệu
 *
 * GHI CHÚ: Index { timestamp: -1 } giúp query này rất nhanh
 */
const getLatestSensorReading = async (req, res) => {
  try {
    // findOne: lấy 1 document (mặc định là cái đầu tiên match)
    // sort({ timestamp: -1 }): sắp xếp giảm dần theo timestamp
    // limit(1): chỉ lấy 1 cái
    // → kết hợp: lấy document có timestamp lớn nhất
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

/**
 * FUNCTION 3: getSensorReadingByRange
 * ====================================
 * ENDPOINT: GET /api/sensor/range?from=1731535800000&to=1731622200000
 *
 * MỤC ĐÍCH: Lấy dữ liệu trong khoảng thời gian → vẽ biểu đồ (chart)
 *
 * QUERY PARAMS:
 * - from: timestamp bắt đầu (milliseconds, ví dụ 1731535800000)
 * - to: timestamp kết thúc
 *
 * RESPONSE (thành công):
 * Status: 200
 * [
 *   { timestamp: "2025-11-14T08:00:00Z", co2: 400, ... },
 *   { timestamp: "2025-11-14T09:00:00Z", co2: 500, ... },
 *   { timestamp: "2025-11-14T10:00:00Z", co2: 850, ... },
 *   ...
 * ]
 *
 * DÙNG TRONG:
 * - Vẽ line chart CO2 theo thời gian
 * - Vẽ line chart PM2.5 theo thời gian
 * - Hiển thị lịch sử 24 giờ, 7 ngày, 1 tháng
 *
 * FLOW:
 * 1. FE gọi GET /api/sensor/range?from=...&to=...
 *    (ví dụ: lấy data từ 8h sáng tới 10h tối hôm nay)
 * 2. Backend parse from/to từ query params
 * 3. Chuyển milliseconds → Date objects
 * 4. Truy vấn MongoDB: tìm tất cả documents có timestamp trong [from, to]
 * 5. Sort tăng dần theo timestamp (cũ nhất trước, mới nhất sau)
 * 6. Trả mảng về FE
 * 7. FE render Chart.js/D3.js với dữ liệu
 *
 * VÍ DỤ QUERY:
 * GET /api/sensor/range?from=1731535800000&to=1731622200000
 * → Lấy data từ giữa tháng 11 đến hôm sau
 *
 * GHI CHÚ:
 * - sort({ timestamp: 1 }) = tăng dần (time-series, từ cũ tới mới)
 * - $gte = greater than or equal (>=)
 * - $lte = less than or equal (<=)
 */
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

/**
 * FUNCTION 4: getAllSensorReadings
 * ==================================
 * ENDPOINT: GET /api/sensor/all
 *
 * MỤC ĐÍCH: Lấy tất cả bản ghi cảm biến (quản lý, phân tích)
 *
 * RESPONSE:
 * Status: 200
 * [ tất cả documents, sorted newest first ]
 *
 * DÙNG TRONG:
 * - Admin page: xem toàn bộ dữ liệu
 * - Export CSV/Excel
 * - Phân tích dữ liệu tổng quan
 *
 * GHI CHÚ:
 * - Nên limit số lượng nếu database quá lớn (tránh crash)
 * - Hoặc thêm pagination (skip, limit)
 */
const getAllSensorReadings = async (req, res) => {
  try {
    // find(): tất cả documents
    // sort({ timestamp: -1 }): newest first
    const readings = await Sensor.find().sort({ timestamp: -1 });

    if (readings.length === 0) {
      return res.status(404).json({ error: "No sensor readings found!" });
    }

    res.status(200).json(readings);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * FUNCTION 5: getSensorStats
 * ===========================
 * ENDPOINT: GET /api/sensor/stats?from=...&to=...
 *
 * MỤC ĐÍCH: Tính thống kê (min, max, avg) của các biến
 *
 * RESPONSE (ví dụ):
 * Status: 200
 * {
 *   "co2_min": 400,
 *   "co2_max": 1200,
 *   "co2_avg": 750.5,
 *   "pm25_min": 12,
 *   "pm25_max": 45,
 *   "pm25_avg": 28.3,
 *   "temp_min": 24,
 *   "temp_max": 32,
 *   "temp_avg": 27.5,
 *   "humidity_min": 40,
 *   "humidity_max": 80,
 *   "humidity_avg": 65,
 *   "co_min": 1,
 *   "co_max": 5,
 *   "co_avg": 2.5,
 *   "count": 100
 * }
 *
 * DÙNG TRONG:
 * - Báo cáo thống kê ngày (min/max/avg chất lượng không khí hôm nay)
 * - Đánh giá chất lượng trung bình
 * - Phát hiện anomaly (nếu min/max quá chênh lệch)
 *
 * DÙNG AGGREGATION PIPELINE:
 * - Mạnh hơn find: có thể group, sum, avg, max, min, ...
 * - 3 stage: $match (filter) → $group (tính toán) → result
 */
const getSensorStats = async (req, res) => {
  try {
    const { from, to } = req.query;

    let query = {};

    // Nếu có from/to, lọc theo khoảng thời gian
    // Nếu không, tính trên toàn bộ dữ liệu
    if (from && to) {
      const fromDate = new Date(parseInt(from));
      const toDate = new Date(parseInt(to));
      query = {
        timestamp: { $gte: fromDate, $lte: toDate },
      };
    }

    // Aggregation pipeline (xử lý từng stage lần lượt)
    const stats = await Sensor.aggregate([
      // Stage 1: $match - filter documents
      // Lấy documents matching query (từ khoảng thời gian)
      { $match: query },

      // Stage 2: $group - nhóm và tính toán
      // _id: null = nhóm tất cả documents thành 1 group
      // Tính min, max, avg cho mỗi biến
      {
        $group: {
          _id: null, // nhóm tất cả
          co2_min: { $min: "$co2" }, // giá trị CO2 nhỏ nhất
          co2_max: { $max: "$co2" }, // giá trị CO2 lớn nhất
          co2_avg: { $avg: "$co2" }, // giá trị CO2 trung bình
          pm25_min: { $min: "$pm25" },
          pm25_max: { $max: "$pm25" },
          pm25_avg: { $avg: "$pm25" },
          temp_min: { $min: "$temperature" },
          temp_max: { $max: "$temperature" },
          temp_avg: { $avg: "$temperature" },
          humidity_min: { $min: "$humidity" },
          humidity_max: { $max: "$humidity" },
          humidity_avg: { $avg: "$humidity" },
          co_min: { $min: "$co" },
          co_max: { $max: "$co" },
          co_avg: { $avg: "$co" },
          count: { $sum: 1 }, // đếm số documents
        },
      },
    ]);

    if (stats.length === 0) {
      return res.status(404).json({ error: "No sensor readings found!" });
    }

    // stats vì aggregation trả về mảng
    res.status(200).json(stats);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * FUNCTION 6: deleteOldReadings
 * ==============================
 * ENDPOINT: DELETE /api/sensor/old?days=30
 *
 * MỤC ĐÍCH: Xóa bản ghi cũ hơn X ngày (dọn dẹp, tiết kiệm chi phí)
 *
 * QUERY PARAMS:
 * - days: số ngày (ví dụ 30 = xóa data > 30 ngày trước)
 *
 * RESPONSE:
 * Status: 200
 * {
 *   "message": "Deleted 500 old readings",
 *   "deletedCount": 500
 * }
 *
 * DÙNG TRONG:
 * - Maintenance job chạy hàng ngày/tuần
 * - Giải phóng không gian database
 * - Giảm chi phí MongoDB Atlas (dùng ít bộ nhớ)
 *
 * VÍ DỤ:
 * DELETE /api/sensor/old?days=30
 * → Xóa tất cả documents có (hôm nay - 30 ngày) < createdAt
 */
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
  getAllSensorReadings,
  getSensorStats,
  deleteOldReadings,
};

const express = require("express");
const router = express.Router();

/**
 * IMPORT CÁC FUNCTION TỪ CONTROLLER
 * ==================================
 * Phải import đúng tên và đúng đường dẫn
 * Nếu sai → lỗi "cannot find module" hoặc "undefined"
 */
const {
  addSensorReading,
  getLatestSensorReading,
  getSensorReadingByRange,
  getAllSensorReadings,
  getSensorStats,
  deleteOldReadings,
} = require("../controllers/sensor.controller");

/**
 * DEBUG: In ra kiểm tra hàm có được import đúng không
 * Nếu typeof là 'function' → đúng
 * Nếu typeof là 'undefined' → sai import/export
 *
 * Có thể xóa dòng này sau khi test xong
 */
console.log("Debug - Controllers imported:", {
  addSensorReading: typeof addSensorReading,
  getLatestSensorReading: typeof getLatestSensorReading,
  getSensorReadingByRange: typeof getSensorReadingByRange,
});

/**
 * ============ ĐỊNH NGHĨA ROUTES ============
 * Format: router.METHOD(PATH, HANDLER_FUNCTION)
 * - METHOD: GET, POST, PUT, DELETE, ...
 * - PATH: URL path (/add, /latest, ...)
 * - HANDLER_FUNCTION: function xử lý request
 */

/**
 * ROUTE 1: POST /api/sensor/add
 * ==============================
 * MỤC ĐÍCH: ESP32 gửi dữ liệu cảm biến lên
 *
 * CỤ THỂ: POST http://localhost:3000/api/sensor/add
 * BODY: { timestamp, temperature, humidity, co2, co, pm25 }
 *
 * HANDLER: addSensorReading (từ controller)
 * - Validate dữ liệu
 * - Lưu vào MongoDB
 * - Trả lại response
 */
router.post("/add", addSensorReading);

/**
 * ROUTE 2: GET /api/sensor/latest
 * ==================================
 * MỤC ĐÍCH: Lấy bản ghi mới nhất → hiển thị realtime
 *
 * CỤ THỂ: GET http://localhost:3000/api/sensor/latest
 * RESPONSE: 1 document (bản ghi mới nhất)
 *
 * DÙNG TRONG:
 * - FE gọi lúc load page hoặc polling mỗi 5 giây
 * - Cập nhật dashboard realtime
 *
 * HANDLER: getLatestSensorReading
 */
router.get("/latest", getLatestSensorReading);

/**
 * ROUTE 3: GET /api/sensor/range?from=...&to=...
 * ================================================
 * MỤC ĐÍCH: Lấy dữ liệu khoảng thời gian → vẽ chart
 *
 * CỤ THỂ: GET http://localhost:3000/api/sensor/range?from=1731535800000&to=1731622200000
 * QUERY PARAMS:
 * - from: timestamp bắt đầu (milliseconds)
 * - to: timestamp kết thúc (milliseconds)
 * RESPONSE: mảng documents
 *
 * DÙNG TRONG:
 * - FE gọi khi vẽ chart 24h, 7d, 1 tháng
 * - Lấy data lịch sử
 *
 * HANDLER: getSensorReadingByRange
 */
router.get("/range", getSensorReadingByRange);

/**
 * ROUTE 4: GET /api/sensor/all
 * =============================
 * MỤC ĐÍCH: Lấy tất cả bản ghi (quản lý, phân tích)
 *
 * CỤ THỂ: GET http://localhost:3000/api/sensor/all
 * RESPONSE: mảng tất cả documents
 *
 * GHI CHÚ:
 * - Nên limit số lượng nếu database quá lớn
 * - Hoặc thêm pagination
 *
 * HANDLER: getAllSensorReadings
 */
router.get("/all", getAllSensorReadings);

/**
 * ROUTE 5: GET /api/sensor/stats?from=...&to=...
 * ================================================
 * MỤC ĐÍCH: Lấy thống kê (min, max, avg)
 *
 * CỤ THỂ: GET http://localhost:3000/api/sensor/stats?from=...&to=...
 * QUERY PARAMS:
 * - from: timestamp bắt đầu (tùy chọn)
 * - to: timestamp kết thúc (tùy chọn)
 * RESPONSE: object chứa min/max/avg của mỗi biến
 *
 * DÙNG TRONG:
 * - Báo cáo thống kê
 * - Dashboard hiển thị stats
 *
 * HANDLER: getSensorStats
 */
router.get("/stats", getSensorStats);

/**
 * ROUTE 6: DELETE /api/sensor/old?days=30
 * =========================================
 * MỤC ĐÍCH: Xóa dữ liệu cũ hơn X ngày
 *
 * CỤ THỂ: DELETE http://localhost:3000/api/sensor/old?days=30
 * QUERY PARAMS:
 * - days: số ngày (xóa data cũ hơn)
 * RESPONSE: { message, deletedCount }
 *
 * DÙNG TRONG:
 * - Dọn dẹp database
 * - Tiết kiệm chi phí MongoDB
 * - Chạy lúc 3h sáng mỗi ngày (background job)
 *
 * HANDLER: deleteOldReadings
 */
router.delete("/old", deleteOldReadings);

/**
 * ============ EXPORT ROUTER ============
 * Router sẽ được import trong app.js/index.js
 * app.use("/api/sensor", sensorRouter)
 * → "/api/sensor/add", "/api/sensor/latest", ...
 */
module.exports = router;

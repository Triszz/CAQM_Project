const mongoose = require("mongoose");

const SensorSchema = mongoose.Schema(
  {
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },

    temperature: {
      type: Number,
      required: true,
      min: -50,
      max: 100,
    },

    humidity: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    co2: {
      type: Number,
      required: true,
      min: 0,
    },

    co: {
      type: Number,
      required: true,
      min: 0,
    },

    pm25: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * ============ INDEXES (CHỈ MỤC) ============
 * Index là cơ cấu tốc độ tra cứu dữ liệu
 * Nếu không có index → phải scan hết 10,000 document → chậm
 * Nếu có index → MongoDB lấy ngay → nhanh
 *
 * QUYỀN ĐẠO HÀM:
 * 1 = sắp xếp tăng dần (A-Z, 0-9)
 * -1 = sắp xếp giảm dần (Z-A, 9-0)
 */

/**
 * Index 1: { timestamp: -1 }
 * ===========================
 * - MỤC ĐÍCH: Tăng tốc truy vấn "latest" (bản ghi mới nhất)
 * - CÁCH DÙNG:
 *   + sort({ timestamp: -1 }).limit(1)
 *   → Lấy 1 bản ghi có timestamp lớn nhất (mới nhất)
 * - DÙNG TRONG:
 *   + Dashboard realtime (hiển thị số đo hiện tại)
 *   + Gauge/Text trên web
 * - TẠI SAO GIẢM DẦN (-1)?
 *   + Thường muốn dữ liệu mới nhất trước (newest first)
 *   + Với index timestamp -1, dữ liệu đã được sắp xếp, lấy ngay element đầu
 */
SensorSchema.index({ timestamp: -1 });

/**
 * Index 2 (tùy chọn): TTL Index
 * ==============================
 * - MỤC ĐÍCH: Tự động xóa dữ liệu cũ hơn X ngày
 * - LỢI ÍCH:
 *   + Tiết kiệm bộ nhớ database
 *   + Giảm chi phí MongoDB Atlas (dùng ít dung lượng)
 *   + Giữ database sạch, chỉ toàn dữ liệu gần đây
 * - CẤU HÌNH:
 *   + expireAfterSeconds: số giây sau đó document sẽ bị xóa
 *   + 2592000 giây = 30 ngày (30 * 24 * 60 * 60)
 * - BỎ COMMENT NÀY NẾU MUỐN AUTO-DELETE DỮ LIỆU CŨ
 * - GHI CHÚ: TTL check chạy mỗi 60 giây, không real-time
 *
 * Để bật TTL index, bỏ comment dòng dưới:
 */
// SensorSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

/**
 * ============ EXPORT MODEL ============
 * Model là class đại diện cho collection trong MongoDB
 * Dùng Sensor.create(), Sensor.find(), Sensor.findOne(), ... để truy vấn
 */
const Sensor = mongoose.model("Sensor", SensorSchema);
module.exports = Sensor;

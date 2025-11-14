const mongoose = require("mongoose");

/**
 * ============ GIẢI THÍCH SCHEMA ============
 * Schema là bản thiết kế dữ liệu - xác định:
 * - Những trường nào sẽ lưu (timestamp, temperature, humidity, ...)
 * - Kiểu dữ liệu mỗi trường (Date, Number, ...)
 * - Ràng buộc dữ liệu (required, min, max, ...)
 * - Index để truy vấn nhanh
 *
 * Mỗi document (bản ghi) lưu một lần đo cảm biến tại một thời điểm
 */

const SensorSchema = mongoose.Schema(
  {
    /**
     * TRƯỜNG: timestamp
     * ==================
     * - TÁC DỤNG: Lưu thời điểm đo (giờ chính xác lấy dữ liệu)
     * - KIỂU: Date (ISO 8601, ví dụ: 2025-11-14T20:30:00Z)
     * - REQUIRED: true (bắt buộc phải có, không được bỏ trống)
     * - DEFAULT: Date.now() (nếu không cung cấp, lấy thời điểm hiện tại)
     * - DÙNG TRONG:
     *   + Sắp xếp dữ liệu theo thời gian (newest first)
     *   + Truy vấn khoảng thời gian (từ 8h sáng tới 10h sáng)
     *   + Vẽ biểu đồ (X-axis là time, Y-axis là CO2/PM2.5/...)
     *
     * VÍ DỤ: timestamp: "2025-11-14T20:30:45Z"
     */
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },

    /**
     * TRƯỜNG: temperature
     * ====================
     * - TÁC DỤNG: Lưu nhiệt độ không khí (độ C)
     * - KIỂU: Number (số thực, có thể 27.5, 28.3, ...)
     * - REQUIRED: true (bắt buộc phải có)
     * - MIN: -50 (ngưỡng thấp nhất hợp lý cho phòng học)
     * - MAX: 100 (ngưỡng cao nhất hợp lý)
     * - VALIDATION: Nếu giá trị < -50 hoặc > 100 → reject, báo lỗi
     * - DÙNG TRONG:
     *   + Hiển thị gauge trên dashboard ("Nhiệt độ: 27.5°C")
     *   + Vẽ biểu đồ lịch sử nhiệt độ 24 giờ
     *   + Tính avg/min/max nhiệt độ trong khoảng thời gian
     *
     * VÍ DỤ: temperature: 27.5
     */
    temperature: {
      type: Number,
      required: true,
      min: -50,
      max: 100,
    },

    /**
     * TRƯỜNG: humidity
     * =================
     * - TÁC DỤNG: Lưu độ ẩm tương đối (%)
     * - KIỂU: Number
     * - REQUIRED: true
     * - MIN: 0% (không khí hoàn toàn khô)
     * - MAX: 100% (không khí bão hòa, ẩm tuyệt đối)
     * - VALIDATION: Giá trị phải trong [0, 100]
     * - DÙNG TRONG:
     *   + Hiển thị gauge ("Độ ẩm: 65%")
     *   + Đánh giá thoải mái: nếu < 30% hoặc > 70% → cảnh báo
     *   + Thống kê trung bình độ ẩm theo ngày
     * - GHI CHÚ: Độ ẩm cao → vi sinh vật dễ phát triển
     *             Độ ẩm thấp → niêm mạc khô, gây khó chịu
     *
     * VÍ DỤ: humidity: 65.2
     */
    humidity: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    /**
     * TRƯỜNG: co2
     * ============
     * - TÁC DỤNG: Lưu nồng độ CO₂ (ppm - phần triệu)
     * - KIỂU: Number
     * - REQUIRED: true
     * - MIN: 0 (không có CO₂)
     * - NGƯỠNG THÔNG THƯỜNG:
     *   + Ngoài trời: ~400 ppm
     *   + Trong phòng bình thường: 600-1000 ppm
     *   + Lớp học đông: > 1500 ppm (chất lượng xấu, ảnh hưởng nhận thức)
     * - NGƯỠNG CẢNH BÁO: > 1000 ppm (lên cảnh báo, bật quạt)
     * - DÙNG TRONG:
     *   + Hiển thị gauge với màu (xanh < 1000, vàng 1000-1500, đỏ > 1500)
     *   + Trigger tự động: nếu CO2 > 1000 → bật quạt
     *   + Vẽ biểu đồ CO2 theo thời gian (thường tăng dần trong ngày)
     * - GHI CHÚ: CO2 cao → người buồn ngủ, khó tập trung, giảm hiệu suất học
     *
     * VÍ DỤ: co2: 850
     */
    co2: {
      type: Number,
      required: true,
      min: 0,
    },

    /**
     * TRƯỜNG: co
     * ===========
     * - TÁC DỤNG: Lưu nồng độ CO (Monoxide Cacbon) - khí độc (ppm)
     * - KIỂU: Number
     * - REQUIRED: true
     * - MIN: 0 (không có CO)
     * - NGƯỠNG CẢNH BÁO:
     *   + WHO: 35 ppm là ngưỡng cao (8 giờ exposure)
     *   + Nên giữ dưới 10 ppm trong môi trường bên trong
     * - DÙNG TRONG:
     *   + Cảnh báo nguy hiểm nhanh (CO ↑ → người có thể bị ngộ độc)
     *   + Hiển thị gauge (xanh < 10, đỏ > 35)
     *   + Trigger cảnh báo buzzer nếu > 30 ppm
     * - GHI CHÚ: CO không có mùi, vô hình, nguy hiểm!
     *             Thường từ xe cộ bên ngoài hoặc máy sưởi hỏng
     *
     * VÍ DỤ: co: 2.1
     */
    co: {
      type: Number,
      required: true,
      min: 0,
    },

    /**
     * TRƯỜNG: pm25
     * =============
     * - TÁC DỤNG: Lưu nồng độ bụi mịn PM2.5 (µg/m³ - micrograms/cubic meter)
     * - KIỂU: Number
     * - REQUIRED: true
     * - MIN: 0 (không có bụi)
     * - NGƯỠNG THEO WHO:
     *   + 0-15 µg/m³: Tốt (xanh)
     *   + 15-35 µg/m³: Trung bình (vàng) - bắt đầu ảnh hưởng sức khỏe
     *   + 35-75 µg/m³: Kém (cam)
     *   + > 75 µg/m³: Rất kém (đỏ) - nguy hiểm sức khỏe
     * - DÙNG TRONG:
     *   + Hiển thị gauge màu sắc (xanh/vàng/cam/đỏ)
     *   + Cảnh báo khi > 35 µg/m³ (sức khỏe bắt đầu bị ảnh hưởng)
     *   + Vẽ biểu đồ lịch sử PM2.5
     *   + Trigger: nếu PM2.5 cao lâu → bật máy lọc, mở cửa sổ
     * - GHI CHÚ: PM2.5 rất nhỏ (2.5 micrometer), xâm nhập vào phổi
     *             Ảnh hưởng hô hấp, tim mạch, thậm chí ung thư phổi dài hạn
     *
     * VÍ DỤ: pm25: 18.5
     */
    pm25: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    /**
     * TIMESTAMPS: true
     * =================
     * - TÁC DỤNG: Tự động thêm 2 trường:
     *   + createdAt: thời điểm document được tạo
     *   + updatedAt: thời điểm document được cập nhật lần cuối
     * - DÙNG TRONG:
     *   + Audit (ai tạo/sửa dữ liệu lúc nào)
     *   + Sắp xếp theo ngày tạo
     *   + Xóa dữ liệu cũ (ví dụ xóa dữ liệu > 30 ngày)
     */
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

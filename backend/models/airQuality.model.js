const mongoose = require("mongoose");

const AirQualitySchema = new mongoose.Schema(
  {
    // Dữ liệu sensor (input cho AI)
    sensorData: {
      temperature: { type: Number, required: true },
      humidity: { type: Number, required: true },
      co2: { type: Number, required: true },
      co: { type: Number, required: true },
      pm25: { type: Number, required: true },
    },

    // Kết quả từ AI
    quality: {
      type: String,
      required: true,
      enum: ["Tốt", "Trung bình", "Kém"],
    },

    // Confidence score (tùy chọn)
    confidence: {
      type: Number,
      min: 0,
      max: 1,
    },

    // Màu LED đã gửi
    ledColor: {
      type: String,
      enum: ["green", "yellow", "red"],
    },

    // Buzzer có kêu không?
    buzzerTriggered: {
      type: Boolean,
      default: false,
    },

    // Config buzzer đã dùng
    buzzerConfig: {
      beepCount: Number,
      beepDuration: Number,
      interval: Number,
    },

    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

AirQualitySchema.index({ timestamp: -1 });
AirQualitySchema.index({ quality: 1 });

const AirQuality = mongoose.model("AirQuality", AirQualitySchema);

module.exports = AirQuality;

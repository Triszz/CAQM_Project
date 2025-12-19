const mongoose = require("mongoose");

const AirQualitySchema = new mongoose.Schema(
  {
    sensorData: {
      temperature: { type: Number, required: true },
      humidity: { type: Number, required: true },
      co2: { type: Number, required: true },
      co: { type: Number, required: true },
      pm25: { type: Number, required: true },
    },

    quality: {
      type: String,
      required: true,
      enum: ["Tốt", "Trung bình", "Kém"],
    },

    confidence: {
      type: Number,
      min: 0,
      max: 1,
    },

    ledColor: {
      type: String,
      enum: ["green", "yellow", "red"],
    },

    buzzerTriggered: {
      type: Boolean,
      default: false,
    },

    buzzerConfig: {
      beepCount: Number,
      beepDuration: Number,
      interval: Number,
    },

    problematicSensors: [
      {
        sensor: String,
        value: Number,
        unit: String,
        threshold: String,
        severity: String,
      },
    ],

    emailSent: {
      type: Boolean,
      default: false,
      index: true,
    },

    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
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

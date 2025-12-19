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

SensorSchema.index({ timestamp: -1 });

const Sensor = mongoose.model("Sensor", SensorSchema);
module.exports = Sensor;

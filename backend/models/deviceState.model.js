const mongoose = require("mongoose");

const DeviceStateSchema = new mongoose.Schema(
  {
    deviceType: {
      type: String,
      required: true,
      enum: ["led", "buzzer"],
      unique: true,
    },

    isActive: {
      type: Boolean,
      default: false,
    },

    ledState: {
      brightness: {
        type: Number,
        default: 75,
        min: 0,
        max: 100,
      },
      currentColor: {
        type: String,
        enum: ["green", "yellow", "red"],
        default: "green",
      },
    },

    buzzerState: {
      beepCount: {
        type: Number,
        default: 3,
        min: 1,
        max: 10,
      },
      beepDuration: {
        type: Number,
        default: 200,
        min: 100,
        max: 500,
      },
      interval: {
        type: Number,
        default: 100,
        min: 50,
        max: 500,
      },
    },

    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

DeviceStateSchema.index({ deviceType: 1 });

const DeviceState = mongoose.model("DeviceState", DeviceStateSchema);

module.exports = DeviceState;

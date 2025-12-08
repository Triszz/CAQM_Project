const mongoose = require("mongoose");

const DeviceStateSchema = new mongoose.Schema(
  {
    // ✅ Loại thiết bị
    deviceType: {
      type: String,
      required: true,
      enum: ["led", "buzzer", "fan"],
      unique: true, // Mỗi loại device chỉ có 1 document (trạng thái hiện tại)
    },

    // ✅ Trạng thái bật/tắt
    isActive: {
      type: Boolean,
      default: false,
    },

    // ✅ Trạng thái LED
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

    // ✅ Trạng thái Buzzer
    buzzerState: {
      beepCount: {
        type: Number,
        default: 3,
        min: 1,
        max: 10,
      },
      beepDuration: {
        type: Number,
        default: 200, // ms
        min: 100,
        max: 500,
      },
      interval: {
        type: Number,
        default: 100, // ms
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

// Index
DeviceStateSchema.index({ deviceType: 1 });

const DeviceState = mongoose.model("DeviceState", DeviceStateSchema);

module.exports = DeviceState;

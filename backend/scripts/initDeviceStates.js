require("dotenv").config();
const mongoose = require("mongoose");
const DeviceState = require("../models/deviceState.model");

mongoose.connect(process.env.MONGODB_URI);

mongoose.connection.on("connected", async () => {
  console.log("Connected to MongoDB");

  try {
    const devices = ["led", "buzzer"];

    for (const device of devices) {
      const result = await DeviceState.findOneAndUpdate(
        { deviceType: device },
        { deviceType: device },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log(`✅ Initialized ${device}:`, result);
    }

    console.log("\n✅ All device states initialized successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error initializing device states:", error);
    process.exit(1);
  }
});

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB connection error:", err);
  process.exit(1);
});

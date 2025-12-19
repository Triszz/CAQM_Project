const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { initMqttClient } = require("./config/mqtt.client");

initMqttClient();

const mongoose = require("mongoose");
const userRouter = require("./routes/user.route");
const sensorRouter = require("./routes/sensor.route");
const deviceStateRouter = require("./routes/deviceState.route");
const airQualityRouter = require("./routes/airQuality.route");

const chatbotRouter = require("./routes/chatbot.route");

const app = express();

// middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Khởi động MQTT subscriber
const mqttSubscriber = require("./mqtt/subscriber");

// routes
app.use("/api", userRouter);
app.use("/api/sensor", sensorRouter);
app.use("/api/device-state", deviceStateRouter);
app.use("/api/air-quality", airQualityRouter);

app.use("/api/chatbot", chatbotRouter);

// connect
const PORT = process.env.PORT || 3000;
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connect to database successfully!");
    console.log("AI Air Quality Service: READY");
    console.log("MQTT Subscriber: ACTIVE");
    app.listen(PORT, () => {
      console.log(`Server is listening on PORT ${PORT}.`);
    });
  })
  .catch((e) => {
    console.log("Fail to connect database: ", e);
  });

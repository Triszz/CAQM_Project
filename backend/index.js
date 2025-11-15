const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const userRouter = require("./routes/user.route");
const sensorRouter = require("./routes/sensor.route");
require("dotenv").config();

const app = express();

// middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// routes
app.use("/api", userRouter);
app.use("/api/sensor", sensorRouter);

// connect
const PORT = process.env.PORT || 3000;
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connect to database successfully!");
    app.listen(PORT, () => {
      console.log(`Server is listening on PORT ${PORT}.`);
    });
  })
  .catch((e) => {
    console.log("Fail to connect database: ", e);
  });

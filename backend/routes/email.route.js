// routes/email.route.js

const express = require("express");
const router = express.Router();
const { sendAirQualityAlert } = require("../services/emailService");
const requireAuth = require("../middlewares/requireAuth");

// ✅ Test endpoint gửi email
router.post("/test-alert", requireAuth, async (req, res) => {
  try {
    const { email } = req.body;

    // Mock data kém
    const mockData = {
      temperature: 32.5,
      humidity: 75,
      co2: 1500,
      co: 15.5,
      pm25: 85,
      quality: "TỆ",
    };

    const result = await sendAirQualityAlert(
      email || process.env.ALERT_EMAIL,
      req.user.username,
      mockData
    );

    if (result.success) {
      res.status(200).json({
        success: true,
        message: "Test email sent successfully",
        messageId: result.messageId,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;

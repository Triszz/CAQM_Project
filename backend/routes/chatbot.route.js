// routes/chatbot.route.js

const express = require("express");
const router = express.Router();
const {
  sendMessage,
  clearHistory,
} = require("../controllers/chatbot.controller");

// ✅ Send message to chatbot
router.post("/message", sendMessage);

// ✅ Clear conversation history
router.post("/clear", clearHistory);

module.exports = router;

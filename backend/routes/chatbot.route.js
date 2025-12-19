const express = require("express");
const router = express.Router();
const {
  sendMessage,
  clearHistory,
} = require("../controllers/chatbot.controller");

const requireAuth = require("../middlewares/requireAuth");

router.use(requireAuth);

router.post("/message", sendMessage);

router.post("/clear", clearHistory);

module.exports = router;

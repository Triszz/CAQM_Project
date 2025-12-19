// routes/chatbot.route.js

const express = require("express");
const router = express.Router();
const { sendMessage, clearHistory } = require("../controllers/chatbot.controller");

const requireAuth = require("../middlewares/requireAuth");

router.use(requireAuth);
//Send message to chatbot
router.post("/message", sendMessage);

//Clear conversation history
router.post("/clear", clearHistory);

module.exports = router;

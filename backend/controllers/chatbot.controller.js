// controllers/chatbot.controller.js

const { chat } = require("../services/geminiService");

// ✅ Lưu conversation history trong memory (production nên dùng Redis/Database)
const conversations = new Map();

const sendMessage = async (req, res) => {
  try {
    const { message, userId } = req.body;

    console.log(`💬 [${userId}] User message:`, message);

    // ✅ Validate input
    if (!message || message.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "Message cannot be empty",
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "userId is required",
      });
    }

    // ✅ Lấy conversation history
    let conversationHistory = conversations.get(userId) || [];

    // ✅ Gọi Gemini
    const result = await chat(message, conversationHistory);

    if (result.success) {
      // ✅ Cập nhật conversation history
      conversations.set(userId, result.conversationHistory);

      // ✅ Giới hạn history (giữ 20 message gần nhất)
      if (result.conversationHistory.length > 20) {
        conversations.set(userId, result.conversationHistory.slice(-20));
      }

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error,
        message: result.message,
      });
    }
  } catch (error) {
    console.error("❌ Chatbot controller error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message:
        "Xin lỗi, tôi gặp lỗi khi xử lý yêu cầu của bạn. Vui lòng thử lại.",
    });
  }
};

// ✅ Clear conversation history
const clearHistory = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "userId is required",
      });
    }

    conversations.delete(userId);

    console.log(`🗑️ Cleared history for user: ${userId}`);

    res.status(200).json({
      success: true,
      message: "Conversation history cleared",
    });
  } catch (error) {
    console.error("❌ Clear history error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

module.exports = {
  sendMessage,
  clearHistory,
};

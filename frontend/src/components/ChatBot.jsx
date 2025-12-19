import { useState, useRef, useEffect } from "react";
import { ChatbotAPI } from "../services/api";
import { useAuthContext } from "../hooks/useAuthContext";

function ChatBot({ onClose, messages, setMessages }) {
  const { user } = useAuthContext();
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (inputValue.trim() === "" || isLoading) return;

    const userMessage = {
      id: messages.length + 1,
      text: inputValue,
      sender: "user",
      timestamp: new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages([...messages, userMessage]);
    const currentInput = inputValue;
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await ChatbotAPI.sendMessage(currentInput, user._id);

      const botMessage = {
        id: messages.length + 2,
        text: response.data.message,
        sender: "bot",
        timestamp: new Date().toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prevMessages) => [...prevMessages, botMessage]);
    } catch (error) {
      console.error("❌ Chatbot error:", error);

      // ✅ Xử lý error từ Axios
      let errorText =
        "Xin lỗi, tôi gặp lỗi khi xử lý yêu cầu của bạn. Vui lòng thử lại.";

      if (error.response?.data?.message) {
        errorText = error.response.data.message;
      } else if (error.message) {
        errorText = `Lỗi: ${error.message}`;
      }

      const errorMessage = {
        id: messages.length + 2,
        text: errorText,
        sender: "bot",
        timestamp: new Date().toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !isLoading) {
      handleSendMessage();
    }
  };

  return (
    <div className="chatbot-container">
      <div className="chatbot-header">
        <div className="chatbot-name">AI Assistant 🤖</div>
        <div className="popup-button" onClick={onClose} title="Thu gọn">
          −
        </div>
      </div>

      <div className="chatbot-frame">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${
              message.sender === "user" ? "message-user" : "message-bot"
            }`}
          >
            <div className="message-bubble">
              <p className="message-text">{message.text}</p>
              <span className="message-time">{message.timestamp}</span>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message message-bot">
            <div className="message-bubble">
              <p className="message-text">🤔 Đang suy nghĩ...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chatbot-message">
        <input
          type="text"
          className="chatbot-input"
          placeholder="Hỏi về chất lượng không khí..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={isLoading}
        />
        <button
          className="chatbot-button"
          onClick={handleSendMessage}
          disabled={isLoading}
        >
          <strong>{isLoading ? "..." : "Gửi"}</strong>
        </button>
      </div>
    </div>
  );
}

export default ChatBot;

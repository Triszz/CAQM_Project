import { useState, useRef, useEffect } from "react";

function ChatBot({ onClose, messages, setMessages }) {
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  const handleSendMessage = () => {
    if (inputValue.trim() === "") return;

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
    setInputValue("");

    setTimeout(() => {
      const botMessage = {
        id: messages.length + 2,
        text: "Cảm ơn bạn đã nhắn tin! Backend sẽ xử lý câu hỏi này sau.",
        sender: "bot",
        timestamp: new Date().toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prevMessages) => [...prevMessages, botMessage]);
    }, 1000);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  return (
    <div className="chatbot-container">
      <div className="chatbot-header">
        <div className="chatbot-name">MyChatBot</div>
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
        <div ref={messagesEndRef} />
      </div>

      <div className="chatbot-message">
        <input
          type="text"
          className="chatbot-input"
          placeholder="Nhập tin nhắn của bạn..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyPress}
        />
        <button className="chatbot-button" onClick={handleSendMessage}>
          <strong>Gửi</strong>
        </button>
      </div>
    </div>
  );
}

export default ChatBot;

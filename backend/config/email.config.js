// config/email.config.js

const nodemailer = require("nodemailer");
console.log("\n========== EMAIL CONFIG DEBUG ==========");
console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASSWORD:", process.env.EMAIL_PASSWORD);
console.log("EMAIL_PASSWORD length:", process.env.EMAIL_PASSWORD ? process.env.EMAIL_PASSWORD.length : 0);
console.log("EMAIL_PASSWORD has spaces?", process.env.EMAIL_PASSWORD ? /\s/.test(process.env.EMAIL_PASSWORD) : "N/A");
console.log("=========================================\n");

// Kiểm tra nếu thiếu
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
  console.error("CRITICAL: EMAIL_USER or EMAIL_PASSWORD is undefined!");
  console.error("  Check your .env file in backend/ directory");

  // Tạm thời export một transporter giả để tránh crash
  module.exports = {
    sendMail: () => Promise.reject(new Error("Email not configured")),
  };
  return;
}

// Cấu hình transporter (dùng Gmail)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Email của bạn
    pass: process.env.EMAIL_PASSWORD, // App Password (KHÔNG phải mật khẩu Gmail)
  },
});

// Verify kết nối
transporter.verify((error, success) => {
  if (error) {
    console.error("Email config error:", error);
  } else {
    console.log("Email service ready");
  }
});

module.exports = transporter;

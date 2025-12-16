// services/emailService.js

const transporter = require("../config/email.config");

/**
 * Gửi email cảnh báo chất lượng không khí kém
 * @param {String} userEmail - Email người nhận
 * @param {String} username - Tên người dùng
 * @param {Object} sensorData - Dữ liệu cảm biến
 */
const sendAirQualityAlert = async (userEmail, username, sensorData) => {
  try {
    const { temperature, humidity, co2, co, pm25, quality } = sensorData;

    // ✅ DEBUG: Log input
    console.log("📧 [Email] Starting sendAirQualityAlert...");
    console.log("   Recipient:", userEmail);
    console.log("   Username:", username);
    console.log("   Quality:", quality);
    console.log("   Data:", { temperature, humidity, co2, co, pm25 });

    // ✅ Nội dung email (HTML)
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
            border-radius: 10px;
          }
          .header {
            background-color: #dc3545;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background-color: white;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .alert-box {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
          }
          .data-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          .data-table td {
            padding: 10px;
            border-bottom: 1px solid #ddd;
          }
          .data-table td:first-child {
            font-weight: bold;
            width: 40%;
          }
          .warning {
            color: #dc3545;
            font-weight: bold;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            color: #666;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ CẢNH BÁO CHẤT LƯỢNG KHÔNG KHÍ</h1>
          </div>
          <div class="content">
            
            <div class="alert-box">
              <h3 style="margin-top: 0; color: #dc3545;">🚨 Chất lượng không khí đang ở mức <span class="warning">${quality.toUpperCase()}</span>!</h3>
              <p>Hệ thống giám sát chất lượng không khí của bạn đã phát hiện các chỉ số vượt ngưỡng an toàn.</p>
            </div>

            <h3>📊 Dữ liệu cảm biến hiện tại:</h3>
            <table class="data-table">
              <tr>
                <td>🌡️ Nhiệt độ</td>
                <td><strong>${temperature.toFixed(1)}°C</strong></td>
              </tr>
              <tr>
                <td>💧 Độ ẩm</td>
                <td><strong>${humidity.toFixed(1)}%</strong></td>
              </tr>
              <tr>
                <td>🏭 CO₂</td>
                <td><strong>${co2} ppm</strong> ${co2 > 1000 ? '<span class="warning">(Cao)</span>' : ""}</td>
              </tr>
              <tr>
                <td>☠️ CO</td>
                <td><strong>${co.toFixed(1)} ppm</strong> ${
      co > 9 ? '<span class="warning">(Nguy hiểm)</span>' : ""
    }</td>
              </tr>
              <tr>
                <td>💨 Bụi mịn PM2.5</td>
                <td><strong>${pm25.toFixed(1)} µg/m³</strong> ${
      pm25 > 35 ? '<span class="warning">(Vượt ngưỡng)</span>' : ""
    }</td>
              </tr>
            </table>

            <h3>💡 Khuyến nghị:</h3>
            <ul>
              <li>✅ Mở cửa sổ để thông gió (nếu không khí bên ngoài tốt hơn)</li>
              <li>✅ Bật máy lọc không khí nếu có</li>
              <li>✅ Hạn chế hoạt động ngoài trời</li>
              <li>✅ Đeo khẩu trang khi cần thiết</li>
              <li>✅ Kiểm tra và thay bộ lọc không khí</li>
            </ul>

            <p style="margin-top: 30px;">
              <small>Email này được gửi tự động từ hệ thống giám sát chất lượng không khí. 
              Thời gian: <strong>${new Date().toLocaleString("vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
              })}</strong></small>
            </p>
          </div>
          <div class="footer">
            <p>Air Quality Monitoring System - Student ID: 23127503</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // ✅ Cấu hình email
    const mailOptions = {
      from: {
        name: "Air Quality Monitoring System",
        address: process.env.EMAIL_USER,
      },
      to: userEmail,
      subject: `⚠️ CẢNH BÁO: Chất lượng không khí ${quality.toUpperCase()}!`,
      html: htmlContent,
      // Text version (fallback cho email client không hỗ trợ HTML)
      text: `
        CẢNH BÁO CHẤT LƯỢNG KHÔNG KHÍ

        Xin chào ${username},

        Chất lượng không khí đang ở mức ${quality.toUpperCase()}!

        Dữ liệu cảm biến:
        - Nhiệt độ: ${temperature.toFixed(1)}°C
        - Độ ẩm: ${humidity.toFixed(1)}%
        - CO₂: ${co2} ppm
        - CO: ${co.toFixed(1)} ppm
        - PM2.5: ${pm25.toFixed(1)} µg/m³

        Vui lòng kiểm tra và cải thiện chất lượng không khí.

        Thời gian: ${new Date().toLocaleString("vi-VN", {
          timeZone: "Asia/Ho_Chi_Minh",
        })}
      `,
    };

    // ✅ DEBUG: Log email details
    console.log("📝 [Email] Email config:");
    console.log("   From:", mailOptions.from.address);
    console.log("   To:", mailOptions.to);
    console.log("   Subject:", mailOptions.subject);
    console.log("   Content type: HTML + Text");

    // ✅ Gửi email
    console.log("🔄 [Email] Sending via transporter...");
    const info = await transporter.sendMail(mailOptions);

    console.log("✅ [Email] Sent successfully!");
    console.log("   Message ID:", info.messageId);
    console.log("   Response:", info.response);

    return {
      success: true,
      messageId: info.messageId,
      response: info.response,
    };
  } catch (error) {
    console.error("❌ [Email] Send error:", error);
    console.error("   Error type:", error.constructor.name);
    console.error("   Error message:", error.message);
    console.error("   Error code:", error.code);

    return {
      success: false,
      error: error.message,
      errorCode: error.code,
    };
  }
};

module.exports = {
  sendAirQualityAlert,
};

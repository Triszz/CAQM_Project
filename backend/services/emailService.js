// services/emailService.js

const transporter = require("../config/email.config");

/**
 * Gửi email cảnh báo chất lượng không khí kém
 * CHỈ HIỂN THỊ CÁC SENSORS VƯỢT NGƯỠNG
 * @param {String} userEmail - Email người nhận
 * @param {String} username - Tên người dùng
 * @param {Object} data - Dữ liệu cảm biến + problematicSensors từ AI
 */

// ✅ SỬA: Hàm tạo row - nhận value trực tiếp
function createProblematicSensorRow(icon, label, value, unit) {
  return `
    <tr style="background-color: #fee; border-left: 4px solid #dc3545;">
      <td style="padding: 12px; font-weight: 600;">
        ${icon} ${label}
      </td>
      <td style="padding: 12px; color: #dc3545; font-weight: bold; font-size: 18px;">
        🚨 ${value} ${unit}
      </td>
    </tr>
  `;
}

async function sendAirQualityAlert(userEmail, username, data) {
  console.log("📧 [Email] Starting sendAirQualityAlert...");
  console.log("   Recipient:", userEmail);
  console.log("   Username:", username);
  console.log("   Quality:", data.quality);
  console.log("   Data:", data);

  try {
    const { quality, problematicSensors = [] } = data;

    // ✅ KIỂM TRA: Nếu không có sensor vượt ngưỡng → không gửi email
    if (problematicSensors.length === 0) {
      console.log(
        "⚠️ [Email] No problematic sensors detected. Skipping email."
      );
      return {
        success: false,
        skipped: true,
        message: "No problematic sensors to report",
      };
    }

    // ✅ SỬA: Icon mapping (không cần value trong config)
    const sensorIcons = {
      CO2: { icon: "🏭", label: "CO₂" },
      CO: { icon: "☠️", label: "CO" },
      "PM2.5": { icon: "💨", label: "Bụi mịn PM2.5" },
      "Nhiệt độ": { icon: "🌡️", label: "Nhiệt độ" },
      "Độ ẩm": { icon: "💧", label: "Độ ẩm" },
    };

    // ✅ SỬA: Tạo HTML rows - DÙNG GIÁ TRỊ TỪ problematicSensors
    const problematicRows = problematicSensors
      .map((s) => {
        const config = sensorIcons[s.sensor];
        if (!config) {
          console.warn(`⚠️ Unknown sensor: ${s.sensor}`);
          return ""; // Skip nếu không tìm thấy config
        }

        // ✅ DÙNG s.value (từ AI) thay vì sensorData
        const displayValue =
          typeof s.value === "number" ? s.value.toFixed(1) : s.value;

        return createProblematicSensorRow(
          config.icon,
          config.label,
          displayValue,
          s.unit // ✅ Dùng s.unit từ AI
        );
      })
      .join("");

    console.log(
      "   Problematic sensors:",
      problematicSensors.map((s) => `${s.sensor}=${s.value}${s.unit}`)
    );
    console.log("   Number of rows:", problematicSensors.length);

    // ✅ HTML Email
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4;">
  <div style="max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; text-align: center;">
      <h1 style="margin: 0; font-size: 28px;">⚠️ CẢNH BÁO CHẤT LƯỢNG KHÔNG KHÍ</h1>
      <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">
        Chất lượng không khí: <strong>${quality.toUpperCase()}</strong>
      </p>
    </div>

    <!-- Content -->
    <div style="padding: 30px;">
      <p style="font-size: 16px; color: #555; margin-bottom: 20px;">
        Xin chào,
      </p>
      <p style="font-size: 16px; color: #555; margin-bottom: 25px;">
        Hệ thống giám sát chất lượng không khí đã phát hiện <strong>${
          problematicSensors.length
        }</strong> chỉ số vượt ngưỡng an toàn.
      </p>

      <!-- Sensors vượt ngưỡng -->
      <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 25px; border-radius: 5px;">
        <h3 style="margin: 0 0 15px 0; color: #856404; font-size: 18px;">
          ⚠️ Sensors vượt ngưỡng nguy hiểm:
        </h3>
        
        <!-- Problematic Sensors Table -->
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Cảm biến</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Giá trị</th>
            </tr>
          </thead>
          <tbody>
            ${problematicRows}
          </tbody>
        </table>
      </div>

      <!-- Recommendations -->
      <div style="background-color: #d1ecf1; border-left: 4px solid #17a2b8; padding: 15px; margin-bottom: 20px; border-radius: 5px;">
        <h3 style="margin: 0 0 10px 0; color: #0c5460; font-size: 16px;">💡 Khuyến nghị:</h3>
        <ul style="margin: 0; padding-left: 20px; color: #0c5460;">
          <li>Mở cửa sổ để thông gió (nếu không khí bên ngoài tốt hơn)</li>
          <li>Bật máy lọc không khí nếu có</li>
          <li>Hạn chế hoạt động ngoài trời</li>
          <li>Đeo khẩu trang khi cần thiết</li>
          <li>Kiểm tra và thay bộ lọc không khí</li>
        </ul>
      </div>

      <!-- Footer -->
      <div style="text-align: center; color: #999; font-size: 13px; margin-top: 25px; padding-top: 20px; border-top: 1px solid #eee;">
        <p style="margin: 5px 0;">
          Email này được gửi tự động từ hệ thống giám sát chất lượng không khí
        </p>
        <p style="margin: 5px 0;">
          <strong>Thời gian:</strong> ${new Date().toLocaleString("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh",
          })}
        </p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    // ✅ Plain text version
    const problematicText = problematicSensors
      .map((s) => {
        const config = sensorIcons[s.sensor];
        if (!config) return "";

        const displayValue =
          typeof s.value === "number" ? s.value.toFixed(1) : s.value;

        return `- ${config.icon} ${config.label}: ${displayValue} ${s.unit} ⚠️ VƯỢT NGƯỠNG`;
      })
      .join("\n");

    const textContent = `
🚨 CẢNH BÁO: Chất lượng không khí đang ở mức ${quality.toUpperCase()}!

Xin chào,

Hệ thống giám sát chất lượng không khí đã phát hiện ${
      problematicSensors.length
    } chỉ số vượt ngưỡng an toàn.

⚠️ Sensors vượt ngưỡng:
${problematicText}

💡 Khuyến nghị:
- Mở cửa sổ để thông gió
- Bật máy lọc không khí
- Đeo khẩu trang khi cần thiết
- Hạn chế hoạt động ngoài trời
- Kiểm tra và thay bộ lọc không khí

Thời gian: ${new Date().toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
    })}
    `;

    const mailOptions = {
      from: `"IAQM Alert System" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `⚠️ CẢNH BÁO: ${
        problematicSensors.length
      } sensor vượt ngưỡng - Chất lượng không khí ${quality.toUpperCase()}!`,
      text: textContent,
      html: htmlContent,
    };

    console.log("📝 [Email] Email config:");
    console.log("   From:", mailOptions.from);
    console.log("   To:", mailOptions.to);
    console.log("   Subject:", mailOptions.subject);
    console.log("   Content type: HTML + Text");

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
    console.error("❌ [Email] Failed to send:", error);
    console.error("   Error type:", error.constructor.name);
    console.error("   Error message:", error.message);

    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = {
  sendAirQualityAlert,
};

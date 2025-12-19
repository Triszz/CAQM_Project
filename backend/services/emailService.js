const transporter = require("../config/email.config");

function createProblematicSensorRow(label, value, unit) {
  return `
    <tr style="background-color: #fee; border-left: 4px solid #dc3545;">
      <td style="padding: 12px; font-weight: 600;">
        ${label}
      </td>
      <td style="padding: 12px; color: #dc3545; font-weight: bold; font-size: 18px;">
        ${value} ${unit}
      </td>
    </tr>
  `;
}

async function sendAirQualityAlert(userEmail, username, data) {
  console.log("[Email] Starting sendAirQualityAlert...");
  console.log("Recipient:", userEmail);
  console.log("Username:", username);
  console.log("Quality:", data.quality);
  console.log("Data:", data);

  try {
    const { quality, problematicSensors = [] } = data;

    if (problematicSensors.length === 0) {
      console.log("[Email] No problematic sensors detected. Skipping email.");
      return {
        success: false,
        skipped: true,
        message: "No problematic sensors to report",
      };
    }

    const sensorIcons = {
      CO2: { label: "CO2" },
      CO: { label: "CO" },
      "PM2.5": { label: "Bụi mịn PM2.5" },
      "Nhiệt độ": { label: "Nhiệt độ" },
      "Độ ẩm": { label: "Độ ẩm" },
    };

    const problematicRows = problematicSensors
      .map((s) => {
        const config = sensorIcons[s.sensor];
        if (!config) {
          console.warn(`Unknown sensor: ${s.sensor}`);
          return "";
        }

        const displayValue =
          typeof s.value === "number" ? s.value.toFixed(1) : s.value;

        return createProblematicSensorRow(config.label, displayValue, s.unit);
      })
      .join("");

    console.log(
      "   Problematic sensors:",
      problematicSensors.map((s) => `${s.sensor}=${s.value}${s.unit}`)
    );
    console.log("   Number of rows:", problematicSensors.length);

    // HTML Email
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        
        <!-- Main Container -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; max-width: 600px; width: 100%;">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #dc3545; padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                CẢNH BÁO CHẤT LƯỢNG KHÔNG KHÍ
              </h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px;">
                Mức độ: <strong>${quality.toUpperCase()}</strong>
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #333333;">
                Xin chào ${username}, hệ thống đã phát hiện <strong>${
      problematicSensors.length
    }</strong> chỉ số vượt ngưỡng an toàn:
              </p>
              
              <!-- Data Table -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e0e0e0; margin-bottom: 20px;">
                <thead>
                  <tr>
                    <th style="background-color: #f8f9fa; padding: 12px; text-align: left; font-size: 14px; font-weight: 600; color: #333333; border-bottom: 2px solid #dee2e6;">
                      Cảm biến
                    </th>
                    <th style="background-color: #f8f9fa; padding: 12px; text-align: left; font-size: 14px; font-weight: 600; color: #333333; border-bottom: 2px solid #dee2e6;">
                      Giá trị
                    </th>
                  </tr>
                </thead>
                <tbody>
                  ${problematicRows}
                </tbody>
              </table>
              
              <!-- Recommendations -->
              <div style="background-color: #f8f9fa; padding: 20px; border-left: 4px solid #17a2b8;">
                <p style="margin: 0 0 10px 0; font-size: 15px; font-weight: 600; color: #333333;">
                  Khuyến nghị:
                </p>
                <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8; color: #555555;">
                  <li>Mở cửa sổ để thông gió</li>
                  <li>Bật máy lọc không khí nếu có</li>
                  <li>Hạn chế hoạt động ngoài trời</li>
                  <li>Đeo khẩu trang khi cần thiết</li>
                </ul>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; background-color: #f8f9fa; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0; font-size: 12px; color: #999999; text-align: center; line-height: 1.6;">
                Email tự động từ hệ thống giám sát chất lượng không khí<br>
                ${new Date().toLocaleString("vi-VN", {
                  timeZone: "Asia/Ho_Chi_Minh",
                })}
              </p>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
</body>
</html>
`;

    const problematicText = problematicSensors
      .map((s) => {
        const config = sensorIcons[s.sensor];
        if (!config) return "";

        const displayValue =
          typeof s.value === "number" ? s.value.toFixed(1) : s.value;

        return `- ${config.label}: ${displayValue} ${s.unit} (VƯỢT NGƯỠNG)`;
      })
      .join("\n");

    const textContent = `
CẢNH BÁO: Chất lượng không khí đang ở mức ${quality.toUpperCase()}!

Xin chào,

Hệ thống giám sát chất lượng không khí đã phát hiện ${
      problematicSensors.length
    } chỉ số vượt ngưỡng an toàn.

Sensors vượt ngưỡng:
${problematicText}

Khuyến nghị:
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
      subject: `CẢNH BÁO: ${
        problematicSensors.length
      } sensor vượt ngưỡng - Chất lượng không khí ${quality.toUpperCase()}!`,
      text: textContent,
      html: htmlContent,
    };

    console.log("[Email] Email config:");
    console.log("From:", mailOptions.from);
    console.log("To:", mailOptions.to);
    console.log("Subject:", mailOptions.subject);
    console.log("Content type: HTML + Text");

    console.log("[Email] Sending via transporter...");
    const info = await transporter.sendMail(mailOptions);

    console.log("[Email] Sent successfully!");
    console.log("Message ID:", info.messageId);
    console.log("Response:", info.response);

    return {
      success: true,
      messageId: info.messageId,
      response: info.response,
    };
  } catch (error) {
    console.error("[Email] Failed to send:", error);
    console.error("Error type:", error.constructor.name);
    console.error("Error message:", error.message);

    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = {
  sendAirQualityAlert,
};

# 📊 Email vs Pushsafer - Chi tiết So Sánh

## ✅ Những điểm giống nhau

| Tiêu chí        | Email                     | Pushsafer                 |
| --------------- | ------------------------- | ------------------------- |
| **Cooldown**    | 5 phút                    | 5 phút                    |
| **Trigger**     | Khi quality = "Kém"       | Khi quality = "Kém"       |
| **Cơ chế**      | Biến `lastEmailSent`      | Biến `lastPushsaferSent`  |
| **Console log** | ✅ Chi tiết               | ✅ Chi tiết               |
| **Xử lý lỗi**   | Try-catch + return object | Try-catch + return object |

## 🔍 Chi tiết Ghi Log

### Email Logging

```
📧 [Email] Starting sendAirQualityAlert...
   Recipient: fo3lqm25@gmail.com
   Username: Test User
   Quality: Kém
   Data: { temperature, humidity, co2, co, pm25 }

📝 [Email] Email config:
   From: fo3lqm25@gmail.com
   To: fo3lqm25@gmail.com
   Subject: ⚠️ CẢNH BÁO: Chất lượng không khí KÉM!
   Content type: HTML + Text

🔄 [Email] Sending via transporter...

✅ [Email] Sent successfully!
   Message ID: <6c2f6fbc-35d3-2b44-8f2f-d52fd0719571@gmail.com>
   Response: 250 2.0.0 OK ...
```

### Pushsafer Logging

```
📱 [Pushsafer] Starting sendPushsaferAlert...
   Device ID: 99321
   Quality: Kém
   Data: { temperature, humidity, co2, co, pm25 }

✅ [Pushsafer] Cooldown check passed - proceeding to send

📝 [Pushsafer] Message config:
   Title: IAQM - ⚠️ Cảnh báo không khí
   Device ID: 99321
   Priority: 2
   Sound: 1
   Vibrate: 1
   Message preview: 🚨 CẢNH BÁO: Chất lượng không khí KÉM...

🔄 [Pushsafer] Sending via Pushsafer API...

✅ [Pushsafer] Sent successfully!
   Response: {"status":1,"success":"message transmitted","available":38,"message_ids":"64870751:99321"}
```

## 🛠️ Các file đã update

### 1. `services/emailService.js`

- ✅ Thêm console.log input validation
- ✅ Thêm console.log config details
- ✅ Thêm console.log transport status
- ✅ Thêm console.log response details
- ✅ Cải thiện error logging

### 2. `services/pushsafer.service.js`

- ✅ Thêm console.log input validation
- ✅ Thêm console.log cooldown check
- ✅ Thêm console.log message config
- ✅ Thêm console.log API send status
- ✅ Thêm console.log response parsing
- ✅ Cải thiện error logging with error type & code

### 3. `services/airQualityService.js`

- ✅ Thêm section divider trong console
- ✅ Thêm chi tiết email result
- ✅ Thêm chi tiết pushsafer result
- ✅ Cải thiện error handling

### 4. Test Files

- ✅ `test_pushsafer_cooldown.js` - test cooldown mechanism
- ✅ `test_alert_system.js` - test cả email + pushsafer

## 🔬 Cách Debug

### Chạy test email + pushsafer

```bash
node test_alert_system.js
```

### Chạy test cooldown

```bash
node test_pushsafer_cooldown.js
```

### Chạy application

```bash
npm run dev
```

Khi có cảnh báo "Kém", bạn sẽ thấy:

```
═══════════════════════════════════════════════════════
📬 EMAIL & PUSHSAFER ALERT BLOCK
═══════════════════════════════════════════════════════

--- 4.1 EMAIL ATTEMPT ---
[tất cả chi tiết email]

--- 4.1 EMAIL RESULT ---
Success: true
Message ID: <...>

--- 4.2 PUSHSAFER ATTEMPT ---
[tất cả chi tiết pushsafer]

--- 4.2 PUSHSAFER RESULT ---
Success: true
Sent: true
Message ID: 64870751:99321
```

## 📋 Tóm tắt

| Hành động                | Output                                           |
| ------------------------ | ------------------------------------------------ |
| Email gửi thành công     | ✅ `[Email] Sent successfully!`                  |
| Pushsafer gửi thành công | ✅ `[Pushsafer] Sent successfully!`              |
| Email cooldown           | ⏳ `[Alert] Cooldown active: XXXs remaining`     |
| Pushsafer cooldown       | ⏳ `[Pushsafer] Cooldown active: XXXs remaining` |
| Email error              | ❌ `[Email] Send error: ...`                     |
| Pushsafer error          | ❌ `[Pushsafer] Send error: ...`                 |

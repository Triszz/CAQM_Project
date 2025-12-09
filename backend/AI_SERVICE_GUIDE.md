# Air Quality Classification - Decision Tree Model

## 📋 Mô tả

Hệ thống sử dụng **Decision Tree Classifier** từ scikit-learn để phân loại chất lượng không khí dựa trên 5 thông số cảm biến:

- **CO2** (ppm): Carbon dioxide
- **CO** (ppm): Carbon monoxide
- **PM2.5** (μg/m³): Particulate matter
- **Temperature** (°C): Nhiệt độ
- **Humidity** (%): Độ ẩm

## 🎯 Phân loại

Hệ thống trả về 3 mức chất lượng không khí:

| Chất lượng | Mô tả | Hành động |
|-----------|-------|----------|
| 🟢 **Tốt** | Điều kiện tối ưu | LED xanh, không có cảnh báo |
| 🟡 **Trung bình** | Điều kiện có chút vấn đề | LED vàng, không kêu |
| 🔴 **Kém** | Điều kiện xấu | LED đỏ, buzzer kêu + danh sách nguyên nhân |

## 🔍 Nguyên nhân khi "Kém"

Khi chất lượng không khí được phân loại là **"Kém"**, API sẽ trả về danh sách các cảm biến gây ra vấn đề:

```json
{
  "sensor": "CO2",
  "value": 1200,
  "unit": "ppm",
  "threshold": 1000,
  "severity": "cao"
}
```

Tiêu chí xác định nguyên nhân:
- **CO2 > 1000 ppm** → Xấu
- **CO > 7 ppm** → Xấu
- **PM2.5 > 35 μg/m³** → Xấu
- **Temperature < 15°C hoặc > 32°C** → Xấu
- **Humidity < 30% hoặc > 70%** → Xấu

## 🚀 Cài đặt & Chạy

### 1. Cài đặt dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Chạy Python AI Service

```bash
python air_quality_classifier.py
```

Dịch vụ sẽ:
- Tự động tạo dữ liệu huấn luyện nếu chưa có model
- Huấn luyện Decision Tree
- Lưu model vào `air_quality_model.pkl`
- Khởi động Flask API trên `http://localhost:5000`

### 3. Chạy Node.js Backend (ở terminal khác)

```bash
npm start
```

## 📡 API Endpoints

### Dự đoán chất lượng không khí

**POST** `/predict`

**Request:**
```json
{
  "co2": 1200,
  "co": 8.5,
  "pm25": 45,
  "temperature": 28,
  "humidity": 65
}
```

**Response (Nếu "Kém"):**
```json
{
  "quality": "Kém",
  "confidence": 0.95,
  "sensor_values": {
    "co2": 1200,
    "co": 8.5,
    "pm25": 45,
    "temperature": 28,
    "humidity": 65
  },
  "problematic_sensors": [
    {
      "sensor": "CO2",
      "value": 1200,
      "unit": "ppm",
      "threshold": 1000,
      "severity": "cao"
    },
    {
      "sensor": "CO",
      "value": 8.5,
      "unit": "ppm",
      "threshold": 7,
      "severity": "trung bình"
    },
    {
      "sensor": "PM2.5",
      "value": 45,
      "unit": "μg/m³",
      "threshold": 35,
      "severity": "cao"
    }
  ]
}
```

**Response (Nếu "Tốt"):**
```json
{
  "quality": "Tốt",
  "confidence": 0.98,
  "sensor_values": {
    "co2": 500,
    "co": 1.5,
    "pm25": 10,
    "temperature": 22,
    "humidity": 50
  }
}
```

### Kiểm tra trạng thái

**GET** `/health`

```json
{
  "status": "ok",
  "message": "Air Quality Service is running"
}
```

### Thông tin Model

**GET** `/model-info`

```json
{
  "model_type": "DecisionTreeClassifier",
  "features": ["CO2", "CO", "PM2.5", "Temperature", "Humidity"],
  "classes": ["Tốt", "Trung bình", "Kém"],
  "status": "ready"
}
```

## 🔧 Cấu hình

Tạo file `.env` trong thư mục `backend`:

```env
AI_SERVICE_URL=http://localhost:5000/predict
```

Nếu chạy trên server khác:
```env
AI_SERVICE_URL=http://your-ai-service:5000/predict
```

## 📊 Dữ liệu huấn luyện

Model được huấn luyện trên tập dữ liệu tổng hợp 300 mẫu:
- 100 mẫu "Tốt"
- 100 mẫu "Trung bình"
- 100 mẫu "Kém"

Độ chính xác mô hình: ~95%

## 🔄 Luồng xử lý

```
Sensor Data → Python AI → Prediction
                         ├─ quality: "Tốt"/"Trung bình"/"Kém"
                         ├─ confidence: 0-1
                         └─ problematic_sensors: [] (nếu "Kém")
                         
                         ↓
                     
Node.js Backend → LED điều khiển → MQTT
                ├─ Đổi màu
                ├─ Nếu "Kém": Buzzer kêu
                └─ Lưu DB
```

## 📝 Cải thiện trong tương lai

- [ ] Sử dụng dữ liệu thực từ IoT sensors
- [ ] Thử nghiệm với các model khác (Random Forest, XGBoost)
- [ ] Thêm các tính năng như dự báo xu hướng
- [ ] Cải thiện ngưỡng phân loại dựa trên dữ liệu thực
- [ ] Xây dựng API để re-train model

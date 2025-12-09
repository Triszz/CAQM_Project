import numpy as np
import pandas as pd
from sklearn.tree import DecisionTreeClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import joblib
import json
from flask import Flask, request, jsonify
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# ============================================
# 1. TRAINING DATA & MODEL
# ============================================

def generate_training_data():
    """
    Tạo dữ liệu huấn luyện theo những quy tắc cơ bản
    """
    np.random.seed(42)
    
    data = []
    labels = []
    
    # 🟢 "Tốt" - Điều kiện tốt
    for _ in range(100):
        co2 = np.random.randint(350, 700)  # < 700
        co = np.random.uniform(0, 3)       # < 3
        pm25 = np.random.randint(0, 15)    # < 15
        temp = np.random.uniform(20, 26)   # 20-26°C
        humidity = np.random.uniform(40, 60)  # 40-60%
        data.append([co2, co, pm25, temp, humidity])
        labels.append("Tốt")
    
    # 🟡 "Trung bình" - Điều kiện vừa phải
    for _ in range(100):
        co2 = np.random.randint(700, 1000)  # 700-1000
        co = np.random.uniform(3, 7)        # 3-7
        pm25 = np.random.randint(15, 35)    # 15-35
        temp = np.random.choice([np.random.uniform(15, 20), np.random.uniform(26, 32)])
        humidity = np.random.choice([np.random.uniform(30, 40), np.random.uniform(60, 70)])
        data.append([co2, co, pm25, temp, humidity])
        labels.append("Trung bình")
    
    # 🔴 "Kém" - Điều kiện xấu
    for _ in range(100):
        co2 = np.random.randint(1000, 2000)  # > 1000
        co = np.random.uniform(7, 15)        # > 7
        pm25 = np.random.randint(35, 100)    # > 35
        temp = np.random.choice([np.random.uniform(10, 15), np.random.uniform(32, 40)])
        humidity = np.random.choice([np.random.uniform(20, 30), np.random.uniform(70, 90)])
        data.append([co2, co, pm25, temp, humidity])
        labels.append("Kém")
    
    return np.array(data), np.array(labels)

def train_model():
    """
    Huấn luyện Decision Tree Classifier
    """
    logger.info("🤖 Generating training data...")
    X, y = generate_training_data()
    
    # Chia dữ liệu
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Chuẩn hóa dữ liệu
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Huấn luyện Decision Tree
    logger.info("🌳 Training Decision Tree...")
    model = DecisionTreeClassifier(
        max_depth=10,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42
    )
    model.fit(X_train_scaled, y_train)
    
    # Đánh giá
    accuracy = model.score(X_test_scaled, y_test)
    logger.info(f"✅ Model accuracy: {accuracy:.2%}")
    
    # Lưu model và scaler
    joblib.dump(model, "air_quality_model.pkl")
    joblib.dump(scaler, "air_quality_scaler.pkl")
    logger.info("💾 Model and scaler saved!")
    
    return model, scaler

# Load model khi khởi động
try:
    model = joblib.load("air_quality_model.pkl")
    scaler = joblib.load("air_quality_scaler.pkl")
    logger.info("✅ Model loaded from disk")
except:
    logger.info("⚠️  Model not found. Training new model...")
    model, scaler = train_model()

# ============================================
# 2. LOGIC PHÂN LOẠI & TÌM NGUYÊN NHÂN
# ============================================

def get_problematic_sensors(sensor_data):
    """
    Xác định các cảm biến nào gây ra chất lượng không khí kém
    
    Tiêu chí:
    - CO2 > 1000 ppm → Xấu
    - CO > 7 ppm → Xấu
    - PM2.5 > 35 μg/m³ → Xấu
    - Temperature < 15°C hoặc > 32°C → Xấu
    - Humidity < 30% hoặc > 70% → Xấu
    """
    problematic = []
    
    co2 = sensor_data.get("co2", 0)
    co = sensor_data.get("co", 0)
    pm25 = sensor_data.get("pm25", 0)
    temperature = sensor_data.get("temperature", 0)
    humidity = sensor_data.get("humidity", 0)
    
    if co2 > 1000:
        problematic.append({
            "sensor": "CO2",
            "value": co2,
            "unit": "ppm",
            "threshold": 1000,
            "severity": "cao" if co2 > 1500 else "trung bình"
        })
    
    if co > 7:
        problematic.append({
            "sensor": "CO",
            "value": round(co, 2),
            "unit": "ppm",
            "threshold": 7,
            "severity": "cao" if co > 10 else "trung bình"
        })
    
    if pm25 > 35:
        problematic.append({
            "sensor": "PM2.5",
            "value": pm25,
            "unit": "μg/m³",
            "threshold": 35,
            "severity": "cao" if pm25 > 75 else "trung bình"
        })
    
    if temperature < 15 or temperature > 32:
        direction = "cao" if temperature > 32 else "thấp"
        problematic.append({
            "sensor": "Nhiệt độ",
            "value": round(temperature, 1),
            "unit": "°C",
            "threshold": f"15-32°C (hiện tại {direction})",
            "severity": "cao" if (temperature < 10 or temperature > 35) else "trung bình"
        })
    
    if humidity < 30 or humidity > 70:
        direction = "cao" if humidity > 70 else "thấp"
        problematic.append({
            "sensor": "Độ ẩm",
            "value": round(humidity, 1),
            "unit": "%",
            "threshold": f"30-70% (hiện tại {direction})",
            "severity": "cao" if (humidity < 20 or humidity > 80) else "trung bình"
        })
    
    return problematic

def predict_air_quality(sensor_data):
    """
    Dự đoán chất lượng không khí từ dữ liệu cảm biến
    
    Input: {
        "co2": float,
        "co": float,
        "pm25": float,
        "temperature": float,
        "humidity": float
    }
    
    Output: {
        "quality": str ("Tốt", "Trung bình", "Kém"),
        "confidence": float (0-1),
        "problematic_sensors": list (nếu "Kém")
    }
    """
    try:
        # Validate input
        required_fields = ["co2", "co", "pm25", "temperature", "humidity"]
        for field in required_fields:
            if field not in sensor_data:
                raise ValueError(f"Missing field: {field}")
        
        # Chuẩn bị dữ liệu
        features = np.array([[
            sensor_data["co2"],
            sensor_data["co"],
            sensor_data["pm25"],
            sensor_data["temperature"],
            sensor_data["humidity"]
        ]])
        
        # Chuẩn hóa
        features_scaled = scaler.transform(features)
        
        # Dự đoán
        prediction = model.predict(features_scaled)[0]
        probabilities = model.predict_proba(features_scaled)[0]
        
        # Lấy confidence (xác suất cao nhất)
        confidence = float(np.max(probabilities))
        
        result = {
            "quality": prediction,
            "confidence": round(confidence, 3),
            "sensor_values": {
                "co2": sensor_data["co2"],
                "co": sensor_data["co"],
                "pm25": sensor_data["pm25"],
                "temperature": sensor_data["temperature"],
                "humidity": sensor_data["humidity"]
            }
        }
        
        # Nếu "Kém" → thêm danh sách cảm biến gây vấn đề
        if prediction == "Kém":
            result["problematic_sensors"] = get_problematic_sensors(sensor_data)
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Prediction error: {e}")
        raise

# ============================================
# 3. FLASK API
# ============================================

@app.route("/predict", methods=["POST"])
def predict():
    """
    API endpoint để dự đoán chất lượng không khí
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        result = predict_air_quality(data)
        return jsonify(result), 200
        
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(f"❌ API error: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/health", methods=["GET"])
def health():
    """
    Health check endpoint
    """
    return jsonify({"status": "ok", "message": "Air Quality Service is running"}), 200

@app.route("/model-info", methods=["GET"])
def model_info():
    """
    Thông tin về model
    """
    return jsonify({
        "model_type": "DecisionTreeClassifier",
        "features": ["CO2", "CO", "PM2.5", "Temperature", "Humidity"],
        "classes": ["Tốt", "Trung bình", "Kém"],
        "status": "ready"
    }), 200

if __name__ == "__main__":
    logger.info("🚀 Starting Air Quality Classifier Service...")
    app.run(host="0.0.0.0", port=5000, debug=False)

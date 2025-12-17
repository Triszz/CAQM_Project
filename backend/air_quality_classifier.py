import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import joblib
import json
from flask import Flask, request, jsonify
import logging
import os
from collections import Counter

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Tên file models
MODEL_QUALITY_PATH = "model_quality_custom.pkl"
MODEL_PROBLEMS_PATH = "model_problems_custom.pkl"
SCALER_PATH = "scaler_custom.pkl"

# ============================================
# 0. CUSTOM DECISION TREE IMPLEMENTATION
# ============================================

class Node:
    def __init__(self, feature=None, threshold=None, left=None, right=None, *, value=None, proba=None):
        self.feature = feature
        self.threshold = threshold
        self.left = left
        self.right = right
        self.value = value
        self.proba = proba

    def is_leaf_node(self):
        return self.value is not None

class SimpleDecisionTree:
    """
    Cây quyết định tự xây dựng (Classification Tree) sử dụng Gini Impurity
    """
    def __init__(self, min_samples_split=2, max_depth=100, n_features=None):
        self.min_samples_split = min_samples_split
        self.max_depth = max_depth
        self.n_features = n_features
        self.root = None

    def fit(self, X, y):
        self.n_features = X.shape[1] if not self.n_features else min(X.shape[1], self.n_features)
        self.root = self._grow_tree(X, y)

    def _grow_tree(self, X, y, depth=0):
        n_samples, n_feats = X.shape
        n_labels = len(np.unique(y))

        # Điều kiện dừng
        if (depth >= self.max_depth or n_labels == 1 or n_samples < self.min_samples_split):
            counter = Counter(y)
            most_common = counter.most_common(1)[0][0]
            # Tính xác suất cho từng class tại lá này
            total = len(y)
            proba = {k: v / total for k, v in counter.items()}
            return Node(value=most_common, proba=proba)

        feat_idxs = np.random.choice(n_feats, self.n_features, replace=False)

        # Tìm split tốt nhất
        best_feat, best_thresh = self._best_split(X, y, feat_idxs)

        if best_feat is None: # Không tìm được split nào tốt hơn
            counter = Counter(y)
            most_common = counter.most_common(1)[0][0]
            proba = {k: v / len(y) for k, v in counter.items()}
            return Node(value=most_common, proba=proba)

        left_idxs, right_idxs = self._split(X[:, best_feat], best_thresh)
        left = self._grow_tree(X[left_idxs, :], y[left_idxs], depth + 1)
        right = self._grow_tree(X[right_idxs, :], y[right_idxs], depth + 1)
        return Node(best_feat, best_thresh, left, right)

    def _best_split(self, X, y, feat_idxs):
        best_gain = -1
        split_idx, split_threshold = None, None

        for feat_idx in feat_idxs:
            X_column = X[:, feat_idx]
            thresholds = np.unique(X_column)

            # Chỉ thử tối đa 10 threshold ngẫu nhiên để tăng tốc nếu dữ liệu lớn
            if len(thresholds) > 10:
                thresholds = np.random.choice(thresholds, 10, replace=False)

            for thr in thresholds:
                gain = self._information_gain(y, X_column, thr)
                if gain > best_gain:
                    best_gain = gain
                    split_idx = feat_idx
                    split_threshold = thr

        if best_gain == 0: return None, None # Không có gain nào dương
        return split_idx, split_threshold

    def _information_gain(self, y, X_column, threshold):
        # Gini của cha
        parent_gini = self._gini(y)

        # Tạo split
        left_idxs, right_idxs = self._split(X_column, threshold)
        if len(left_idxs) == 0 or len(right_idxs) == 0:
            return 0

        # Gini có trọng số của con
        n = len(y)
        n_l, n_r = len(left_idxs), len(right_idxs)
        e_l, e_r = self._gini(y[left_idxs]), self._gini(y[right_idxs])
        child_gini = (n_l / n) * e_l + (n_r / n) * e_r

        return parent_gini - child_gini

    def _split(self, X_column, split_thresh):
        left_idxs = np.argwhere(X_column <= split_thresh).flatten()
        right_idxs = np.argwhere(X_column > split_thresh).flatten()
        return left_idxs, right_idxs

    def _gini(self, y):
        # 1 - sum(p^2)
        _, counts = np.unique(y, return_counts=True)
        probabilities = counts / len(y)
        return 1 - np.sum(probabilities ** 2)

    def predict(self, X):
        return np.array([self._traverse_tree(x, self.root) for x in X])

    def predict_proba(self, X):
        # Trả về list các dict xác suất {label: prob}
        return [self._traverse_tree_proba(x, self.root) for x in X]

    def _traverse_tree(self, x, node):
        if node.is_leaf_node():
            return node.value
        if x[node.feature] <= node.threshold:
            return self._traverse_tree(x, node.left)
        return self._traverse_tree(x, node.right)
    
    def _traverse_tree_proba(self, x, node):
        if node.is_leaf_node():
            return node.proba
        if x[node.feature] <= node.threshold:
            return self._traverse_tree_proba(x, node.left)
        return self._traverse_tree_proba(x, node.right)


class SimpleMultiLabelModel:
    """
    Model đa nhãn tự xây dựng (Binary Relevance):
    Huấn luyện N cây quyết định riêng biệt cho N cột nhãn đầu ra
    """
    def __init__(self, max_depth=15):
        self.models = []
        self.max_depth = max_depth

    def fit(self, X, y):
        # y là matrix (n_samples, n_labels)
        self.models = []
        n_labels = y.shape[1]
        for i in range(n_labels):
            y_col = y[:, i]
            tree = SimpleDecisionTree(max_depth=self.max_depth)
            tree.fit(X, y_col)
            self.models.append(tree)

    def predict(self, X):
        # Kết quả trả về matrix (n_samples, n_labels)
        preds = []
        for tree in self.models:
            preds.append(tree.predict(X))
        return np.column_stack(preds)

    def score(self, X, y):
        # Tính accuracy đơn giản: đúng hết các nhãn mới tính là đúng
        preds = self.predict(X)
        correct = np.all(preds == y, axis=1)
        return np.mean(correct)


# ============================================
# 1. TRAINING DATA GENERATOR (GIỮ NGUYÊN)
# ============================================

def generate_training_data():
    """
    Tạo dữ liệu huấn luyện - ĐIỀU CHỈNH CHO KHÍ HẬU TP.HCM
    - Nhiệt độ: 25-40°C (thay vì 20-60°C)
    - Độ ẩm: 70-85% (thay vì 40-90%)
    - PM2.5: Ngưỡng cao hơn (do ô nhiễm thực tế)
    - THÊM: Cases "Trung bình" chi tiết (individual + combinations)
    """
    np.random.seed(42)
    data = []
    labels_quality = []
    labels_problems = []

    # ============================================
    # CASE 1: TỐT (500 samples)
    # ============================================
    for _ in range(500):
        co2 = np.random.randint(350, 800)
        co = np.random.uniform(0, 5)
        pm25 = np.random.randint(0, 25)
        temp = np.random.uniform(25, 30)
        hum = np.random.uniform(70, 85)
        data.append([co2, co, pm25, temp, hum])
        labels_quality.append("Tốt")
        labels_problems.append([0, 0, 0, 0, 0])

    # ============================================
    # CASE 2: TRUNG BÌNH (1,200 samples)
    # ============================================
    
    # 2a. Tất cả sensors ở mức "Tốt" NHƯNG tổng hợp lại "hơi khó chịu" (200 samples)
    for _ in range(200):
        co2 = np.random.randint(750, 850)      # Gần ngưỡng
        co = np.random.uniform(4, 6)           # Gần ngưỡng
        pm25 = np.random.randint(20, 30)       # Gần ngưỡng
        temp = np.random.uniform(29, 31)       # Gần ngưỡng
        hum = np.random.uniform(68, 87)        # Gần ngưỡng
        data.append([co2, co, pm25, temp, hum])
        labels_quality.append("Trung bình")
        labels_problems.append([0, 0, 0, 0, 0])

    # ============================================
    # CASE 2B: TRUNG BÌNH - INDIVIDUAL SENSORS (ĐƠN LẺ - 750 samples)
    # ============================================
    
    # 2b1. CHỈ CO2 hơi cao (150 samples)
    for _ in range(150):
        co2 = np.random.randint(800, 1000)     # ✅ Moderate range
        co = np.random.uniform(0, 5)           # Tốt
        pm25 = np.random.randint(0, 25)        # Tốt
        temp = np.random.uniform(25, 30)       # Tốt
        hum = np.random.uniform(70, 85)        # Tốt
        data.append([co2, co, pm25, temp, hum])
        labels_quality.append("Trung bình")
        labels_problems.append([0, 0, 0, 0, 0])

    # 2b2. CHỈ CO hơi cao (150 samples)
    for _ in range(150):
        co2 = np.random.randint(400, 800)      # Tốt
        co = np.random.uniform(5, 9)           # ✅ Moderate range
        pm25 = np.random.randint(0, 25)        # Tốt
        temp = np.random.uniform(25, 30)       # Tốt
        hum = np.random.uniform(70, 85)        # Tốt
        data.append([co2, co, pm25, temp, hum])
        labels_quality.append("Trung bình")
        labels_problems.append([0, 0, 0, 0, 0])

    # 2b3. CHỈ PM2.5 hơi cao (150 samples)
    for _ in range(150):
        co2 = np.random.randint(400, 800)      # Tốt
        co = np.random.uniform(0, 5)           # Tốt
        pm25 = np.random.randint(25, 35)       # ✅ Moderate range
        temp = np.random.uniform(25, 30)       # Tốt
        hum = np.random.uniform(70, 85)        # Tốt
        data.append([co2, co, pm25, temp, hum])
        labels_quality.append("Trung bình")
        labels_problems.append([0, 0, 0, 0, 0])

    # 2b4. CHỈ Nhiệt độ hơi nóng (150 samples)
    for _ in range(150):
        co2 = np.random.randint(400, 800)      # Tốt
        co = np.random.uniform(0, 5)           # Tốt
        pm25 = np.random.randint(0, 25)        # Tốt
        temp = np.random.uniform(30, 34)       # ✅ Moderate range (hơi nóng)
        hum = np.random.uniform(70, 85)        # Tốt
        data.append([co2, co, pm25, temp, hum])
        labels_quality.append("Trung bình")
        labels_problems.append([0, 0, 0, 0, 0])

    # 2b5. CHỈ Độ ẩm hơi khó chịu (150 samples)
    for _ in range(150):
        co2 = np.random.randint(400, 800)      # Tốt
        co = np.random.uniform(0, 5)           # Tốt
        pm25 = np.random.randint(0, 25)        # Tốt
        temp = np.random.uniform(25, 30)       # Tốt
        hum = np.random.choice([np.random.uniform(65, 70), np.random.uniform(85, 92)])  # ✅ Moderate (hơi khô / hơi ẩm)
        data.append([co2, co, pm25, temp, hum])
        labels_quality.append("Trung bình")
        labels_problems.append([0, 0, 0, 0, 0])

    # ============================================
    # CASE 2C: TRUNG BÌNH - COMBINATIONS (2 sensors - 250 samples)
    # ============================================
    
    # 2c1. CO2 + CO hơi cao (50 samples)
    for _ in range(50):
        co2 = np.random.randint(800, 1000)
        co = np.random.uniform(5, 9)
        pm25 = np.random.randint(0, 25)
        temp = np.random.uniform(25, 30)
        hum = np.random.uniform(70, 85)
        data.append([co2, co, pm25, temp, hum])
        labels_quality.append("Trung bình")
        labels_problems.append([0, 0, 0, 0, 0])

    # 2c2. CO2 + PM2.5 hơi cao (50 samples)
    for _ in range(50):
        co2 = np.random.randint(800, 1000)
        co = np.random.uniform(0, 5)
        pm25 = np.random.randint(25, 35)
        temp = np.random.uniform(25, 30)
        hum = np.random.uniform(70, 85)
        data.append([co2, co, pm25, temp, hum])
        labels_quality.append("Trung bình")
        labels_problems.append([0, 0, 0, 0, 0])

    # 2c3. CO2 + Temp hơi cao (50 samples)
    for _ in range(50):
        co2 = np.random.randint(800, 1000)
        co = np.random.uniform(0, 5)
        pm25 = np.random.randint(0, 25)
        temp = np.random.uniform(30, 34)
        hum = np.random.uniform(70, 85)
        data.append([co2, co, pm25, temp, hum])
        labels_quality.append("Trung bình")
        labels_problems.append([0, 0, 0, 0, 0])

    # 2c4. CO + PM2.5 hơi cao (50 samples)
    for _ in range(50):
        co2 = np.random.randint(400, 800)
        co = np.random.uniform(5, 9)
        pm25 = np.random.randint(25, 35)
        temp = np.random.uniform(25, 30)
        hum = np.random.uniform(70, 85)
        data.append([co2, co, pm25, temp, hum])
        labels_quality.append("Trung bình")
        labels_problems.append([0, 0, 0, 0, 0])

    # 2c5. PM2.5 + Temp hơi cao (50 samples)
    for _ in range(50):
        co2 = np.random.randint(400, 800)
        co = np.random.uniform(0, 5)
        pm25 = np.random.randint(25, 35)
        temp = np.random.uniform(30, 34)
        hum = np.random.uniform(70, 85)
        data.append([co2, co, pm25, temp, hum])
        labels_quality.append("Trung bình")
        labels_problems.append([0, 0, 0, 0, 0])

    # ============================================
    # CASE 3: KÉM - INDIVIDUAL SENSORS (ĐƠN LẺ - 750 samples)
    # ============================================
    
    # 3a. CHỈ CO2 vượt ngưỡng (150 samples)
    for _ in range(150):
        co2 = np.random.randint(1000, 2500)    # ✅ >1000 = Poor
        co = np.random.uniform(0, 5)
        pm25 = np.random.randint(0, 30)
        temp = np.random.uniform(25, 30)
        hum = np.random.uniform(70, 85)
        data.append([co2, co, pm25, temp, hum])
        labels_quality.append("Kém")
        labels_problems.append([1, 0, 0, 0, 0])

    # 3b. CHỈ CO vượt ngưỡng (150 samples)
    for _ in range(150):
        co2 = np.random.randint(400, 800)
        co = np.random.uniform(9, 50)          # ✅ >9 = Poor
        pm25 = np.random.randint(0, 30)
        temp = np.random.uniform(25, 30)
        hum = np.random.uniform(70, 85)
        data.append([co2, co, pm25, temp, hum])
        labels_quality.append("Kém")
        labels_problems.append([0, 1, 0, 0, 0])

    # 3c. CHỈ PM2.5 vượt ngưỡng (150 samples)
    for _ in range(150):
        co2 = np.random.randint(400, 800)
        co = np.random.uniform(0, 5)
        pm25 = np.random.randint(35, 100)      # ✅ >35 = Poor
        temp = np.random.uniform(25, 30)
        hum = np.random.uniform(70, 85)
        data.append([co2, co, pm25, temp, hum])
        labels_quality.append("Kém")
        labels_problems.append([0, 0, 1, 0, 0])

    # 3d. CHỈ Nhiệt độ vượt ngưỡng (150 samples)
    for _ in range(150):
        co2 = np.random.randint(400, 800)
        co = np.random.uniform(0, 5)
        pm25 = np.random.randint(0, 30)
        temp = np.random.uniform(34, 40)       # ✅ >34 = Poor
        hum = np.random.uniform(70, 85)
        data.append([co2, co, pm25, temp, hum])
        labels_quality.append("Kém")
        labels_problems.append([0, 0, 0, 1, 0])

    # 3e. CHỈ Độ ẩm vượt ngưỡng (150 samples)
    for _ in range(150):
        co2 = np.random.randint(400, 800)
        co = np.random.uniform(0, 5)
        pm25 = np.random.randint(0, 30)
        temp = np.random.uniform(25, 30)
        hum = np.random.choice([np.random.uniform(40, 65), np.random.uniform(92, 100)])  # ✅ <65 hoặc >92 = Poor
        data.append([co2, co, pm25, temp, hum])
        labels_quality.append("Kém")
        labels_problems.append([0, 0, 0, 0, 1])

    # ============================================
    # CASE 4: KÉM - COMBINATIONS (2 sensors - 500 samples)
    # ============================================
    
    # 4a. CO2 + CO (100 samples)
    for _ in range(100):
        co2 = np.random.randint(1000, 2500)
        co = np.random.uniform(9, 50)
        pm25 = np.random.randint(0, 30)
        temp = np.random.uniform(25, 30)
        hum = np.random.uniform(70, 85)
        data.append([co2, co, pm25, temp, hum])
        labels_quality.append("Kém")
        labels_problems.append([1, 1, 0, 0, 0])

    # 4b. CO2 + PM2.5 (100 samples)
    for _ in range(100):
        co2 = np.random.randint(1000, 2500)
        co = np.random.uniform(0, 5)
        pm25 = np.random.randint(35, 100)
        temp = np.random.uniform(25, 30)
        hum = np.random.uniform(70, 85)
        data.append([co2, co, pm25, temp, hum])
        labels_quality.append("Kém")
        labels_problems.append([1, 0, 1, 0, 0])

    # 4c. CO2 + Temp (100 samples)
    for _ in range(100):
        co2 = np.random.randint(1000, 2500)
        co = np.random.uniform(0, 5)
        pm25 = np.random.randint(0, 30)
        temp = np.random.uniform(34, 40)
        hum = np.random.uniform(70, 85)
        data.append([co2, co, pm25, temp, hum])
        labels_quality.append("Kém")
        labels_problems.append([1, 0, 0, 1, 0])

    # 4d. CO + PM2.5 (100 samples)
    for _ in range(100):
        co2 = np.random.randint(400, 800)
        co = np.random.uniform(9, 50)
        pm25 = np.random.randint(35, 100)
        temp = np.random.uniform(25, 30)
        hum = np.random.uniform(70, 85)
        data.append([co2, co, pm25, temp, hum])
        labels_quality.append("Kém")
        labels_problems.append([0, 1, 1, 0, 0])

    # 4e. PM2.5 + Temp (100 samples)
    for _ in range(100):
        co2 = np.random.randint(400, 800)
        co = np.random.uniform(0, 5)
        pm25 = np.random.randint(35, 100)
        temp = np.random.uniform(34, 40)
        hum = np.random.uniform(70, 85)
        data.append([co2, co, pm25, temp, hum])
        labels_quality.append("Kém")
        labels_problems.append([0, 0, 1, 1, 0])

    # ============================================
    # CASE 5: KÉM - COMBINATIONS (3 sensors - 200 samples)
    # ============================================
    
    # 5a. CO2 + CO + PM2.5 (100 samples)
    for _ in range(100):
        co2 = np.random.randint(1000, 2500)
        co = np.random.uniform(9, 50)
        pm25 = np.random.randint(35, 100)
        temp = np.random.uniform(25, 30)
        hum = np.random.uniform(70, 85)
        data.append([co2, co, pm25, temp, hum])
        labels_quality.append("Kém")
        labels_problems.append([1, 1, 1, 0, 0])

    # 5b. CO2 + CO + Temp (100 samples)
    for _ in range(100):
        co2 = np.random.randint(1000, 2500)
        co = np.random.uniform(9, 50)
        pm25 = np.random.randint(0, 30)
        temp = np.random.uniform(34, 40)
        hum = np.random.uniform(70, 85)
        data.append([co2, co, pm25, temp, hum])
        labels_quality.append("Kém")
        labels_problems.append([1, 1, 0, 1, 0])
        
    # ============================================
    # CASE 6: KÉM - ALL SENSORS (4 sensors - 200 samples)
    # ============================================
    
    # 6a. Tất cả sensors vượt ngưỡng nghiêm trọng (200 samples)
    for _ in range(200):
        co2 = np.random.randint(1500, 3000)
        co = np.random.uniform(15, 50)
        pm25 = np.random.randint(75, 200)
        temp = np.random.uniform(36, 40)
        hum = np.random.uniform(40, 65)
        data.append([co2, co, pm25, temp, hum])
        labels_quality.append("Kém")
        labels_problems.append([1, 1, 1, 1, 0])

    return np.array(data), np.array(labels_quality), np.array(labels_problems)



# ============================================
# 2. TRAIN & LOAD CUSTOM MODELS
# ============================================

def train_models():
    logger.info("Generating hybrid training data...")
    X, y_quality, y_problems = generate_training_data()

    X_train, X_test, yq_train, yq_test, yp_train, yp_test = train_test_split(
        X, y_quality, y_problems, test_size=0.2, random_state=42
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # --- MODEL 1: QUALITY CLASSIFIER (Custom Decision Tree) ---
    logger.info("Training Custom Decision Tree for Quality...")
    # Thay vì RandomForest, ta dùng 1 cây quyết định tự viết
    clf_quality = SimpleDecisionTree(max_depth=15, min_samples_split=5) 
    clf_quality.fit(X_train_scaled, yq_train)
    
    # Tính accuracy thủ công
    y_pred = clf_quality.predict(X_test_scaled)
    acc_q = np.mean(y_pred == yq_test)
    logger.info(f"Custom Quality Model Accuracy: {acc_q:.2%}")

    # --- MODEL 2: DIAGNOSTIC MODEL (Custom Multi-Label) ---
    logger.info("Training Custom Multi-Label Model for Diagnostics...")
    clf_problems = SimpleMultiLabelModel(max_depth=15)
    clf_problems.fit(X_train_scaled, yp_train)
    
    acc_p = clf_problems.score(X_test_scaled, yp_test)
    logger.info(f"Custom Diagnostic Model Accuracy: {acc_p:.2%}")

    joblib.dump(clf_quality, MODEL_QUALITY_PATH)
    joblib.dump(clf_problems, MODEL_PROBLEMS_PATH)
    joblib.dump(scaler, SCALER_PATH)
    
    return clf_quality, clf_problems, scaler

# Load models
try:
    if not os.path.exists(MODEL_QUALITY_PATH):
        raise FileNotFoundError
    clf_quality = joblib.load(MODEL_QUALITY_PATH)
    clf_problems = joblib.load(MODEL_PROBLEMS_PATH)
    scaler = joblib.load(SCALER_PATH)
    logger.info("All CUSTOM models loaded successfully.")
except:
    logger.info("Models not found or outdated. Training custom models...")
    clf_quality, clf_problems, scaler = train_models()

# ============================================
# 3. PREDICTION LOGIC
# ============================================

def predict_logic(sensor_data):
    try:
        features = np.array([[
            sensor_data["co2"],
            sensor_data["co"],
            sensor_data["pm25"],
            sensor_data["temperature"],
            sensor_data["humidity"]
        ]])
        
        features_scaled = scaler.transform(features)
        
        # 1. Predict Quality
        quality_pred_arr = clf_quality.predict(features_scaled)
        quality_pred = quality_pred_arr[0]
        
        # Lấy confidence (xác suất cao nhất của class dự đoán)
        proba_dict_list = clf_quality.predict_proba(features_scaled)
        proba_dict = proba_dict_list[0] # Dict {label: prob}
        # Nếu dict trả về rỗng hoặc lỗi, default 1.0
        quality_proba = proba_dict.get(quality_pred, 0.0)

        # 2. Predict Problems
        problems_pred_matrix = clf_problems.predict(features_scaled) 
        problems_vector = problems_pred_matrix[0]

        problematic_sensors = []
        sensor_names = ["CO2", "CO", "PM2.5", "Nhiệt độ", "Độ ẩm"]
        sensor_keys = ["co2", "co", "pm25", "temperature", "humidity"]
        units = ["ppm", "ppm", "μg/m³", "°C", "%"]
        
        for i, is_bad in enumerate(problems_vector):
            if is_bad == 1:
                problematic_sensors.append({
                    "sensor": sensor_names[i],
                    "value": sensor_data[sensor_keys[i]],
                    "unit": units[i],
                    "threshold": "AI Detected",
                    "severity": "cao"
                })

        return {
            "quality": quality_pred,
            "confidence": round(quality_proba, 2),
            "problematic_sensors": problematic_sensors,
            "sensor_values": sensor_data
        }

    except Exception as e:
        logger.error(f"Prediction logic error: {e}")
        raise e

# ============================================
# 4. API ENDPOINTS (Giữ nguyên)
# ============================================

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400
    try:
        required = ["co2", "co", "pm25", "temperature", "humidity"]
        for field in required:
            if field not in data:
                return jsonify({"error": f"Missing field: {field}"}), 400 
        result = predict_logic(data)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/retrain", methods=["POST"])
def retrain():
    global clf_quality, clf_problems, scaler
    clf_quality, clf_problems, scaler = train_models()
    return jsonify({"message": "Custom models retrained successfully"}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)

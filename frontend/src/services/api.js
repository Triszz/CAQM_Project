import axios from "axios";
const API_BASE_URL = "http://localhost:3000/api";
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

const getAuthHeaders = () => {
  try {
    const userString = localStorage.getItem("user");
    if (!userString) return {};
    const user = JSON.parse(userString);
    return user.token ? { Authorization: `Bearer ${user.token}` } : {};
  } catch (error) {
    console.error("Error parsing user from localStorage: ", error);
    return {};
  }
};

export const UserAPI = {
  signup: (username, email, password) =>
    api.post("/signup", { username, email, password }),
  login: (email, password) => api.post("/login", { email, password }),
  getUserInfo: () => api.get("/user-info", { headers: getAuthHeaders() }),
};
export const SensorAPI = {
  getLatestSensorReading: () =>
    api.get("/sensor/latest", { headers: getAuthHeaders() }),
  getSensorReadingToday: () =>
    api.get("/sensor/today", { headers: getAuthHeaders() }),
  getSensorReadingLastHour: () =>
    api.get("/sensor/last-hour", { headers: getAuthHeaders() }),
};

export const DeviceStateAPI = {
  // ✅ Lấy tất cả device states
  getAllDeviceStates: () =>
    api.get("/device-state", { headers: getAuthHeaders() }),

  // ✅ Lấy state của 1 device
  getDeviceState: (deviceType) =>
    api.get(`/device-state/${deviceType}`, { headers: getAuthHeaders() }),

  // ✅ Cập nhật LED brightness
  updateLedBrightness: (data) =>
    api.put("/device-state/led/brightness", data, {
      headers: getAuthHeaders(),
    }),

  // ✅ Cập nhật Buzzer config
  updateBuzzerConfig: (data) =>
    api.put("/device-state/buzzer/config", data, { headers: getAuthHeaders() }),

  // ✅ Test buzzer
  testBuzzer: (config) =>
    api.post("/device-state/buzzer/test", config, {
      headers: getAuthHeaders(),
    }),
};

export const AirQualityAPI = {
  getCurrentAirQuality: () =>
    api.get("/air-quality/current", { headers: getAuthHeaders() }),
};

export const ChatbotAPI = {
  // ✅ Gửi message đến chatbot
  sendMessage: (message, userId) =>
    api.post(
      "/chatbot/message",
      { message, userId },
      { headers: getAuthHeaders() }
    ),

  // ✅ Xóa conversation history
  clearHistory: (userId) =>
    api.post("/chatbot/clear", { userId }, { headers: getAuthHeaders() }),
};

export default api;

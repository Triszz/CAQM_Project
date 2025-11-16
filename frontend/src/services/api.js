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
  signup: (username, email, password, phoneNumber) =>
    api.post("/signup", { username, email, password, phoneNumber }),
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
export default api;

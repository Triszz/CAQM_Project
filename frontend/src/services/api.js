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
export default api;

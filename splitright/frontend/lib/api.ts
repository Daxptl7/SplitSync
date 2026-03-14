import axios from "axios";
import { auth } from "./firebase";

// Use relative URLs so all API requests go through the Next.js rewrite proxy
// The proxy in next.config.js forwards /api/v1/* to the Django backend
const api = axios.create({
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach Firebase ID token to every request
api.interceptors.request.use(async (config) => {
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (err) {
    console.error("Token fetch error:", err);
  }
  return config;
});

// Global response error handler
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — redirect to login
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;

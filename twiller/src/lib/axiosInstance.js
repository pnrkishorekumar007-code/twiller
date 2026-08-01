import axios from "axios";
import { auth } from "@/context/firebase";

const axiosInstance = axios.create({
  baseURL: process.env.BACKEND_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 90000,
});

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out`)), ms)
    ),
  ]);
}

axiosInstance.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    try {
      const token = await withTimeout(user.getIdToken(), 10000, "getIdToken");
      config.headers.Authorization = `Bearer ${token}`;
    } catch (err) {
      console.error("Failed to get auth token:", err);
      // Let the request proceed without a token rather than hang forever —
      // the backend's verifyAuth middleware will correctly reject it with
      // a 401, which the app already knows how to handle (unlike an
      // indefinite hang, which it doesn't).
    }
  }
  return config;
});

export default axiosInstance;

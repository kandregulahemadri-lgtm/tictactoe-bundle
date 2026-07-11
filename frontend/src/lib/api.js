import axios from "axios";

const DEFAULT_BACKEND_URL = "https://tictactoe-backend-e8us.onrender.com";
const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || DEFAULT_BACKEND_URL).replace(/\/$/, "");
export const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  timeout: 10000,
});

export function formatApiErrorDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export default api;

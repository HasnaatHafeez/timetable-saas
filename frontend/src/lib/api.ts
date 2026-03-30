import axios from "axios";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const authDebug = import.meta.env.VITE_AUTH_DEBUG === "true";

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  async (config) => {
    const session = isSupabaseConfigured
      ? (await supabase.auth.getSession()).data.session
      : null;

    const token = session?.access_token || localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      if (authDebug) {
        // eslint-disable-next-line no-console
        console.debug("[AUTH] Attached Bearer token", {
          url: config.url,
          tokenPreview: `${token.slice(0, 10)}...`,
        });
      }
    } else if (authDebug) {
      // eslint-disable-next-line no-console
      console.debug("[AUTH] No token attached", { url: config.url });
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      if (authDebug) {
        // eslint-disable-next-line no-console
        console.debug("[AUTH] Received 401 response", {
          url: error.config?.url,
        });
      }
      await supabase.auth.signOut();
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;

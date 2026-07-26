import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("lp_access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    if (err.response?.status === 401 && !err.config._retry) {
      const refresh = localStorage.getItem("lp_refresh_token");
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refresh_token: refresh });
          localStorage.setItem("lp_access_token", data.access_token);
          localStorage.setItem("lp_refresh_token", data.refresh_token);
          err.config._retry = true;
          err.config.headers.Authorization = `Bearer ${data.access_token}`;
          return api(err.config);
        } catch (e) {
          localStorage.removeItem("lp_access_token");
          localStorage.removeItem("lp_refresh_token");
        }
      }
    }
    return Promise.reject(err);
  }
);

import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const t = localStorage.getItem("bitfits_token");
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export const saveAuth = (token, user) => {
  localStorage.setItem("bitfits_token", token);
  localStorage.setItem("bitfits_user", JSON.stringify(user));
};

export const clearAuth = () => {
  localStorage.removeItem("bitfits_token");
  localStorage.removeItem("bitfits_user");
};

export const getUser = () => {
  try { return JSON.parse(localStorage.getItem("bitfits_user")); } catch { return null; }
};

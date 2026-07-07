import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, saveAuth, clearAuth, getUser } from "@/lib/api";

const AuthCtx = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getUser());
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
      localStorage.setItem("bitfits_user", JSON.stringify(data));
    } catch (error) {
      // Token expired/invalid → clear local state so user is redirected to /auth
      if (error?.response?.status === 401) {
        localStorage.removeItem("bitfits_token");
        localStorage.removeItem("bitfits_user");
        setUser(null);
      } else {
        console.error("Auth refresh failed:", error);
      }
    }
  }, []);

  useEffect(() => {
    if (localStorage.getItem("bitfits_token")) refresh();
  }, [refresh]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      saveAuth(data.token, data.user);
      setUser(data.user);
      return data.user;
    } finally { setLoading(false); }
  };

  const register = async (email, password, name) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", { email, password, name });
      saveAuth(data.token, data.user);
      setUser(data.user);
      return data.user;
    } finally { setLoading(false); }
  };

  const logout = () => { clearAuth(); setUser(null); };

  return (
    <AuthCtx.Provider value={{ user, setUser, login, register, logout, loading, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
};

export const useAuth = () => useContext(AuthCtx);

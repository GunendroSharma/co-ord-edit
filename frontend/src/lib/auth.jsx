import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "./api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("lp_access_token");
    if (!token) { setReady(true); return; }
    api.get("/auth/me").then((r) => { setUser(r.data); if (r.data?.email) localStorage.setItem("lp_shopper_email", r.data.email); }).catch(() => {}).finally(() => setReady(true));
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("lp_access_token", data.access_token);
    localStorage.setItem("lp_refresh_token", data.refresh_token);
    localStorage.setItem("lp_shopper_email", data.user.email);
    setUser(data.user);
    return data.user;
  };
  const signup = async (email, password, name) => {
    const { data } = await api.post("/auth/signup", { email, password, name });
    localStorage.setItem("lp_access_token", data.access_token);
    localStorage.setItem("lp_refresh_token", data.refresh_token);
    localStorage.setItem("lp_shopper_email", data.user.email);
    setUser(data.user);
    return data.user;
  };
  const logout = () => {
    localStorage.removeItem("lp_access_token");
    localStorage.removeItem("lp_refresh_token");
    setUser(null);
  };

  return <AuthCtx.Provider value={{ user, ready, login, signup, logout }}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => useContext(AuthCtx);

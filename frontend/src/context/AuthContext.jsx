import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api, { clearStoredAccessToken, setStoredAccessToken } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // null = checking, false = anonymous, object = user
  const [user, setUser] = useState(null);
  const [authAttempted, setAuthAttempted] = useState(false);

  const fetchMe = useCallback(async () => {
    const fetchCurrentUser = async () => {
      const { data } = await api.get("/auth/me");
      const accessToken = data?.access_token;
      if (accessToken) setStoredAccessToken(accessToken);
      const userData = accessToken ? Object.fromEntries(Object.entries(data).filter(([k]) => k !== "access_token")) : data;
      setUser(userData);
      return userData;
    };

    try {
      const currentUser = await fetchCurrentUser();
      setAuthAttempted(true);
      return currentUser;
    } catch (error) {
      if (error?.response?.status === 401) {
        try {
          const { data } = await api.post("/auth/refresh");
          if (data?.access_token) setStoredAccessToken(data.access_token);
          const refreshedUser = await fetchCurrentUser();
          setAuthAttempted(true);
          return refreshedUser;
        } catch (_) {
          // ignore and fall through to anonymous state
        }
      }
      setAuthAttempted(true);
      clearStoredAccessToken();
      setUser(false);
      return false;
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = async (email, password) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      const accessToken = data?.access_token;
      if (accessToken) setStoredAccessToken(accessToken);
      const userData = accessToken ? Object.fromEntries(Object.entries(data).filter(([k]) => k !== "access_token")) : data;
      setUser(userData);
      return userData;
    } catch (error) {
      clearStoredAccessToken();
      setUser(false);
      throw error;
    }
  };
  const register = async (payload) => {
    try {
      const { data } = await api.post("/auth/register", payload);
      const accessToken = data?.access_token;
      if (accessToken) setStoredAccessToken(accessToken);
      const userData = accessToken ? Object.fromEntries(Object.entries(data).filter(([k]) => k !== "access_token")) : data;
      setUser(userData);
      return userData;
    } catch (error) {
      clearStoredAccessToken();
      setUser(false);
      throw error;
    }
  };
  const logout = async () => {
    try { await api.post("/auth/logout"); } catch (_) {}
    clearStoredAccessToken();
    setUser(false);
  };
  const updateProfile = async (payload) => {
    const { data } = await api.patch("/auth/profile", payload);
    setUser(data);
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, authAttempted, login, register, logout, updateProfile, refresh: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

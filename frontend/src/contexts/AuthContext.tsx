import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "teacher";
  backendRole?: string; // raw role from backend (e.g., SYSTEM_ADMIN, INSTITUTION_OWNER)
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");
    if (savedToken && savedUser) {
      setToken(savedToken);
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    // Demo mode: use demo@unischedule.com / demo1234 to preview without backend
    if (email === "demo@unischedule.com" && password === "demo1234") {
      const demoUser: User = { id: "demo", name: "Demo Admin", email: "demo@unischedule.com", role: "admin" };
      const demoToken = "demo-token";
      localStorage.setItem("token", demoToken);
      localStorage.setItem("user", JSON.stringify(demoUser));
      setToken(demoToken);
      setUser(demoUser);
      return;
    }
    const res = await api.post("/auth/login", { email, password });
    const { token: t, user: u } = res.data;
    const rawRole = u.backendRole || u.role;
    const mappedUser = {
      id: u.id,
      name: u.name,
      email: u.email,
      role: rawRole === "TEACHER" || rawRole === "teacher" ? "teacher" : "admin",
      backendRole: rawRole,
    } as User;
    localStorage.setItem("token", t);
    localStorage.setItem("user", JSON.stringify(mappedUser));
    setToken(t);
    setUser(mappedUser);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, role = "admin") => {
    const res = await api.post("/auth/register", { name, email, password, role });
    const { token: t, user: u } = res.data;
    // normalize role to frontend enum and keep backend role
    const rawRole = u.backendRole || u.role;
    const mappedUser = {
      id: u.id,
      name: u.name,
      email: u.email,
      role: rawRole === "teacher" || rawRole === "TEACHER" ? "teacher" : "admin",
      backendRole: rawRole,
    } as User;
    localStorage.setItem("token", t);
    localStorage.setItem("user", JSON.stringify(mappedUser));
    setToken(t);
    setUser(mappedUser);
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const res = await api.post("/auth/signup", { name, email, password });
    const { token: t, user: u } = res.data;
    const rawRole = u.backendRole || u.role;
    const mappedUser = {
      id: u.id,
      name: u.name,
      email: u.email,
      role: rawRole === "TEACHER" || rawRole === "teacher" ? "teacher" : "admin",
      backendRole: rawRole,
    } as User;
    localStorage.setItem("token", t);
    localStorage.setItem("user", JSON.stringify(mappedUser));
    setToken(t);
    setUser(mappedUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    await api.post("/auth/forgot-password", { email });
  }, []);

  const resetPassword = useCallback(async (token: string, newPassword: string) => {
    await api.post("/auth/reset-password", { token, newPassword });
  }, []);

  const updateProfile = useCallback(async (data: Partial<User>) => {
    const res = await api.put("/users/profile", data);
    const updated = res.data;
    const rawRole = updated.backendRole || updated.role;
    const mappedUser = {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: rawRole === "TEACHER" || rawRole === "teacher" ? "teacher" : "admin",
      backendRole: rawRole,
    } as User;
    localStorage.setItem("user", JSON.stringify(mappedUser));
    setUser(mappedUser);
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await api.put("/auth/change-password", { currentPassword, newPassword });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        register,
        signup,
        logout,
        forgotPassword,
        resetPassword,
        updateProfile,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

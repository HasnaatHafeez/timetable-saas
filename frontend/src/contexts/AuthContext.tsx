import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

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

  const mapBackendRole = (rawRole?: string) => (rawRole === "TEACHER" || rawRole === "teacher" ? "teacher" : "admin");

  const setAuthState = useCallback((nextToken: string | null, nextUser: User | null) => {
    if (nextToken) {
      localStorage.setItem("token", nextToken);
      setToken(nextToken);
    } else {
      localStorage.removeItem("token");
      setToken(null);
    }

    if (nextUser) {
      localStorage.setItem("user", JSON.stringify(nextUser));
      setUser(nextUser);
    } else {
      localStorage.removeItem("user");
      setUser(null);
    }
  }, []);

  const syncBackendSession = useCallback(async (fallbackEmail?: string): Promise<User | null> => {
    try {
      const response = await api.get("/auth/session");
      const backendUser = response.data?.user;
      if (!backendUser) return null;

      return {
        id: backendUser.id,
        name: backendUser.name || fallbackEmail || "User",
        email: backendUser.email,
        role: mapBackendRole(backendUser.backendRole || backendUser.role),
        backendRole: backendUser.backendRole || backendUser.role,
      };
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const hydrateSession = async () => {
      if (!isSupabaseConfigured) {
        setAuthState(null, null);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error || !data.session) {
        setAuthState(null, null);
        setIsLoading(false);
        return;
      }

      const accessToken = data.session.access_token;
      const fallbackEmail = data.session.user.email || "";
      const backendUser = await syncBackendSession(fallbackEmail);

      const mappedUser: User = backendUser || {
        id: data.session.user.id,
        name: data.session.user.user_metadata?.full_name || fallbackEmail || "User",
        email: fallbackEmail,
        role: "teacher",
        backendRole: "TEACHER",
      };

      setAuthState(accessToken, mappedUser);
      setIsLoading(false);
    };

    hydrateSession();

    if (!isSupabaseConfigured) {
      return () => {
        mounted = false;
      };
    }

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      if (!session) {
        setAuthState(null, null);
        return;
      }

      const accessToken = session.access_token;
      const fallbackEmail = session.user.email || "";
      const backendUser = await syncBackendSession(fallbackEmail);

      const mappedUser: User = backendUser || {
        id: session.user.id,
        name: session.user.user_metadata?.full_name || fallbackEmail || "User",
        email: fallbackEmail,
        role: "teacher",
        backendRole: "TEACHER",
      };

      setAuthState(accessToken, mappedUser);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [setAuthState, syncBackendSession]);

  const login = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      throw new Error("Supabase auth is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }

    const session = data.session;
    if (!session) {
      throw new Error("No Supabase session returned");
    }

    const backendUser = await syncBackendSession(session.user.email || "");
    const mappedUser: User = backendUser || {
      id: session.user.id,
      name: session.user.user_metadata?.full_name || session.user.email || "User",
      email: session.user.email || "",
      role: "teacher",
      backendRole: "TEACHER",
    };

    setAuthState(session.access_token, mappedUser);
  }, [setAuthState, syncBackendSession]);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    if (!isSupabaseConfigured) {
      throw new Error("Supabase auth is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });

    if (error) {
      throw error;
    }

    if (!data.session) {
      throw new Error("Signup succeeded. Please verify your email before logging in.");
    }

    const session = data.session;
    const backendUser = await syncBackendSession(session.user.email || "");
    const mappedUser: User = backendUser || {
      id: session.user.id,
      name: name || session.user.email || "User",
      email: session.user.email || "",
      role: "teacher",
      backendRole: "TEACHER",
    };

    setAuthState(session.access_token, mappedUser);
  }, [setAuthState, syncBackendSession]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    await signup(name, email, password);
  }, [signup]);

  const logout = useCallback(() => {
    void supabase.auth.signOut();
    setAuthState(null, null);
  }, [setAuthState]);

  const forgotPassword = useCallback(async (email: string) => {
    if (!isSupabaseConfigured) {
      throw new Error("Supabase auth is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
    }

    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      throw error;
    }
  }, []);

  const resetPassword = useCallback(async (token: string, newPassword: string) => {
    if (!isSupabaseConfigured) {
      throw new Error("Supabase auth is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
    }

    const normalizedToken = String(token || "").trim();
    if (normalizedToken) {
      await supabase.auth.verifyOtp({
        token_hash: normalizedToken,
        type: "recovery",
      });
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      throw error;
    }
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
    if (!currentPassword) {
      throw new Error("Current password is required.");
    }

    if (!isSupabaseConfigured) {
      throw new Error("Supabase auth is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      throw error;
    }
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

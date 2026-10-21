"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { fetcher, mutateApi } from "./api";
import type { AuthResponse, SendOtpResponse, User, UserRole } from "./types";

interface AuthContextType {
  user: User | null;
  role: "guest" | UserRole;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  loginWithGoogle: (credential: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  sendVerificationOtp: (email: string, name?: string) => Promise<SendOtpResponse>;
  verifyRegistration: (
    name: string,
    email: string,
    password: string,
    code: string,
    phone?: string
  ) => Promise<void>;
  logout: () => void;
  updateProfile: (data: {
    name?: string;
    phone_number?: string;
    wa_notifications_enabled?: boolean;
    notification_lead_minutes?: number;
  }) => Promise<User>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "smartroad_token";
const USER_KEY = "smartroad_user";

function getInitialToken(): string | null {
  if (typeof window !== "undefined") {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }
  return null;
}

function getInitialUser(): User | null {
  if (typeof window !== "undefined") {
    try {
      const savedUserStr = localStorage.getItem(USER_KEY);
      if (savedUserStr) {
        return JSON.parse(savedUserStr);
      }
    } catch {
      return null;
    }
  }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(getInitialToken);
  const [user, setUser] = useState<User | null>(getInitialUser);
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(getInitialToken()));

  // Validate session on mount
  useEffect(() => {
    const savedToken = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
    if (!savedToken) {
      return;
    }

    fetcher<User>("/api/auth/me")
      .then((currentUser) => {
        setUser(currentUser);
        try {
          localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
        } catch {
          // ignore
        }
      })
      .catch(() => {
        try {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
        } catch {
          // ignore
        }
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await mutateApi<AuthResponse>("/api/auth/login", "POST", { email, password });
    setToken(res.access_token);
    setUser(res.user);
    try {
      localStorage.setItem(TOKEN_KEY, res.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    } catch {
      // Ignore storage error
    }
    return res.user;
  };

  const loginWithGoogle = async (credential: string) => {
    const res = await mutateApi<AuthResponse>("/api/auth/google", "POST", { credential });
    setToken(res.access_token);
    setUser(res.user);
    try {
      localStorage.setItem(TOKEN_KEY, res.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    } catch {
      // Ignore storage error
    }
  };

  const register = async (name: string, email: string, password: string, phone?: string) => {
    const res = await mutateApi<AuthResponse>("/api/auth/register", "POST", {
      name,
      email,
      password,
      phone_number: phone || null,
    });
    setToken(res.access_token);
    setUser(res.user);
    try {
      localStorage.setItem(TOKEN_KEY, res.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    } catch {
      // Ignore storage error
    }
  };

  const sendVerificationOtp = async (email: string, name?: string): Promise<SendOtpResponse> => {
    return await mutateApi<SendOtpResponse>("/api/auth/send-verification-otp", "POST", {
      email,
      name,
    });
  };

  const verifyRegistration = async (
    name: string,
    email: string,
    password: string,
    code: string,
    phone?: string
  ): Promise<void> => {
    const res = await mutateApi<AuthResponse>("/api/auth/verify-registration", "POST", {
      name,
      email,
      password,
      code,
      phone_number: phone || null,
    });
    setToken(res.access_token);
    setUser(res.user);
    try {
      localStorage.setItem(TOKEN_KEY, res.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    } catch {
      // Ignore storage error
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      // Ignore storage error
    }
  };

  const updateProfile = async (data: {
    name?: string;
    phone_number?: string;
    wa_notifications_enabled?: boolean;
    notification_lead_minutes?: number;
  }) => {
    const updated = await mutateApi<User>("/api/auth/me", "PUT", data);
    setUser(updated);
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage error
    }
    return updated;
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const current = await fetcher<User>("/api/auth/me");
      setUser(current);
      localStorage.setItem(USER_KEY, JSON.stringify(current));
    } catch {
      // Ignore error
    }
  };

  const role: "guest" | UserRole = user ? user.role : "guest";

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        token,
        isLoading,
        login,
        loginWithGoogle,
        register,
        sendVerificationOtp,
        verifyRegistration,
        logout,
        updateProfile,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

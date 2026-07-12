"use client";
import { create } from "zustand";
import { apiClient } from "@/lib/utils";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: typeof window !== "undefined" ? localStorage.getItem("token") : null,
  isLoading: true,

  login: async (email: string, password: string) => {
    const data = await apiClient("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    set({ user: data.user, token: data.token });
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    set({ user: null, token: null });
    window.location.href = "/login";
  },

  loadUser: async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        set({ isLoading: false });
        return;
      }
      const user = await apiClient("/auth/me");
      set({ user, token, isLoading: false });
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      set({ user: null, token: null, isLoading: false });
    }
  },

  isAuthenticated: () => !!get().token && !!get().user,
}));

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "@/types/auth";

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  hydrated: boolean;
  setToken: (token: string | null) => void;
  setUser: (user: AuthUser | null) => void;
  setHydrated: (hydrated: boolean) => void;
  clearAuth: () => void;
  roleBoundary: () => "student" | "admin" | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      hydrated: false,
      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),
      setHydrated: (hydrated) => set({ hydrated }),
      clearAuth: () => set({ token: null, user: null }),
      roleBoundary: () => {
        const roleId = get().user?.role_id;
        if (roleId === 3) return "student";
        if (roleId === 1 || roleId === 2) return "admin";
        return null;
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);

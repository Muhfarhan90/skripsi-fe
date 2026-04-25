"use client";

import { create } from "zustand";
import type { AuthUser } from "@/types/auth";

interface AuthState {
  user: AuthUser | null;
  sessionChecked: boolean;
  setUser: (user: AuthUser | null) => void;
  setSessionChecked: (checked: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  sessionChecked: false,
  setUser: (user) => set({ user }),
  setSessionChecked: (checked) => set({ sessionChecked: checked }),
  clearAuth: () => set({ user: null, sessionChecked: true }),
}));

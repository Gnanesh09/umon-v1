import { create } from "zustand";

export type UserRole = "user" | "merchant" | "admin";

type UserProfile = {
  walletAddress: string;
  role: UserRole;
  displayName?: string;
  email?: string;
  merchantId?: string;
  merchantStatus?: string;
};

type AuthState = {
  user: UserProfile | null;
  loading: boolean;
  setUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  isAdmin: () => boolean;
  isMerchant: () => boolean;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  isAdmin: () => get().user?.role === "admin",
  isMerchant: () => get().user?.role === "merchant" || get().user?.role === "admin",
}));

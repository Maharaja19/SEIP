import { create } from "zustand";
import api from "../utils/api";
import { normalizeUserFromApi, clearAuthStorage } from "../utils/authUser";
import { normalizeRole } from "../utils/roles";

export const useStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem("user")) || null,
  token: localStorage.getItem("token") || null,
  isAuthenticated: !!localStorage.getItem("token"),
  loading: false,
  activeOrganization: null,

  login: (userData, token) => {
    const normalized = normalizeUserFromApi(userData);
    if (!normalized || !token) return;

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(normalized));
    set({ user: normalized, token, isAuthenticated: true });
  },

  logout: () => {
    clearAuthStorage();
    set({ user: null, token: null, isAuthenticated: false, activeOrganization: null });
    window.location.href = "/login";
  },

  refreshUser: async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      clearAuthStorage();
      set({ user: null, token: null, isAuthenticated: false });
      return null;
    }

    set({ loading: true });
    try {
      const res = await api.get("/auth/me");
      if (res.data?.success && res.data?.user) {
        const normalized = normalizeUserFromApi(res.data.user);
        localStorage.setItem("user", JSON.stringify(normalized));
        set({ user: normalized, isAuthenticated: true, loading: false });
        
        // Fetch organization details
        if (normalized.organizationId) {
          get().fetchOrganization();
        }
        return normalized;
      }
      throw new Error("Invalid response from server");
    } catch (error) {
      clearAuthStorage();
      set({ user: null, token: null, isAuthenticated: false, loading: false });
      throw error;
    }
  },

  fetchOrganization: async () => {
    try {
      const res = await api.get("/organizations/me");
      if (res.data?.success) {
        set({ activeOrganization: res.data.data });
      }
    } catch (err) {
      console.warn("Failed to fetch organization details:", err.message);
    }
  },

  hasRole: (role) => {
    return normalizeRole(get().user?.role) === normalizeRole(role);
  },

  hasAnyRole: (roles) => {
    const current = normalizeRole(get().user?.role);
    return (roles || []).some((r) => normalizeRole(r) === current);
  }
}));

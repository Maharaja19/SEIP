import React, { createContext, useContext, useEffect } from "react";
import { useStore } from "../store/useStore";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const store = useStore();

  useEffect(() => {
    const initSession = async () => {
      if (store.token) {
        try {
          await store.refreshUser();
        } catch (err) {
          console.warn("Session restore failed:", err.message);
        }
      }
    };
    initSession();
  }, []);

  const value = {
    user: store.user,
    login: store.login,
    logout: store.logout,
    refreshUser: store.refreshUser,
    isAuthenticated: store.isAuthenticated,
    loading: store.loading,
    hasRole: store.hasRole,
    hasAnyRole: store.hasAnyRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

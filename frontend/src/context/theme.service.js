import React, { createContext, useState, useEffect } from "react";

// 1️⃣ Create Context
export const ThemeContext = createContext();

// 2️⃣ Theme definitions
const themes = {
  light: {
    // Background colors
    "--bg-primary": "#ffffff",
    "--bg-secondary": "#f8fafc",
    "--bg-tertiary": "#f1f5f9",
    
    // Text colors
    "--text-primary": "#1e293b",
    "--text-secondary": "#64748b",
    "--text-tertiary": "#94a3b8",
    
    // Primary colors
    "--primary-color": "#2563eb",
    "--primary-light": "#3b82f6",
    
    // Status colors
    "--success-color": "#10b981",
    "--warning-color": "#f59e0b",
    "--danger-color": "#dc2626",
    "--info-color": "#0ea5e9",
    
    // Gray scale
    "--gray-50": "#f8fafc",
    "--gray-100": "#f1f5f9",
    "--gray-200": "#e2e8f0",
    "--gray-300": "#cbd5e1",
    "--gray-400": "#94a3b8",
    "--gray-500": "#64748b",
    "--gray-600": "#475569",
    "--gray-700": "#334155",
    "--gray-800": "#1e293b",
    "--gray-900": "#0f172a",
    
    // Shadows
    "--shadow-sm": "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    "--shadow-md": "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    "--shadow-lg": "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    "--shadow-xl": "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    
    // Spacing
    "--spacing-xs": "0.25rem",
    "--spacing-sm": "0.5rem",
    "--spacing-md": "1rem",
    "--spacing-lg": "1.5rem",
    "--spacing-xl": "2rem",
    "--spacing-2xl": "3rem",
    
    // Typography
    "--text-xs": "0.75rem",
    "--text-sm": "0.875rem",
    "--text-base": "1rem",
    "--text-lg": "1.125rem",
    "--text-xl": "1.25rem",
    "--text-2xl": "1.5rem",
    "--text-3xl": "1.875rem",
    "--text-4xl": "2.25rem",
    
    // Radius
    "--radius-sm": "0.125rem",
    "--radius-md": "0.25rem",
    "--radius-lg": "0.5rem",
    "--radius-full": "9999px",
    
    // Borders
    "--border-color": "#e2e8f0",
    
    // Card styles
    "--card-bg": "#ffffff",
    "--card-shadow": "0 1px 3px rgba(0, 0, 0, 0.1)",
    
    // Button styles
    "--btn-primary-bg": "#2563eb",
    "--btn-primary-hover": "#1d4ed8",
    "--btn-secondary-bg": "#f1f5f9",
    "--btn-secondary-hover": "#e2e8f0",
    "--btn-danger-bg": "#dc2626",
    "--btn-danger-hover": "#b91c1c",
    "--btn-success-bg": "#10b981",
    "--btn-success-hover": "#059669",
  }
};

// 3️⃣ Apply theme to document
const applyTheme = (theme) => {
  const root = document.documentElement;
  const themeColors = themes[theme];
  
  Object.keys(themeColors).forEach(property => {
    root.style.setProperty(property, themeColors[property]);
  });
  
  // Add theme class to body for additional styling
  document.body.className = `theme-${theme}`;
};

// 4️⃣ Theme Provider Component
export const ThemeProvider = ({ children }) => {
  // Load theme from localStorage or default to "light"
  const [theme] = useState("light"); // Fixed to light theme only

  // Update theme when it changes
  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem("theme", theme);
  }, [theme]); // Always light theme

  // No toggle function since theme is fixed
  const toggleTheme = () => {
    // No-op since theme is fixed to light
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
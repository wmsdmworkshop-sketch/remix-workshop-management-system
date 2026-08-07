// ============================================================
// Customer Portal V2 — Theme Toggle Component
// ============================================================
// Dark / Light mode toggle stored in localStorage.
// Uses CSS custom properties on :root for instant swap.

import React, { useState, useEffect } from "react";

export type PortalTheme = "light" | "dark";

const STORAGE_KEY = "dwip_portal_theme";

// CSS custom properties for both themes
const THEMES: Record<PortalTheme, Record<string, string>> = {
  light: {
    "--cp-bg": "#fafaf9",
    "--cp-surface": "#ffffff",
    "--cp-primary": "#1e3a5f",
    "--cp-text": "#1a1a2e",
    "--cp-text-secondary": "#64748b",
    "--cp-border": "#e2e8f0",
    "--cp-header-bg": "#1e3a5f",
    "--cp-tab-bg": "#ffffff",
  },
  dark: {
    "--cp-bg": "#0f172a",
    "--cp-surface": "#1e293b",
    "--cp-primary": "#3b82f6",
    "--cp-text": "#f1f5f9",
    "--cp-text-secondary": "#94a3b8",
    "--cp-border": "#334155",
    "--cp-header-bg": "#020617",
    "--cp-tab-bg": "#1e293b",
  },
};

export function applyTheme(theme: PortalTheme) {
  const root = document.documentElement;
  const vars = THEMES[theme];
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  root.setAttribute("data-cp-theme", theme);
}

export function getStoredTheme(): PortalTheme {
  return (localStorage.getItem(STORAGE_KEY) as PortalTheme) || "light";
}

interface ThemeToggleProps {
  compact?: boolean;
}

export function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const [theme, setTheme] = useState<PortalTheme>(getStoredTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggle = () => {
    const next: PortalTheme = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  };

  if (compact) {
    return (
      <button style={s.compactBtn} onClick={toggle} title="Toggle Dark / Light Mode">
        {theme === "light" ? "🌙" : "☀️"}
      </button>
    );
  }

  return (
    <div style={s.row}>
      <span style={s.label}>{theme === "dark" ? "🌙 Dark Mode" : "☀️ Light Mode"}</span>
      <button
        style={{ ...s.toggleBtn, background: theme === "dark" ? "#3b82f6" : "#e2e8f0" }}
        onClick={toggle}
      >
        <div style={{
          ...s.knob,
          transform: theme === "dark" ? "translateX(20px)" : "translateX(2px)",
        }} />
      </button>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  compactBtn: {
    background: "rgba(255,255,255,0.15)",
    border: "1px solid rgba(255,255,255,0.25)",
    borderRadius: 10,
    padding: "5px 8px",
    fontSize: 18,
    cursor: "pointer",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 0",
  },
  label: { fontSize: 14, color: "#1a1a2e", fontWeight: 500 },
  toggleBtn: {
    width: 44, height: 24, borderRadius: 12, border: "none",
    position: "relative" as const, cursor: "pointer", transition: "background 0.2s", padding: 0,
  },
  knob: {
    position: "absolute" as const, top: 2,
    width: 20, height: 20, borderRadius: "50%", background: "#fff",
    transition: "transform 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
  },
};

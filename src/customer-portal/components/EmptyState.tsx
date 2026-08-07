// ============================================================
// Customer Portal V2 — Empty State Component
// ============================================================
// Standardized empty state for all pages.

import React from "react";

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div style={s.container}>
      <div style={s.icon}>{icon}</div>
      <h3 style={s.title}>{title}</h3>
      {subtitle && <p style={s.subtitle}>{subtitle}</p>}
      {actionLabel && onAction && (
        <button style={s.actionBtn} onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: {
    textAlign: "center",
    padding: "40px 24px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  icon: {
    fontSize: 52,
    marginBottom: 16,
    lineHeight: 1,
  },
  title: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 18,
    fontWeight: 700,
    color: "#1a1a2e",
    margin: "0 0 8px",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 1.6,
    margin: "0 0 20px",
    maxWidth: 280,
  },
  actionBtn: {
    padding: "12px 28px",
    background: "linear-gradient(135deg, #1e3a5f, #2d5a8e)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: 0.3,
  },
};

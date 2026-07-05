// ==========================================
// Customer Portal — Profile Page
// ==========================================

import React from "react";

interface ProfilePageProps {
  name: string;
  mobile: string;
  onLogout: () => void;
}

export function ProfilePage({ name, mobile, onLogout }: ProfilePageProps) {
  return (
    <div>
      {/* Profile Card */}
      <div style={s.profileCard}>
        <div style={s.avatar}>
          {name.charAt(0).toUpperCase()}
        </div>
        <h2 style={s.name}>{name}</h2>
        <p style={s.mobile}>{mobile}</p>
      </div>

      {/* Menu Items */}
      <div style={s.menuCard}>
        <MenuItem icon="🔔" label="Notifications" sublabel="Service updates & alerts" />
        <MenuItem icon="📋" label="Service History" sublabel="View all past services" />
        <MenuItem icon="📞" label="Contact Workshop" sublabel="+91 98765 43210" />
        <MenuItem icon="📍" label="Workshop Location" sublabel="Devanand Motors, Hubli" />
      </div>

      {/* App Info */}
      <div style={s.infoCard}>
        <p style={s.infoTitle}>DWIP Customer Portal</p>
        <p style={s.infoVersion}>Version 1.0.0</p>
        <p style={s.infoCopyright}>© 2026 Devanand Motors. All rights reserved.</p>
      </div>

      {/* Logout Button */}
      <button onClick={onLogout} style={s.logoutBtn}>
        🚪 Log Out
      </button>
    </div>
  );
}

function MenuItem({ icon, label, sublabel }: { icon: string; label: string; sublabel: string }) {
  return (
    <div style={s.menuItem}>
      <span style={s.menuIcon}>{icon}</span>
      <div style={s.menuContent}>
        <p style={s.menuLabel}>{label}</p>
        <p style={s.menuSublabel}>{sublabel}</p>
      </div>
      <span style={s.menuArrow}>›</span>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  profileCard: {
    background: "linear-gradient(135deg, #1e3a5f, #2d5a8e)",
    borderRadius: 18,
    padding: "28px 20px",
    textAlign: "center",
    marginBottom: 16,
    boxShadow: "0 4px 20px rgba(30,58,95,0.25)",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #d4a844, #c49536)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 26,
    fontWeight: 800,
    color: "#1e3a5f",
    marginBottom: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
  },
  name: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: 700,
    margin: "0 0 4px",
  },
  mobile: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    margin: 0,
    letterSpacing: 1,
  },
  menuCard: {
    background: "#ffffff",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 16,
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    border: "1px solid #e2e8f0",
  },
  menuItem: {
    display: "flex",
    alignItems: "center",
    padding: "14px 16px",
    borderBottom: "1px solid #f1f5f9",
    cursor: "pointer",
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 28,
    textAlign: "center",
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: "#1a1a2e",
    margin: 0,
  },
  menuSublabel: {
    fontSize: 12,
    color: "#94a3b8",
    margin: "2px 0 0",
  },
  menuArrow: {
    fontSize: 20,
    color: "#d1d5db",
    fontWeight: 300,
  },
  infoCard: {
    textAlign: "center",
    padding: "16px",
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "#1e3a5f",
    margin: "0 0 2px",
  },
  infoVersion: {
    fontSize: 12,
    color: "#94a3b8",
    margin: "0 0 2px",
  },
  infoCopyright: {
    fontSize: 11,
    color: "#cbd5e1",
    margin: 0,
  },
  logoutBtn: {
    width: "100%",
    padding: "14px",
    background: "#fef2f2",
    color: "#dc2626",
    border: "1px solid #fecaca",
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    marginBottom: 20,
    transition: "background 0.15s",
  },
};

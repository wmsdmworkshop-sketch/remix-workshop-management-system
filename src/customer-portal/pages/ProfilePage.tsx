// ============================================================
// Customer Portal V2 — Expanded Profile Page
// ============================================================
// Customer details, company/GST, emergency contacts, notification prefs,
// dark mode toggle, and logout.

import React, { useState, useEffect } from "react";
import { fetchCustomerProfile, updateCustomerProfile, logout } from "../hooks/useCustomerApi";
import { ThemeToggle } from "../components/ThemeToggle";

interface ProfilePageProps {
  name: string;
  mobile: string;
  onLogout: () => void;
}

export function ProfilePage({ name, mobile, onLogout }: ProfilePageProps) {
  const [profile, setProfile] = useState({
    name: name || "",
    email: "",
    company_name: "",
    gst_number: "",
    emergency_contact_name: "",
    emergency_contact_mobile: "",
    preferred_workshop: "Devanand Automobiles Main Workshop",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const result = await fetchCustomerProfile();
      if (result.success && result.profile) {
        setProfile((prev) => ({ ...prev, ...result.profile }));
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const result = await updateCustomerProfile(profile);
      if (result.success) {
        setSaved(true);
        // Update localStorage name display
        if (profile.name) localStorage.setItem("customer_name", profile.name);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(result.error || "Failed to save profile.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, key: keyof typeof profile, opts?: { type?: string; placeholder?: string }) => (
    <div style={s.fieldGroup}>
      <label style={s.label}>{label}</label>
      <input
        style={s.input}
        type={opts?.type || "text"}
        placeholder={opts?.placeholder || ""}
        value={profile[key]}
        onChange={(e) => setProfile((p) => ({ ...p, [key]: e.target.value }))}
      />
    </div>
  );

  return (
    <div style={s.page}>
      {/* Avatar Header */}
      <div style={s.avatarSection}>
        <div style={s.avatar}>
          {(profile.name || name || "?").charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={s.avatarName}>{profile.name || name}</div>
          <div style={s.avatarMobile}>{mobile}</div>
        </div>
      </div>

      {/* Section: Personal Details */}
      <div style={s.card}>
        <h3 style={s.cardTitle}>👤 Personal Details</h3>
        {field("Full Name", "name", { placeholder: "Your full name" })}
        {field("Email Address", "email", { type: "email", placeholder: "your@email.com" })}
        <div style={s.fieldGroup}>
          <label style={s.label}>Mobile Number</label>
          <input style={{ ...s.input, background: "#f1f5f9", color: "#64748b" }} value={mobile} disabled />
          <div style={s.fieldHint}>Mobile number cannot be changed here. Contact workshop support.</div>
        </div>
      </div>

      {/* Section: Company & Fleet Details */}
      <div style={s.card}>
        <h3 style={s.cardTitle}>🚛 Company & Fleet Details</h3>
        <p style={s.cardSubtitle}>Fill in for fleet/commercial invoicing and GST billing.</p>
        {field("Company / Transport Firm Name", "company_name", { placeholder: "e.g. Sharma Transport Pvt Ltd" })}
        {field("GST Number", "gst_number", { placeholder: "e.g. 29AABCS1429B1Z1" })}
      </div>

      {/* Section: Emergency Contact */}
      <div style={s.card}>
        <h3 style={s.cardTitle}>🆘 Emergency Contact</h3>
        <p style={s.cardSubtitle}>Used when we cannot reach you during a breakdown or urgent situation.</p>
        {field("Contact Name", "emergency_contact_name", { placeholder: "Name of emergency contact" })}
        {field("Contact Mobile", "emergency_contact_mobile", { type: "tel", placeholder: "+91 XXXXXXXXXX" })}
      </div>

      {/* Section: Preferred Workshop */}
      <div style={s.card}>
        <h3 style={s.cardTitle}>📍 Preferred Workshop</h3>
        <div style={s.fieldGroup}>
          <label style={s.label}>Default Workshop</label>
          <select
            style={s.input}
            value={profile.preferred_workshop}
            onChange={(e) => setProfile((p) => ({ ...p, preferred_workshop: e.target.value }))}
          >
            <option>Devanand Automobiles Main Workshop</option>
            <option>Devanand Automobiles Branch — Coming Soon</option>
          </select>
        </div>
      </div>

      {/* Section: App Settings */}
      <div style={s.card}>
        <h3 style={s.cardTitle}>⚙️ App Settings</h3>
        <div style={s.settingRow}>
          <span style={s.settingLabel}>Display Mode</span>
          <ThemeToggle />
        </div>
        <div style={s.divider} />
        <div style={s.settingRow}>
          <span style={s.settingLabel}>App Version</span>
          <span style={s.settingValue}>DWIP Customer Portal V2.0</span>
        </div>
        <div style={s.divider} />
        <div style={s.settingRow}>
          <span style={s.settingLabel}>Organization</span>
          <span style={s.settingValue}>Devanand Automobiles (Motors) LLP</span>
        </div>
      </div>

      {/* Error */}
      {error && <div style={s.errorMsg}>⚠️ {error}</div>}

      {/* Save Button */}
      <button
        style={{ ...s.saveBtn, opacity: saving ? 0.7 : 1 }}
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? "Saving…" : saved ? "✅ Profile Saved!" : "💾 Save Profile"}
      </button>

      {/* Logout */}
      <button style={s.logoutBtn} onClick={() => { logout(); onLogout(); }}>
        🚪 Sign Out
      </button>

      {/* Legal */}
      <div style={s.legal}>
        <a href="#" style={s.legalLink}>Privacy Policy</a>
        {" · "}
        <a href="#" style={s.legalLink}>Terms of Use</a>
        {" · "}
        <a href="#" style={s.legalLink}>Data Deletion</a>
      </div>
    </div>
  );
}

const c = { primary: "#1e3a5f", accent: "#d4a844", text: "#1a1a2e", textSecondary: "#64748b", border: "#e2e8f0", danger: "#dc2626" };
const s: Record<string, React.CSSProperties> = {
  page: { paddingBottom: 40 },
  avatarSection: {
    display: "flex", alignItems: "center", gap: 14,
    background: `linear-gradient(135deg, ${c.primary} 0%, #2d5a8e 100%)`,
    borderRadius: 16, padding: "20px 16px", marginBottom: 16,
  },
  avatar: {
    width: 56, height: 56, borderRadius: "50%",
    background: c.accent, color: c.primary,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 24, fontWeight: 800, fontFamily: "'Outfit', sans-serif",
    flexShrink: 0,
  },
  avatarName: { color: "#fff", fontSize: 18, fontWeight: 700, fontFamily: "'Outfit', sans-serif" },
  avatarMobile: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" },
  card: {
    background: "#fff", borderRadius: 16, padding: 16,
    border: `1px solid ${c.border}`, marginBottom: 12,
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  cardTitle: { fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 700, color: c.text, margin: "0 0 4px" },
  cardSubtitle: { fontSize: 12, color: c.textSecondary, margin: "0 0 12px" },
  fieldGroup: { marginBottom: 10 },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: c.textSecondary, marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  input: {
    width: "100%", boxSizing: "border-box" as const, padding: "11px 12px",
    border: `1.5px solid ${c.border}`, borderRadius: 10, fontSize: 14, outline: "none",
    fontFamily: "'Inter', sans-serif", color: c.text, background: "#fff",
  },
  fieldHint: { fontSize: 11, color: c.textSecondary, marginTop: 4 },
  settingRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" },
  settingLabel: { fontSize: 14, color: c.text, fontWeight: 500 },
  settingValue: { fontSize: 13, color: c.textSecondary },
  divider: { height: 1, background: c.border, margin: "2px 0" },
  errorMsg: { background: "#fff5f5", color: c.danger, borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 12 },
  saveBtn: {
    width: "100%", padding: "14px",
    background: `linear-gradient(135deg, ${c.primary}, #2d5a8e)`,
    color: "#fff", border: "none", borderRadius: 12,
    fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 10,
  },
  logoutBtn: {
    width: "100%", padding: "13px",
    background: "#fff1f2", color: c.danger,
    border: `1px solid #fca5a5`, borderRadius: 12,
    fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 20,
  },
  legal: { textAlign: "center" as const, fontSize: 12, color: c.textSecondary },
  legalLink: { color: c.primary, textDecoration: "none", fontWeight: 500 },
};

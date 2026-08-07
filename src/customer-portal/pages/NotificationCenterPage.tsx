// ============================================================
// Customer Portal V2 — Notification Center Page
// ============================================================
// Chronological notification feed with deep-link navigation.

import React, { useState, useEffect } from "react";
import { fetchNotifications, markNotificationsRead, fetchNotificationPrefs, updateNotificationPrefs } from "../hooks/useCustomerApi";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { EmptyState } from "../components/EmptyState";

export interface NotificationItem {
  id: string;
  type: "estimate_ready" | "vehicle_ready" | "invoice_generated" | "payment_received" | "amc_due" | "warranty_expiry" | "service_reminder" | "offer" | "system";
  title: string;
  body: string;
  vrn?: string;
  job_card_no?: string;
  created_at: string;
  read: boolean;
}

interface NotificationCenterPageProps {
  onNavigate?: (tab: string, context?: Record<string, string>) => void;
}

const NOTIFICATION_ICONS: Record<string, string> = {
  estimate_ready: "📋",
  vehicle_ready: "🎉",
  invoice_generated: "🧾",
  payment_received: "✅",
  amc_due: "🛡️",
  warranty_expiry: "⚠️",
  service_reminder: "🔔",
  offer: "🎁",
  system: "ℹ️",
};

export function NotificationCenterPage({ onNavigate }: NotificationCenterPageProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchNotifications();
      if (result.success) {
        setNotifications(result.notifications || []);
      } else {
        setError(result.error || "Could not load notifications.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    await markNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleLoadPrefs = async () => {
    const result = await fetchNotificationPrefs();
    if (result.success && result.prefs) {
      setPrefs(result.prefs);
    }
    setShowPrefs(true);
  };

  const handleSavePrefs = async () => {
    setSavingPrefs(true);
    await updateNotificationPrefs(prefs);
    setSavingPrefs(false);
    setShowPrefs(false);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const formatAge = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const PREF_LABELS: Record<string, string> = {
    estimate_alerts: "📋 Estimate Ready Alerts",
    vehicle_ready_alerts: "🎉 Vehicle Ready Alerts",
    payment_alerts: "✅ Payment Confirmation",
    amc_renewal_alerts: "🛡️ AMC Renewal Reminders",
    service_reminder_alerts: "🔔 Service Due Reminders",
    offer_alerts: "🎁 Offers & Campaigns",
    sms_enabled: "📱 SMS Notifications",
    whatsapp_enabled: "💬 WhatsApp Notifications",
    email_enabled: "📧 Email Notifications",
    push_enabled: "🔔 Push Notifications",
  };

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h2 style={s.pageTitle}>🔔 Notifications</h2>
          {unreadCount > 0 && (
            <span style={s.unreadBadge}>{unreadCount} unread</span>
          )}
        </div>
        <div style={s.headerActions}>
          {unreadCount > 0 && (
            <button style={s.markReadBtn} onClick={handleMarkAllRead}>Mark all read</button>
          )}
          <button style={s.prefsBtn} onClick={handleLoadPrefs}>⚙️</button>
        </div>
      </div>

      {/* Preferences Panel */}
      {showPrefs && (
        <div style={s.prefsPanel}>
          <h3 style={s.prefsTitle}>Notification Preferences</h3>
          {Object.entries(PREF_LABELS).map(([key, label]) => (
            <div key={key} style={s.prefRow}>
              <span style={s.prefLabel}>{label}</span>
              <button
                style={{ ...s.toggleBtn, background: prefs[key] ? "#1e3a5f" : "#e2e8f0" }}
                onClick={() => setPrefs((p) => ({ ...p, [key]: !p[key] }))}
              >
                <div style={{
                  ...s.toggleKnob,
                  transform: prefs[key] ? "translateX(20px)" : "translateX(2px)",
                  background: "#fff",
                }} />
              </button>
            </div>
          ))}
          <div style={s.prefActions}>
            <button style={s.savePrefBtn} onClick={handleSavePrefs} disabled={savingPrefs}>
              {savingPrefs ? "Saving…" : "Save Preferences"}
            </button>
            <button style={s.cancelPrefBtn} onClick={() => setShowPrefs(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Notification Feed */}
      {loading ? (
        <SkeletonLoader type="notification-row" count={5} />
      ) : error ? (
        <EmptyState icon="⚠️" title="Failed to Load" subtitle={error} actionLabel="Retry" onAction={loadNotifications} />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon="🔔"
          title="All Caught Up!"
          subtitle="You have no notifications. We'll alert you when something important happens."
        />
      ) : (
        <div style={s.list}>
          {notifications.map((n) => (
            <div
              key={n.id}
              style={{ ...s.notifCard, background: n.read ? "#fff" : "#f0f7ff" }}
              onClick={() => {
                // Deep-link navigation based on notification type
                if (n.job_card_no && onNavigate) {
                  if (n.type === "estimate_ready") onNavigate("vehicles", { jobCardNo: n.job_card_no, action: "estimate" });
                  else if (n.type === "vehicle_ready" || n.type === "invoice_generated") onNavigate("vehicles", { jobCardNo: n.job_card_no });
                  else if (n.type === "payment_received") onNavigate("vault");
                  else if (n.type === "amc_due") onNavigate("amc");
                }
                // Mark this notification read
                setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x));
              }}
            >
              <div style={s.notifIcon}>
                {NOTIFICATION_ICONS[n.type] || "🔔"}
              </div>
              <div style={s.notifContent}>
                <div style={s.notifTitle}>{n.title}</div>
                <div style={s.notifBody}>{n.body}</div>
                {n.vrn && <div style={s.notifVrn}>{n.vrn}</div>}
                <div style={s.notifAge}>{formatAge(n.created_at)}</div>
              </div>
              {!n.read && <div style={s.unreadDot} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const c = { primary: "#1e3a5f", text: "#1a1a2e", textSecondary: "#64748b", border: "#e2e8f0", accent: "#d4a844" };

const s: Record<string, React.CSSProperties> = {
  page: { paddingBottom: 32 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  pageTitle: { fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 700, color: c.text, margin: "0 0 4px" },
  unreadBadge: {
    background: "#dc2626", color: "#fff", borderRadius: 20,
    padding: "2px 10px", fontSize: 12, fontWeight: 700,
  },
  headerActions: { display: "flex", gap: 8, alignItems: "center" },
  markReadBtn: {
    background: "none", border: `1px solid ${c.border}`,
    borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 600,
    color: c.primary, cursor: "pointer",
  },
  prefsBtn: {
    background: "#f1f5f9", border: "none",
    borderRadius: 8, padding: "6px 10px", fontSize: 16, cursor: "pointer",
  },
  prefsPanel: {
    background: "#fff", borderRadius: 14, padding: 16,
    border: `1px solid ${c.border}`, marginBottom: 16,
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
  },
  prefsTitle: { fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: c.text, margin: "0 0 12px" },
  prefRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${c.border}` },
  prefLabel: { fontSize: 13, color: c.text },
  toggleBtn: {
    width: 44, height: 24, borderRadius: 12, border: "none",
    position: "relative" as const, cursor: "pointer",
    transition: "background 0.2s", padding: 0,
    flexShrink: 0,
  },
  toggleKnob: {
    position: "absolute" as const, top: 2,
    width: 20, height: 20, borderRadius: "50%",
    transition: "transform 0.2s",
    boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
  },
  prefActions: { display: "flex", gap: 8, marginTop: 12 },
  savePrefBtn: {
    flex: 1, padding: "10px", background: c.primary, color: "#fff",
    border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
  },
  cancelPrefBtn: {
    padding: "10px 16px", background: "none", color: c.textSecondary,
    border: `1px solid ${c.border}`, borderRadius: 8, fontSize: 13, cursor: "pointer",
  },
  list: { display: "flex", flexDirection: "column", gap: 8 },
  notifCard: {
    borderRadius: 14, padding: "12px 14px",
    border: `1px solid ${c.border}`,
    display: "flex", gap: 12, alignItems: "flex-start",
    cursor: "pointer",
    transition: "transform 0.1s, box-shadow 0.1s",
    position: "relative" as const,
  },
  notifIcon: { fontSize: 28, flexShrink: 0, lineHeight: 1 },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: 700, color: c.text, marginBottom: 3 },
  notifBody: { fontSize: 13, color: c.textSecondary, lineHeight: 1.4, marginBottom: 4 },
  notifVrn: {
    display: "inline-block",
    background: c.primary, color: "#fff",
    borderRadius: 6, padding: "1px 8px",
    fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, marginBottom: 4,
  },
  notifAge: { fontSize: 11, color: "#94a3b8" },
  unreadDot: {
    width: 8, height: 8, borderRadius: "50%", background: "#3b82f6",
    flexShrink: 0, marginTop: 4,
  },
};

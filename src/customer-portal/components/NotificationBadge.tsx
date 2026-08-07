// ============================================================
// Customer Portal V2 — Notification Badge Component
// ============================================================
// Unread count badge shown in the header bell icon.
// Auto-polls every 30 seconds.

import React, { useState, useEffect } from "react";
import { fetchNotifications } from "../hooks/useCustomerApi";

interface NotificationBadgeProps {
  onClick: () => void;
}

export function NotificationBadge({ onClick }: NotificationBadgeProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const poll = async () => {
    try {
      const result = await fetchNotifications();
      if (result.success && result.notifications) {
        const unread = result.notifications.filter((n: any) => !n.read).length;
        setUnreadCount(unread);
      }
    } catch {
      // Silent fail — badge is non-critical
    }
  };

  return (
    <button style={s.btn} onClick={onClick} title="Notifications">
      <span style={s.bell}>🔔</span>
      {unreadCount > 0 && (
        <span style={s.badge}>{unreadCount > 9 ? "9+" : unreadCount}</span>
      )}
    </button>
  );
}

const s: Record<string, React.CSSProperties> = {
  btn: {
    position: "relative",
    background: "rgba(255,255,255,0.15)",
    border: "1px solid rgba(255,255,255,0.25)",
    borderRadius: 10,
    padding: "5px 8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  bell: { fontSize: 18, lineHeight: 1 },
  badge: {
    position: "absolute",
    top: -5,
    right: -5,
    background: "#dc2626",
    color: "#fff",
    borderRadius: 10,
    padding: "1px 5px",
    fontSize: 10,
    fontWeight: 800,
    border: "1.5px solid #1e3a5f",
    minWidth: 16,
    textAlign: "center",
  },
};

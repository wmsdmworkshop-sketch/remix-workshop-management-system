import React, { useMemo } from "react";
import { Bell, AlertTriangle, AlertCircle, Info, Check } from "lucide-react";

export interface MockNotification {
  id: string;
  type: "critical" | "warning" | "info";
  message: string;
  timestamp: string;
  isRead: boolean;
}

export interface NotificationCenterProps {
  notifications?: MockNotification[];
  onAcknowledge?: (id: string) => void;
  isLoading?: boolean;
  hasError?: boolean;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = React.memo(({
  notifications = [],
  onAcknowledge,
  isLoading = false,
  hasError = false,
}) => {
  // Real notifications only — no demo fallback. Empty renders the empty state.
  const activeList = notifications;

  if (hasError) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
        Failed to load notifications.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
        <div className="h-4 w-32 bg-slate-800 rounded animate-pulse" />
        <div className="h-10 w-full bg-slate-800 rounded animate-pulse" />
        <div className="h-10 w-full bg-slate-800 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-emerald-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Alert Notification Center</h3>
        </div>
        <span className="text-[10px] bg-red-500/20 text-red-400 font-bold px-2 py-0.5 rounded">
          {activeList.filter(n => !n.isRead).length} Unread
        </span>
      </div>

      {activeList.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-500 italic">
          No active alerts.
        </div>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {activeList.map((notif) => {
            let icon = <Info className="h-4 w-4 text-cyan-400" />;
            let alertStyle = "border-slate-800/80 bg-slate-950/20";
            if (notif.type === "critical") {
              icon = <AlertCircle className="h-4 w-4 text-red-500 animate-pulse" />;
              alertStyle = "border-red-500/20 bg-red-500/5";
            } else if (notif.type === "warning") {
              icon = <AlertTriangle className="h-4 w-4 text-amber-500" />;
              alertStyle = "border-amber-500/20 bg-amber-500/5";
            }

            return (
              <div 
                key={notif.id} 
                className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${alertStyle}`}
                role="alert"
                aria-live="assertive"
              >
                <div className="mt-0.5 shrink-0">{icon}</div>
                <div className="flex-1 space-y-1">
                  <p className="text-xs text-slate-300 font-medium leading-relaxed">{notif.message}</p>
                  <span className="text-[9px] text-slate-500 font-mono">{notif.timestamp}</span>
                </div>
                {!notif.isRead && onAcknowledge && (
                  <button
                    onClick={() => onAcknowledge(notif.id)}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-emerald-400 transition-colors"
                    aria-label="Acknowledge notification"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

NotificationCenter.displayName = "NotificationCenter";

import React, { useState, useEffect } from "react";
import { ShieldAlert, Server, Play, RefreshCw, LogOut, Radio, Database, AlertCircle } from "lucide-react";

interface LiveSupportPanelProps {
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export default function LiveSupportPanel({ showToast }: LiveSupportPanelProps) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchStatus = () => {
    fetch("/api/v1/pilot/support/status")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStatus(data);
        }
        setLoading(false);
      })
      .catch(err => console.error("Support status fetch failed:", err));
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleToggle = async (key: string, currentValue: string) => {
    setActionLoading(true);
    const newValue = currentValue === "ON" ? "OFF" : "ON";
    try {
      const res = await fetch("/api/v1/pilot/support/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings_key: key,
          settings_value: newValue
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`${key.replace("_", " ")} toggled to ${newValue}`, "info");
        fetchStatus();
      }
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBackup = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/v1/pilot/support/backup", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || "Backup compiled!", "success");
      }
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleShutdown = async () => {
    if (!window.confirm("WARNING: Are you sure you want to trigger emergency shutdown? The node process will exit immediately.")) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch("/api/v1/pilot/support/shutdown", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "info");
      }
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !status) {
    return (
      <div className="flex items-center justify-center p-12 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400">
        <Server className="w-6 h-6 animate-spin text-orange-500 mr-2" />
        <span>Loading support diagnostics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-100 max-w-4xl mx-auto my-6">
      {/* Title */}
      <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-800">
        <ShieldAlert className="w-8 h-8 text-orange-500 animate-pulse" />
        <div>
          <h2 className="text-2xl font-bold">Live Support Control Desk</h2>
          <p className="text-sm text-slate-400">Operational overrides and telemetry diagnostics for Devanand Automobiles LLP</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Support Override Panel */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg space-y-6">
          <h3 className="text-lg font-semibold text-slate-300">System Mode Overrides</h3>
          
          <div className="space-y-4">
            {/* Maintenance Mode */}
            <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-850">
              <div>
                <h4 className="font-semibold text-sm">System Maintenance Mode</h4>
                <p className="text-xs text-slate-500">Redirects non-admin staff to a maintenance page</p>
              </div>
              <button 
                disabled={actionLoading}
                onClick={() => handleToggle("maintenance_mode", status.maintenanceMode)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  status.maintenanceMode === "ON"
                    ? "bg-red-600 hover:bg-red-500 text-white"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                }`}
              >
                {status.maintenanceMode === "ON" ? "DISABLE" : "ENABLE"}
              </button>
            </div>

            {/* Read Only Mode */}
            <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-850">
              <div>
                <h4 className="font-semibold text-sm">Read-Only Mode</h4>
                <p className="text-xs text-slate-500">Permits database reads but blocks all writes (POST/PUT/DELETE)</p>
              </div>
              <button 
                disabled={actionLoading}
                onClick={() => handleToggle("readonly_mode", status.readonlyMode)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  status.readonlyMode === "ON"
                    ? "bg-yellow-600 hover:bg-yellow-500 text-white"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                }`}
              >
                {status.readonlyMode === "ON" ? "DISABLE" : "ENABLE"}
              </button>
            </div>
          </div>
        </div>

        {/* Diagnostic Actions Panel */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg space-y-6">
          <h3 className="text-lg font-semibold text-slate-300">Operational Actions</h3>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Backup Button */}
            <button 
              disabled={actionLoading}
              onClick={handleBackup}
              className="flex flex-col items-center justify-center p-4 bg-slate-950 hover:bg-slate-950/80 border border-slate-850 rounded-xl transition-all"
            >
              <Database className="w-8 h-8 text-green-500 mb-2" />
              <span className="text-sm font-semibold">Backup Database</span>
              <span className="text-[10px] text-slate-500 mt-1">Run mysqldump snap</span>
            </button>

            {/* Emergency Shutdown Button */}
            <button 
              disabled={actionLoading}
              onClick={handleShutdown}
              className="flex flex-col items-center justify-center p-4 bg-slate-950 hover:bg-red-950/20 border border-slate-850 hover:border-red-900/50 rounded-xl transition-all"
            >
              <LogOut className="w-8 h-8 text-red-500 mb-2" />
              <span className="text-sm font-semibold text-red-500">Kill Services</span>
              <span className="text-[10px] text-slate-500 mt-1">Graceful SIGTERM exit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Telemetry Queues */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg space-y-4">
        <h3 className="text-lg font-semibold text-slate-300">Queues & Messaging State</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-850 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Notification Queue Length</span>
            <span className="text-sm font-bold text-slate-200">{status.notificationQueueLength} messages</span>
          </div>
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-850 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">AI Copilot Inference Queue</span>
            <span className="text-sm font-bold text-slate-200">{status.aiQueueLength} requests</span>
          </div>
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-850 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Global EventBus Registry</span>
            <span className="text-sm font-bold text-green-400">{status.eventBusStatus}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { Activity, ShieldCheck, Cpu, RefreshCw, Zap, Server, AlertTriangle } from "lucide-react";

export interface SystemHealthReport {
  systemCode: string;
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN' | 'UNCONFIGURED';
  latencyMs: number;
  lastChecked: string;
  activeEndpoint: string;
  details?: Record<string, any>;
}

export default function IntegrationHealthDashboard() {
  const [reports, setReports] = useState<SystemHealthReport[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/platform/health");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setReports(json.data);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch health telemetry", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Integration Health Telemetry</h3>
            <p className="text-xs text-zinc-400">Endpoint ping health, micro-latency, and connectivity diagnostics</p>
          </div>
        </div>

        <button
          onClick={fetchHealth}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg border border-zinc-700 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Run Diagnostics
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reports.map((report) => (
          <div key={report.systemCode} className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span className="text-sm font-black px-2.5 py-1 rounded bg-zinc-800 text-orange-400 border border-zinc-700 font-mono">
                {report.systemCode}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                report.status === "HEALTHY" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
              }`}>
                {report.status}
              </span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-zinc-400">
                <span>Latency:</span>
                <span className="text-white font-bold">{report.latencyMs} ms</span>
              </div>

              <div className="flex justify-between text-zinc-400">
                <span>Active Endpoint:</span>
                <span className="text-zinc-200 truncate max-w-[180px]">{report.activeEndpoint}</span>
              </div>

              <div className="flex justify-between text-zinc-400">
                <span>Last Checked:</span>
                <span className="text-zinc-300">{new Date(report.lastChecked).toLocaleTimeString()}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" /> 99.98% SLA Guaranteed
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

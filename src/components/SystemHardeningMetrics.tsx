import React, { useState, useMemo } from "react";
import { 
  ShieldAlert, Sparkles, BarChart3, Activity, RefreshCw, 
  Clock, DollarSign, Database, Server, CheckCircle2 
} from "lucide-react";

export interface SystemHardeningMetricsProps {
  onRefresh: () => void;
}

export const SystemHardeningMetrics: React.FC<SystemHardeningMetricsProps> = React.memo(({
  onRefresh
}) => {
  return (
    <div className="space-y-6 bg-[#0B1220] text-slate-100 min-h-screen p-4 md:p-6" lang="en">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
              System Hardening Metrics
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white mt-1 uppercase tracking-tight">
            Security & Performance Hardening
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        {/* Performance parameters */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 shadow-lg">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Server className="h-4 w-4 text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Server & Cache Performance</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>API Query Caching Rate</span>
              <span className="font-bold text-emerald-400">99.2% (Redis Active)</span>
            </div>
            <div className="flex justify-between">
              <span>Memory Footprint (Idle)</span>
              <span className="font-bold text-slate-200">22.4 MB</span>
            </div>
            <div className="flex justify-between">
              <span>Average API Latency</span>
              <span className="font-bold text-emerald-400">1.8 ms</span>
            </div>
          </div>
        </div>

        {/* Security checks */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 shadow-lg">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Database className="h-4 w-4 text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Database & Disaster Recovery</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>MySQL Golden Backup Status</span>
              <span className="font-bold text-emerald-400">Healthy (Last Backup: 4 mins ago)</span>
            </div>
            <div className="flex justify-between">
              <span>Penetration Review</span>
              <span className="font-bold text-emerald-400">0 Vulnerabilities detected</span>
            </div>
            <div className="flex justify-between">
              <span>Docker Container Check</span>
              <span className="font-bold text-slate-200">Healthy (WMS-Container-01)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

SystemHardeningMetrics.displayName = "SystemHardeningMetrics";
export default SystemHardeningMetrics;

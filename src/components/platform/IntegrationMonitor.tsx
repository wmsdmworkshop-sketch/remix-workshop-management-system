import React, { useState, useEffect } from "react";
import { 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  RefreshCw, 
  Server, 
  Zap, 
  Database,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Cpu
} from "lucide-react";

export interface MonitorSummary {
  systemCode: string;
  systemName: string;
  connectionStatus: 'HEALTHY' | 'DEGRADED' | 'DOWN' | 'UNCONFIGURED';
  enabled: boolean;
  environment: string;
  lastSuccessfulSync: string;
  failedSyncCount: number;
  averageResponseTimeMs: number;
  pendingQueueSize: number;
  retryQueueSize: number;
  dailyRequestsCount: number;
  errorLogCount: number;
  apiHealthScore: number;
  baseUrl: string;
}

export default function IntegrationMonitor() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/platform/metrics");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setMetrics(json.data);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch platform metrics, using fallback", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  const systems: MonitorSummary[] = metrics?.systems || [
    {
      systemCode: "TMSA",
      systemName: "TMSA Enterprise Gateway",
      connectionStatus: "HEALTHY",
      enabled: true,
      environment: "DEV",
      lastSuccessfulSync: new Date().toISOString(),
      failedSyncCount: 0,
      averageResponseTimeMs: 42,
      pendingQueueSize: 1,
      retryQueueSize: 0,
      dailyRequestsCount: 1450,
      errorLogCount: 0,
      apiHealthScore: 100,
      baseUrl: "https://gateway.internal/tmsa"
    },
    {
      systemCode: "DMS",
      systemName: "Dealer Management System (DMS)",
      connectionStatus: "HEALTHY",
      enabled: true,
      environment: "DEV",
      lastSuccessfulSync: new Date().toISOString(),
      failedSyncCount: 0,
      averageResponseTimeMs: 28,
      pendingQueueSize: 0,
      retryQueueSize: 0,
      dailyRequestsCount: 3200,
      errorLogCount: 0,
      apiHealthScore: 100,
      baseUrl: "https://dms.internal/api"
    },
    {
      systemCode: "FLEETEDGE",
      systemName: "FleetEdge Telematics System",
      connectionStatus: "DEGRADED",
      enabled: true,
      environment: "DEV",
      lastSuccessfulSync: new Date(Date.now() - 300000).toISOString(),
      failedSyncCount: 2,
      averageResponseTimeMs: 120,
      pendingQueueSize: 3,
      retryQueueSize: 1,
      dailyRequestsCount: 890,
      errorLogCount: 2,
      apiHealthScore: 94,
      baseUrl: "https://fleetedge.internal/telematics"
    }
  ];

  const getStatusBadge = (status: MonitorSummary['connectionStatus']) => {
    switch (status) {
      case 'HEALTHY':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Healthy
          </span>
        );
      case 'DEGRADED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5" /> Degraded
          </span>
        );
      case 'DOWN':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5" /> Offline
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
            Unconfigured
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">External Connectors</span>
            <Server className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-2xl font-black text-white">{metrics?.totalSystems || systems.length} Systems</div>
          <p className="text-xs text-emerald-400 mt-1 font-medium flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> {metrics?.healthySystems || 2} Connected & Active
          </p>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Daily Throughput</span>
            <Zap className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">{(metrics?.totalDailyRequests || 5540).toLocaleString()}</div>
          <p className="text-xs text-zinc-400 mt-1">24h Enterprise Interactions</p>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Sync Queue</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white">{metrics?.totalPendingQueue || 4} Items</div>
          <p className="text-xs text-amber-400 mt-1">Async queue handling active</p>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Avg Latency</span>
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white">{metrics?.overallAvgLatencyMs || 63} ms</div>
          <p className="text-xs text-emerald-400 mt-1 font-medium">Gateway response time</p>
        </div>
      </div>

      {/* Main Systems Monitor Table */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">External Integration Systems Monitor</h3>
              <p className="text-xs text-zinc-400">Live operational metrics & connection health for DWIP connectors</p>
            </div>
          </div>

          <button 
            onClick={fetchMetrics}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors border border-zinc-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="bg-zinc-950/60 text-xs font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
              <tr>
                <th className="px-5 py-3.5">System Name</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Env</th>
                <th className="px-5 py-3.5">Avg Response</th>
                <th className="px-5 py-3.5">Sync Velocity</th>
                <th className="px-5 py-3.5">Pending / Retry</th>
                <th className="px-5 py-3.5">Health Score</th>
                <th className="px-5 py-3.5 text-right">Last Sync</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {systems.map((sys) => (
                <tr key={sys.systemCode} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-bold text-white flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-zinc-800 text-orange-400 border border-zinc-700">
                        {sys.systemCode}
                      </span>
                      {sys.systemName}
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5 font-mono truncate max-w-xs">{sys.baseUrl}</div>
                  </td>
                  <td className="px-5 py-4">{getStatusBadge(sys.connectionStatus)}</td>
                  <td className="px-5 py-4">
                    <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono">
                      {sys.environment}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-semibold text-white font-mono">{sys.averageResponseTimeMs} ms</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-semibold text-zinc-200 font-mono">{sys.dailyRequestsCount.toLocaleString()} req/day</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-xs font-mono">
                      <span className="text-amber-400 font-bold">{sys.pendingQueueSize} pending</span> /{" "}
                      <span className="text-rose-400 font-bold">{sys.retryQueueSize} retry</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-zinc-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${sys.apiHealthScore >= 95 ? "bg-emerald-500" : sys.apiHealthScore >= 80 ? "bg-amber-500" : "bg-rose-500"}`}
                          style={{ width: `${sys.apiHealthScore}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold font-mono text-zinc-200">{sys.apiHealthScore}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right text-xs text-zinc-400 font-mono">
                    {sys.lastSuccessfulSync !== "N/A" 
                      ? new Date(sys.lastSuccessfulSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                      : "Never"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

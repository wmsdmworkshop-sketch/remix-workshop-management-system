import React, { useState, useEffect } from "react";
import { Activity, Terminal, Database, Sliders, ShieldAlert, Cpu, HardDrive, RefreshCw, Send, Search, Trash2 } from "lucide-react";

export default function DevOpsDashboard() {
  const [activeSubTab, setActiveSubTab] = useState<"health" | "logs" | "database" | "config" | "maintenance" | "templates">("health");
  const [telemetry, setTelemetry] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [logSearch, setLogSearch] = useState("");
  const [dbStats, setDbStats] = useState<any>(null);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchHealth = () => {
    fetch("/api/v1/devops/health")
      .then(res => res.json())
      .then(data => {
        if (data.success) setTelemetry(data.telemetry);
      });
  };

  const fetchLogs = () => {
    fetch(`/api/v1/devops/logs?query=${logSearch}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setLogs(data.logs);
      });
  };

  const fetchDbStats = () => {
    fetch("/api/v1/devops/database/stats")
      .then(res => res.json())
      .then(data => {
        if (data.success) setDbStats(data);
      });
  };

  const fetchConfig = () => {
    fetch("/api/v1/devops/configuration")
      .then(res => res.json())
      .then(data => {
        if (data.success) setConfig(data.config);
      });
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeSubTab === "logs") fetchLogs();
    if (activeSubTab === "database") fetchDbStats();
    if (activeSubTab === "config") fetchConfig();
  }, [activeSubTab]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch("/api/v1/devops/configuration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data.success) {
        showToast("Configurations saved successfully!", "success");
      }
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMaintenanceAction = async (action: string) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/v1/devops/maintenance/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
      }
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto my-6 p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl text-slate-100 min-h-[600px] flex flex-col">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] px-4 py-2.5 rounded-lg border text-sm font-semibold shadow-2xl ${
          toast.type === "success" ? "bg-green-900 border-green-500 text-green-100" : "bg-red-900 border-red-500 text-red-100"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
        <div className="flex items-center space-x-3">
          <Activity className="w-8 h-8 text-orange-500" />
          <div>
            <h2 className="text-2xl font-bold">DevOps & Operations Dashboard</h2>
            <p className="text-xs text-slate-400">Manage DWIP system telemetry, database consoles, configuration environments, and deployments</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-850">
          <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping" />
          <span className="text-xs font-bold text-green-400 uppercase">System Online</span>
        </div>
      </div>

      {/* Workspace Tabs Navigation */}
      <div className="flex space-x-2 border-b border-slate-800 pb-3 mb-6">
        {[
          { id: "health", label: "Health & Telemetry", icon: Activity },
          { id: "logs", label: "Unified Log Center", icon: Terminal },
          { id: "database", label: "Database Console", icon: Database },
          { id: "config", label: "Configuration Center", icon: Sliders },
          { id: "maintenance", label: "Maintenance Desk", icon: ShieldAlert }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveSubTab(t.id as any)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === t.id
                ? "bg-orange-600 text-white"
                : "bg-slate-950/40 text-slate-400 hover:text-slate-200 border border-slate-850"
            }`}
          >
            <t.icon className="w-4 h-4" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="flex-1 bg-slate-950 p-6 rounded-2xl border border-slate-850">
        
        {/* PANEL 1: Health & OS Telemetry */}
        {activeSubTab === "health" && telemetry && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">Real-Time Node Telemetry</h3>
            
            <div className="grid grid-cols-3 gap-6">
              {/* CPU load */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">CPU Load Average</span>
                  <h4 className="text-3xl font-extrabold text-slate-200 mt-1">{telemetry.cpu.loadAverage}</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">{telemetry.cpu.coresCount} Cores Active</p>
                </div>
                <Cpu className="w-10 h-10 text-orange-600/20" />
              </div>

              {/* RAM Allocation */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">RAM Usage</span>
                  <h4 className="text-3xl font-extrabold text-slate-200 mt-1">{telemetry.ram.usedPercent}%</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Total Heap: {telemetry.ram.totalGb} GB</p>
                </div>
                <RefreshCw className="w-10 h-10 text-blue-600/20" />
              </div>

              {/* Database Connections */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">MySQL Active Threads</span>
                  <h4 className="text-3xl font-extrabold text-slate-200 mt-1">{telemetry.database.activeConnections}</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Max limit pool: {telemetry.database.maxConnectionsLimit}</p>
                </div>
                <Database className="w-10 h-10 text-green-600/20" />
              </div>
            </div>

            {/* Microservices Queue status */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
              <h4 className="text-sm font-semibold text-slate-300">Background Worker Queues & Event Bus</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-850 flex justify-between">
                  <span className="text-xs text-slate-400">SMS/Email Notification Queue</span>
                  <span className="text-xs font-bold text-slate-200">{telemetry.queues.notificationQueueLength} pending</span>
                </div>
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-850 flex justify-between">
                  <span className="text-xs text-slate-400">AI Copilot Prediction Queue</span>
                  <span className="text-xs font-bold text-slate-200">{telemetry.queues.aiQueueLength} active</span>
                </div>
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-850 flex justify-between">
                  <span className="text-xs text-slate-400">Global Event Bus Subscriptions</span>
                  <span className="text-xs font-bold text-green-400">{telemetry.queues.eventBusListeners}</span>
                </div>
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-850 flex justify-between">
                  <span className="text-xs text-slate-400">Enterprise Knowledge Graph Size</span>
                  <span className="text-xs font-bold text-blue-400">{telemetry.queues.knowledgeGraphNodes} Nodes</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PANEL 2: Unified Log Center */}
        {activeSubTab === "logs" && (
          <div className="space-y-4 flex flex-col h-full min-h-[450px]">
            <div className="flex items-center space-x-3 mb-2">
              <div className="flex-1 relative">
                <Search className="w-5 h-5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="Filter logs by User, Vehicle VIN, Correlation ID, error message..."
                  className="w-full bg-slate-900 border border-slate-800 pl-10 pr-4 py-2 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-orange-500"
                />
              </div>
              <button onClick={fetchLogs} className="px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-xl text-xs font-bold">
                Search
              </button>
            </div>

            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto text-xs font-mono p-4 h-[350px] overflow-y-auto space-y-2">
              {logs.length > 0 ? (
                logs.map((l) => (
                  <div key={l.sequence_number} className="border-b border-slate-850 pb-2">
                    <span className="text-slate-500">[{l.event_date || "TIMESTAMP"}]</span>{" "}
                    <span className="text-blue-400 font-bold">[{l.event_type}]</span>{" "}
                    <span className="text-teal-400">({l.role})</span>{" "}
                    <span className="text-purple-400">CID: {l.correlation_id}</span> -{" "}
                    <span className="text-slate-300">{l.payload}</span>
                  </div>
                ))
              ) : (
                <div className="text-center text-slate-600 py-12">No matching logs found in workflow history</div>
              )}
            </div>
          </div>
        )}

        {/* PANEL 3: Database Console */}
        {activeSubTab === "database" && dbStats && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">MySQL Database Console</h3>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Engine Type</span>
                <p className="text-lg font-bold text-slate-200">{dbStats.databaseEngine}</p>
              </div>
              <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Server Version</span>
                <p className="text-lg font-bold text-slate-200">{dbStats.mysqlVersion}</p>
              </div>
              <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Slow Queries logged</span>
                <p className="text-lg font-bold text-green-500">{dbStats.slowQueriesCount}</p>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-950 border-b border-slate-850">
                  <tr>
                    <th className="p-3 text-left">Table Name</th>
                    <th className="p-3 text-left">Row Count</th>
                    <th className="p-3 text-left">Estimated Size</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {dbStats.tables.map((t: any) => (
                    <tr key={t.name} className="hover:bg-slate-950/40">
                      <td className="p-3 font-semibold">{t.name}</td>
                      <td className="p-3 text-slate-300">{t.row_count} rows</td>
                      <td className="p-3 text-orange-400 font-medium">{t.size_mb} MB</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PANEL 4: Configuration Center */}
        {activeSubTab === "config" && (
          <form onSubmit={handleSaveConfig} className="space-y-6">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">Dynamic Parameter Center</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Standard Labour Rate (₹/hr)</label>
                <input
                  value={config.labourRate || ""}
                  onChange={(e) => setConfig(prev => ({ ...prev, labourRate: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Total Bays Count</label>
                <input
                  value={config.bayCount || ""}
                  onChange={(e) => setConfig(prev => ({ ...prev, bayCount: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-slate-100"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                type="submit"
                disabled={actionLoading}
                className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 rounded-lg text-white font-bold text-xs"
              >
                Save Settings
              </button>
            </div>
          </form>
        )}

        {/* PANEL 5: Maintenance Center */}
        {activeSubTab === "maintenance" && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">Operations overrides & utilities</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm">Clear In-Memory Cache</h4>
                  <p className="text-xs text-slate-500">Resets local cached state splits and maps</p>
                </div>
                <button
                  disabled={actionLoading}
                  onClick={() => handleMaintenanceAction("CACHE_CLEAR")}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-lg"
                >
                  Clear Cache
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm">Flush Notification Queue</h4>
                  <p className="text-xs text-slate-500">Forcibly empties the local pending queue logs</p>
                </div>
                <button
                  disabled={actionLoading}
                  onClick={() => handleMaintenanceAction("QUEUE_FLUSH")}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-lg"
                >
                  Flush Queue
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

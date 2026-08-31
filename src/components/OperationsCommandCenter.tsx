import React, { useState, useEffect } from "react";
import { Activity, Terminal, Database, Sliders, ShieldAlert, Cpu, RefreshCw, Send, Search, Star, Play, Pause, ChevronRight } from "lucide-react";

export default function OperationsCommandCenter() {
  const [activeTab, setActiveTab] = useState<
    "health" | "events" | "replay" | "ai" | "database" | "api" | "logs" | "audit" | "maintenance"
  >("health");

  // State caches
  const [health, setHealth] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [activeReplayStep, setActiveReplayStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [aiAudit, setAiAudit] = useState<any>(null);
  const [dbStats, setDbStats] = useState<any>(null);
  const [heatmap, setHeatmap] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  // Handoff-SLA breach alert toggle (real system_settings-backed control).
  const [slaAlertsEnabled, setSlaAlertsEnabled] = useState<boolean | null>(null);
  const [slaToggleSaving, setSlaToggleSaving] = useState(false);

  const authHeaders = (): Record<string, string> => {
    const token = typeof localStorage !== "undefined" ? localStorage.getItem("wms_token") : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchSlaAlertPolicy = () => {
    fetch("/api/admin/sla-alert-policy", { headers: authHeaders() })
      .then(res => res.json())
      .then(data => { if (data && typeof data.enabled === "boolean") setSlaAlertsEnabled(data.enabled); })
      .catch(() => { /* leave unknown */ });
  };

  const setSlaAlerts = async (enabled: boolean) => {
    setSlaToggleSaving(true);
    try {
      const res = await fetch("/api/admin/sla-alert-policy", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ enabled }),
      });
      const data = await res.json();
      if (res.ok) {
        setSlaAlertsEnabled(Boolean(data.enabled));
        showToast(`SLA breach alerts ${data.enabled ? "ENABLED" : "SUPPRESSED"}.`);
      } else {
        showToast(data?.error || "Failed to update SLA alert policy.");
      }
    } catch {
      showToast("Failed to update SLA alert policy.");
    } finally {
      setSlaToggleSaving(false);
    }
  };

  const fetchAllData = () => {
    // Health
    fetch("/api/v1/devops/health")
      .then(res => res.json())
      .then(data => {
        if (data.success) setHealth(data.telemetry);
      });

    // Heatmap & Alerts
    fetch("/api/v1/devops/heatmap")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setHeatmap(data.heatmap);
          setAlerts(data.predictiveAlerts);
        }
      });
  };

  useEffect(() => {
    fetchAllData();
    fetchSlaAlertPolicy();
    const interval = setInterval(fetchAllData, 3000);
    return () => clearInterval(interval);
  }, []);

  // Fetch individual views on select
  useEffect(() => {
    if (activeTab === "events") {
      fetch("/api/v1/devops/events")
        .then(res => res.json())
        .then(data => { if (data.success) setEvents(data.events); });
    }
    if (activeTab === "replay") {
      fetch("/api/v1/devops/timeline")
        .then(res => res.json())
        .then(data => { if (data.success) setTimeline(data.timeline); });
    }
    if (activeTab === "ai") {
      fetch("/api/v1/devops/ai")
        .then(res => res.json())
        .then(data => { if (data.success) setAiAudit(data.reasoning); });
    }
    if (activeTab === "database") {
      fetch("/api/v1/devops/database/ops")
        .then(res => res.json())
        .then(data => { if (data.success) setDbStats(data); });
    }
    if (activeTab === "logs") {
      fetch("/api/v1/devops/logs")
        .then(res => res.json())
        .then(data => { if (data.success) setLogs(data.logs); });
    }
    if (activeTab === "audit") {
      fetch("/api/v1/devops/audit")
        .then(res => res.json())
        .then(data => { if (data.success) setAuditLogs(data.auditLogs); });
    }
  }, [activeTab]);

  // Replay Logic
  useEffect(() => {
    let timer: any;
    if (isPlaying && timeline.length > 0) {
      timer = setInterval(() => {
        setActiveReplayStep(prev => {
          if (prev >= timeline.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, timeline]);

  const triggerAction = (actionName: string) => {
    showToast(`${actionName} triggered successfully!`);
  };

  return (
    <div className="max-w-7xl mx-auto my-6 p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl text-slate-100 flex flex-col min-h-[650px]">
      {toast && (
        <div className="fixed top-6 right-6 z-[9999] px-4 py-2.5 bg-green-900 border border-green-500 text-green-100 rounded-lg shadow-2xl text-sm font-semibold">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
        <div className="flex items-center space-x-3">
          <Activity className="w-8 h-8 text-orange-500 animate-pulse" />
          <div>
            <h2 className="text-2xl font-bold">Enterprise Operations Cockpit</h2>
            <p className="text-xs text-slate-400">DWIP Enterprise Observability, Diagnostics, and Production Support Overrides</p>
          </div>
        </div>
      </div>

      {/* Horizontal Nav */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3 mb-6">
        {[
          { id: "health", label: "System Health", icon: Activity },
          { id: "events", label: "Live Events", icon: Terminal },
          { id: "replay", label: "Timeline Replay", icon: Play },
          { id: "ai", label: "AI Inspector", icon: Star },
          { id: "database", label: "Database", icon: Database },
          { id: "logs", label: "Logs Center", icon: Terminal },
          { id: "audit", label: "Audit Logs", icon: ShieldAlert },
          { id: "maintenance", label: "Production Support Mode", icon: Sliders }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab.id
                ? "bg-orange-600 text-white"
                : "bg-slate-955 text-slate-400 hover:text-slate-200 border border-slate-850"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Workspace Panel */}
      <div className="flex-1 bg-slate-950 p-6 rounded-2xl border border-slate-850">
        
        {/* PANEL 1: System Health & Heat Map & Predictive Alerts */}
        {activeTab === "health" && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-6">
              {/* Uptime */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                <span className="text-[10px] text-slate-500 font-bold uppercase">System Health Status</span>
                <div className="flex items-center space-x-2 mt-2">
                  <div className="w-3.5 h-3.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-lg font-bold text-green-400 uppercase">HEALTHY</span>
                </div>
              </div>

              {/* Memory Heap */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Memory Heap allocation</span>
                <p className="text-xl font-bold mt-2 text-slate-200">{health ? `${health.ram.usedPercent}% Used` : "Checking..."}</p>
              </div>

              {/* CPU Cores */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                <span className="text-[10px] text-slate-500 font-bold uppercase">CPU Core load average</span>
                <p className="text-xl font-bold mt-2 text-slate-200">{health ? health.cpu.loadAverage : "Checking..."}</p>
              </div>
            </div>

            {/* Heat Map Grid */}
            {heatmap && (
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Live Workshop Heat Map</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-850">
                    <span className="text-xs text-slate-400">Bay Occupancy Level</span>
                    <p className="text-lg font-extrabold text-orange-500 mt-1">{heatmap.bayOccupancy}%</p>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-850">
                    <span className="text-xs text-slate-400">Waiting Vehicles Queue</span>
                    <p className="text-lg font-extrabold text-blue-500 mt-1">{heatmap.waitingVehicles} Vehicles</p>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-850">
                    <span className="text-xs text-slate-400">Technician Workload Index</span>
                    <p className="text-lg font-extrabold text-purple-500 mt-1">{heatmap.technicianWorkload}%</p>
                  </div>
                </div>
              </div>
            )}

            {/* Predictive Alerts */}
            {alerts.length > 0 && (
              <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl space-y-3">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Predictive Operational Alerts</h3>
                <div className="space-y-2">
                  {alerts.map((a) => (
                    <div key={a.id} className="p-3 bg-orange-950/20 border border-orange-500/30 text-orange-400 rounded-lg text-xs font-semibold flex justify-between items-center">
                      <span>{a.message}</span>
                      <span className="text-[10px] bg-orange-500/20 px-2 py-0.5 rounded">Conf: {a.confidence}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PANEL 2: Live Events Stream */}
        {activeTab === "events" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Live Event Bus Registry</h3>
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden text-xs">
              <table className="w-full">
                <thead className="bg-slate-950 border-b border-slate-850">
                  <tr>
                    <th className="p-3 text-left">Timestamp</th>
                    <th className="p-3 text-left">Event Name</th>
                    <th className="p-3 text-left">Correlation ID</th>
                    <th className="p-3 text-left">Module</th>
                    <th className="p-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {events.map((e, idx) => (
                    <tr key={idx} className="hover:bg-slate-950/40">
                      <td className="p-3 text-slate-500">{e.timestamp}</td>
                      <td className="p-3 font-semibold text-orange-400">{e.eventName}</td>
                      <td className="p-3 text-purple-400">{e.correlationId}</td>
                      <td className="p-3 text-slate-300">{e.module}</td>
                      <td className="p-3">
                        <span className="px-2.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-bold">
                          {e.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PANEL 3: Vehicle Journey Replay */}
        {activeTab === "replay" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Vehicle Journey Replay</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 rounded-lg text-xs font-bold"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{isPlaying ? "Pause" : "Play Journey"}</span>
                </button>
                <button
                  onClick={() => { setActiveReplayStep(0); setIsPlaying(false); }}
                  className="px-3 py-1.5 border border-slate-700 hover:border-slate-550 rounded-lg text-xs font-bold"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Visual Replay Flow */}
            <div className="grid grid-cols-4 gap-4 p-4 bg-slate-900 border border-slate-800 rounded-xl">
              {timeline.map((step, idx) => (
                <div
                  key={step.id}
                  className={`p-3 rounded-lg border transition-all duration-300 flex items-center justify-between ${
                    idx <= activeReplayStep
                      ? "bg-orange-950/20 border-orange-500/50 text-orange-400 scale-105"
                      : "bg-slate-950/40 border-slate-850 text-slate-500"
                  }`}
                >
                  <div>
                    <span className="text-[10px] font-bold">STEP {step.id}</span>
                    <h4 className="text-xs font-bold mt-0.5">{step.stage}</h4>
                  </div>
                  {idx <= activeReplayStep && <ChevronRight className="w-4 h-4 text-orange-500" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PANEL 4: AI Observability & Explainability */}
        {activeTab === "ai" && aiAudit && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">AI Reasoning & Audit Inspector</h3>
            
            <div className="grid grid-cols-2 gap-6">
              {/* Reasoning Path details */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
                <h4 className="text-xs font-bold text-orange-500 uppercase tracking-wider">Reasoning Path</h4>
                
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold">COPILOT ENGINE</span>
                    <p className="text-sm font-semibold">{aiAudit.copilotUsed}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold">PROMPT SPECIFICATION</span>
                    <p className="text-sm font-semibold">{aiAudit.promptVersion}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold">EVALUATED RULES</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {aiAudit.rulesEvaluated.map((r: string) => (
                        <span key={r} className="text-[9px] bg-slate-950 px-2 py-0.5 rounded border border-slate-850 font-mono text-slate-400">
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Explainability details */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
                <h4 className="text-xs font-bold text-orange-500 uppercase tracking-wider">Explainability Panel</h4>
                
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold">WHY?</span>
                    <p className="text-xs text-slate-300 mt-0.5">{aiAudit.explainability.why}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold">EVIDENCE USED</span>
                    <p className="text-xs text-slate-300 mt-0.5">{aiAudit.explainability.evidence}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold">HISTORICAL CASES MATCH</span>
                    <p className="text-xs text-slate-300 mt-0.5">{aiAudit.explainability.historicalCases}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PANEL 5: Database Metrics */}
        {activeTab === "database" && dbStats && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Database Operations Dashboard</h3>
            
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Query TAT Average</span>
                <p className="text-lg font-bold text-slate-200 mt-1">{dbStats.queryDurationAverageMs} ms</p>
              </div>
              <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Index Usage</span>
                <p className="text-lg font-bold text-slate-200 mt-1">{dbStats.indexUsagePercent}%</p>
              </div>
              <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Deadlocks Logged</span>
                <p className="text-lg font-bold text-green-500 mt-1">{dbStats.deadlocksCount}</p>
              </div>
              <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Lock Waits</span>
                <p className="text-lg font-bold text-green-500 mt-1">{dbStats.lockWaits}</p>
              </div>
            </div>

            {/* Index suggestion alert */}
            {dbStats.missingIndexes && (
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <h4 className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-2">Missing Index Recommendations</h4>
                {dbStats.missingIndexes.map((idx: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-xs p-2 bg-slate-950 rounded border border-slate-850">
                    <span className="font-semibold">Table: {idx.table}</span>
                    <code className="text-teal-400">{idx.suggestion}</code>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PANEL 6: Unified Logs */}
        {activeTab === "logs" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Log Explorer</h3>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-xs max-h-[300px] overflow-y-auto space-y-2">
              {logs.map((log) => (
                <div key={log.sequence_number} className="border-b border-slate-850 pb-1.5">
                  <span className="text-slate-500">[{log.event_date}]</span>{" "}
                  <span className="text-blue-400">[{log.event_type}]</span> -{" "}
                  <span className="text-slate-300">{log.payload}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PANEL 7: Immutable Audit */}
        {activeTab === "audit" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Audit Explorer</h3>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-xs max-h-[300px] overflow-y-auto space-y-2">
              {auditLogs.map((log) => (
                <div key={log.sequence_number} className="border-b border-slate-850 pb-1.5 flex justify-between">
                  <div>
                    <span className="text-slate-500">[{log.event_date}]</span>{" "}
                    <span className="text-purple-400 font-bold">[{log.user}]</span> -{" "}
                    <span className="text-slate-300">{log.payload}</span>
                  </div>
                  <span className="text-slate-500 text-[10px]">CID: {log.correlation_id}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PANEL 8: Production Support Mode overrides */}
        {activeTab === "maintenance" && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Pilot Control Panel</h3>

            {/* Real, system_settings-backed control: suppress handoff-SLA breach
                alerts across the app during the production-testing period. */}
            <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1 max-w-xl">
                <h4 className="text-xs font-bold text-orange-400 uppercase flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" /> Handoff-SLA Breach Alerts
                </h4>
                <p className="text-[11px] text-slate-400">
                  When suppressed, the 5-minute handoff SLA clocks keep running and recording, but breaches are
                  not surfaced — no alert-bell notification, no red BREACHED badges, no My Workspace counts.
                  Keep this off until the workflow is realtime-tested against live arrivals, then enable it.
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wider mt-1">
                  Status:{" "}
                  {slaAlertsEnabled === null ? (
                    <span className="text-slate-500">Checking…</span>
                  ) : slaAlertsEnabled ? (
                    <span className="text-emerald-400">Alerts ENABLED (breaches surfaced)</span>
                  ) : (
                    <span className="text-amber-400">SUPPRESSED (testing mode)</span>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSlaAlerts(false)}
                  disabled={slaToggleSaving || slaAlertsEnabled === false}
                  className={`px-4 py-2 rounded text-xs font-bold transition-all ${slaAlertsEnabled === false ? "bg-amber-600 text-white" : "bg-slate-800 hover:bg-slate-700 text-slate-300"} disabled:opacity-60`}
                >
                  Suppress
                </button>
                <button
                  onClick={() => setSlaAlerts(true)}
                  disabled={slaToggleSaving || slaAlertsEnabled === true}
                  className={`px-4 py-2 rounded text-xs font-bold transition-all ${slaAlertsEnabled === true ? "bg-emerald-600 text-white" : "bg-slate-800 hover:bg-slate-700 text-slate-300"} disabled:opacity-60`}
                >
                  Enable
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-2">
                <h4 className="text-xs font-bold text-orange-400 uppercase">Pilot Mode Settings</h4>
                <div className="flex gap-2">
                  <button onClick={() => triggerAction("Enable Pilot Mode")} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-xs font-bold text-white text-center">
                    Enable Pilot
                  </button>
                  <button onClick={() => triggerAction("Disable Pilot Mode")} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded text-xs font-bold text-slate-300 text-center">
                    Disable Pilot
                  </button>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-2">
                <h4 className="text-xs font-bold text-orange-400 uppercase">System Maintenance</h4>
                <div className="flex gap-2">
                  <button onClick={() => triggerAction("Toggle Maintenance Mode")} className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 rounded text-xs font-bold text-white text-center">
                    Toggle Maint. Mode
                  </button>
                  <button onClick={() => triggerAction("System Diagnostics")} className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded text-xs font-bold text-white text-center">
                    Run Diagnostics
                  </button>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-2">
                <h4 className="text-xs font-bold text-orange-400 uppercase">Build Info</h4>
                <div className="text-[11px] text-slate-400 space-y-0.5">
                  <p>Version: <span className="text-slate-200 font-semibold">DWIP Enterprise RC1</span></p>
                  <p>Build Ref: <span className="text-slate-200 font-mono">RC1-PILOT-SAAS</span></p>
                  <p>Deployment: <span className="text-slate-200">Cloud Run (Asia South 1)</span></p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              <button onClick={() => triggerAction("Export Logs")} className="p-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl font-bold text-xs text-center">
                Export Logs (JSON)
              </button>
              <button onClick={() => triggerAction("Export Database")} className="p-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl font-bold text-xs text-center">
                Export Database (SQL)
              </button>
              <button onClick={() => triggerAction("Restart Services")} className="p-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl font-bold text-xs text-center">
                Restart PM2 Services
              </button>
              <button onClick={() => triggerAction("Clear Cache")} className="p-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl font-bold text-xs text-center">
                Purge Redis Cache
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

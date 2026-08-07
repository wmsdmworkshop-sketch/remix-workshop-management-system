import React, { useState } from "react";
import { Activity, Globe, Clock, FileText, HeartPulse, Settings, Cpu } from "lucide-react";
import IntegrationMonitor from "./IntegrationMonitor";
import ExternalSystemsManager from "./ExternalSystemsManager";
import SyncQueueViewer from "./SyncQueueViewer";
import ApiLogsViewer from "./ApiLogsViewer";
import IntegrationHealthDashboard from "./IntegrationHealthDashboard";
import PlatformConfigurationPanel from "./PlatformConfigurationPanel";

interface PlatformControlCenterProps {
  initialTab?: string;
}

export default function PlatformControlCenter({ initialTab = "integration-monitor" }: PlatformControlCenterProps) {
  const [activeSubTab, setActiveSubTab] = useState<string>(initialTab);

  const subTabs = [
    { id: "integration-monitor", label: "Integration Monitor", icon: Activity },
    { id: "external-systems", label: "External Systems", icon: Globe },
    { id: "sync-queue", label: "Sync Queue", icon: Clock },
    { id: "api-logs", label: "API Logs", icon: FileText },
    { id: "health-dashboard", label: "Health Dashboard", icon: HeartPulse },
    { id: "integration-config", label: "Configuration", icon: Settings },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6 bg-black min-h-screen text-zinc-100 font-sans">
      {/* Header Title Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-600 to-amber-600 flex items-center justify-center text-white shadow-xl shadow-orange-950/40">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">DWIP Core Platform & Integration Layer</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-500/10 text-orange-400 border border-orange-500/20">
                Sprint IL-001 Architecture
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Enterprise Integration Gateway, Core Engines, Standardized Common Services & System Monitoring
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800/80 overflow-x-auto pb-1 no-scrollbar">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
                isActive
                  ? "bg-zinc-900 text-orange-400 border-orange-500 shadow-lg"
                  : "text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-zinc-900/40"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-orange-500" : "text-zinc-500"}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Active Tab View Render */}
      <div className="pt-2">
        {activeSubTab === "integration-monitor" && <IntegrationMonitor />}
        {activeSubTab === "external-systems" && <ExternalSystemsManager />}
        {activeSubTab === "sync-queue" && <SyncQueueViewer />}
        {activeSubTab === "api-logs" && <ApiLogsViewer />}
        {activeSubTab === "health-dashboard" && <IntegrationHealthDashboard />}
        {activeSubTab === "integration-config" && <PlatformConfigurationPanel />}
      </div>
    </div>
  );
}

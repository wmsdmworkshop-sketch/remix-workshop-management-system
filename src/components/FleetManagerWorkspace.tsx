import React, { useState, useMemo } from "react";
import { 
  Building2, ShieldCheck, Activity, AlertOctagon, RefreshCw, 
  Clock, DollarSign, Truck, AlertTriangle, CheckCircle 
} from "lucide-react";
import { AICopilotPanel } from "./AICopilotPanel";

interface FleetManagerWorkspaceProps {
  jobCards: any[];
  onRefresh: () => void;
  aiModeEnabled?: boolean;
}

export const FleetManagerWorkspace: React.FC<FleetManagerWorkspaceProps> = React.memo(({
  jobCards = [],
  onRefresh,
  aiModeEnabled = true
}) => {
  const [activeTab, setActiveTab] = useState<string>("fleet-overview");

  // Mock fleet metrics linked to active job cards
  const fleetData = useMemo(() => {
    const totalVehicles = 42;
    const activeOnRoad = 37;
    const inWorkshop = jobCards.filter(j => !j.gate_out_time).length || 5;
    const uptimePercent = Number(((activeOnRoad / totalVehicles) * 100).toFixed(1));

    const activeBreakdowns = [
      { id: "BD-4091", vehicle: "MH12XY4091 (Signa 2823)", location: "NH-48 highway, Mile 142", component: "Steering Gear Box", status: "QRT Dispatch" },
      { id: "BD-8012", vehicle: "MH12XY8012 (Prima 5530)", location: "Pune bypass toll plaza", component: "Fuel Injector clog", status: "Advisor Dispatch" }
    ];

    const contracts = [
      { id: "AMC-TATA-77", name: "VRL Logistics Annual Coverage", expiry: "2026-12-31", remainingBalance: 450000.00, status: "Active" },
      { id: "AMC-TATA-99", name: "Yash Transport Express", expiry: "2026-08-15", remainingBalance: 78000.00, status: "Action Required" }
    ];

    return { totalVehicles, activeOnRoad, inWorkshop, uptimePercent, activeBreakdowns, contracts };
  }, [jobCards]);

  return (
    <div className="space-y-6 bg-[#0B1220] text-slate-100 min-h-screen p-4 md:p-6" lang="en">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
              Fleet Operations Control
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white mt-1 uppercase tracking-tight">
            Fleet Intelligence Platform
          </h1>
        </div>

        {/* Tab triggers */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          {[
            { id: "fleet-overview", label: "Fleet Overview" },
            { id: "breakdowns", label: "Active Breakdowns" },
            { id: "contracts", label: "AMC & Contracts" },
            { id: "copilot", label: "Fleet Copilot" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === tab.id 
                  ? "bg-indigo-600 text-white" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "fleet-overview" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Stats blocks */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center space-y-1">
              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">Total Fleet Size</span>
              <span className="text-xl font-black text-white">{fleetData.totalVehicles} Vehicles</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center space-y-1">
              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">Active On Road</span>
              <span className="text-xl font-black text-emerald-400">{fleetData.activeOnRoad} Active</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center space-y-1">
              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">In Workshop</span>
              <span className="text-xl font-black text-amber-400">{fleetData.inWorkshop} Locked</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center space-y-1">
              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">Fleet Uptime SLA</span>
              <span className="text-xl font-black text-indigo-400 animate-pulse">{fleetData.uptimePercent}%</span>
            </div>
          </div>

          {/* Relationship score card */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Fleet Relationship Health</h3>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full border-4 border-indigo-500 flex items-center justify-center font-black text-lg text-white">
                88
              </div>
              <div className="text-xs space-y-1">
                <p className="text-slate-200 font-bold">Good Standing Partnership</p>
                <p className="text-slate-400">SLA adherence is green. No payments pending. Average approval response time is 18 minutes.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "breakdowns" && (
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Live Breakdown Tracker</h3>
            <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[8px] font-black rounded uppercase animate-pulse">
              2 Active Incidents
            </span>
          </div>
          <div className="space-y-3 text-xs">
            {fleetData.activeBreakdowns.map((bd, idx) => (
              <div key={idx} className="bg-slate-950/40 p-4 rounded-xl border border-slate-850 space-y-2 flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-400 animate-pulse" />
                    <span className="font-bold text-slate-200">{bd.vehicle}</span>
                  </div>
                  <p className="text-slate-400">Location: {bd.location}</p>
                  <p className="text-slate-400">Causal Component: <span className="text-amber-500 font-semibold">{bd.component}</span></p>
                </div>
                <span className="px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded text-[9px] font-bold uppercase">
                  {bd.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "contracts" && (
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 shadow-lg animate-in fade-in duration-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 pb-2 border-b border-slate-800">AMC Contracts Coverage</h3>
          <div className="space-y-3 text-xs">
            {fleetData.contracts.map((c, idx) => (
              <div key={idx} className="bg-slate-950/40 p-4 rounded-xl border border-slate-850 flex justify-between items-center">
                <div className="space-y-1">
                  <span className="font-bold text-slate-200 block">{c.name}</span>
                  <span className="text-slate-400 block">Expires: {c.expiry}</span>
                  <span className="text-slate-400 block">Remaining Funds: <span className="text-emerald-400 font-bold">₹{c.remainingBalance.toLocaleString()}</span></span>
                </div>
                <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase ${
                  c.status === "Active" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse"
                }`}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "copilot" && (
        <div className="animate-in fade-in duration-200">
          <AICopilotPanel 
            role="Fleet Manager"
            context={{
              totalVehicles: fleetData.totalVehicles,
              uptimePercent: fleetData.uptimePercent,
              activeBreakdownsCount: fleetData.activeBreakdowns.length,
              contractsRemaining: fleetData.contracts.map(c => c.remainingBalance)
            }}
          />
        </div>
      )}
    </div>
  );
});

FleetManagerWorkspace.displayName = "FleetManagerWorkspace";
export default FleetManagerWorkspace;

import React, { useState, useMemo } from "react";
import { 
  Building2, Sparkles, BarChart3, AlertOctagon, RefreshCw, 
  Clock, DollarSign, Activity, FileText, CheckCircle2 
} from "lucide-react";

export interface GMServiceCommandCenterProps {
  jobCards: any[];
  onRefresh: () => void;
  aiModeEnabled?: boolean;
}

export const GMServiceCommandCenter: React.FC<GMServiceCommandCenterProps> = React.memo(({
  jobCards = [],
  onRefresh,
  aiModeEnabled = true
}) => {
  const [activeTab, setActiveTab] = useState<string>("kpis");

  // Calculations for KPIs
  const computedMetrics = useMemo(() => {
    const totalRev = jobCards.reduce((sum, j) => sum + (j.labor_price || 0) + (j.parts_price || 0), 0) || 125000;
    const count = jobCards.length;
    const completed = jobCards.filter(j => j.status === "Completed").length;
    const active = jobCards.filter(j => j.status === "Active").length;
    const reworkCount = jobCards.filter(j => j.rework_count > 0).length;

    return { totalRev, count, completed, active, reworkCount };
  }, [jobCards]);

  return (
    <div className="space-y-6 bg-[#0B1220] text-slate-100 min-h-screen p-4 md:p-6" lang="en">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
              GM Service Control
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white mt-1 uppercase tracking-tight">
            GM Service Command Center
          </h1>
        </div>

        {/* Tab triggers */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          {[
            { id: "kpis", label: "Executive KPIs" },
            { id: "brief", label: "AI Daily Brief" },
            { id: "comparison", label: "Workshop Comparison" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === tab.id 
                  ? "bg-blue-600 text-white" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "kpis" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Today's Gross Revenue", val: `₹${(computedMetrics.totalRev / 1000).toFixed(0)}k`, color: "text-emerald-400" },
            { label: "Total Open Job Cards", val: computedMetrics.active, color: "text-white" },
            { label: "Rework Incidents", val: computedMetrics.reworkCount, color: "text-red-400" },
            { label: "SLA Warnings", val: 3, color: "text-red-500 font-bold animate-pulse" }
          ].map((stat, idx) => (
            <div key={idx} className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center space-y-1">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">{stat.label}</span>
              <span className={`text-lg font-black ${stat.color}`}>{stat.val}</span>
            </div>
          ))}
        </div>
      )}

      {activeTab === "brief" && (
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 shadow-lg">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Sparkles className="h-4 w-4 text-emerald-400 animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Gemma Executive Daily Brief</h3>
          </div>
          {aiModeEnabled ? (
          <div className="space-y-3 text-xs leading-relaxed text-slate-300">
            <p>
              <strong>Daily Bottleneck Alert:</strong> Gulbarga branch diagnostic queue has breached target threshold by 12% due to electric bay cleaning maintenance. Recommended action: Route 2 Nexon EVs to Basavakalyan.
            </p>
            <p>
              <strong>Revenue Trend:</strong> Overall dealer network is performing at 104% of daily target, driven by express spares conversions at Shahapur.
            </p>
          </div>
          ) : (
          <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl text-center">
            <p className="text-xs text-slate-500">AI Mode is disabled. Enable AI Mode to view Gemma Executive AI briefings and recommendations.</p>
          </div>
          )}
        </div>
      )}

      {activeTab === "comparison" && (
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 shadow-lg">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Building2 className="h-4 w-4 text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Workshop Location Comparison</h3>
          </div>
          <div className="space-y-2 text-xs">
            {[
              { name: "Sedam Road (Primary)", revenue: "₹38,000", CSI: "9.6/10" },
              { name: "Gulbarga", revenue: "₹24,000", CSI: "9.2/10" },
              { name: "Basavakalyan", revenue: "₹18,500", CSI: "9.4/10" },
              { name: "Shahapur", revenue: "₹31,000", CSI: "9.5/10" },
              { name: "Yadgir", revenue: "₹13,500", CSI: "9.0/10" }
            ].map((loc, idx) => (
              <div key={idx} className="bg-slate-950/40 p-3 rounded-xl border border-slate-850 flex items-center justify-between">
                <span className="font-bold text-slate-200">{loc.name}</span>
                <div className="flex gap-4">
                  <span className="text-slate-400">Rev: {loc.revenue}</span>
                  <span className="text-emerald-400 font-bold">CSI: {loc.CSI}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

GMServiceCommandCenter.displayName = "GMServiceCommandCenter";
export default GMServiceCommandCenter;

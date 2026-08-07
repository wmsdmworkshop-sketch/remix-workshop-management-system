import React, { useState, useMemo } from "react";
import { 
  ShieldAlert, Sparkles, BarChart3, TrendingUp, RefreshCw, 
  DollarSign, FileSpreadsheet, Building, Users 
} from "lucide-react";
import { AICopilotPanel } from "./AICopilotPanel";

export interface DealerPrincipalCommandCenterProps {
  jobCards: any[];
  onRefresh: () => void;
  aiModeEnabled?: boolean;
}

export const DealerPrincipalCommandCenter: React.FC<DealerPrincipalCommandCenterProps> = React.memo(({
  jobCards = [],
  onRefresh,
  aiModeEnabled = true
}) => {
  const [activeTab, setActiveTab] = useState<string>("financials");

  // Calculations for financial dashboard
  const financials = useMemo(() => {
    const grossTotal = jobCards.reduce((sum, j) => sum + Number(j.labor_price || 0) + Number(j.parts_price || 0), 0);
    const profitMargin = Math.round(grossTotal * 0.22);
    const outstanding = jobCards.reduce((sum, j) => sum + Number(j.outstanding_balance || 0), 0);

    return { grossTotal, profitMargin, outstanding };
  }, [jobCards]);

  const handleExportPowerBi = () => {
    const dataset = jobCards.map(j => ({
      jobId: j.job_id,
      vrn: j.vrn,
      grossRevenue: (j.labor_price || 0) + (j.parts_price || 0),
      status: j.status,
      timestamp: new Date().toISOString()
    }));
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataset, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `PowerBI_Executive_Dataset_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    alert("Power BI executive data payload downloaded successfully.");
  };

  return (
    <div className="space-y-6 bg-[#0B1220] text-slate-100 min-h-screen p-4 md:p-6" lang="en">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
              Dealer Principal cockpit
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white mt-1 uppercase tracking-tight">
            Executive Command Center
          </h1>
        </div>

        {/* Tab triggers */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          {[
            { id: "financials", label: "Financials Dashboard" },
            { id: "copilot", label: "Executive AI Copilot" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === tab.id 
                  ? "bg-amber-600 text-slate-950 font-black" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "financials" && (
        <div className="space-y-6">
          {/* Financial summary blocks */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-3">
              <span className="text-[9px] text-slate-500 font-bold uppercase block">Gross Revenues Today</span>
              <span className="text-2xl font-black text-emerald-400">₹{(financials.grossTotal / 1000).toFixed(1)}k</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-3">
              <span className="text-[9px] text-slate-500 font-bold uppercase block">Net Profit Contribution (22%)</span>
              <span className="text-2xl font-black text-white">₹{(financials.profitMargin / 1000).toFixed(1)}k</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-3">
              <span className="text-[9px] text-slate-500 font-bold uppercase block">Outstanding Collections Ledger</span>
              <span className="text-2xl font-black text-red-400">₹{financials.outstanding}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleExportPowerBi}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
            >
              <FileSpreadsheet className="h-4 w-4" /> Export Power BI Dataset
            </button>
          </div>
        </div>
      )}

      {activeTab === "copilot" && (
        <AICopilotPanel 
          role="Dealer Principal"
          context={{
            grossRevenue: financials.grossTotal,
            netProfit: financials.profitMargin,
            outstanding: financials.outstanding
          }}
        />
      )}
    </div>
  );
});

DealerPrincipalCommandCenter.displayName = "DealerPrincipalCommandCenter";
export default DealerPrincipalCommandCenter;

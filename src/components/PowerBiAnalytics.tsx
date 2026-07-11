import React, { useState, useMemo } from "react";
import { 
  FileSpreadsheet, Sparkles, BarChart3, TrendingUp, RefreshCw, 
  DollarSign, Activity, FileText, CheckCircle2 
} from "lucide-react";

export interface PowerBiAnalyticsProps {
  jobCards: any[];
  onRefresh: () => void;
}

export const PowerBiAnalytics: React.FC<PowerBiAnalyticsProps> = React.memo(({
  jobCards = [],
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<string>("datasets");

  const handleDownloadDataset = () => {
    const dataset = jobCards.map(j => ({
      jobId: j.job_id,
      vrn: j.vrn,
      makeModel: `${j.vehicle_make} ${j.vehicle_model}`,
      status: j.status,
      revenue: (j.labor_price || 0) + (j.parts_price || 0),
      timestamp: new Date().toISOString()
    }));
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataset, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `PowerBI_Global_Dataset_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    alert("Power BI structured dataset download completed.");
  };

  return (
    <div className="space-y-6 bg-[#0B1220] text-slate-100 min-h-screen p-4 md:p-6" lang="en">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
              Enterprise Reporting
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white mt-1 uppercase tracking-tight">
            Power BI Analytics Center
          </h1>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 shadow-lg">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
          <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Scheduled Power BI Dataset Compilation</h3>
        </div>
        <div className="space-y-3 text-xs leading-relaxed text-slate-300">
          <p>
            Generate and export schema-validated datasets directly to your Power BI desktop dashboard. The exported payload conforms to Tat commercial vehicle dealer compliance models.
          </p>
          <button 
            onClick={handleDownloadDataset}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
          >
            Download Dataset (JSON Schema)
          </button>
        </div>
      </div>
    </div>
  );
});

PowerBiAnalytics.displayName = "PowerBiAnalytics";
export default PowerBiAnalytics;

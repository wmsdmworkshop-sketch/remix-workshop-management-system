import React, { useState, useMemo } from "react";
import { 
  User, Calendar, Clock, CheckCircle2, DollarSign, Send, 
  FileText, Activity, AlertTriangle, RefreshCw 
} from "lucide-react";

export interface CustomerExperiencePlatformProps {
  jobCards: any[];
  onRefresh: () => void;
}

export const CustomerExperiencePlatform: React.FC<CustomerExperiencePlatformProps> = React.memo(({
  jobCards = [],
  onRefresh
}) => {
  const [vrnQuery, setVrnQuery] = useState<string>("");
  const [selectedJob, setSelectedJob] = useState<any>(null);

  // Search vehicle status
  const handleCheckStatus = () => {
    const job = jobCards.find(j => j.vrn.toLowerCase().includes(vrnQuery.toLowerCase()));
    if (job) {
      setSelectedJob(job);
    } else {
      alert("Vehicle registration details not found in active ledger.");
    }
  };

  return (
    <div className="space-y-6 bg-[#0B1220] text-slate-100 min-h-screen p-4 md:p-6" lang="en">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              Customer Portal
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white mt-1 uppercase tracking-tight">
            Devanand Service Tracking
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Search status */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Calendar className="h-4 w-4 text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Track My Repair</h3>
          </div>
          <div className="space-y-3">
            <input 
              type="text" 
              placeholder="Enter Registration Number (e.g. KA01MM1111)"
              value={vrnQuery}
              onChange={(e) => setVrnQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none"
            />
            <button 
              onClick={handleCheckStatus}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
            >
              Verify Vehicle Status
            </button>
          </div>
        </div>

        {/* Status display panel */}
        {selectedJob && (
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 shadow-lg">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Activity className="h-4 w-4 text-blue-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Live Repair Timeline</h3>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Vehicle model</span>
                <span className="font-bold text-slate-200">{selectedJob.vehicle_make} {selectedJob.vehicle_model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Active Workflow Stage</span>
                <span className="font-bold text-blue-400">{selectedJob.current_workflow_state || "Diagnostics"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <span className="font-bold text-slate-200">{selectedJob.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Estimated TAT</span>
                <span className="font-bold text-slate-200">{selectedJob.estimated_tat || "45"} minutes</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

CustomerExperiencePlatform.displayName = "CustomerExperiencePlatform";
export default CustomerExperiencePlatform;

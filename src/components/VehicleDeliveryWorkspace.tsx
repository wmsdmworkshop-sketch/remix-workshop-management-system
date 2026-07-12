import React, { useState, useMemo } from "react";
import { 
  CheckCircle2, Camera, User, ClipboardCheck, Sparkles, Send, 
  Map, ShieldAlert, FileText, Clock, Signature 
} from "lucide-react";

export interface VehicleDeliveryWorkspaceProps {
  jobCards: any[];
  onRefresh: () => void;
  onUpdateJob: (id: number, updatedFields: Partial<any>) => Promise<void>;
  currentUser?: any;
}

export const VehicleDeliveryWorkspace: React.FC<VehicleDeliveryWorkspaceProps> = React.memo(({
  jobCards = [],
  onRefresh,
  onUpdateJob,
  currentUser
}) => {
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [csiScore, setCsiScore] = useState<number>(10);
  const [customerFeedback, setCustomerFeedback] = useState<string>("");

  // Checklist state
  const [deliveryChecklist, setDeliveryChecklist] = useState<Record<string, boolean>>({
    cleanliness: true, valuablesReturned: true, oldPartsReturned: false, fuelLevelVerified: true, accessoriesVerify: true
  });

  // Derive target job card
  const selectedJob = useMemo(() => {
    return jobCards.find(j => j.job_id === selectedJobId) || jobCards[0] || null;
  }, [jobCards, selectedJobId]);

  // Complete final delivery
  const handleDeliverVehicle = async () => {
    if (!selectedJob) return;
    try {
      await onUpdateJob(selectedJob.job_id, {
        status: "Completed",
        current_workflow_state: "COMPLETED",
        remarks: `${selectedJob.remarks || ""}\n[Delivered to Customer]: CSI: ${csiScore}/10 | Feedback: ${customerFeedback}`
      });
      alert("Vehicle successfully delivered. Workflow engine marked as COMPLETED.");
      onRefresh();
    } catch (e) {
      alert("Delivery logging failed.");
    }
  };

  return (
    <div className="space-y-6 bg-[#0B1220] text-slate-100 min-h-screen p-4 md:p-6" lang="en">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="ds-button-success flex h-2 w-2 rounded-full   animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              Vehicle Handover Workspace
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white mt-1 uppercase tracking-tight">
            Vehicle Delivery & Gate Pass
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending delivery queue */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 shadow-lg">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Clock className="h-4 w-4 text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Pending Deliveries</h3>
          </div>
          <div className="space-y-3">
            {jobCards.filter(j => j.current_workflow_state === "DELIVERY_PENDING").map(job => (
              <button
                key={job.job_id}
                onClick={() => setSelectedJobId(job.job_id)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  selectedJobId === job.job_id 
                    ? "bg-blue-600/10 border-blue-600/30 text-white" 
                    : "bg-slate-950/40 border-slate-850 text-slate-300 hover:border-slate-800"
                }`}
              >
                <div className="font-mono text-xs font-bold">{job.vrn}</div>
                <div className="text-[10px] text-slate-400 mt-1">{job.vehicle_make} {job.vehicle_model} • Advisor: {job.service_advisor || "Unassigned"}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Handover checklists & CSI collection */}
        {selectedJob && (
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 shadow-lg lg:col-span-2">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <ClipboardCheck className="h-4 w-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Delivery Checklist & Feedback ({selectedJob.vrn})</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.keys(deliveryChecklist).map(key => (
                <button
                  key={key}
                  onClick={() => setDeliveryChecklist(prev => ({ ...prev, [key]: !prev[key] }))}
                  className={`p-3 rounded-xl border text-center space-y-1.5 transition-all ${
                    deliveryChecklist[key] 
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                      : "bg-slate-950/20 border-slate-850 text-slate-400 hover:border-slate-850"
                  }`}
                >
                  <span className="text-[10px] font-black uppercase block tracking-wider">{key}</span>
                  <span className="text-xs font-bold">{deliveryChecklist[key] ? "✓ Clear" : "✗ Pending"}</span>
                </button>
              ))}
            </div>

            {/* CSI Score and Remarks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-850">
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">CSI Rating Score (1-10)</label>
                <select 
                  value={csiScore}
                  onChange={(e) => setCsiScore(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none"
                >
                  {[...Array(10)].map((_, i) => (
                    <option key={i+1} value={i+1}>{i+1} - {i === 9 ? "Excellent" : i === 0 ? "Poor" : "Good"}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Customer Verbal Feedback</label>
                <input 
                  type="text" 
                  placeholder="Very satisfied with isolation diagnostics speed..."
                  value={customerFeedback}
                  onChange={(e) => setCustomerFeedback(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none"
                />
              </div>
            </div>

            {/* Digital Sign-off */}
            <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-850 text-xs space-y-2.5">
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">Customer Delivery Authorization</span>
              <div className="flex items-center gap-2">
                <Signature className="h-4 w-4 text-blue-400" />
                <span className="text-slate-300">Signed digitally on Devanand Handover Tablet</span>
              </div>
            </div>

            <button 
              onClick={handleDeliverVehicle}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
            >
              Issue Gate Pass & Finalize Handover
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

VehicleDeliveryWorkspace.displayName = "VehicleDeliveryWorkspace";
export default VehicleDeliveryWorkspace;

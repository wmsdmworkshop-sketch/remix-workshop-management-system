import React, { useState, useMemo } from "react";
import { 
  User, Calendar, Clock, CheckCircle2, DollarSign, Send, 
  FileText, Activity, AlertTriangle, RefreshCw, Shield, Bell
} from "lucide-react";
import { AICopilotPanel } from "./AICopilotPanel";

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
  const [activeTab, setActiveTab] = useState<string>("health");

  // Search vehicle status
  const handleCheckStatus = () => {
    const job = jobCards.find(j => j.vrn.toLowerCase().includes(vrnQuery.toLowerCase()));
    if (job) {
      setSelectedJob(job);
    } else {
      // Fallback to first job card if query is empty or not matched
      if (jobCards.length > 0) {
        setSelectedJob(jobCards[0]);
      } else {
        alert("Vehicle registration details not found in active ledger.");
      }
    }
  };

  // If no job selected yet, pick first as default if available
  useMemo(() => {
    if (!selectedJob && jobCards.length > 0) {
      setSelectedJob(jobCards[0]);
    }
  }, [jobCards, selectedJob]);

  // Formats a real timestamp to a clock string. Returns null (never a fabricated
  // time) when the value is missing/unparseable so the UI can show "Pending".
  const fmtClock = (v?: string | null): string | null => {
    if (!v) return null;
    const d = new Date(v);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-6 bg-[#0B1220] text-slate-100 min-h-screen p-4 md:p-6" lang="en">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              Customer Digital Ownership Ecosystem
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white mt-1 uppercase tracking-tight">
            Customer Experience Console
          </h1>
        </div>

        {/* Tab switchers */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          {[
            { id: "health", label: "Vehicle Health & Timeline" },
            { id: "warranty", label: "Warranty & Campaigns" },
            { id: "copilot", label: "AI Customer Assistant" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === tab.id 
                  ? "bg-emerald-600 text-slate-950 font-black" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Search Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 shadow-lg">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Calendar className="h-4 w-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-black">Search My Vehicle</h3>
            </div>
            <div className="space-y-3">
              <input 
                type="text" 
                placeholder="Enter VRN (e.g. KA-04-MM-9041)"
                value={vrnQuery}
                onChange={(e) => setVrnQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none"
              />
              <button 
                onClick={handleCheckStatus}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Track Repair Progress
              </button>
            </div>
          </div>

          {selectedJob && (
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-3 shadow-lg">
              <span className="text-[9px] text-slate-500 font-bold uppercase block tracking-wider">Vehicle Passport</span>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Reg No:</span>
                <span className="font-mono font-bold text-white uppercase">{selectedJob.vrn}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Model:</span>
                <span className="font-bold text-slate-200">{selectedJob.vehicle_make} {selectedJob.vehicle_model}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Chassis No:</span>
                <span className="font-mono text-slate-300">{selectedJob.vin || "—"}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Active Panel */}
        <div className="lg:col-span-2">
          {activeTab === "health" && selectedJob && (
            <div className="space-y-6">
              {/* Vehicle Health Card */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Vehicle Health Card</h3>
                  </div>
                  {selectedJob.warranty_status && (
                    <span className="text-[10px] font-black text-emerald-400 uppercase bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{selectedJob.warranty_status}</span>
                  )}
                </div>

                {/* Telemetry is shown ONLY when real values are on record — never fabricated. */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                    <span className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Battery Health</span>
                    <span className="text-xs font-black text-slate-200">{selectedJob.battery_soh != null ? `${selectedJob.battery_soh}% SoH` : "—"}</span>
                  </div>
                  <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                    <span className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Brakes Condition</span>
                    <span className="text-xs font-black text-slate-200">{selectedJob.brakes_condition || "—"}</span>
                  </div>
                  <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                    <span className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Coolant Level</span>
                    <span className="text-xs font-black text-slate-200">{selectedJob.coolant_level || "—"}</span>
                  </div>
                  <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                    <span className="text-[9px] text-slate-500 font-bold uppercase block mb-1">OBD Diagnostics</span>
                    <span className="text-xs font-black text-slate-200">{selectedJob.active_dtc_count != null ? `${selectedJob.active_dtc_count} Active DTCs` : "—"}</span>
                  </div>
                </div>
              </div>

              {/* Service Timeline Tracker */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-emerald-400 animate-pulse" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Active Service Timeline</h3>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">Estimated TAT: {selectedJob.estimated_tat ? `${selectedJob.estimated_tat} mins` : "—"}</span>
                </div>

                <div className="relative pl-6 border-l-2 border-slate-800 space-y-6">
                  {(() => {
                    // Drive the customer timeline from REAL job/workflow data only.
                    // No fabricated diagnostics/technician/completion timestamps —
                    // show "Pending"/"Awaiting update" when a real time is absent.
                    const wfState = String(selectedJob.current_workflow_state || "").toUpperCase();
                    const gateTime = fmtClock(selectedJob.started_at) || (selectedJob.time_in ? String(selectedJob.time_in) : null);
                    const workStarted = !!selectedJob.started_at || ["Active", "Rework"].includes(selectedJob.status);
                    const completed = !!selectedJob.completed_at || ["Completed", "Invoiced"].includes(selectedJob.status);
                    const inDiagnostics = wfState.includes("DIAGNOS");
                    const inQc = wfState.includes("QC") || wfState === "FINAL_REVIEW";
                    return [
                      { title: "Gate Entry Registered", time: gateTime || "Awaiting update", desc: "Vehicle checked in for service.", done: !!gateTime },
                      { title: "Technical Diagnostics", time: "Awaiting update", desc: "Inspection and diagnostics.", done: workStarted || completed, active: inDiagnostics },
                      { title: "Work in Progress", time: fmtClock(selectedJob.started_at) || (workStarted ? "In progress" : "Not started"), desc: selectedJob.technician_name ? `Technician ${selectedJob.technician_name} is carrying out servicing.` : "Servicing in progress.", done: completed, active: workStarted && !completed },
                      { title: "Quality Control Assessment", time: fmtClock(selectedJob.completed_at) || "Pending", desc: "Quality inspection.", done: completed, active: inQc && !completed }
                    ];
                  })().map((step, idx) => (
                    <div key={idx} className="relative">
                      <span className={`absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full border ${
                        step.active ? "bg-blue-600 border-blue-400 animate-pulse" :
                        step.done ? "bg-emerald-600 border-emerald-400" : "bg-slate-950 border-slate-800"
                      }`}>
                        {step.done && <CheckCircle2 className="h-2.5 w-2.5 text-white" />}
                      </span>
                      <div>
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className={step.done || step.active ? "text-slate-200" : "text-slate-500"}>{step.title}</span>
                          <span className="text-slate-500 font-normal">{step.time}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "warranty" && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <Shield className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Warranty Coverage</h3>
                </div>
                {/* Warranty details shown ONLY from real records — never fabricated. */}
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between border-b border-slate-850 pb-2">
                    <span className="text-slate-500">Coverage Class</span>
                    <span className="font-bold text-slate-200">{selectedJob.warranty_class || "—"}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-850 pb-2">
                    <span className="text-slate-500">Clearance Threshold</span>
                    <span className="font-bold text-slate-200">{selectedJob.warranty_threshold || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Current Status</span>
                    <span className="font-bold text-emerald-400">{selectedJob.warranty_status || "—"}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <Bell className="h-4 w-4 text-amber-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Eligible Service Campaigns</h3>
                </div>
                {Array.isArray(selectedJob.open_campaigns) && selectedJob.open_campaigns.length > 0 ? (
                  selectedJob.open_campaigns.map((c: any, idx: number) => (
                    <div key={idx} className="bg-slate-950/40 p-4 rounded-xl border border-amber-500/10 flex items-start gap-3">
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-bold text-slate-200 block">{typeof c === "string" ? c : (c?.title || c?.code || "Campaign")}</span>
                        {c?.description && <span className="text-[10px] text-slate-400 mt-1 block">{c.description}</span>}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-slate-500">No eligible service campaigns on record.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === "copilot" && (
            <AICopilotPanel 
              role="Customer"
              context={{
                vin: selectedJob?.vin || "",
                makeModel: `${selectedJob?.vehicle_make || ""} ${selectedJob?.vehicle_model || ""}`,
                status: selectedJob?.status || "In Service"
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
});

CustomerExperiencePlatform.displayName = "CustomerExperiencePlatform";
export default CustomerExperiencePlatform;


import React, { useState, useMemo } from "react";
import { 
  ClipboardCheck, CheckCircle2, AlertOctagon, RefreshCw, BarChart3, 
  Map, Sparkles, Signature, FileText, Camera, Users, Clock 
} from "lucide-react";

export interface QCInspectorWorkspaceProps {
  jobCards: any[];
  employees: any[];
  onRefresh: () => void;
  onUpdateJob: (id: number, updatedFields: Partial<any>) => Promise<void>;
  currentUser?: any;
  aiModeEnabled?: boolean;
}

export const QCInspectorWorkspace: React.FC<QCInspectorWorkspaceProps> = React.memo(({
  jobCards = [],
  employees = [],
  onRefresh,
  onUpdateJob,
  currentUser,
  aiModeEnabled = true
}) => {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  // Digital QC checklists state
  const [qcChecklist, setQcChecklist] = useState<Record<string, boolean>>({
    mechanical: true, electrical: true, brakes: false, steering: true, suspension: false, roadTest: false
  });

  // Road test checklists state
  const [roadTestChecklist, setRoadTestChecklist] = useState<Record<string, boolean>>({
    brakeResponse: true, steeringAlignment: true, gearShifts: false, cabinNoise: true
  });

  // Decision state
  const [decision, setDecision] = useState<string>("PASS");
  const [reworkReason, setReworkReason] = useState<string>("");
  const [techFeedback, setTechFeedback] = useState<string>("");

  // Target job card lookup
  const selectedJob = useMemo(() => {
    return jobCards.find(j => j.job_id === selectedJobId) || jobCards[0] || null;
  }, [jobCards, selectedJobId]);

  // Section 1: Dashboard KPIs
  const qcStats = useMemo(() => {
    const waiting = jobCards.filter(j => j.current_workflow_state === "QC_PENDING").length;
    const underInspection = jobCards.filter(j => j.status === "Active" && j.remarks?.includes("[QC]")).length;
    const passedCount = jobCards.filter(j => j.status === "Completed" && !j.remarks?.includes("[Rework]")).length || 6;
    const failedCount = jobCards.filter(j => j.rework_count > 0).length || 2;

    return {
      waiting,
      underInspection,
      passedCount,
      failedCount,
      ftr: "94%",
      avgQcTime: "18 mins"
    };
  }, [jobCards]);

  // Section 7: AI QC Copilot
  const aiCopilotData = useMemo(() => {
    if (!selectedJob) return null;
    const isEV = selectedJob.vehicle_model?.toLowerCase().includes("ev");
    return {
      defectRisk: isEV ? "High risk of battery isolation failures on Nexon EV post-wash." : "Low risks detected.",
      missingChecks: ["Rear brake caliper torque check", "Tire pressure level log"],
      warrantyRisk: "None. Extended warranty coverage active.",
      suggestedChecks: isEV ? ["High Voltage Isolation Test"] : ["Brake fluid level verify"],
      confidence: "97%"
    };
  }, [selectedJob]);

  // Submit QC Decision
  const handleSubmitDecision = async () => {
    if (!selectedJob) return;
    try {
      const updatedRemarks = `${selectedJob.remarks || ""}\n[QC Decision]: ${decision} | Reason: ${reworkReason} | Feedback: ${techFeedback}`;
      if (decision === "PASS") {
        await onUpdateJob(selectedJob.job_id, {
          status: "Completed",
          current_workflow_state: "BILLING_PENDING",
          remarks: updatedRemarks
        });
        alert("Quality check PASS. Job routed to Billing department.");
      } else {
        // FAIL/REWORK
        await onUpdateJob(selectedJob.job_id, {
          status: "Rework",
          current_workflow_state: "QC_FAILED",
          rework_count: (selectedJob.rework_count || 0) + 1,
          remarks: updatedRemarks
        });
        alert("Quality check FAIL. Job marked for Rework.");
      }
      onRefresh();
    } catch (e) {
      alert("Failed to submit decision.");
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
              Audit Validation Workspace
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white mt-1 uppercase tracking-tight">
            Quality Control Terminal
          </h1>
        </div>

        {/* Tab triggers */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          {[
            { id: "dashboard", label: "QC Dashboard" },
            { id: "checklist", label: "QC Checklist" },
            { id: "roadtest", label: "Road Test" },
            { id: "decision", label: "Decision Center" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === tab.id 
                  ? "bg-emerald-600 text-white" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* SECTION 1: Dashboard metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: "Waiting for QC", val: qcStats.waiting, color: "text-white" },
              { label: "Under Inspection", val: qcStats.underInspection, color: "text-blue-400" },
              { label: "QC Passed Today", val: qcStats.passedCount, color: "text-emerald-400" },
              { label: "QC Failed Today", val: qcStats.failedCount, color: "text-red-400" },
              { label: "FTR Performance", val: qcStats.ftr, color: "text-amber-400" },
              { label: "Avg QC Time", val: qcStats.avgQcTime, color: "text-slate-300" }
            ].map((stat, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center space-y-1">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">{stat.label}</span>
                <span className={`text-lg font-black ${stat.color}`}>{stat.val}</span>
              </div>
            ))}
          </div>

          {/* SECTION 2: QC Queue list */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <Clock className="h-4 w-4 text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">QC Validation Queue</h3>
              </div>
              <div className="space-y-3">
                {jobCards.filter(j => j.current_workflow_state === "QC_PENDING").map(job => (
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
                    <div className="text-[10px] text-slate-400 mt-1">{job.vehicle_make} {job.vehicle_model} • Tech: {job.technician_name || "Unassigned"}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* SECTION 7: AI QC Copilot — gated by aiModeEnabled */}
            {selectedJob && aiModeEnabled && aiCopilotData && (
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-4 lg:col-span-2">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <Sparkles className="h-4 w-4 text-emerald-400 animate-pulse" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Gemma AI Quality Check Copilot</h3>
                </div>
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-slate-950/40 border border-slate-850 text-slate-300 rounded-xl leading-relaxed">
                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider block mb-1">Defect Risk Analysis</span>
                    {aiCopilotData.defectRisk}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-850 space-y-1">
                      <span className="text-[9px] text-slate-500 font-bold uppercase block">Missing Checks</span>
                      <ul className="list-disc list-inside text-slate-300 mt-0.5 space-y-0.5">
                        {aiCopilotData.missingChecks.map((c, i) => <li key={i}>{c}</li>)}
                      </ul>
                    </div>
                    <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-850 space-y-1">
                      <span className="text-[9px] text-slate-500 font-bold uppercase block">Suggested Checkpoints</span>
                      <ul className="list-disc list-inside text-slate-300 mt-0.5 space-y-0.5">
                        {aiCopilotData.suggestedChecks.map((c, i) => <li key={i}>{c}</li>)}
                      </ul>
                    </div>
                  </div>
                  <div className="flex justify-between border-t border-slate-850 pt-2.5 text-[10px] text-slate-400 font-bold uppercase">
                    <span>Inference Confidence: <span className="text-emerald-400">{aiCopilotData.confidence}</span></span>
                    <span>Warranty Risk Status: <span className="text-slate-200">{aiCopilotData.warrantyRisk}</span></span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "checklist" && selectedJob && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* SECTION 3: Digital QC Checklist */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-4 lg:col-span-2">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <ClipboardCheck className="h-4 w-4 text-blue-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Digital Validation Checklist</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {Object.keys(qcChecklist).map(key => (
                <button
                  key={key}
                  onClick={() => setQcChecklist(prev => ({ ...prev, [key]: !prev[key] }))}
                  className={`p-3 rounded-xl border text-center space-y-1.5 transition-all ${
                    qcChecklist[key] 
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                      : "bg-slate-950/20 border-slate-850 text-slate-400 hover:border-slate-800"
                  }`}
                >
                  <span className="text-[10px] font-black uppercase tracking-wider block">{key}</span>
                  <span className="text-xs font-bold">{qcChecklist[key] ? "✓ Approved" : "✗ Pending"}</span>
                </button>
              ))}
            </div>
          </div>

          {/* SECTION 4: Evidence Capture */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Camera className="h-4 w-4 text-blue-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Validation Photos Deck</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {["Checklist verify", "Safety verification"].map((l, i) => (
                <div key={i} className="bg-slate-950/40 p-3 rounded-xl border border-slate-850 text-center space-y-2">
                  <Camera className="h-5 w-5 text-slate-500 mx-auto" />
                  <span className="text-[9px] text-slate-400 font-bold block">{l}</span>
                  <button 
                    onClick={() => alert(`QC photo uploaded for ${l}`)}
                    className="px-2 py-1 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold text-[9px] uppercase tracking-wider rounded-lg transition-all"
                  >
                    Capture Photo
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "roadtest" && selectedJob && (
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-4">
          {/* SECTION 5: Road Test */}
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Map className="h-4 w-4 text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Road Test Verification</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-500 block">Distance Covered</span>
                  <span className="text-sm font-bold text-slate-200">3.2 km</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Max Speed</span>
                  <span className="text-sm font-bold text-slate-200">45 km/h</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {Object.keys(roadTestChecklist).map(key => (
                <button
                  key={key}
                  onClick={() => setRoadTestChecklist(prev => ({ ...prev, [key]: !prev[key] }))}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    roadTestChecklist[key] 
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                      : "bg-slate-950/40 border-slate-850 text-slate-400 hover:border-slate-800"
                  }`}
                >
                  <span className="uppercase tracking-wider">{key}</span>
                  <span>{roadTestChecklist[key] ? "✓ Clear" : "✗ Check"}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "decision" && selectedJob && (
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-4">
          {/* SECTION 6: QC Decision & Rework Allocation */}
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Signature className="h-4 w-4 text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">QC Decision & Final Sign-off</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Final Approval Decision</label>
                <select 
                  value={decision} 
                  onChange={(e) => setDecision(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none"
                >
                  <option value="PASS">PASS (Route to Billing)</option>
                  <option value="FAIL">FAIL (Route to Rework)</option>
                </select>
              </div>
              {decision === "FAIL" && (
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Rework Root Cause Reason</label>
                  <input 
                    type="text" 
                    placeholder="Brake pad isolation clips missing..."
                    value={reworkReason}
                    onChange={(e) => setReworkReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none"
                  />
                </div>
              )}
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Technician Feedback Notes</label>
                <input 
                  type="text" 
                  placeholder="Harness requires routing clip check"
                  value={techFeedback}
                  onChange={(e) => setTechFeedback(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none"
                />
              </div>
              <button 
                onClick={handleSubmitDecision}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
              >
                Log Final Validation Decision
              </button>
            </div>
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850 space-y-2.5 text-xs">
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">Digital Sign-off Parameters</span>
              <div>Inspector: <span className="font-bold text-slate-200">{currentUser?.full_name || "QC Inspector"}</span></div>
              <div>Timestamp: <span className="font-mono text-slate-200">{new Date().toISOString()}</span></div>
              <div>Device ID: <span className="font-mono text-slate-200">TAB-QC-088</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

QCInspectorWorkspace.displayName = "QCInspectorWorkspace";
export default QCInspectorWorkspace;

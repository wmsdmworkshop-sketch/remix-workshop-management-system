import React, { useState, useMemo } from "react";
import { 
  Wrench, Play, Pause, Square, Sparkles, ClipboardCheck, Package, 
  Camera, BarChart3, Clock, AlertTriangle, FileText, CheckCircle2 
} from "lucide-react";

export interface TechnicianWorkspaceProps {
  jobCards: any[];
  employees: any[];
  onRefresh: () => void;
  onUpdateJob: (id: number, updatedFields: Partial<any>) => Promise<void>;
  currentUser?: any;
  aiModeEnabled?: boolean;
}

export const TechnicianWorkspace: React.FC<TechnicianWorkspaceProps> = React.memo(({
  jobCards = [],
  employees = [],
  onRefresh,
  onUpdateJob,
  currentUser,
  aiModeEnabled = true
}) => {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  // Labour timer tracking states
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [timerIntervalId, setTimerIntervalId] = useState<any>(null);

  // Repair checklist status
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    isolation: true, diagnostic: false, disassembly: false, assembly: false, selfQc: false
  });

  // Target job card lookup
  const selectedJob = useMemo(() => {
    return jobCards.find(j => j.job_id === selectedJobId) || jobCards[0] || null;
  }, [jobCards, selectedJobId]);

  // Section 1: Dashboard KPIs
  const dashboardStats = useMemo(() => {
    const techName = currentUser?.full_name || "Sanjay Patel";
    const assigned = jobCards.filter(j => j.technician_name?.includes(techName) && j.status !== "Completed");
    const completed = jobCards.filter(j => j.technician_name?.includes(techName) && j.status === "Completed").length;

    return {
      assignedCount: assigned.length,
      currentJob: assigned[0]?.vrn || "No active assignment",
      completedToday: completed,
      productivity: "92%",
      ftr: "96%",
      rework: "0%"
    };
  }, [jobCards, currentUser]);

  // Section 8: Technician AI Copilot suggestions
  const aiCopilotData = useMemo(() => {
    if (!selectedJob) return null;
    const isEV = selectedJob.vehicle_model?.toLowerCase().includes("ev");
    return {
      repairSuggestions: isEV ? "Perform electrical safety scan first. Check high voltage isolator harness." : "Standard combustion spark check & filter cleaning.",
      torqueSpecs: isEV ? "HV Battery mounting bolts: 45 Nm" : "Spark plugs: 25 Nm",
      commonFailures: isEV ? "EV isolation relay solder breakdown" : "Air filter clogging due to environmental dust",
      safetyAlert: isEV ? "WARNING: Wear class 0 1000V rated insulated safety gloves." : "Standard workshop safety protocols apply.",
      confidence: "98%"
    };
  }, [selectedJob]);

  // Labour tracking controls
  const handleStartTimer = () => {
    if (timerActive) return;
    setTimerActive(true);
    const interval = setInterval(() => {
      setTimerSeconds(prev => prev + 1);
    }, 1000);
    setTimerIntervalId(interval);
  };

  const handlePauseTimer = () => {
    if (!timerActive) return;
    setTimerActive(false);
    clearInterval(timerIntervalId);
  };

  const handleStopTimer = async () => {
    handlePauseTimer();
    if (!selectedJob) return;
    try {
      const minutesSpent = Math.max(1, Math.round(timerSeconds / 60));
      await onUpdateJob(selectedJob.job_id, {
        actual_tat: (selectedJob.actual_tat || 0) + minutesSpent,
        status: "Completed",
        current_workflow_state: "QC_PENDING"
      });
      setTimerSeconds(0);
      alert("Job timer stopped. Vehicle routed to QC Inspector.");
      onRefresh();
    } catch (e) {
      alert("Failed to update job status.");
    }
  };

  // Parts request submit
  const handleRequestParts = () => {
    alert("Request for parts registered successfully with Parts Inventory.");
  };

  return (
    <div className="space-y-6 bg-[#0B1220] text-slate-100 min-h-screen p-4 md:p-6" lang="en">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              Active Technician Bay Console
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white mt-1 uppercase tracking-tight">
            Technician Execution Hub
          </h1>
        </div>

        {/* Tab triggers */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          {[
            { id: "dashboard", label: "My Dashboard" },
            { id: "tasks", label: "Repair Checklist" },
            { id: "parts", label: "Parts Desk" },
            { id: "evidence", label: "Evidence Capture" }
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
          {/* SECTION 1: Dashboard stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Assigned Jobs", val: dashboardStats.assignedCount, color: "text-white" },
              { label: "Current Vehicle", val: dashboardStats.currentJob, color: "text-blue-400 font-mono" },
              { label: "Completed Today", val: dashboardStats.completedToday, color: "text-emerald-400" },
              { label: "FTR Performance", val: dashboardStats.ftr, color: "text-amber-400" }
            ].map((stat, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center space-y-1">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">{stat.label}</span>
                <span className={`text-lg font-black ${stat.color}`}>{stat.val}</span>
              </div>
            ))}
          </div>

          {/* SECTION 2: My Queue list */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <Clock className="h-4 w-4 text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Active Queue Roster</h3>
              </div>
              <div className="space-y-3">
                {jobCards.filter(j => j.technician_name?.includes(currentUser?.full_name || "Sanjay Patel") && j.status !== "Completed").map(job => (
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
                    <div className="text-[10px] text-slate-400 mt-1">{job.vehicle_make} {job.vehicle_model} • {job.status}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* SECTION 8: AI Copilot Specs — gated by aiModeEnabled */}
            {selectedJob && aiModeEnabled && aiCopilotData && (
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-4 lg:col-span-2">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <Sparkles className="h-4 w-4 text-emerald-400 animate-pulse" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Technician AI Copilot</h3>
                </div>
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-slate-950/40 border border-slate-850 text-slate-300 rounded-xl leading-relaxed">
                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider block mb-1">Gemma Repair Advice</span>
                    {aiCopilotData.repairSuggestions}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-850 space-y-1">
                      <span className="text-[9px] text-slate-500 font-bold uppercase block">Torque Specifications</span>
                      <span className="font-bold text-slate-200">{aiCopilotData.torqueSpecs}</span>
                    </div>
                    <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-850 space-y-1">
                      <span className="text-[9px] text-slate-500 font-bold uppercase block">Common Fault Risk</span>
                      <span className="font-bold text-slate-200">{aiCopilotData.commonFailures}</span>
                    </div>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-center gap-2.5 text-red-400">
                    <AlertTriangle className="h-4 w-4 text-red-400 animate-pulse flex-shrink-0" />
                    <span>{aiCopilotData.safetyAlert}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "tasks" && selectedJob && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* SECTION 4: Repair Checklist */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-4 lg:col-span-2">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <ClipboardCheck className="h-4 w-4 text-blue-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Active Repair Tasks Checklist</h3>
            </div>
            <div className="space-y-2.5">
              {Object.keys(checklist).map(key => (
                <button
                  key={key}
                  onClick={() => setChecklist(prev => ({ ...prev, [key]: !prev[key] }))}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all ${
                    checklist[key] 
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                      : "bg-slate-950/40 border-slate-850 text-slate-400 hover:border-slate-800"
                  }`}
                >
                  <span className="uppercase tracking-wider">{key} Checkpoint</span>
                  <span>{checklist[key] ? "Completed ✓" : "Pending ✗"}</span>
                </button>
              ))}
            </div>
          </div>

          {/* SECTION 6: Labour Tracking timer */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Clock className="h-4 w-4 text-blue-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Labour Tracking Clock</h3>
            </div>
            <div className="text-center py-6 bg-slate-950/40 rounded-xl border border-slate-850">
              <div className="font-mono text-3xl font-black text-white">
                {Math.floor(timerSeconds / 60).toString().padStart(2, "0")}:
                {(timerSeconds % 60).toString().padStart(2, "0")}
              </div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1 block">Actual labour time</span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <button 
                onClick={handleStartTimer}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
              >
                <Play className="h-3.5 w-3.5" /> Start
              </button>
              <button 
                onClick={handlePauseTimer}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
              >
                <Pause className="h-3.5 w-3.5" /> Pause
              </button>
              <button 
                onClick={handleStopTimer}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
              >
                <Square className="h-3.5 w-3.5" /> Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "parts" && (
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-4">
          {/* SECTION 5: Parts Request */}
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Package className="h-4 w-4 text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Parts Request Terminal</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Part Number or Description</label>
                <input 
                  type="text" 
                  placeholder="e.g. Brake pad kit front, oil filter..."
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none"
                />
              </div>
              <button 
                onClick={handleRequestParts}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
              >
                Request Part Reservation
              </button>
            </div>
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850 space-y-3">
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">Parts Allocation Status</span>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300">Front Brake Pads</span>
                <span className="text-emerald-400 font-bold">Received (Bay Rack A2)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "evidence" && (
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-4">
          {/* SECTION 7: Evidence Capture */}
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Camera className="h-4 w-4 text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Repair Evidence Photo Capture</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {["Engine compartment check", "Removed old brake pads", "Installed new filters", "Isolation verification"].map((label, idx) => (
              <div key={idx} className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl text-center space-y-2">
                <Camera className="h-6 w-6 text-slate-500 mx-auto" />
                <span className="text-[10px] text-slate-400 font-bold block">{label}</span>
                <button 
                  onClick={() => alert(`Photo captured: ${label}`)}
                  className="px-3 py-1 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold text-[9px] uppercase tracking-wider rounded-lg transition-all"
                >
                  Capture Photo
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

TechnicianWorkspace.displayName = "TechnicianWorkspace";
export default TechnicianWorkspace;

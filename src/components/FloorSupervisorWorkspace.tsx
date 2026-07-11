import React, { useState, useMemo } from "react";
import { 
  Wrench, Users, Clock, AlertTriangle, Sparkles, Building2, BarChart3, 
  History, Calendar, CheckSquare, Layers, RefreshCw 
} from "lucide-react";

export interface FloorSupervisorWorkspaceProps {
  jobCards: any[];
  bays: any[];
  employees: any[];
  alertLogs: any[];
  allocations: any[];
  onRefresh: () => void;
  onUpdateJob: (id: number, updatedFields: Partial<any>) => Promise<void>;
  onAssignTechnicians: (id: number, allocs: any[]) => Promise<void>;
  currentUser?: any;
  aiModeEnabled?: boolean;
}

export const FloorSupervisorWorkspace: React.FC<FloorSupervisorWorkspaceProps> = React.memo(({
  jobCards = [],
  bays = [],
  employees = [],
  alertLogs = [],
  allocations = [],
  onRefresh,
  onUpdateJob,
  onAssignTechnicians,
  currentUser,
  aiModeEnabled = true
}) => {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [assignTechId, setAssignTechId] = useState<number | null>(null);
  const [assignBayId, setAssignBayId] = useState<number | null>(null);

  // Derive target job card
  const selectedJob = useMemo(() => {
    return jobCards.find(j => j.job_id === selectedJobId) || jobCards[0] || null;
  }, [jobCards, selectedJobId]);

  // Section 1: Dashboard KPIs
  const supervisorStats = useMemo(() => {
    const active = jobCards.filter(j => j.status === "Active").length;
    const assigned = jobCards.filter(j => j.technician_name && j.status !== "Completed").length;
    const unassigned = jobCards.filter(j => !j.technician_name && ["Waiting", "Active"].includes(j.status)).length;
    const partsPending = jobCards.filter(j => j.current_workflow_state === "PARTS_PENDING").length;
    const waitingQc = jobCards.filter(j => j.current_workflow_state === "QC_PENDING").length;
    const carryForward = jobCards.filter(j => j.status === "Carry Forward").length;
    const rework = jobCards.filter(j => j.status === "Rework" || j.rework_count > 0).length;
    const warnings = alertLogs.filter(a => a.alert_type === "SLA_WARNING" && a.status === "Active").length;

    return {
      active, assigned, unassigned, partsPending, waitingQc, carryForward, rework, warnings,
      bayUtil: bays.length > 0 ? `${Math.round((bays.filter(b => b.status === "Active").length / bays.length) * 100)}%` : "78%"
    };
  }, [jobCards, bays, alertLogs]);

  // Section 3: Technician Control Center list
  const technicianList = useMemo(() => {
    const techs = employees.filter(e => ["Technician", "Electrician"].includes(e.role));
    return techs.map((t, idx) => {
      const activeJob = jobCards.find(j => j.technician_name?.includes(t.full_name) && ["Active", "Rework"].includes(j.status));
      return {
        id: t.employee_id,
        name: t.full_name,
        role: t.role,
        certification: t.certification_level || "Bronze",
        isBusy: !!activeJob,
        currentJob: activeJob ? activeJob.vrn : "Available",
        loadCount: activeJob ? 1 : 0,
        ftr: `${94 - idx}%`
      };
    });
  }, [employees, jobCards]);

  // Section 6: Supervisor AI Copilot recommendations
  const aiRecommendations = useMemo(() => {
    if (!selectedJob) return null;
    const isEV = selectedJob.vehicle_model?.toLowerCase().includes("ev");
    const bestTech = technicianList.find(t => isEV ? t.certification === "Gold" : !t.isBusy) || technicianList[0];
    const bestBay = bays.find(b => isEV ? b.bay_name.toLowerCase().includes("ev") : b.status === "Idle") || bays[0];

    return {
      bestTech: bestTech?.name || "Sanjay Patel",
      bestBay: bestBay?.bay_name || "Bay 1",
      sequence: "1. Diagnostic check -> 2. Electrical isolation -> 3. Parts assembly check",
      partsRisk: isEV ? "Medium risk of HV connector delays" : "Low risk",
      confidence: "95%"
    };
  }, [selectedJob, technicianList, bays]);

  // Handle manual job assignment
  const handleAssignJob = async () => {
    if (!selectedJob) return;
    try {
      if (assignTechId) {
        const techName = employees.find(e => e.employee_id === assignTechId)?.full_name || "";
        await onAssignTechnicians(selectedJob.job_id, [{ employee_id: assignTechId, tech_role: "Primary Technician" }]);
        await onUpdateJob(selectedJob.job_id, { technician_name: techName });
      }
      if (assignBayId) {
        await onUpdateJob(selectedJob.job_id, { bay_id: assignBayId, status: "Active" });
      }
      alert("Job successfully assigned to selected resource.");
      onRefresh();
    } catch (e) {
      alert("Allocation failed.");
    }
  };

  return (
    <div className="space-y-6 bg-[#0B1220] text-slate-100 min-h-screen p-4 md:p-6" lang="en">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
              Floor Execution Cockpit
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white mt-1 uppercase tracking-tight">
            Floor Supervisor Console
          </h1>
        </div>

        {/* Tab triggers */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          {[
            { id: "dashboard", label: "Dashboard Grid" },
            { id: "twin", label: "Live Digital Twin" },
            { id: "technicians", label: "Technician Control" },
            { id: "allocation", label: "Job Allocation" }
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

      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* SECTION 1: Dashboard KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { label: "Active Jobs", val: supervisorStats.active, color: "text-white" },
              { label: "Assigned JCs", val: supervisorStats.assigned, color: "text-blue-400" },
              { label: "Unassigned JCs", val: supervisorStats.unassigned, color: "text-amber-400" },
              { label: "Bay Utilization", val: supervisorStats.bayUtil, color: "text-emerald-400" },
              { label: "Waiting for Parts", val: supervisorStats.partsPending, color: "text-red-400" },
              { label: "SLA Warnings", val: supervisorStats.warnings, color: "text-red-500 font-black animate-pulse" }
            ].map((stat, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center space-y-1">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">{stat.label}</span>
                <span className={`text-lg font-black ${stat.color}`}>{stat.val}</span>
              </div>
            ))}
          </div>

          {/* SECTION 5: Work Progress Board */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Layers className="h-4 w-4 text-blue-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Work Progress Board</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { name: "Waiting list", count: jobCards.filter(j => j.status === "Waiting").length, color: "border-slate-800" },
                { name: "In Progress", count: jobCards.filter(j => j.status === "Active").length, color: "border-blue-500/20" },
                { name: "Parts Pending", count: jobCards.filter(j => j.current_workflow_state === "PARTS_PENDING").length, color: "border-red-500/20" },
                { name: "Completed today", count: jobCards.filter(j => j.status === "Completed").length, color: "border-emerald-500/20" }
              ].map((column, idx) => (
                <div key={idx} className={`bg-slate-950/40 border ${column.color} p-4 rounded-xl text-center space-y-2`}>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">{column.name}</div>
                  <div className="text-2xl font-black text-white">{column.count}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "twin" && (
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-4">
          {/* SECTION 2: Live Workshop Floor Digital Twin */}
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Building2 className="h-4 w-4 text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Live Workshop Floor Digital Twin</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {bays.map(bay => {
              const activeInBay = jobCards.find(j => j.bay_id === bay.bay_id && ["Active", "Rework"].includes(j.status));
              return (
                <div key={bay.bay_id} className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-white uppercase">{bay.bay_name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] ${
                      activeInBay ? "bg-blue-500/10 text-blue-400" : "bg-emerald-500/10 text-emerald-400"
                    }`}>{activeInBay ? "Occupied" : "Available"}</span>
                  </div>
                  {activeInBay ? (
                    <div className="space-y-1.5 text-xs text-slate-300">
                      <div>Vehicle: <span className="font-mono font-bold text-slate-100">{activeInBay.vrn}</span></div>
                      <div>Technician: <span className="font-bold text-slate-100">{activeInBay.technician_name || "Unassigned"}</span></div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 italic">No vehicle active in bay.</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "technicians" && (
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-4">
          {/* SECTION 3: Technician Control Center */}
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Users className="h-4 w-4 text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Technician Roster Status</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {technicianList.map(tech => (
              <div key={tech.id} className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200">{tech.name}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    tech.isBusy ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"
                  }`}>{tech.isBusy ? "Busy" : "Idle"}</span>
                </div>
                <div className="text-xs text-slate-400 space-y-1">
                  <div>Certification: <span className="text-slate-200 font-bold">{tech.certification}</span></div>
                  <div>Current Job: <span className="text-slate-200">{tech.currentJob}</span></div>
                  <div>FTR Rating: <span className="text-emerald-400 font-bold">{tech.ftr}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "allocation" && selectedJob && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* SECTION 4: Job Allocation & Sequence controls */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Calendar className="h-4 w-4 text-blue-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Job Card Allocation</h3>
            </div>
            <div className="space-y-4">
              <div>
                <span className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Target Vehicle</span>
                <span className="font-mono text-xs font-bold text-slate-200">{selectedJob.vrn}</span>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Assign Technician</label>
                <select 
                  onChange={(e) => setAssignTechId(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none"
                >
                  <option value="">Select Technician...</option>
                  {technicianList.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.certification})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Assign Workshop Bay</label>
                <select 
                  onChange={(e) => setAssignBayId(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none"
                >
                  <option value="">Select Bay...</option>
                  {bays.map(b => (
                    <option key={b.bay_id} value={b.bay_id}>{b.bay_name}</option>
                  ))}
                </select>
              </div>
              <button 
                onClick={handleAssignJob}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
              >
                Apply Allocations
              </button>
            </div>
          </div>

          {/* SECTION 6: Supervisor AI Copilot — gated by aiModeEnabled */}
          {aiModeEnabled && aiRecommendations && (
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-4 lg:col-span-2">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <Sparkles className="h-4 w-4 text-emerald-400 animate-pulse" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Supervisor AI Copilot</h3>
              </div>
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-850 text-slate-300 leading-relaxed">
                  <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider block mb-1">Recommended Sequence</span>
                  {aiRecommendations.sequence}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-850">
                    <span className="text-[9px] text-slate-500 font-bold uppercase block">Best Technician Match</span>
                    <span className="font-bold text-slate-200">{aiRecommendations.bestTech}</span>
                  </div>
                  <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-850">
                    <span className="text-[9px] text-slate-500 font-bold uppercase block">Best Bay Match</span>
                    <span className="font-bold text-slate-200">{aiRecommendations.bestBay}</span>
                  </div>
                </div>
                <div className="flex justify-between border-t border-slate-850 pt-3 text-[10px] text-slate-400 uppercase font-bold">
                  <span>Inference Confidence: <span className="text-emerald-400">{aiRecommendations.confidence}</span></span>
                  <span>Parts Delay Risk: <span className="text-amber-400">{aiRecommendations.partsRisk}</span></span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

FloorSupervisorWorkspace.displayName = "FloorSupervisorWorkspace";
export default FloorSupervisorWorkspace;

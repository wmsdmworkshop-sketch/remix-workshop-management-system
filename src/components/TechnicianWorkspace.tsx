import React, { useState, useMemo, useEffect, useCallback } from "react";
import { isWorkCompleteStatus } from "../types";
import { 
  Wrench, Play, Pause, Square, Sparkles, ClipboardCheck, Package, 
  Camera, BarChart3, Clock, AlertTriangle, FileText, CheckCircle2 
} from "lucide-react";
import { AICopilotPanel } from "./AICopilotPanel";
import MediaAttach from "./MediaAttach";
import { ComplaintsPanel } from "./ComplaintsPanel";
import { getStaffToken } from "../lib/authToken";

export interface TechnicianWorkspaceProps {
  jobCards: any[];
  employees: any[];
  onRefresh: () => void;
  onUpdateJob: (id: number, updatedFields: Partial<any>) => Promise<boolean | void>;
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
  // Completed-work drill-down, opened from the "Completed" KPI tile.
  const [showCompleted, setShowCompleted] = useState<boolean>(false);

  // Labour timer tracking states
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [timerIntervalId, setTimerIntervalId] = useState<any>(null);

  // Repair checklist status
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    isolation: true, diagnostic: false, disassembly: false, assembly: false, selfQc: false
  });

  // Parts request form + status
  const [partDescription, setPartDescription] = useState("");
  const [partQuantity, setPartQuantity] = useState(1);
  const [partUrgency, setPartUrgency] = useState<"NORMAL" | "URGENT">("NORMAL");
  const [partsRequests, setPartsRequests] = useState<any[]>([]);
  const [submittingPartRequest, setSubmittingPartRequest] = useState(false);
  const [completingJob, setCompletingJob] = useState(false);

  // Jobs actually allocated to THIS technician (job_card_master.assigned_to
  // == my employee_id, the single-technician allocation flow that's wired
  // up). This used to include any job with NO technician assigned at all —
  // "unassigned" was being treated as "assigned to everyone" — which, while
  // floor allocation was broken, meant the entire open backlog counted as
  // this technician's own queue. Oldest-first so the "current" job is the
  // one that's been waiting longest.
  const myJobs = useMemo(() => {
    const myId = currentUser?.employee_id;
    if (myId == null) return [];
    return jobCards
      .filter(j => Number(j.assigned_to) === Number(myId) && !isWorkCompleteStatus(j.status))
      .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
  }, [jobCards, currentUser]);

  // Target job card lookup — defaults to this technician's own oldest queued
  // job, never to jobCards[0] (an arbitrary card unrelated to them). A stale
  // selectedJobId pointing at a job no longer in myJobs (e.g. reassigned
  // away) also falls back to myJobs[0] rather than leaking another job.
  const selectedJob = useMemo(() => {
    return myJobs.find(j => j.job_id === selectedJobId) || myJobs[0] || null;
  }, [myJobs, selectedJobId]);

  /**
   * This technician's finished work, newest first.
   *
   * Drives both the "Completed" KPI and the drill-down list below it, so the
   * number and the list can never disagree.
   */
  const myCompletedJobs = useMemo(() => {
    const myId = currentUser?.employee_id;
    if (myId == null) return [];
    return jobCards
      .filter(j => Number(j.assigned_to) === Number(myId) && isWorkCompleteStatus(j.status))
      .sort((a, b) => {
        const at = new Date(a.completed_at || a.updated_at || 0).getTime();
        const bt = new Date(b.completed_at || b.updated_at || 0).getTime();
        return bt - at;
      });
  }, [jobCards, currentUser]);

  // Section 1: Dashboard KPIs
  const dashboardStats = useMemo(() => {
    const myId = currentUser?.employee_id;
    // NOT "today". This counts every job this technician has finished, which is
    // what the list below shows. The tile used to be labelled "Completed Today"
    // while counting all of them — a technician with one job finished last week
    // saw "Completed Today: 1" on a day he had completed nothing.
    const completed = myCompletedJobs.length;
    const reworkCount = jobCards.filter(j => j.rework_count && j.rework_count > 0).length;
    const totalCount = completed + myJobs.length;
    const ftrVal = totalCount > 0
      ? `${Math.round(((totalCount - reworkCount) / totalCount) * 100)}%`
      : "100%";

    return {
      assignedCount: myJobs.length,
      currentJob: myJobs[0]?.vrn || "No active assignment",
      completedCount: completed,
      productivity: totalCount > 0 ? "100%" : "0%",
      ftr: ftrVal,
      rework: `${reworkCount}`
    };
  }, [jobCards, myJobs, myCompletedJobs, currentUser]);

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

  const authHeaders = (): Record<string, string> => {
    const t = getStaffToken();
    return t ? { "Content-Type": "application/json", Authorization: `Bearer ${t}` } : { "Content-Type": "application/json" };
  };

  // Loads this job's parts requests (for the Parts Desk status list + the
  // completion gate's "unresolved parts" check the backend also enforces).
  const loadPartsRequests = useCallback(async (jobCardId: string) => {
    if (!jobCardId) { setPartsRequests([]); return; }
    try {
      const res = await fetch(`/api/floor-execution/parts-status/${encodeURIComponent(jobCardId)}`, { headers: authHeaders() });
      const data = await res.json();
      setPartsRequests(Array.isArray(data?.data) ? data.data : []);
    } catch {
      setPartsRequests([]);
    }
  }, []);

  useEffect(() => {
    if (selectedJob?.job_card_no) loadPartsRequests(selectedJob.job_card_no);
  }, [selectedJob?.job_card_no, loadPartsRequests]);

  // Technician marks the job QC-ready. The backend's completion gate
  // (validateFloorCompletionGate, inside handoffToQc) blocks this — with the
  // real reason — if parts requests or customer-approval findings are still
  // open, so we surface whatever it returns rather than guessing here.
  const handleStopTimer = async () => {
    handlePauseTimer();
    if (!selectedJob) return;
    setCompletingJob(true);
    try {
      const minutesSpent = Math.max(1, Math.round(timerSeconds / 60));
      const res = await fetch("/api/floor-execution/qc-handoff", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ jobCardId: selectedJob.job_card_no, vrn: selectedJob.vrn }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.error || "Cannot hand off to QC yet.");
        setCompletingJob(false);
        return;
      }
      await onUpdateJob(selectedJob.job_id, {
        actual_tat: (selectedJob.actual_tat || 0) + minutesSpent,
        status: "Completed",
        current_workflow_state: "QC_PENDING"
      });
      setTimerSeconds(0);
      alert("Job handed off to QC Inspector.");
      onRefresh();
    } catch (e: any) {
      alert(`Failed to hand off to QC: ${e.message || "network error"}`);
    }
    setCompletingJob(false);
  };

  // Parts request submit — real POST to the parts sub-flow (15-min query/issue
  // TAT), replacing what used to be a bare alert() with no backing request.
  const handleRequestParts = async () => {
    if (!selectedJob) return;
    if (!partDescription.trim()) { alert("Enter a part number or description first."); return; }
    setSubmittingPartRequest(true);
    try {
      const res = await fetch("/api/floor-execution/parts-request", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          jobCardId: selectedJob.job_card_no,
          vrn: selectedJob.vrn,
          partDescription: partDescription.trim(),
          quantity: partQuantity,
          urgency: partUrgency,
        }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data?.error || "Failed to submit parts request."); setSubmittingPartRequest(false); return; }
      setPartDescription("");
      setPartQuantity(1);
      setPartUrgency("NORMAL");
      await loadPartsRequests(selectedJob.job_card_no);
    } catch (e: any) {
      alert(`Failed to submit parts request: ${e.message || "network error"}`);
    }
    setSubmittingPartRequest(false);
  };

  return (
    <div className="space-y-6 bg-[#0B1220] text-slate-100 min-h-screen p-4 md:p-6" lang="en">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="ds-button-success flex h-2 w-2 rounded-full   animate-pulse" />
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
            { id: "evidence", label: "Evidence Capture" },
            { id: "copilot", label: "Technician AI Copilot" }
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

      {activeTab === "copilot" && (
        <div className="space-y-6">
          <AICopilotPanel 
            role="Technician"
            context={{
              selectedJobId: selectedJob?.job_id,
              vin: selectedJob?.vin,
              makeModel: `${selectedJob?.vehicle_make || ""} ${selectedJob?.vehicle_model || ""}`
            }}
          />
        </div>
      )}

      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* SECTION 1: Dashboard stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Assigned Jobs", val: dashboardStats.assignedCount, color: "text-white" },
              { label: "Current Vehicle", val: dashboardStats.currentJob, color: "text-blue-400 font-mono" },
              // "Completed" without "Today": the figure is this technician's
              // whole finished history, and the tile opens that list.
              { label: "Completed", val: dashboardStats.completedCount, color: "text-emerald-400", drill: true },
              { label: "FTR Performance", val: dashboardStats.ftr, color: "text-amber-400" }
            ].map((stat, idx) => (
              stat.drill ? (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setShowCompleted(v => !v)}
                  aria-expanded={showCompleted}
                  title="Show my completed jobs"
                  className={`bg-slate-900 border p-4 rounded-xl text-center space-y-1 transition-all cursor-pointer hover:border-emerald-600/40 ${
                    showCompleted ? "border-emerald-600/40 ring-1 ring-emerald-600/20" : "border-slate-800"
                  }`}
                >
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">{stat.label}</span>
                  <span className={`text-lg font-black ${stat.color}`}>{stat.val}</span>
                  <span className="text-[9px] text-emerald-500/70 font-bold uppercase tracking-wider block">
                    {showCompleted ? "Hide list" : "View list"}
                  </span>
                </button>
              ) : (
                <div key={idx} className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center space-y-1">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">{stat.label}</span>
                  <span className={`text-lg font-black ${stat.color}`}>{stat.val}</span>
                </div>
              )
            ))}
          </div>

          {/* SECTION 1b: Completed work drill-down (opened from the KPI tile) */}
          {showCompleted && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-lg overflow-hidden">
              <div className="flex items-center gap-2 p-5 pb-3 border-b border-slate-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">My Completed Jobs</h3>
                <span className="text-[10px] text-slate-500 font-bold">({myCompletedJobs.length})</span>
              </div>

              {myCompletedJobs.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">
                  You have no completed jobs yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[9px] text-slate-500 font-bold uppercase tracking-wider border-b border-slate-850">
                        <th className="px-5 py-2.5">Job Card</th>
                        <th className="px-5 py-2.5">Vehicle</th>
                        <th className="px-5 py-2.5">Completed</th>
                        <th className="px-5 py-2.5">Status</th>
                        <th className="px-5 py-2.5 text-right">Labour Billed</th>
                        <th className="px-5 py-2.5">Invoice</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myCompletedJobs.map(job => {
                        // LABOUR IS SHOWN ONLY WHEN IT WAS ACTUALLY BILLED.
                        // The per-technician labour split lives in
                        // job_card_technician.labour_share, which is not yet
                        // written by the live save path, so for almost every
                        // job there is no collected figure to show. The
                        // estimate is NOT substituted here: a technician
                        // reading his own earnings must not be shown a quoted
                        // amount formatted as money he has earned.
                        const billed = job.labour_share ?? job.labour_amount ?? null;
                        const hasBilled = billed != null && Number(billed) > 0;
                        const isPaid = String(job.billing_status || "").toLowerCase() === "paid";

                        return (
                          <tr key={job.job_id} className="border-b border-slate-850/60 text-xs hover:bg-slate-950/40">
                            <td className="px-5 py-3 font-mono text-slate-300">{job.job_card_no || "—"}</td>
                            <td className="px-5 py-3 font-mono font-bold text-slate-200">{job.vrn || "—"}</td>
                            <td className="px-5 py-3 text-slate-400">
                              {job.completed_at
                                ? new Date(job.completed_at).toLocaleDateString("en-IN", {
                                    day: "2-digit", month: "short", year: "numeric"
                                  })
                                : <span className="text-slate-600">Not recorded</span>}
                            </td>
                            <td className="px-5 py-3">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                job.status === "Delivered"
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                              }`}>
                                {job.status}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right font-mono">
                              {hasBilled ? (
                                <span className="text-emerald-400 font-bold">
                                  ₹{Number(billed).toLocaleString("en-IN")}
                                </span>
                              ) : (
                                // Honest blank, with the reason. Not ₹0 — zero
                                // would read as "you earned nothing".
                                <span className="text-slate-600" title="No labour split has been recorded against this job yet">
                                  Not yet billed
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3">
                              {job.invoice_no ? (
                                <span className="font-mono text-slate-300">{job.invoice_no}</span>
                              ) : (
                                <span className={`text-[10px] font-bold ${isPaid ? "text-amber-500" : "text-slate-600"}`}>
                                  {isPaid ? "Paid, no invoice no." : "Not invoiced"}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Say plainly why the money column is mostly empty, rather
                      than leaving the technician to assume he was unpaid. */}
                  {myCompletedJobs.every(j => !(j.labour_share ?? j.labour_amount)) && (
                    <p className="text-[10px] text-slate-500 px-5 py-3 border-t border-slate-850 leading-relaxed">
                      Labour amounts appear here once the job is invoiced and the labour split is
                      recorded against your name. None of these jobs has a recorded split yet — this
                      is not a statement that the work was unpaid. Ask your supervisor to confirm
                      billing.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: My Queue list */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <Clock className="h-4 w-4 text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Active Queue Roster</h3>
              </div>
              <div className="space-y-3">
                {myJobs.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No jobs currently assigned in active queue roster.</p>
                ) : myJobs.map(job => (
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
                    <div className="text-[10px] text-blue-400 mt-1 font-bold">
                      {job.bay_no ? `Bay: ${job.bay_no}` : job.bay_id ? `Bay: ${job.bay_id}` : "Bay: Not yet allocated"}
                    </div>
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
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs bg-slate-950/40 border border-slate-850 rounded-xl px-3 py-2">
              <span className="font-mono font-bold text-white">{selectedJob.vrn}</span>
              <span className="text-slate-400">{selectedJob.vehicle_make} {selectedJob.vehicle_model}</span>
              <span className="text-blue-400 font-bold">
                {selectedJob.bay_no ? `Bay: ${selectedJob.bay_no}` : selectedJob.bay_id ? `Bay: ${selectedJob.bay_id}` : "Bay: Not yet allocated"}
              </span>
            </div>
            <ComplaintsPanel vrn={selectedJob.vrn} />
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
                className="ds-button-success flex items-center justify-center gap-1.5 py-2.5   hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
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
                className="ds-button-danger flex items-center justify-center gap-1.5 py-2.5   hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
              >
                <Square className="h-3.5 w-3.5" /> Complete
              </button>
            </div>
          </div>

          <div className="lg:col-span-3">
            <MediaAttach
              jobCardNo={selectedJob.job_card_no}
              vrn={selectedJob.vrn}
              title="Work Photos"
              categories={[
                { key: "WORK_PHOTO", label: "Work / progress photo" },
                { key: "PARTS_PHOTO", label: "Parts photo" },
              ]}
            />
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
                  value={partDescription}
                  onChange={(e) => setPartDescription(e.target.value)}
                  placeholder="e.g. Brake pad kit front, oil filter..."
                  className="ds-input w-full   border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={partQuantity}
                    onChange={(e) => setPartQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Urgency</label>
                  <select
                    value={partUrgency}
                    onChange={(e) => setPartUrgency(e.target.value as "NORMAL" | "URGENT")}
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>
              <button
                onClick={handleRequestParts}
                disabled={submittingPartRequest || !selectedJob}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
              >
                {submittingPartRequest ? "Submitting…" : "Request Part Reservation"}
              </button>
            </div>
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850 space-y-3">
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">Parts Request Status</span>
              {partsRequests.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">No parts requested for this job yet.</p>
              ) : (
                partsRequests.map((p) => (
                  <div key={p.request_id} className="flex justify-between items-center text-xs border-b border-slate-900 pb-2 last:border-0 last:pb-0">
                    <span className="text-slate-300">{p.part_description} {p.quantity > 1 ? `(x${p.quantity})` : ""}</span>
                    <span className={`font-bold ${
                      p.status === "FULFILLED" ? "text-emerald-400" :
                      p.status === "ACKNOWLEDGED" ? "text-amber-400" :
                      p.status === "BACKORDERED" ? "text-red-400" : "text-slate-400"
                    }`}>
                      {p.status}
                    </span>
                  </div>
                ))
              )}
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

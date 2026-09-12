import React, { useState, useMemo, useEffect } from "react";
import { isOpenJobStatus, isWorkCompleteStatus } from "../types";
import { 
  Wrench, Users, Clock, AlertTriangle, Sparkles, Building2, BarChart3, 
  History, Calendar, CheckSquare, Layers, RefreshCw, CheckCircle2, 
  ArrowRight, ShieldCheck, Play, Pause, Send, AlertOctagon, UserCheck, Tag
} from "lucide-react";
import { ComplaintsPanel } from "./ComplaintsPanel";

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
  const [activeTab, setActiveTab] = useState<string>("my-attention");
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  // Allocation Modal State
  const [showAllocateModal, setShowAllocateModal] = useState<boolean>(false);
  const [selectedAllocationJob, setSelectedAllocationJob] = useState<any | null>(null);
  const [selectedBay, setSelectedBay] = useState<string>("B-01");
  const [selectedTech, setSelectedTech] = useState<string>("TECH-001");
  const [isOverride, setIsOverride] = useState<boolean>(false);
  const [overrideReason, setOverrideReason] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Real bay roster for the allocation modal. This used to be four hardcoded
  // <option> elements (a stale snapshot of tbl_bays that never picked up new
  // bays or reflected live status) — now fetched from the same endpoint
  // getBaysStatus() backs, on demand each time the modal opens.
  const [floorBays, setFloorBays] = useState<any[]>([]);
  const [floorBaysLoading, setFloorBaysLoading] = useState<boolean>(false);
  const [floorBaysError, setFloorBaysError] = useState<string>("");

  useEffect(() => {
    if (!showAllocateModal) return;
    let cancelled = false;
    setFloorBaysLoading(true);
    setFloorBaysError("");
    (async () => {
      try {
        const token = localStorage.getItem("dwip_token") || localStorage.getItem("token") || localStorage.getItem("wms_token");
        const res = await fetch("/api/floor-execution/bays", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.success) {
          const list = Array.isArray(data.data) ? data.data : [];
          setFloorBays(list);
          const firstAvailable = list.find((b: any) => String(b.status || "").toUpperCase() === "AVAILABLE") || list[0];
          if (firstAvailable) setSelectedBay(firstAvailable.bayId);
        } else {
          setFloorBaysError(data.error || "Could not load bays.");
        }
      } catch (e: any) {
        if (!cancelled) setFloorBaysError(e.message || "Network error loading bays.");
      } finally {
        if (!cancelled) setFloorBaysLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [showAllocateModal]);

  // Real pending-handoff queue (GET /api/floor-execution/new-jobs). "Immediate
  // Handoffs" and "My New Jobs" used to render raw/sliced `jobCards` — the
  // first 3, or literally all ~100+ of them hardcoded "UNALLOCATED" — with no
  // connection to real handoff/allocation state, so no action could ever make
  // an item disappear from either list. This fetches the actual queue
  // getFloorPendingQueue() already builds server-side.
  const [pendingQueue, setPendingQueue] = useState<any[]>([]);
  const [pendingQueueLoading, setPendingQueueLoading] = useState<boolean>(false);
  const [pendingQueueError, setPendingQueueError] = useState<string>("");

  const fetchPendingQueue = React.useCallback(async () => {
    setPendingQueueLoading(true);
    setPendingQueueError("");
    try {
      const token = localStorage.getItem("dwip_token") || localStorage.getItem("token") || localStorage.getItem("wms_token");
      const res = await fetch("/api/floor-execution/new-jobs", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPendingQueue(Array.isArray(data.data) ? data.data : []);
      } else {
        setPendingQueueError(data.error || "Could not load pending handoffs.");
      }
    } catch (e: any) {
      setPendingQueueError(e.message || "Network error loading pending handoffs.");
    } finally {
      setPendingQueueLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingQueue();
  }, [fetchPendingQueue]);

  // Derive target job card
  const selectedJob = useMemo(() => {
    return jobCards.find(j => j.job_id === selectedJobId) || jobCards[0] || null;
  }, [jobCards, selectedJobId]);

  // Section 1: Dashboard KPIs
  const supervisorStats = useMemo(() => {
    const active = jobCards.filter(j => j.status === "Active").length;
    const assigned = jobCards.filter(j => j.technician_name && j.status !== "Completed").length;
    const unassigned = jobCards.filter(j => !j.technician_name && isOpenJobStatus(j.status)).length;
    const partsPending = jobCards.filter(j => j.current_workflow_state === "PARTS_PENDING").length;
    const waitingQc = jobCards.filter(j => j.current_workflow_state === "QC_PENDING").length;
    const warnings = alertLogs.filter(a => a.alert_type === "SLA_WARNING" && a.status === "Active").length;

    const activeBaysCount = bays.length > 0 
      ? bays.filter(b => ["Active", "Occupied", "IN_USE", "BUSY"].includes(b.status)).length 
      : Math.min(5, active);
    const totalBaysCount = bays.length > 0 ? bays.length : 5;
    const bayUtil = `${Math.round((activeBaysCount / totalBaysCount) * 100)}%`;

    return {
      active, assigned, unassigned, partsPending, waitingQc, warnings, bayUtil
    };
  }, [jobCards, bays, alertLogs]);

  // Technician Roster
  const technicianList = useMemo(() => {
    const techs = employees.filter(e => ["Technician", "Electrician", "Mechanic"].includes(e.role));
    return techs.map((t, idx) => {
      const activeJob = jobCards.find(j => j.technician_name?.includes(t.full_name) && j.status === "In Progress");
      return {
        id: `TECH-${t.employee_id}`,
        name: t.full_name,
        role: t.role,
        certification: t.qualification || "Bronze",
        isBusy: !!activeJob,
        currentJob: activeJob ? activeJob.vrn : "Available",
        loadCount: activeJob ? 1 : 0
      };
    });
  }, [employees, jobCards]);

  const handleAcknowledge = async (jobCardId: string) => {
    try {
      const token = localStorage.getItem("dwip_token") || localStorage.getItem("token") || localStorage.getItem("wms_token");
      const res = await fetch("/api/floor-execution/acknowledge-handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ jobCardId })
      });
      if (res.ok) {
        alert(`✅ Handoff for ${jobCardId} Acknowledged! SLA timer stopped.`);
        onRefresh();
        fetchPendingQueue();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Acknowledge failed: ${err.error || res.statusText}`);
      }
    } catch (e: any) {
      alert(`Acknowledge failed: ${e.message || "network error"}`);
    }
  };

  const handleAllocateCommit = async () => {
    if (!selectedAllocationJob) return;
    if (isOverride && !overrideReason) {
      alert("Please provide a mandatory reason for overriding the AI recommendation.");
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("dwip_token") || localStorage.getItem("token") || localStorage.getItem("wms_token");
      const res = await fetch("/api/floor-execution/allocate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          jobCardId: selectedAllocationJob.jobCardId || selectedAllocationJob.vrn,
          bayId: selectedBay,
          technicianId: selectedTech,
          // Compare as strings (ids may be numeric) so the correct technician
          // name is resolved. Never fabricate a fallback name — an unmatched id
          // must surface honestly, not silently record a hardcoded technician.
          technicianName: technicianList.find(t => String(t.id) === selectedTech)?.name || "",
          isOverride,
          overrideReason
        })
      });

      if (res.ok) {
        alert(`✨ Vehicle allocated to Bay ${selectedBay} and Technician ${selectedTech}!`);
        setShowAllocateModal(false);
        onRefresh();
        fetchPendingQueue();
      } else {
        const err = await res.json();
        alert(`Allocation failed: ${err.error || "Bay or Technician unavailable"}`);
      }
    } catch (e: any) {
      alert(`Allocation error: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendToQc = async (jobCardId: string, vrn: string) => {
    try {
      const token = localStorage.getItem("dwip_token") || localStorage.getItem("token") || localStorage.getItem("wms_token");
      const res = await fetch("/api/floor-execution/qc-handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ jobCardId, vrn, qcInchargeId: "QC-INCHARGE-01" })
      });
      if (res.ok) {
        alert(`🚀 Vehicle ${vrn} marked READY FOR QC! Transferred to QC In-Charge with 5-minute SLA.`);
        onRefresh();
      } else {
        const err = await res.json();
        alert(`QC Handoff blocked: ${err.error || "Unresolved dependencies remain"}`);
      }
    } catch (e: any) {
      alert(`QC Handoff error: ${e.message}`);
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
              FLOOR CONTROL • MY WORKSPACE
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white mt-1 uppercase tracking-tight">
            Floor In-Charge Command Center
          </h1>
        </div>

        <button 
          onClick={onRefresh}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5 text-blue-400" />
          <span>Sync Workspace</span>
        </button>
      </div>

      {/* Tab Triggers */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-800">
        {[
          { id: "my-attention", label: "MY ATTENTION", count: pendingQueue.length + supervisorStats.warnings },
          { id: "my-new-jobs", label: "MY NEW JOBS", count: pendingQueue.length },
          { id: "my-bays", label: "MY BAYS", count: bays.length || 5 },
          { id: "my-techs", label: "MY TECHNICIANS", count: technicianList.length || 3 },
          { id: "my-delays", label: "MY DELAYS", count: supervisorStats.partsPending }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === tab.id 
                ? "bg-blue-600 text-white" 
                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== null && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-200 font-mono">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: MY ATTENTION */}
      {activeTab === "my-attention" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Active Jobs", val: supervisorStats.active, color: "text-white" },
              { label: "Unallocated", val: pendingQueue.length, color: "text-amber-400 font-bold" },
              { label: "Bay Utilization", val: supervisorStats.bayUtil, color: "text-emerald-400" },
              { label: "SLA Alerts", val: supervisorStats.warnings, color: "text-red-400 font-black" }
            ].map((stat, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center space-y-1">
                <span className="text-[9px] text-slate-500 font-bold uppercase block">{stat.label}</span>
                <span className={`text-lg font-black ${stat.color}`}>{stat.val}</span>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Immediate Handoffs & Action Required</h3>
            {pendingQueueLoading ? (
              <p className="text-xs text-slate-500 text-center py-6">Loading pending handoffs…</p>
            ) : pendingQueueError ? (
              <p className="text-xs text-red-400 text-center py-6">{pendingQueueError}</p>
            ) : pendingQueue.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No pending handoffs — you're caught up.</p>
            ) : pendingQueue.slice(0, 3).map(j => (
              <div key={j.jobCardId} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between gap-4">
                <div>
                  <span className="font-mono text-base font-black text-white">{j.vrn}</span>
                  <p className="text-xs text-slate-400">{j.vehicleModel} • SA: {j.saName || "Unassigned"}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAcknowledge(j.jobCardId)}
                    className="px-3 py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-bold uppercase rounded-xl cursor-pointer"
                  >
                    ACKNOWLEDGE
                  </button>
                  <button
                    onClick={() => {
                      setSelectedAllocationJob({ jobCardId: j.jobCardId, vrn: j.vrn });
                      setShowAllocateModal(true);
                    }}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase rounded-xl cursor-pointer"
                  >
                    ALLOCATE
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: MY NEW JOBS */}
      {activeTab === "my-new-jobs" && (
        <div className="space-y-4">
          {pendingQueueLoading ? (
            <p className="text-xs text-slate-500 text-center py-10">Loading pending handoffs…</p>
          ) : pendingQueueError ? (
            <p className="text-xs text-red-400 text-center py-10">{pendingQueueError}</p>
          ) : pendingQueue.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-10">No unallocated jobs — you're caught up.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingQueue.map(j => (
                <div key={j.jobCardId} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-base font-black text-white">{j.vrn}</span>
                      <span className="text-xs text-slate-400 block">{j.vehicleModel}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400">UNALLOCATED</span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 text-xs space-y-1">
                    <div className="flex justify-between"><span className="text-slate-400">SA:</span><span className="font-bold text-slate-200">{j.saName || "Unassigned"}</span></div>
                  </div>

                  <ComplaintsPanel vrn={j.vrn} compact />

                  <button
                    onClick={() => {
                      setSelectedAllocationJob({ jobCardId: j.jobCardId, vrn: j.vrn });
                      setShowAllocateModal(true);
                    }}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer"
                  >
                    ALLOCATE BAY & TECHNICIAN
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MY BAYS */}
      {activeTab === "my-bays" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* No placeholder bays. This used to fall back to B-01/B-02/B-03 with
              invented occupancy whenever the real bay list was empty, so a
              supervisor could plan against three bays that do not exist. */}
          {bays.length === 0 ? (
            <p className="md:col-span-3 py-10 text-center text-slate-500 text-xs italic">
              No bays are configured for this workshop yet.
            </p>
          ) : (
            bays.map((b: any) => (
              <div key={b.bay_id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white text-xs uppercase">{b.bay_name}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    b.status === "Occupied" ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"
                  }`}>{b.status}</span>
                </div>
                {b.bay_type && <p className="text-xs text-slate-400">{b.bay_type}</p>}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 4: MY TECHNICIANS */}
      {activeTab === "my-techs" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {technicianList.map(t => (
            <div key={t.id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-white text-xs">{t.name}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  t.isBusy ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"
                }`}>{t.isBusy ? "Busy" : "Available"}</span>
              </div>
              <p className="text-xs text-slate-400">{t.role} • Cert: <span className="text-slate-200 font-bold">{t.certification}</span></p>
              <div className="flex justify-between border-t border-slate-850 pt-2 text-[10px] text-slate-400">
                <span>Current: {t.currentJob}</span>
                <span>Workload: {t.loadCount}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 5: MY DELAYS */}
      {activeTab === "my-delays" && (
        <div className="space-y-3 text-xs">
          {/* This tab previously showed one hardcoded delay ("WAITING FOR PARTS
              (18m)", VRN KA32M9988, requested by "Tech Ravi Kumar") that never
              came from any job. Delay tracking is not wired to this view yet, so
              it now says so rather than inventing an entry. */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-center text-slate-500">
            <p className="font-semibold">No delays recorded</p>
            <p className="text-[11px] mt-1">Parts and approval delays raised against your jobs will appear here.</p>
          </div>
        </div>
      )}

      {/* ALLOCATION MODAL */}
      {showAllocateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-base font-black text-white">ALLOCATE BAY & TECHNICIAN</h2>
              <button onClick={() => setShowAllocateModal(false)} className="text-slate-400 text-xs">✕</button>
            </div>

            {/* No recommendation is shown here: this panel previously printed a
                STATIC "AI SUGGESTION" naming a bay and a technician ("Bay 01 +
                Ravi Kumar, HCV Heavy Duty certified, lowest active workload").
                Nothing was computed — the text was hardcoded, so it named the
                same person on every job card regardless of who was available.
                Choose the bay and technician below. */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Select Bay</label>
                {floorBaysLoading ? (
                  <div className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-slate-500">Loading bays…</div>
                ) : floorBaysError ? (
                  <div className="w-full bg-red-950/40 border border-red-900 rounded-xl p-2.5 text-red-300">{floorBaysError}</div>
                ) : (
                  <select
                    value={selectedBay}
                    onChange={(e) => setSelectedBay(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-slate-200 outline-none"
                  >
                    {floorBays.length === 0 && <option value="">No bays configured</option>}
                    {floorBays.map((b: any) => {
                      const status = String(b.status || "").toUpperCase();
                      const isAvailable = status === "AVAILABLE";
                      return (
                        <option key={b.bayId} value={b.bayId} disabled={!isAvailable}>
                          {b.bayName} {b.bayType ? `(${b.bayType})` : ""}{!isAvailable ? ` — ${status}` : ""}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Select Technician</label>
                <select
                  value={selectedTech}
                  onChange={(e) => setSelectedTech(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-slate-200 outline-none"
                >
                  {technicianList.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.certification}) - {t.isBusy ? "Busy" : "Available"}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="override"
                  checked={isOverride}
                  onChange={(e) => setIsOverride(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-blue-600"
                />
                <label htmlFor="override" className="text-slate-400 text-xs cursor-pointer font-bold">
                  Override AI Recommendation
                </label>
              </div>

              {isOverride && (
                <div>
                  <label className="block text-[10px] font-bold text-amber-400 uppercase mb-1">Override Reason (Required)</label>
                  <input
                    type="text"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="State reason for overriding AI recommendation..."
                    className="w-full bg-slate-950 border border-amber-500/40 rounded-xl p-2 text-xs text-white"
                  />
                </div>
              )}
            </div>

            <button
              onClick={handleAllocateCommit}
              disabled={submitting}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer"
            >
              {submitting ? "Allocating..." : "CONFIRM ALLOCATION"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

FloorSupervisorWorkspace.displayName = "FloorSupervisorWorkspace";
export default FloorSupervisorWorkspace;

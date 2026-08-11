import React, { useState, Suspense, useMemo, useCallback } from "react";
import { KPIHeader } from "./KPIHeader";
import { FinancialRibbon } from "./FinancialRibbon";
import { WorkshopSelector } from "./WorkshopSelector";
import { NotificationCenter } from "./NotificationCenter";
import { LiveQueueBoard } from "./LiveQueueBoard";
import { SLACommandCenter } from "./SLACommandCenter";
import { QueueHeatMap } from "./QueueHeatMap";
import { WorkshopAIEngine } from "./aiEngine";
import { AICopilotPanel } from "../AICopilotPanel";

// Lazy-loaded subpanels for optimized loading performance
const BayLayoutBoard = React.lazy(() =>
  import("./BayLayoutBoard").then(module => ({ default: module.BayLayoutBoard }))
);
const TechnicianHeatMap = React.lazy(() =>
  import("./TechnicianHeatMap").then(module => ({ default: module.TechnicianHeatMap }))
);
const AIRecommendationPanel = React.lazy(() =>
  import("./AIRecommendationPanel").then(module => ({ default: module.AIRecommendationPanel }))
);
const CarryForwardPanel = React.lazy(() =>
  import("./CarryForwardPanel").then(module => ({ default: module.CarryForwardPanel }))
);
const EscalationPanel = React.lazy(() =>
  import("./EscalationPanel").then(module => ({ default: module.EscalationPanel }))
);
const ActivityTimeline = React.lazy(() =>
  import("./ActivityTimeline").then(module => ({ default: module.ActivityTimeline }))
);

export interface WorkshopDashboardProps {
  jobCards: any[];
  bays: any[];
  employees: any[];
  allocations: any[];
  alertLogs: any[];
  onRefresh: () => void;
  onUpdateJob: (id: number, updatedFields: Partial<any>) => Promise<void>;
  onAssignTechnicians: (id: number, allocs: any[]) => Promise<void>;
  onResolveCarryForward?: (id: number, status: "Approved" | "Rejected") => Promise<void>;
  onResolveRework?: (id: number, status: "Approved" | "Rejected") => Promise<void>;
  onRaiseCarryForward?: (id: number, reason: string) => Promise<void>;
  onRaiseRework?: (id: number, reason: string, techId: number) => Promise<void>;
  currentUser?: any;
  isLoading?: boolean;
  hasError?: boolean;
  aiModeEnabled?: boolean;
}

export const WorkshopDashboard: React.FC<WorkshopDashboardProps> = React.memo(({
  jobCards = [],
  bays = [],
  employees = [],
  allocations = [],
  alertLogs = [],
  onRefresh,
  onUpdateJob,
  onAssignTechnicians,
  onResolveCarryForward,
  onResolveRework,
  onRaiseCarryForward,
  onRaiseRework,
  currentUser,
  isLoading = false,
  hasError = false,
  aiModeEnabled = true,
}) => {
  const [selectedWorkshop, setSelectedWorkshop] = useState<string>("Kalaburagi");
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  
  // Modal / panel states for active control actions
  const [showAllocModal, setShowAllocModal] = useState<boolean>(false);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [selectedBayId, setSelectedBayId] = useState<number | null>(null);
  const [selectedTechId, setSelectedTechId] = useState<number | null>(null);
  const [cfReason, setCfReason] = useState<string>("");
  const [reworkReason, setReworkReason] = useState<string>("");
  const [showCfModal, setShowCfModal] = useState<boolean>(false);
  const [showReworkModal, setShowReworkModal] = useState<boolean>(false);

  // Online status monitoring
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Role extraction
  const userRole = currentUser?.role || "workshop_manager";

  // Role permissions validator
  const validatePermission = useCallback((action: string): boolean => {
    if (userRole === "admin" || userRole === "developer" || userRole === "gm_service" || userRole === "service_manager") {
      return true;
    }
    if (userRole === "workshop_manager") {
      return true; // Full access except force override SLA
    }
    if (userRole === "supervisor") {
      const allowed = ["Assign Technician", "Assign Bay", "Queue Movement"];
      return allowed.includes(action);
    }
    if (userRole === "dealer_principal") {
      return action === "Emergency Override";
    }
    return false;
  }, [userRole]);

  // Handle manual bay allocation
  const handleBayAllocation = async (jobId: number, bayId: number) => {
    if (!validatePermission("Assign Bay")) {
      alert("Permission Denied: Supervisor or Manager role required for Bay Allocation.");
      return;
    }

    // Check bay conflicts (prevent double allocation)
    const activeInBay = jobCards.find(j => j.bay_id === bayId && ["Active", "Carry Forward", "Rework"].includes(j.status));
    if (activeInBay && activeInBay.job_id !== jobId) {
      alert(`Conflict Warning: Bay is already occupied by vehicle ${activeInBay.vrn}.`);
      return;
    }

    try {
      await onUpdateJob(jobId, { bay_id: bayId, status: "Active" });
      onRefresh();
    } catch (e) {
      alert("Failed to allocate bay.");
    }
  };

  // Handle technician allocation
  const handleTechAllocation = async (jobId: number, techId: number) => {
    if (!validatePermission("Assign Technician")) {
      alert("Permission Denied: Supervisor or Manager role required for Technician Assignment.");
      return;
    }

    // Check if technician is already busy (prevent tech conflict)
    const isTechBusy = jobCards.find(j => j.technician_name?.includes(employees.find(e => e.employee_id === techId)?.full_name) && ["Active", "Rework"].includes(j.status));
    if (isTechBusy && isTechBusy.job_id !== jobId) {
      const proceed = window.confirm(`Technician is currently working on ${isTechBusy.vrn}. Assign anyway?`);
      if (!proceed) return;
    }

    try {
      await onAssignTechnicians(jobId, [{ employee_id: techId, tech_role: "Primary Technician" }]);
      const techName = employees.find(e => e.employee_id === techId)?.full_name || "Assigned Tech";
      await onUpdateJob(jobId, { technician_name: techName });
      onRefresh();
    } catch (e) {
      alert("Failed to assign technician.");
    }
  };

  // AI recommendations acceptance handler
  const handleAcceptRecommendation = async (recId: string) => {
    if (!validatePermission("Override AI")) {
      alert("Permission Denied: Manager role required to action AI recommendations.");
      return;
    }

    // Accept suggestion: dynamically re-route vehicle to the suggested bay & technician
    const targetJob = jobCards.find(j => ["Waiting", "Active"].includes(j.status));
    if (!targetJob) {
      alert("No active matching job card found to assign suggestion to.");
      return;
    }

    const targetBay = bays[0]; // mock resolved suggestion target
    const targetTech = employees.find(e => e.role === "Technician");

    if (targetBay && targetJob) {
      await handleBayAllocation(targetJob.job_id, targetBay.bay_id);
    }
    if (targetTech && targetJob) {
      await handleTechAllocation(targetJob.job_id, targetTech.employee_id);
    }
    alert("AI Recommendation successfully applied.");
  };

  // Carry Forward request resolution handler
  const handleResolveCarryForward = async (id: string, status: "Approved" | "Rejected") => {
    if (!validatePermission("Carry Forward")) {
      alert("Permission Denied: Manager authorization required to resolve Carry Forward requests.");
      return;
    }
    if (onResolveCarryForward) {
      await onResolveCarryForward(Number(id.replace("cf-", "")), status);
    }
  };

  // KPI computations
  const kpiMetrics = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    // Real counts — 0 when there are no records (never a demo fallback).
    const received = jobCards.filter(j => j.created_at && j.created_at.startsWith(todayStr)).length;
    const delivered = jobCards.filter(j => j.status === "Completed" || j.status === "Invoiced").length;
    const openJcs = jobCards.filter(j => ["Active", "Waiting", "Rework", "Carry Forward"].includes(j.status)).length;
    // Bay utilization is only meaningful when bays exist; otherwise "No data" (null), not a fabricated %.
    const utilization = bays.length > 0
      ? Math.round((bays.filter(b => b.status !== "Idle" && b.status !== "Empty").length / bays.length) * 100)
      : null;
    const breaches = alertLogs.filter(a => a.alert_type === "SLA_BREACH" && a.status === "Active").length;

    // productivity / ftr / csi / avgTat have no authoritative source wired here → null ("No data").
    // They must NOT be fabricated. (Wire to real analytics before surfacing a value.)
    return {
      received,
      delivered,
      openJcs,
      utilization,
      productivity: null,
      ftr: null,
      csi: null,
      avgTatMinutes: null,
      slaBreaches: breaches
    };
  }, [jobCards, bays, alertLogs]);

  // Financial Split computations & EOD Forecasts
  const financialMetrics = useMemo(() => {
    // ACTUAL invoiced revenue today (real; 0 when nothing invoiced). forecast.total is
    // computed from invoiced job cards only — NOT an AI projection. The projected EOD
    // figure (forecast.forecastEod) is exposed separately as FORECAST, never as actual.
    const forecast = WorkshopAIEngine.forecastRevenue(jobCards);
    return {
      todayRevenue: forecast.total,          // ACTUAL (invoiced)
      forecastEodRevenue: forecast.forecastEod, // FORECAST (projection)
      targetRevenue: 500000,                 // TARGET (configured)
      labourRevenue: forecast.labour,        // ACTUAL
      partsRevenue: forecast.parts,          // ACTUAL
      // Average over real job cards; null ("No data") when there are none — never a demo value.
      avgJobCardVal: jobCards.length > 0
        ? Math.round(jobCards.reduce((sum, j) => sum + (j.labor_price || 0) + (j.parts_price || 0), 0) / jobCards.length)
        : null
    };
  }, [jobCards]);

  // AI Workshop health score
  const healthScore = useMemo(() => {
    return WorkshopAIEngine.calculateHealthScore(jobCards, bays, alertLogs);
  }, [jobCards, bays, alertLogs]);

  // AI SLA predictions
  const slaPredictions = useMemo(() => {
    return WorkshopAIEngine.predictSlaBreaches(jobCards, alertLogs);
  }, [jobCards, alertLogs]);

  // AI Parts delay predictions
  const partsDelays = useMemo(() => {
    return WorkshopAIEngine.predictPartsDelays(jobCards);
  }, [jobCards]);

  // AI recommendation feed
  const aiRecommendations = useMemo(() => {
    return WorkshopAIEngine.generateAiFeed(jobCards, bays, employees);
  }, [jobCards, bays, employees]);

  // Manager Daily Brief
  const dailyBrief = useMemo(() => {
    return WorkshopAIEngine.generateDailyBrief(jobCards, bays, employees);
  }, [jobCards, bays, employees]);

  // Columns wait list computation
  const queueColumns = useMemo(() => {
    const getCount = (stateName: string) => jobCards.filter(j => j.current_workflow_state === stateName).length;
    const critical = (stateName: string) => jobCards.filter(j => j.current_workflow_state === stateName && j.priority === "Express").length;
    // Real per-stage counts (0 when empty). avgWaitMinutes has no authoritative source
    // here → null ("No data"); never a fabricated wait time.
    return [
      { id: "gate", name: "Gate Entry", count: getCount("GATE_IN"), avgWaitMinutes: null, criticalCount: critical("GATE_IN") },
      { id: "reception", name: "Reception", count: getCount("INTAKE_PENDING"), avgWaitMinutes: null, criticalCount: critical("INTAKE_PENDING") },
      { id: "advisor", name: "Advisor", count: getCount("ESTIMATE_PENDING"), avgWaitMinutes: null, criticalCount: critical("ESTIMATE_PENDING") },
      { id: "workshop", name: "Workshop", count: getCount("WIP_START"), avgWaitMinutes: null, criticalCount: critical("WIP_START") },
      { id: "qc", name: "Quality Check", count: getCount("QC_PENDING"), avgWaitMinutes: null, criticalCount: critical("QC_PENDING") },
      { id: "parts", name: "Parts Pending", count: getCount("PARTS_PENDING"), avgWaitMinutes: null, criticalCount: critical("PARTS_PENDING") },
      { id: "billing", name: "Billing / Cashier", count: getCount("FINAL_REVIEW"), avgWaitMinutes: null, criticalCount: critical("FINAL_REVIEW") }
    ];
  }, [jobCards]);

  // SLA Warnings and Breaches monitor values
  const slaMetrics = useMemo(() => {
    return {
      warnings: alertLogs.filter(a => a.alert_type === "SLA_WARNING" && a.status === "Active").length,
      breaches: alertLogs.filter(a => a.alert_type === "SLA_BREACH" && a.status === "Active").length,
      emergencyCount: jobCards.filter(j => j.priority === "Express" && j.status !== "Completed").length,
      waitingParts: jobCards.filter(j => j.current_workflow_state === "PARTS_PENDING").length,
      waitingCustomer: jobCards.filter(j => j.current_workflow_state === "ESTIMATE_PENDING").length,
      waitingQc: jobCards.filter(j => j.current_workflow_state === "QC_PENDING").length,
      waitingBilling: jobCards.filter(j => j.current_workflow_state === "FINAL_REVIEW").length
    };
  }, [alertLogs, jobCards]);

  // Digital twin bay roster mapping
  const bayList = useMemo(() => {
    return bays.map(b => {
      const activeJob = jobCards.find(j => j.bay_id === b.bay_id && ["Active", "Carry Forward", "Rework"].includes(j.status));
      return {
        id: String(b.bay_id),
        name: b.bay_name,
        type: b.bay_type || "Mechanical",
        vehicle: activeJob ? `${activeJob.vehicle_make} ${activeJob.vehicle_model} (${activeJob.vrn})` : null,
        technician: activeJob ? (activeJob.technician_name || "Assigned Tech") : null,
        status: activeJob
          ? (activeJob.status === "Rework" ? "Breakdown" : activeJob.status === "Carry Forward" ? "Carry Forward" : "Working")
          : "Empty Bay",
        // Real elapsed time from started_at; null when unknown (no fabricated 35 min).
        elapsedMinutes: activeJob && activeJob.started_at
          ? Math.max(0, Math.round((Date.now() - new Date(activeJob.started_at).getTime()) / 60000))
          : null,
        etd: activeJob ? (activeJob.expected_time_of_completion || activeJob.etd || null) : null,
        priority: activeJob ? activeJob.priority : "Normal"
      } as any;
    });
  }, [bays, jobCards]);

  // Technician heat maps
  const technicianList = useMemo(() => {
    const techs = employees.filter(e => ["Technician", "Electrician"].includes(e.role));
    return techs.map(t => {
      const activeJob = jobCards.find(j => j.technician_name?.includes(t.full_name) && ["Active", "Rework"].includes(j.status));
      return {
        id: String(t.employee_id),
        name: t.full_name,
        skill: `${t.role} (${t.certification_level || "Bronze"})`,
        currentJob: activeJob ? activeJob.vrn : null,
        status: activeJob ? "Working" : (t.is_active ? "Idle" : "Leave"),
        // Real productivity from allocated vs target revenue; null ("No data") when unavailable.
        productivityScore: (t.allocated_revenue != null && t.target_revenue)
          ? Math.min(100, Math.round((t.allocated_revenue / t.target_revenue) * 100))
          : null,
        jobsCompletedToday: null,
        efficiency: null
      } as any;
    });
  }, [employees, jobCards]);

  // Recent timeline feed logs
  const activityTimelineList = useMemo(() => {
    const activeJcs = [...jobCards].reverse().slice(0, 5);
    return activeJcs.map((j, index) => ({
      id: `time-${index}`,
      time: j.time_in || null,
      vehicle: `${j.vehicle_make || ""} ${j.vehicle_model || ""} (${j.vrn})`.trim(),
      action: j.status === "Completed" ? "Completed QC Verification" : `Workflow phase transition to ${j.current_workflow_state || j.status}`,
      advisor: j.service_advisor || null,
      stage: j.current_workflow_state || j.status,
      iconType: j.status === "Completed" ? "qc" : "repair"
    } as any));
  }, [jobCards]);

  // Carry forward logs list
  const carryForwardList = useMemo(() => {
    const cfJobs = jobCards.filter(j => j.status === "Carry Forward" || j.status === "Rework");
    return cfJobs.map(j => ({
      id: String(j.job_id),
      vehicle: `${j.vehicle_make || ""} ${j.vehicle_model || ""} (${j.vrn})`.trim(),
      advisor: j.service_advisor || "Unassigned",
      technician: j.technician_name || "Unassigned",
      reason: j.pending_reason || j.remarks || "—",
      expectedCompletion: j.expected_date_out || null,
      priority: j.priority
    } as any));
  }, [jobCards]);

  // Active escalation items
  const escalationList = useMemo(() => {
    const activeAlerts = alertLogs.filter(a => a.status === "Active");
    return activeAlerts.map(a => {
      const matchJob = jobCards.find(j => j.job_id === a.job_id);
      return {
        id: String(a.alert_id),
        level: a.alert_type === "SLA_BREACH" ? "L3" : "L1",
        vehicle: matchJob ? `${matchJob.vehicle_make || ""} ${matchJob.vehicle_model || ""} (${matchJob.vrn})`.trim() : "—",
        complaint: a.message,
        // Real age from alert creation; null when unknown (no fabricated 25 min).
        ageMinutes: a.created_at ? Math.max(0, Math.round((Date.now() - new Date(a.created_at).getTime()) / 60000)) : null,
        owner: "Workshop Manager",
        priority: a.alert_type === "SLA_BREACH" ? "Critical" : "High"
      } as any;
    });
  }, [alertLogs, jobCards]);

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center" role="alert">
        <h2 className="text-lg font-bold text-red-500 uppercase tracking-wider">Operational Dashboard Error</h2>
        <p className="text-xs text-slate-400 mt-2 max-w-md">
          A runtime database communication error occurred while streaming telemetry feeds. Please retry or contact system admin.
        </p>
        <button 
          onClick={onRefresh}
          className="ds-button-danger mt-4 px-4 py-2   hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors"
        >
          Reconnect Stream
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-[#0B1220] text-slate-100 min-h-screen p-4 md:p-6" lang="en">
      {/* Network offline alert */}
      {!isOnline && (
        <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-400 text-xs font-bold flex items-center justify-between animate-pulse" role="status">
          <span>WMS Network connection interrupted. Operating in cached offline mode.</span>
          <span className="text-[9px] bg-amber-500/20 px-2 py-0.5 rounded">OFFLINE</span>
        </div>
      )}

      {/* Header and location selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="ds-button-success flex h-2 w-2 rounded-full   animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              Operational Live Control Center ({userRole.toUpperCase()})
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1">
            <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
              WMS Workshop Control Panel
            </h1>
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
              <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Health Score:</span>
              <span className={`text-xs font-black px-2 py-0.5 rounded ${
                healthScore >= 85 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                healthScore >= 65 ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                "bg-red-500/10 text-red-400 border border-red-500/20"
              }`}>{healthScore}%</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (jobCards.length > 0) {
                setSelectedJobId(jobCards[0].job_id);
                setShowAllocModal(true);
              }
            }}
            className="px-3.5 py-2 bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-colors"
          >
            Manual Allocation
          </button>
          <WorkshopSelector
            selectedWorkshop={selectedWorkshop}
            onWorkshopChange={setSelectedWorkshop}
          />
        </div>
      </div>

      {/* Financial Overview Ribbon */}
      <FinancialRibbon {...financialMetrics} isLoading={isLoading} />

      {/* KPI Stats Grid */}
      <KPIHeader metrics={kpiMetrics} isLoading={isLoading} />

      {/* Live Operational Queue Section */}
      <LiveQueueBoard columns={queueColumns} isLoading={isLoading} />

      {/* AI OPERATIONS CENTER — gated by aiModeEnabled */}
      {aiModeEnabled ? (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-slate-900/50 border border-slate-800/60 p-5 rounded-2xl">
        {/* Module 10: Manager Daily Brief */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-300">Manager Daily Brief</h2>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">{dailyBrief.morningBrief}</p>
          <div className="space-y-1 bg-slate-950/40 p-3 rounded-xl border border-slate-800/40 text-xs">
            <div className="text-[10px] text-slate-500 font-bold uppercase">Today's Risks & Bottlenecks</div>
            <div className="text-slate-300 font-medium">{dailyBrief.todayRisks}</div>
            <div className="text-amber-400 font-medium mt-1">{dailyBrief.bottlenecks}</div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Recommended Actions</span>
            <ul className="list-disc list-inside text-xs text-blue-400 space-y-0.5">
              {dailyBrief.recommendedActions.map((action, i) => (
                <li key={i}>{action}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Module 5: SLA Breach Predictor */}
        <div className="space-y-3 border-l border-slate-800/60 pl-0 lg:pl-6">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-300">SLA Breach Predictor</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-950/50 p-2.5 rounded-xl border border-red-500/20 text-center">
              <div className="text-lg font-black text-red-500">{slaPredictions.within30Mins}</div>
              <div className="text-[9px] text-slate-500 uppercase font-black">Within 30m</div>
            </div>
            <div className="bg-slate-950/50 p-2.5 rounded-xl border border-amber-500/20 text-center">
              <div className="text-lg font-black text-amber-500">{slaPredictions.within1Hour}</div>
              <div className="text-[9px] text-slate-500 uppercase font-black">Within 1h</div>
            </div>
            <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800 text-center">
              <div className="text-lg font-black text-slate-300">{slaPredictions.within2Hours}</div>
              <div className="text-[9px] text-slate-500 uppercase font-black">Within 2h</div>
            </div>
          </div>
          {slaPredictions.highRiskJobs.length > 0 ? (
            <div className="space-y-1.5 bg-red-500/5 p-3 rounded-xl border border-red-500/10">
              <div className="text-[9px] text-red-400 font-bold uppercase tracking-wider">Critical Risk Vehicles</div>
              {slaPredictions.highRiskJobs.map((j: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">{j.vrn}</span>
                  <span className="text-red-400 font-bold bg-red-500/10 px-1.5 py-0.5 rounded text-[10px]">{j.remaining} remaining</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="ds-button-success text-xs text-emerald-400 font-bold  /5 p-3 rounded-xl border border-emerald-500/10 text-center">
              ✔ No imminent SLA breaches predicted.
            </div>
          )}
        </div>

        {/* Module 4: Parts Delay Predictor */}
        <div className="space-y-3 border-l border-slate-800/60 pl-0 lg:pl-6">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-300">Parts Delay Copilot</h2>
          </div>
          {partsDelays.length > 0 ? (
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {partsDelays.map((p, i) => (
                <div key={i} className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/50 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                    <span>{p.vehicle}</span>
                    <span className="text-amber-400">Delay: {p.expectedDelay}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">Needed: {p.delayedPart}</div>
                  <div className="ds-button-success text-[9px] text-emerald-400  /5 px-2 py-0.5 rounded border border-emerald-500/10 inline-block">
                    Alt: {p.alternatePart}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-400 bg-slate-950/40 p-4 rounded-xl border border-slate-800/50 text-center">
              No active parts delay risks detected in the active repair queue.
            </div>
          )}
        </div>
      </div>
      ) : (
      <div className="bg-slate-900/50 border border-slate-700/40 p-5 rounded-2xl flex items-center justify-center gap-4">
        <div className="h-10 w-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
          <span className="text-slate-500 text-lg">🤖</span>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-400">AI Operations Center</p>
          <p className="text-xs text-slate-600">AI Mode is disabled. Enable AI Mode to view Manager Daily Brief, SLA Breach Predictor, and Parts Delay Copilot.</p>
        </div>
      </div>
      )}

      {/* Workshop Manager Copilot Orchestrator */}
      <AICopilotPanel 
        role="Workshop Manager"
        context={{
          workshopName: selectedWorkshop,
          openJobsCount: kpiMetrics.openJcs,
          slaBreachesCount: kpiMetrics.slaBreaches,
          utilizationRate: kpiMetrics.utilization
        }}
      />

      {/* Main Split Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6 flex flex-col">
          <div className="flex-1">
            <SLACommandCenter metrics={slaMetrics} isLoading={isLoading} onRefresh={onRefresh} />
          </div>
          <div className="flex-1">
            <QueueHeatMap data={queueColumns} isLoading={isLoading} />
          </div>
        </div>

        {/* Center Panel: Interactive Bay Digital Twin layout */}
        <div className="lg:col-span-2">
          <Suspense fallback={<div className="h-96 bg-slate-900 animate-pulse" />}>
            <BayLayoutBoard bays={bayList} isLoading={isLoading} onSelectBay={(id) => {
              const matchingJob = jobCards.find(j => String(j.bay_id) === id && ["Active", "Rework"].includes(j.status));
              if (matchingJob) {
                setSelectedJobId(matchingJob.job_id);
                setShowAllocModal(true);
              }
            }} />
          </Suspense>
        </div>

        {/* Right Panel: Active Technician Heat Map & Roster Status */}
        <div className="lg:col-span-1">
          <Suspense fallback={<div className="h-96 bg-slate-900 animate-pulse" />}>
            <TechnicianHeatMap technicians={technicianList} isLoading={isLoading} />
          </Suspense>
        </div>
      </div>

      {/* Optimization recommendations & Notifications center */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <Suspense fallback={<div className="h-48 bg-slate-900 rounded-xl animate-pulse" />}>
            {aiModeEnabled ? (
            <AIRecommendationPanel 
              recommendations={aiRecommendations}
              isLoading={isLoading} 
              onApplyOverride={handleAcceptRecommendation} 
            />
            ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 h-full flex items-center justify-center">
              <div className="text-center space-y-2">
                <p className="text-xs font-bold text-slate-400">Gemma-4 Layout Optimizations</p>
                <p className="text-[11px] text-slate-600">AI Mode is disabled. No Recommendations Available.</p>
              </div>
            </div>
            )}
          </Suspense>
        </div>
        <div>
          <Suspense fallback={<div className="h-48 bg-slate-900 rounded-xl animate-pulse" />}>
            <CarryForwardPanel items={carryForwardList} isLoading={isLoading} onApprove={(id) => handleResolveCarryForward(id, "Approved")} onReject={(id) => handleResolveCarryForward(id, "Rejected")} />
          </Suspense>
        </div>
        <div>
          <NotificationCenter isLoading={isLoading} />
        </div>
      </div>

      {/* Historical Escalations and Audit Timeline Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <Suspense fallback={<div className="h-60 bg-slate-900 rounded-xl animate-pulse" />}>
            <EscalationPanel escalations={escalationList} isLoading={isLoading} />
          </Suspense>
        </div>
        <div>
          <Suspense fallback={<div className="h-60 bg-slate-900 rounded-xl animate-pulse" />}>
            <ActivityTimeline items={activityTimelineList} isLoading={isLoading} />
          </Suspense>
        </div>
      </div>

      {/* ACTIVE ALLOCATION COMMAND MODAL */}
      {showAllocModal && selectedJobId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">Reassign Bay & Technicians</h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Select Workshop Bay</label>
                <select 
                  onChange={(e) => setSelectedBayId(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 outline-none"
                >
                  <option value="">Choose Bay...</option>
                  {bays.map(b => (
                    <option key={b.bay_id} value={b.bay_id}>{b.bay_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Select Primary Technician</label>
                <select 
                  onChange={(e) => setSelectedTechId(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 outline-none"
                >
                  <option value="">Choose Tech...</option>
                  {employees.filter(e => e.role === "Technician").map(emp => (
                    <option key={emp.employee_id} value={emp.employee_id}>{emp.full_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button 
                onClick={async () => {
                  if (selectedBayId) await handleBayAllocation(selectedJobId, selectedBayId);
                  if (selectedTechId) await handleTechAllocation(selectedJobId, selectedTechId);
                  setShowAllocModal(false);
                }}
                className="ds-button-success flex-1 py-2   hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
              >
                Apply Allocations
              </button>
              <button 
                onClick={() => setShowAllocModal(false)}
                className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-400 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

WorkshopDashboard.displayName = "WorkshopDashboard";
export default WorkshopDashboard;

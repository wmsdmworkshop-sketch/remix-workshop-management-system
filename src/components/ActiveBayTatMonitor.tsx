import FunnySpinner from "./FunnySpinner";
import React, { useState, useMemo } from "react";
import { 
  Clock, 
  Wrench, 
  TrendingUp, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  SlidersHorizontal,
  Search,
  UserCheck,
  Plus,
  ArrowRight,
  ClipboardList,
  Activity,
  FileSpreadsheet,
  Upload,
  Calendar,
  Layers,
  ChevronRight,
  UserPlus,
  RefreshCw,
  HelpCircle,
  BarChart3,
  Flame,
  Info
} from "lucide-react";
import { JobCard, Bay, Employee } from "../types";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";

interface ActiveBayTatMonitorProps {
  jobCards: JobCard[];
  bays: Bay[];
  employees: Employee[];
  onUpdateJob: (id: number, updatedFields: Partial<JobCard>) => Promise<void>;
  onRefresh: () => Promise<void>;
}

// Master configurations based on the pasted sheets data
export const TAT_STATUSES = [
  "PENDING",
  "WORK IN PROGRESS",
  "COMPLETED",
  "DELIVERED",
  "ON-ROAD",
  "PARKING"
];

export const WORKSHOP_STAGES = [
  "Customer Approval",
  "work-in-progress",
  "Waiting for payment",
  "Warranty Pending",
  "Warranty decline",
  "Warranty Conflict",
  "Other",
  "WAITING FOR PARTS",
  "Deliverd",
  "ancillary delay",
  "parts in transit",
  "cummins delay",
  "outside work",
  "machine shop delay",
  "short manpower",
  "tools delay",
  "techline delay"
];

export const L1_DELAYS = [
  "AMC_Claim_Issue",
  "Awaiting_TML_Approval",
  "Delay_from_customer_end",
  "Delay_In_Additional_Job",
  "Delay_In_Issue_finding",
  "Delay_In_Job_Card_Closing",
  "Government_Vehicle",
  "JC_Reopen_For_Correction",
  "Manpower",
  "Non_Availability_of_Parts",
  "Pending_payment"
];

export const L2_DELAYS = [
  "Additional work found by SA",
  "Ancillary_Delay",
  "Advantek Delay",
  "Amaron Delay",
  "AMC- Approval pending",
  "AMC not updated in system",
  "Bosch Delay",
  "CRM Backend issue",
  "Cummins Delay",
  "Customer denied for payment",
  "Customer did outsourced work by himself",
  "Customer seeking for goodwill",
  "Customer seeking More Discount",
  "Delay at workshop end",
  "Delay in approval from customer",
  "Delay in outsourced work",
  "Delay in work order",
  "Diagnostics Tool not working",
  "Electrician Shortage",
  "Exide Delay",
  "FSB Exceptional/ Deviation"
];

export const L3_DELAYS = [
  "Additional work during upon customer…",
  "Additional work requested by customer",
  "Additional work found during initial check…",
  "Additional work using dynamic check list",
  "Advantek-Closed/ Non working hours",
  "Advantek-Parts not available",
  "Advantek-Warranty decision pending",
  "Amaron-Closed/ Non working hours",
  "Amaron-Parts not available",
  "Amaron-Warranty decision pending",
  "AMC done but not updated in system",
  "AMC not renewed",
  "Ancillary delay-Closed/ Non working hours",
  "Bosch-Closed/ Non working hours",
  "Bosch-Parts not available",
  "Bosch-Warranty decision pending",
  "BS6 Tools not Ordered",
  "BS6 Tools ordered but not received",
  "Communication not done with customer…",
  "Cummins-Closed/ Non working hours",
  "Cummins-Parts not available",
  "Cummins-Warranty decision pending"
];

export const L5_DELAYS = [
  "Absentism due to leave /Holiday",
  "Customer not reachable",
  "Delay in Logistics",
  "facility not available at Workshop",
  "Fund Shortage",
  "Govt. Process Delay",
  "Low Bandwidth",
  "Negligence at Service adviser end",
  "Not available at distributor/ TML",
  "Recommended Manpower NA in Workshop",
  "Service Advisor Not Aware",
  "Sufficient SA Not Available",
  "Tarining not attended due to casual …",
  "Training not attended due to casual…",
  "Training not Organised",
  "Trainings not Attended",
  "Trainings not organised"
];

export const DELAY_NOTES_OPTIONS = [
  "AMC_Activation_pending_TML",
  "Fund strucked in Market due to credit",
  "Fund Strucked with Insurance company",
  "Lack of Proper Monitoring",
  "Mismanagement of Fund"
];

export const SR_TECHS = [
  "LOKU",
  "MALLINATH",
  "MD JAVEED",
  "MOHAMMED SHOAIB",
  "RAJKUMAR AMABARAYA MENTE",
  "SAMEERUDDIN",
  "SANGAPPA",
  "SIRAJ AHMED",
  "SRINATH M. N"
];

export const JR_TECHS = [
  "ALTAF HUSSAIN",
  "ASHFAQ HUSSAIN",
  "HANUMATH RAYA",
  "HUNCHIRAY",
  "MD GOUSE",
  "MOHAMMED ZAKI",
  "NAGESH",
  "SHARNBASAPPA"
];

export const ELECTRICIANS = [
  "ASIF",
  "FAKIRAAPA",
  "MAHMED ALTAF AHMED",
  "MD ABDUL KHADEER",
  "MOHSIN NAWAZ",
  "MUZAMILL",
  "YUNUS ALI",
  "Azhar",
  "aslam"
];

// Generate 15-minute time slots (09:15 to 09:00 next day)
export const TIME_SLOTS = (() => {
  const slots: string[] = [];
  // 09:15 to 23:45
  for (let h = 9; h <= 23; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 9 && m < 15) continue;
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  // 00:00 to 09:00
  for (let h = 0; h <= 9; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 9 && m > 0) continue;
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
})();

// =============================================================================
// UNIFIED BAY LIFECYCLE STATE
// A bay's state is DERIVED from the job card occupying it — using fields we
// already capture (workshop_stage, current_workflow_state, L1–L5 delays). No new
// data source. Priority: a logged delay is the alert state and wins over stage.
// =============================================================================
export type BayLifecycleState =
  | "EMPTY" | "WIP" | "WAITING_PARTS" | "WAITING_APPROVAL" | "WAITING_PAYMENT" | "DELAYED";

export const BAY_STATE_CONFIG: Record<BayLifecycleState, { label: string; badge: string; border: string; dot: string }> = {
  EMPTY:            { label: "Available",        badge: "bg-slate-100 text-slate-500 border-slate-200",   border: "border-slate-200",  dot: "bg-slate-300" },
  WIP:              { label: "Work in Progress", badge: "bg-green-50 text-green-700 border-green-200",     border: "border-green-200",  dot: "bg-green-500" },
  WAITING_PARTS:    { label: "Waiting Parts",    badge: "bg-sky-50 text-sky-700 border-sky-200",          border: "border-sky-200",    dot: "bg-sky-500" },
  WAITING_APPROVAL: { label: "Waiting Approval", badge: "bg-violet-50 text-violet-700 border-violet-200", border: "border-violet-200", dot: "bg-violet-500" },
  WAITING_PAYMENT:  { label: "Waiting Payment",  badge: "bg-amber-50 text-amber-700 border-amber-200",    border: "border-amber-200",  dot: "bg-amber-500" },
  DELAYED:          { label: "Delayed",          badge: "bg-red-50 text-red-700 border-red-200",          border: "border-red-300",    dot: "bg-red-500" },
};

export const BAY_STATE_ORDER: BayLifecycleState[] =
  ["WIP", "WAITING_PARTS", "WAITING_APPROVAL", "WAITING_PAYMENT", "DELAYED", "EMPTY"];

export function deriveBayState(job: JobCard | undefined | null): BayLifecycleState {
  if (!job) return "EMPTY";
  const stage = String(job.workshop_stage || "").toLowerCase();
  const wf = String((job as any).current_workflow_state || "").toUpperCase();
  const hasDelay = !!(job.l1_delay || job.l2_delay || job.l3_delay || job.l5_delay);
  if (hasDelay) return "DELAYED";
  if (stage.includes("part") || wf === "PARTS_PENDING") return "WAITING_PARTS";
  if (stage.includes("approval") || stage.includes("warranty")) return "WAITING_APPROVAL";
  if (stage.includes("payment") || wf === "BILLING_PENDING" || wf === "CASHIER_PENDING") return "WAITING_PAYMENT";
  return "WIP";
}

export default function ActiveBayTatMonitor({
  jobCards,
  bays,
  employees,
  onUpdateJob,
  onRefresh
}: ActiveBayTatMonitorProps) {
  const [activeTab, setActiveTab] = useState<"board" | "delay-manager" | "analytics">("board");
  
  // Search and Filtering states
  const [searchVrn, setSearchVrn] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [stageFilter, setStageFilter] = useState("All");
  const [bayStateFilter, setBayStateFilter] = useState<BayLifecycleState | "ALL">("ALL");

  // Delay Picker Modal State
  const [loggingJobId, setLoggingJobId] = useState<number | null>(null);
  const [logForm, setLogForm] = useState({
    tat_status: "PENDING",
    workshop_stage: "Customer Approval",
    l1_delay: "",
    l2_delay: "",
    l3_delay: "",
    l5_delay: "",
    delay_notes: "",
    time_slot: "09:15"
  });

  // Map of active jobs assigned to bays
  const activeBaysSnapshot = useMemo(() => {
    return bays.map(bay => {
      // Find latest job cards in this bay that are active or parking
      const assignedJobs = jobCards.filter(j => j.bay_id === bay.bay_id && j.status !== "Completed" && j.status !== "Invoiced" && j.status !== "Cancelled");
      return {
        ...bay,
        jobs: assignedJobs,
        lifecycleState: deriveBayState(assignedJobs[0])
      };
    });
  }, [bays, jobCards]);

  // Counts per lifecycle state (for the control-room summary strip).
  const bayStateCounts = useMemo(() => {
    const c = {} as Record<BayLifecycleState, number>;
    BAY_STATE_ORDER.forEach(s => { c[s] = 0; });
    activeBaysSnapshot.forEach(b => { c[b.lifecycleState] = (c[b.lifecycleState] || 0) + 1; });
    return c;
  }, [activeBaysSnapshot]);

  const visibleBays = useMemo(
    () => activeBaysSnapshot.filter(b => bayStateFilter === "ALL" || b.lifecycleState === bayStateFilter),
    [activeBaysSnapshot, bayStateFilter]
  );

  // Open Delay logger for a job
  const openDelayLogger = (job: JobCard) => {
    setLoggingJobId(job.job_id);
    setLogForm({
      tat_status: job.tat_status || "PENDING",
      workshop_stage: job.workshop_stage || "Customer Approval",
      l1_delay: job.l1_delay || "",
      l2_delay: job.l2_delay || "",
      l3_delay: job.l3_delay || "",
      l5_delay: job.l5_delay || "",
      delay_notes: job.delay_notes || "",
      time_slot: job.time_slot || "09:15"
    });
  };

  const handleSaveDelayLog = async () => {
    if (!loggingJobId) return;
    try {
      await onUpdateJob(loggingJobId, logForm);
      setLoggingJobId(null);
      await onRefresh();
    } catch (e) {
      console.error(e);
      alert("Error saving TAT Delay indicators.");
    }
  };

  // Staff checklist / allocations helper
  // We can also query JobTechnicianMaps, but let's allow assigning direct technicians
  // or simple quick tag selection from our master lists!
  const [assigningJobTechId, setAssigningJobTechId] = useState<number | null>(null);

  const handleQuickAssignTech = async (jobId: number, name: string, level: "Sr" | "Jr" | "Elec") => {
    // We can save the technician name directly to job_description or log_notes, or alert configs
    // For extreme simplicity and spreadsheet equivalence, we can store technician assignments in the delay_notes or job_description!
    // But let's append it beautifully to the Job's delay notes or keep a state!
    const job = jobCards.find(j => j.job_id === jobId);
    if (!job) return;

    let currentNotes = job.delay_notes || "";
    const prefix = `[Staff: ${name}]`;
    if (currentNotes.includes(prefix)) {
      currentNotes = currentNotes.replace(prefix, "").trim();
    } else {
      currentNotes = `${prefix} ${currentNotes}`.trim();
    }

    await onUpdateJob(jobId, { delay_notes: currentNotes });
    await onRefresh();
  };

  // Filtered Job Cards with delays
  const filteredJobs = useMemo(() => {
    return jobCards.filter(j => {
      const matchesVrn = j.vrn.toLowerCase().includes(searchVrn.toLowerCase()) || j.customer_name.toLowerCase().includes(searchVrn.toLowerCase());
      const matchesStatus = statusFilter === "All" || j.tat_status === statusFilter;
      const matchesStage = stageFilter === "All" || j.workshop_stage === stageFilter;
      return matchesVrn && matchesStatus && matchesStage;
    });
  }, [jobCards, searchVrn, statusFilter, stageFilter]);

  // Aggregate stats for delay reasons
  const delayAnalytics = useMemo(() => {
    const l1Counts: { [key: string]: number } = {};
    const stageCounts: { [key: string]: number } = {};
    const statusCounts: { [key: string]: number } = {};
    let totalDelayed = 0;

    jobCards.forEach(j => {
      if (j.l1_delay) {
        l1Counts[j.l1_delay] = (l1Counts[j.l1_delay] || 0) + 1;
        totalDelayed++;
      }
      if (j.workshop_stage) {
        stageCounts[j.workshop_stage] = (stageCounts[j.workshop_stage] || 0) + 1;
      }
      if (j.tat_status) {
        statusCounts[j.tat_status] = (statusCounts[j.tat_status] || 0) + 1;
      }
    });

    const l1Data = Object.keys(l1Counts).map(name => ({
      name,
      value: l1Counts[name]
    })).sort((a, b) => b.value - a.value);

    const stageData = Object.keys(stageCounts).map(name => ({
      name,
      value: stageCounts[name]
    })).sort((a, b) => b.value - a.value);

    const statusData = Object.keys(statusCounts).map(name => ({
      name,
      value: statusCounts[name]
    }));

    return {
      l1Data,
      stageData,
      statusData,
      totalDelayed
    };
  }, [jobCards]);

  return (
    <div className="space-y-6" id="bay-tat-monitor-root">
      
      {/* 1. Module Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-600 animate-spin-slow" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">Active Workshop Bay & TAT Monitor</h1>
          </div>
          <p className="text-xs text-slate-500 font-medium">Real-time Turnaround Time management, physical bay assignments, and multi-level delay diagnosis.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button 
            id="btn-board"
            onClick={() => setActiveTab("board")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all flex items-center gap-1.5 ${
              activeTab === "board" 
                ? "bg-slate-900 text-white border-slate-950 shadow-xs" 
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Bay Report
          </button>
          <button
            id="btn-delay"
            onClick={() => setActiveTab("delay-manager")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all flex items-center gap-1.5 ${
              activeTab === "delay-manager" 
                ? "bg-slate-900 text-white border-slate-950 shadow-xs" 
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Log Delays
          </button>
          <button 
            id="btn-analytics"
            onClick={() => setActiveTab("analytics")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all flex items-center gap-1.5 ${
              activeTab === "analytics" 
                ? "bg-slate-900 text-white border-slate-950 shadow-xs" 
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            TAT Pareto Charts
          </button>
        </div>
      </div>

      {/* Quick Cards of Bay Performance */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Active Workshop Bays</p>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-2xl font-black text-slate-900">
              {activeBaysSnapshot.filter(b => b.jobs.length > 0).length} / {bays.length}
            </span>
            <span className="text-[10px] font-bold text-slate-400">occupied</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
            <div 
              className="bg-indigo-600 h-full rounded-full" 
              style={{ width: `${(activeBaysSnapshot.filter(b => b.jobs.length > 0).length / bays.length) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Active Delays Logged</p>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-2xl font-black text-amber-600">
              {delayAnalytics.totalDelayed}
            </span>
            <span className="text-[10px] font-bold text-slate-400">jobs halted</span>
          </div>
          <p className="text-[9px] text-amber-500 font-bold mt-2.5 uppercase tracking-wide flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Action required to prevent SLA breach
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Current Target Status</p>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-2xl font-black text-emerald-600">
              {jobCards.filter(j => j.tat_status === "COMPLETED").length}
            </span>
            <span className="text-[10px] font-bold text-slate-400">vehicles delivered</span>
          </div>
          <p className="text-[9px] text-slate-400 font-bold mt-2.5 uppercase tracking-wide">
            {bayStateCounts.WAITING_PARTS + bayStateCounts.WAITING_APPROVAL + bayStateCounts.WAITING_PAYMENT} bay(s) waiting on parts / approval / payment
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Bays Delayed</p>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-2xl font-black text-red-600">{bayStateCounts.DELAYED}</span>
            <span className="text-[10px] font-bold text-slate-400">of {activeBaysSnapshot.filter(b => b.jobs.length > 0).length} occupied</span>
          </div>
          <p className="text-[9px] text-red-500 font-bold mt-3 uppercase tracking-wide flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Delay reason logged — needs intervention
          </p>
        </div>
      </div>

      {/* 2. RENDERING ACTIVE BOARD */}
      {activeTab === "board" && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            
            {/* Legend and Intro */}
            <div className="space-y-3 border-b border-slate-100 pb-3">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xs font-black uppercase text-slate-800 tracking-wider">Live Workshop Bay Allocation Board</h2>
                  <p className="text-[10px] text-slate-400 font-medium">Each bay's state is derived live from its job card — click a state to filter.</p>
                </div>
              </div>
              {/* Control-room lifecycle summary — clickable filters */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setBayStateFilter("ALL")}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-md border transition-all ${
                    bayStateFilter === "ALL" ? "bg-slate-900 text-white border-slate-950" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  All Bays <span className="opacity-70">({activeBaysSnapshot.length})</span>
                </button>
                {BAY_STATE_ORDER.map(state => {
                  const cfg = BAY_STATE_CONFIG[state];
                  const active = bayStateFilter === state;
                  return (
                    <button
                      key={state}
                      onClick={() => setBayStateFilter(active ? "ALL" : state)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-md border flex items-center gap-1.5 transition-all ${
                        active ? "ring-2 ring-offset-1 ring-slate-400 " + cfg.badge : cfg.badge + " hover:opacity-80"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`}></span>
                      {cfg.label} <span className="opacity-70">({bayStateCounts[state] || 0})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Grid of Bays */}
            {visibleBays.length === 0 && (
              <div className="text-center py-10 text-slate-400 text-xs font-medium">
                No bays in “{bayStateFilter === "ALL" ? "any" : BAY_STATE_CONFIG[bayStateFilter as BayLifecycleState].label}” state.
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pt-2">
              {visibleBays.map(bay => {
                const activeJob = bay.jobs[0]; // Primary active job card on this bay
                const stateCfg = BAY_STATE_CONFIG[bay.lifecycleState];

                return (
                  <div key={bay.bay_id} className={`bg-slate-50/70 border-2 ${stateCfg.border} rounded-xl p-4 flex flex-col justify-between h-72 hover:shadow-xs transition-all`}>

                    {/* Header */}
                    <div className="flex items-start justify-between border-b border-slate-200/60 pb-2">
                      <div>
                        <span className="text-[9px] font-mono font-black text-indigo-600 uppercase tracking-widest">{bay.bay_type} Bay</span>
                        <h3 className="text-sm font-bold text-slate-800 leading-tight">{bay.bay_name}</h3>
                      </div>
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border shadow-2xs uppercase tracking-wider flex items-center gap-1 ${stateCfg.badge}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${stateCfg.dot}`}></span>
                        {stateCfg.label}
                      </span>
                    </div>

                    {/* Middle Content: Vehicle detail or Empty */}
                    {activeJob ? (
                      <div className="py-2 flex-1 flex flex-col justify-between space-y-2">
                        {/* Vehicle top-view SVG outline */}
                        <div className="w-full flex items-center justify-center">
                          <svg className="w-48 h-20 text-slate-400" viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {/* Wheels */}
                            <circle cx="35" cy="15" r="8" fill="#475569" />
                            <circle cx="165" cy="15" r="8" fill="#475569" />
                            <circle cx="35" cy="85" r="8" fill="#475569" />
                            <circle cx="165" cy="85" r="8" fill="#475569" />
                            
                            {/* Car Body Outline */}
                            <rect x="20" y="20" width="160" height="60" rx="10" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" />
                            
                            {/* Mirrors */}
                            <rect x="55" y="16" width="6" height="4" rx="1" fill="#94a3b8" />
                            <rect x="55" y="80" width="6" height="4" rx="1" fill="#94a3b8" />

                            {/* Windshield */}
                            <path d="M 50 25 L 60 50 L 50 75 Z" fill="#e2e8f0" stroke="#cbd5e1" />
                            <path d="M 150 25 L 140 50 L 150 75 Z" fill="#e2e8f0" stroke="#cbd5e1" />

                            {/* VRN printed on body center */}
                            <text x="100" y="55" textAnchor="middle" fill="#0f172a" className="font-mono text-[11px] font-black tracking-wide select-none">
                              {activeJob.vrn}
                            </text>
                          </svg>
                        </div>

                        {/* Details below vehicle */}
                        <div className="space-y-1.5 text-[11px] text-slate-600 font-medium">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 font-semibold uppercase text-[9px] tracking-wide">Technician:</span>
                            <span className="font-bold text-slate-800">
                              {(() => {
                                const mainAssignment = activeJob.technician_assignments?.[0];
                                return mainAssignment ? mainAssignment.technician_name : (activeJob.technician_name || "Unassigned");
                              })()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 font-semibold uppercase text-[9px] tracking-wide">Advisor:</span>
                            <span className="font-bold text-slate-800">{activeJob.service_advisor || "Unassigned"}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 font-semibold uppercase text-[9px] tracking-wide">ETD:</span>
                            <span className="font-bold text-slate-800">
                              {activeJob.etd ? new Date(activeJob.etd).toLocaleString("en-IN", { hour: "numeric", minute: "numeric", day: "numeric", month: "short" }) : "--"}
                            </span>
                          </div>
                          
                          {/* TAT Progress bar */}
                          {(() => {
                            const mainAssignment = activeJob.technician_assignments?.[0];
                            const assignedAt = mainAssignment ? mainAssignment.assigned_at : (activeJob.started_at || activeJob.created_at);
                            let progressPct = 0;
                            if (assignedAt && activeJob.etd) {
                              const start = new Date(assignedAt).getTime();
                              const end = new Date(activeJob.etd).getTime();
                              const now = new Date().getTime();
                              const total = end - start;
                              if (total > 0) {
                                progressPct = Math.min(100, Math.max(0, ((now - start) / total) * 100));
                              }
                            }
                            return (
                              <div className="space-y-1 pt-0.5">
                                <div className="flex justify-between text-[9px]">
                                  <span className="text-slate-400 font-semibold uppercase tracking-wide">TAT Progress:</span>
                                  <span className={`font-bold ${
                                    progressPct < 50 ? "text-green-600" : progressPct <= 80 ? "text-amber-600" : "text-red-600"
                                  }`}>{Math.round(progressPct)}%</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      progressPct < 50 ? "bg-green-500" : progressPct <= 80 ? "bg-amber-500" : "bg-red-500"
                                    }`}
                                    style={{ width: `${progressPct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    ) : (
                      <div className="py-2 flex-1 flex flex-col justify-center items-center">
                        <svg className="w-48 h-20 text-slate-300 opacity-60" viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                          {/* Wheels dashed */}
                          <circle cx="35" cy="15" r="8" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" />
                          <circle cx="165" cy="15" r="8" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" />
                          <circle cx="35" cy="85" r="8" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" />
                          <circle cx="165" cy="85" r="8" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" />
                          
                          {/* Car Body Outline dashed */}
                          <rect x="20" y="20" width="160" height="60" rx="10" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" />
                          <text x="100" y="55" textAnchor="middle" fill="#94a3b8" className="font-bold text-xs tracking-wider uppercase select-none">
                            Available
                          </text>
                        </svg>
                      </div>
                    )}

                    {/* Bottom Actions Row */}
                    <div className="border-t border-slate-200/60 pt-2.5 flex items-center justify-between gap-2">
                      {activeJob ? (
                        <>
                          <button
                            onClick={() => openDelayLogger(activeJob)}
                            className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-slate-900 border border-slate-950 text-white rounded-md hover:bg-slate-800 shadow-sm flex items-center gap-1 transition-all"
                          >
                            <ShieldAlert className="h-3 w-3" />
                            Log Delay Reason
                          </button>
                          
                          <div className="relative group">
                            <button
                              className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border border-slate-200 text-slate-700 bg-white rounded-md hover:bg-slate-50 flex items-center gap-1 transition-all"
                            >
                              <UserPlus className="h-3 w-3 text-slate-500" />
                              Assign Technicians
                            </button>
                            <div className="absolute bottom-full right-0 mb-1 hidden group-hover:block bg-white border border-slate-200 p-2 rounded-xl shadow-lg w-56 z-50 space-y-1 max-h-48 overflow-y-auto">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-1 pb-1 border-b">Sr Techs</p>
                              {SR_TECHS.map(t => (
                                <button 
                                  key={t}
                                  onClick={() => handleQuickAssignTech(activeJob.job_id, t, "Sr")}
                                  className="w-full text-left text-[10px] font-bold px-1.5 py-1 hover:bg-slate-50 rounded flex items-center justify-between text-slate-700"
                                >
                                  {t}
                                  {activeJob.delay_notes?.includes(t) && <span className="h-1.5 w-1.5 rounded-full bg-indigo-600"></span>}
                                </button>
                              ))}
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-1 pt-1 pb-1 border-b">Jr Techs</p>
                              {JR_TECHS.map(t => (
                                <button 
                                  key={t}
                                  onClick={() => handleQuickAssignTech(activeJob.job_id, t, "Jr")}
                                  className="w-full text-left text-[10px] font-bold px-1.5 py-1 hover:bg-slate-50 rounded flex items-center justify-between text-slate-700"
                                >
                                  {t}
                                  {activeJob.delay_notes?.includes(t) && <span className="h-1.5 w-1.5 rounded-full bg-indigo-600"></span>}
                                </button>
                              ))}
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-1 pt-1 pb-1 border-b">Electricians</p>
                              {ELECTRICIANS.map(t => (
                                <button 
                                  key={t}
                                  onClick={() => handleQuickAssignTech(activeJob.job_id, t, "Elec")}
                                  className="w-full text-left text-[10px] font-bold px-1.5 py-1 hover:bg-slate-50 rounded flex items-center justify-between text-slate-700"
                                >
                                  {t}
                                  {activeJob.delay_notes?.includes(t) && <span className="h-1.5 w-1.5 rounded-full bg-indigo-600"></span>}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No job card assigned</span>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}

      {/* 4. DELAY MANAGER LIST */}
      {activeTab === "delay-manager" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-4">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Search job card vrn or customer..."
                value={searchVrn}
                onChange={(e) => setSearchVrn(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-4 text-xs font-medium focus:outline-hidden focus:border-slate-300 focus:bg-white transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-600 focus:outline-hidden"
                >
                  <option value="All">All Statuses</option>
                  {TAT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Stage:</span>
                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-600 focus:outline-hidden"
                >
                  <option value="All">All Stages</option>
                  {WORKSHOP_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Job cards table for delay reporting */}
          <div className="overflow-x-auto">
            <table className="ds-table w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="ds-th p-3">Vehicle Details</th>
                  <th className="ds-th p-3">TAT Status</th>
                  <th className="ds-th p-3">Workshop Stage</th>
                  <th className="ds-th p-3">Delay Reason (L1 &gt; L2)</th>
                  <th className="ds-th p-3">Delay Reason (L3 &gt; L5)</th>
                  <th className="ds-th p-3 text-center">Interval</th>
                  <th className="ds-th p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="ds-td text-center py-12 text-slate-400 font-medium">
                      No active vehicles match the search or filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map(job => (
                    <tr key={job.job_id} className="ds-table-row hover:bg-slate-50/50 transition-all font-medium">
                      <td className="ds-td p-3 font-bold text-slate-900">
                        <p>{job.vrn}</p>
                        <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">{job.customer_name}</span>
                      </td>
                      <td className="ds-td p-3">
                        <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                          {job.tat_status || "PENDING"}
                        </span>
                      </td>
                      <td className="ds-td p-3">
                        <span className="text-[10px] font-black uppercase text-orange-700 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-md">
                          {job.workshop_stage || "work-in-progress"}
                        </span>
                      </td>
                      <td className="ds-td p-3">
                        {job.l1_delay ? (
                          <div className="space-y-0.5">
                            <p className="font-bold text-amber-700 uppercase tracking-wide">L1: {job.l1_delay}</p>
                            <p className="text-[10px] text-slate-500">L2: {job.l2_delay || "N/A"}</p>
                          </div>
                        ) : (
                          <span className="text-emerald-600 font-bold">No Delays</span>
                        )}
                      </td>
                      <td className="ds-td p-3">
                        {job.l1_delay ? (
                          <div className="space-y-0.5">
                            <p className="text-[10px] text-slate-500">L3: {job.l3_delay || "N/A"}</p>
                            <p className="text-[10px] text-red-500">L5: {job.l5_delay || "N/A"}</p>
                          </div>
                        ) : (
                          <span className="text-emerald-500">-</span>
                        )}
                      </td>
                      <td className="ds-td p-3 text-center font-mono font-bold text-slate-500">{job.time_slot || "09:15"}</td>
                      <td className="ds-td p-3 text-center">
                        <button
                          onClick={() => openDelayLogger(job)}
                          className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg shadow-2xs transition-all"
                        >
                          Edit Delays
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* 5. PARETO DELAY ANALYTICS */}
      {activeTab === "analytics" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="analytics-grid">
          
          {/* L1 Delay Causes Distribution */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-600 tracking-wider">Delay Cause Breakdown (L1 Level)</h3>
                <p className="text-[10px] text-slate-400 font-medium">Pareto chart of the principal root causes of workshop halt delays.</p>
              </div>
              <Flame className="h-4 w-4 text-orange-500 animate-pulse" />
            </div>

            <div className="h-80 w-full text-xs">
              {delayAnalytics.l1Data.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 italic font-medium">
                  No active delays reported to generate chart.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={delayAnalytics.l1Data} margin={{ top: 20, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" angle={-15} textAnchor="end" height={60} tickLine={false} />
                    <YAxis stroke="#94a3b8" tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]}>
                      {delayAnalytics.l1Data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? "#ef4444" : index < 3 ? "#f97316" : "#6366f1"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Workshop Stage Distribution */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-600 tracking-wider">Vehicles by Workshop Stage</h3>
                <p className="text-[10px] text-slate-400 font-medium">Occupancy and stage status distribution across repair lines.</p>
              </div>
              <Layers className="h-4 w-4 text-indigo-500" />
            </div>

            <div className="h-80 w-full text-xs">
              {delayAnalytics.stageData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 italic font-medium">
                  No active stage reports to generate charts.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={delayAnalytics.stageData} layout="vertical" margin={{ top: 10, right: 10, left: 40, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" stroke="#94a3b8" />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

        </div>
      )}

      {/* 7. DETAILED DELAY LOGGER DIALOGUE (MODAL) */}
      {loggingJobId !== null && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-slate-200 max-w-xl w-full p-6 space-y-4 shadow-xl max-h-[90dvh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-indigo-600">
                <ShieldAlert className="h-5 w-5" />
                <h3 className="font-black text-sm uppercase tracking-wide">Configure Active Bay &amp; TAT Status</h3>
              </div>
              <button 
                onClick={() => setLoggingJobId(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold uppercase"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-4 py-2">
              
              {/* TAT Status */}
              <div className="space-y-1">
                <label className="ds-label text-[10px] font-bold   uppercase tracking-wider">Active TAT Status Badge</label>
                <select
                  value={logForm.tat_status}
                  onChange={(e) => setLogForm({ ...logForm, tat_status: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-700"
                >
                  {TAT_STATUSES.map(stat => (
                    <option key={stat} value={stat}>{stat}</option>
                  ))}
                </select>
              </div>

              {/* Workshop Stage */}
              <div className="space-y-1">
                <label className="ds-label text-[10px] font-bold   uppercase tracking-wider">Workshop Repair Stage</label>
                <select
                  value={logForm.workshop_stage}
                  onChange={(e) => setLogForm({ ...logForm, workshop_stage: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-700"
                >
                  {WORKSHOP_STAGES.map(stage => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </select>
              </div>

              {/* L1 Delay */}
              <div className="space-y-1">
                <label className="ds-label text-[10px] font-bold   uppercase tracking-wider">L1 Delay (Root category)</label>
                <select
                  value={logForm.l1_delay}
                  onChange={(e) => setLogForm({ ...logForm, l1_delay: e.target.value, l2_delay: "", l3_delay: "", l5_delay: "" })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-700"
                >
                  <option value="">-- No Delay (Active Progress) --</option>
                  {L1_DELAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {/* Show subsequent levels if L1 is active */}
              {logForm.l1_delay && (
                <div className="border-l-2 border-indigo-200 pl-4 space-y-4">
                  
                  {/* L2 Delay */}
                  <div className="space-y-1">
                    <label className="ds-label text-[10px] font-bold   uppercase tracking-wider">L2 Delay (Secondary Category)</label>
                    <select
                      value={logForm.l2_delay}
                      onChange={(e) => setLogForm({ ...logForm, l2_delay: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-700"
                    >
                      <option value="">-- Select L2 Delay --</option>
                      {L2_DELAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>

                  {/* L3 Delay */}
                  <div className="space-y-1">
                    <label className="ds-label text-[10px] font-bold   uppercase tracking-wider">L3 Delay (Tertiary Reason)</label>
                    <select
                      value={logForm.l3_delay}
                      onChange={(e) => setLogForm({ ...logForm, l3_delay: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-700"
                    >
                      <option value="">-- Select L3 Delay --</option>
                      {L3_DELAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>

                  {/* L5 Delay */}
                  <div className="space-y-1">
                    <label className="ds-label text-[10px] font-bold   uppercase tracking-wider">L5 Delay (External Obstruction)</label>
                    <select
                      value={logForm.l5_delay}
                      onChange={(e) => setLogForm({ ...logForm, l5_delay: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-700"
                    >
                      <option value="">-- Select L5 Delay --</option>
                      {L5_DELAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>

                </div>
              )}

              {/* Time slot set */}
              <div className="space-y-1">
                <label className="ds-label text-[10px] font-bold   uppercase tracking-wider">Timeline Reporting Interval</label>
                <select
                  value={logForm.time_slot}
                  onChange={(e) => setLogForm({ ...logForm, time_slot: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-700"
                >
                  {TIME_SLOTS.map(slot => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>

              {/* Delay Notes / other */}
              <div className="space-y-1">
                <label className="ds-label text-[10px] font-bold   uppercase tracking-wider">Delay Specific Notes / details</label>
                <input 
                  type="text"
                  value={logForm.delay_notes}
                  onChange={(e) => setLogForm({ ...logForm, delay_notes: e.target.value })}
                  placeholder="e.g. [Staff: LOKU] Fund strucked with Insurance company..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-medium focus:outline-hidden focus:bg-white"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {DELAY_NOTES_OPTIONS.map(note => (
                    <button
                      key={note}
                      type="button"
                      onClick={() => setLogForm({ ...logForm, delay_notes: (logForm.delay_notes ? `${logForm.delay_notes} ${note}` : note) })}
                      className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 hover:bg-slate-200"
                    >
                      +{note.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            <div className="pt-3 border-t flex gap-2.5">
              <button
                onClick={handleSaveDelayLog}
                className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider transition-all shadow-sm"
              >
                Commit &amp; Synchronize Indicators
              </button>
              <button
                onClick={() => setLoggingJobId(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-500 text-xs font-bold uppercase transition-all"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

import React, { useState, useMemo, useEffect, useRef } from "react";
import { 
  TrendingUp, 
  Target, 
  DollarSign, 
  Percent, 
  Clock, 
  Wrench, 
  CheckCircle2, 
  Play, 
  Pause, 
  User, 
  Phone, 
  Award, 
  ShieldCheck, 
  FileCheck2, 
  Truck, 
  ArrowLeftRight, 
  Plus, 
  AlertTriangle,
  RefreshCw,
  Search,
  CheckCircle,
  HelpCircle,
  Briefcase,
  Bell,
  X
} from "lucide-react";
import { JobCard, Employee, Bay, JobTechnicianMap, JobRevenueSplitDetail, JobRevenue } from "../types";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

// ============================================================================
// ACCOUNTS ROLE: Revenue & DMS Import Splits Panel
// ============================================================================
interface RevenueDashboardProps {
  employees: Employee[];
  jobCards: JobCard[];
  revenues: JobRevenue[];
  splitDetails: JobRevenueSplitDetail[];
  onRefresh: () => void;
}

export function RevenueDashboard({ employees, jobCards, revenues, splitDetails, onRefresh }: RevenueDashboardProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const stats = useMemo(() => {
    const totalRevenue = splitDetails.reduce((sum, d) => sum + (d.split_amount || 0), 0);
    const totalAllocations = splitDetails.length;
    const avgPercentage = splitDetails.reduce((sum, d) => sum + Number(d.split_pct || 0), 0) / (splitDetails.length || 1);
    
    // Group by role
    const roleMap: Record<string, number> = {};
    employees.forEach(emp => {
      const empSplits = splitDetails.filter(d => d.employee_id === emp.employee_id);
      const empSum = empSplits.reduce((sum, d) => sum + (d.split_amount || 0), 0);
      roleMap[emp.role] = (roleMap[emp.role] || 0) + empSum;
    });

    const chartData = Object.entries(roleMap).map(([name, value]) => ({
      name: name.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
      value: Math.round(value)
    }));

    return { totalRevenue, totalAllocations, avgPercentage, chartData };
  }, [employees, splitDetails]);

  const COLORS = ["#f97316", "#3b82f6", "#10b981", "#84cc16", "#a855f7", "#ec4899"];

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gross Splitted Revenue</p>
            <p className="text-2xl font-black text-slate-800 mt-1">₹{stats.totalRevenue.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-orange-500/10 text-orange-600 rounded-xl">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Revenue Allocations</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{stats.totalAllocations}</p>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
            <FileCheck2 className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Average Split %</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{Math.round(stats.avgPercentage)}%</p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chart View */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-5">Revenue Distribution by Role</h2>
          <div className="h-64">
            {stats.chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-medium">
                No revenue allocations recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => `₹${Number(val).toLocaleString()}`} />
                  <Legend verticalAlign="bottom" height={36} iconSize={10} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Detailed Split Breakdown */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Detailed Allocations Ledger</h2>
            <button 
              onClick={onRefresh}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Job Card No..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div className="overflow-y-auto flex-1 max-h-56 divide-y divide-slate-100 pr-1">
            {splitDetails
              .filter(d => {
                const rev = revenues.find(r => r.revenue_id === d.revenue_id);
                const job = rev ? jobCards.find(j => j.job_id === rev.job_id) : null;
                const jobCardNo = job ? job.job_card_no : "";
                return jobCardNo.toLowerCase().includes(searchTerm.toLowerCase());
              })
              .map((split, i) => {
                const emp = employees.find(e => e.employee_id === split.employee_id);
                const rev = revenues.find(r => r.revenue_id === split.revenue_id);
                const job = rev ? jobCards.find(j => j.job_id === rev.job_id) : null;
                const jobCardNo = job ? job.job_card_no : "N/A";
                return (
                  <div key={i} className="py-2.5 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-800">{jobCardNo}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{emp?.full_name || "Unknown Operator"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-orange-600">₹{Number(split.split_amount).toLocaleString()}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{split.split_pct}% Share</p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}


// ============================================================================
// GATE PERSONNEL: Vehicle Entry & Exit Register Panel
// ============================================================================
interface GateEntryProps {
  jobCards: JobCard[];
  bays: Bay[];
  onCreateJob: (job: any) => void;
  onRefresh: () => void;
}

export function GateEntryPanel({ jobCards, bays, onCreateJob, onRefresh }: GateEntryProps) {
  const [vrn, setVrn] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  const activeJobsCount = jobCards.filter(j => j.status !== "Completed").length;
  const totalBaysOccupied = bays.filter(b => b.status === "Occupied").length;

  const handleRegisterEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vrn || !customerName || !customerMobile) return;

    // Generate compliant simple entry structure
    onCreateJob({
      job_card_no: `JC-${Date.now().toString().slice(-5)}`,
      vrn: vrn.trim().toUpperCase(),
      customer_name: customerName.trim(),
      customer_mobile: customerMobile.trim(),
      vehicle_make: "TATA",
      vehicle_model: model || "Nexon",
      sr_type: "General Service",
      status: "Gate In",
      bay_id: null,
      estimated_duration_mins: 120,
      gate_in_time: new Date().toISOString(),
      service_start_time: null,
      service_end_time: null,
      actual_duration_mins: null,
      notes: "Registered by Gate Security Personnel"
    });

    setSuccess(`Vehicle registered: ${vrn.toUpperCase()} registered with Gate In status.`);
    setVrn("");
    setCustomerName("");
    setCustomerMobile("");
    setMake("");
    setModel("");

    setTimeout(() => setSuccess(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {success && (
        <div className="rounded-xl bg-emerald-500/10 p-4 border border-emerald-500/20 flex items-start gap-3 text-emerald-400 text-xs animate-in slide-in-from-top-2 duration-200">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-orange-500/10 text-orange-600 rounded-xl">
            <Truck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Vehicles Inside Yard</p>
            <p className="text-2xl font-black text-slate-800 mt-0.5">{activeJobsCount} Cars</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
            <ArrowLeftRight className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bays Active Occupancy</p>
            <p className="text-2xl font-black text-slate-800 mt-0.5">{totalBaysOccupied} / {bays.length} Bays</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Gate Entry Register Form */}
        <div className="md:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Plus className="h-4 w-4 text-orange-500" />
            <span>New Vehicle Inward Registration</span>
          </h2>

          <form onSubmit={handleRegisterEntry} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Registration Number (VRN) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. KA-03-HA-1234"
                  value={vrn}
                  onChange={(e) => setVrn(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Customer Mobile Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9876543210"
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jane Miller"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Vehicle Make
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Hyundai"
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Vehicle Model
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. i20"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow"
            >
              <Truck className="h-4 w-4" />
              <span>Record Gate Inward & Create Job Card</span>
            </button>
          </form>
        </div>

        {/* Live Gate Log */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Gate Activity Log</h2>
            <button 
              onClick={onRefresh}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 max-h-56 space-y-3 pr-1 text-xs">
            {jobCards
              .filter(j => j.status === "Waiting")
              .map((job, i) => (
                <div key={i} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-start">
                  <div>
                    <p className="font-bold text-slate-800">{job.vrn}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">{job.customer_name} • {job.vehicle_make}</p>
                  </div>
                  <span className="text-[8px] font-mono bg-orange-100 text-orange-800 border border-orange-200 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold">
                    Waiting
                  </span>
                </div>
              ))}

            {jobCards.filter(j => j.status === "Waiting").length === 0 && (
              <div className="text-center py-8 text-slate-400 text-[11px]">
                No vehicles at Waiting status.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


// ============================================================================
// TECHNICIAN ROLE: My Jobs Panel
// ============================================================================
// ============================================================================
// TECHNICIAN ROLE: My Jobs Panel - Toast Notification Support
// ============================================================================
interface ToastItemProps {
  toast: {
    id: string;
    jobId: number;
    jobCardNo: string;
    title: string;
    description: string;
    priority: 'Normal' | 'Express';
    job: JobCard;
  };
  onDismiss: (id: string) => void;
  onStartWork: (jobId: number) => void;
}

function TechnicianToastItem({ toast, onDismiss, onStartWork }: ToastItemProps) {
  const [progress, setProgress] = useState(100);
  const duration = 7000; // 7 seconds
  const intervalTime = 50;
  const decrement = (intervalTime / duration) * 100;

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, duration);

    const progressInterval = setInterval(() => {
      setProgress(prev => Math.max(0, prev - decrement));
    }, intervalTime);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, [toast.id, onDismiss, decrement]);

  return (
    <div className="relative overflow-hidden bg-slate-900 border border-slate-800 text-white rounded-xl shadow-2xl p-4 w-80 flex flex-col gap-2.5 animate-in slide-in-from-right-5 fade-in duration-300">
      <div className="flex items-start justify-between gap-2">
        <div className="flex gap-2">
          <div className="p-2 bg-orange-500/20 text-orange-400 rounded-lg shrink-0 mt-0.5">
            <Bell className="h-4 w-4 animate-bounce" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-400">
                {toast.title}
              </span>
              {toast.priority === "Express" && (
                <span className="text-[8px] font-black uppercase tracking-widest bg-red-600 text-white px-1.5 py-0.5 rounded-md animate-pulse">
                  Express
                </span>
              )}
            </div>
            <p className="text-xs font-black tracking-tight">{toast.jobCardNo}</p>
            <p className="text-[10px] text-slate-300 font-medium leading-relaxed">
              {toast.description}
            </p>
          </div>
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="text-slate-400 hover:text-white transition-colors p-1 rounded-md hover:bg-slate-800 cursor-pointer shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-slate-800/80 pt-2.5 mt-0.5">
        <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">
          Assigned just now
        </span>
        {toast.job.status === "Waiting" && (
          <button
            onClick={() => {
              onStartWork(toast.jobId);
              onDismiss(toast.id);
            }}
            className="bg-orange-500 hover:bg-orange-600 text-white font-black text-[9px] uppercase tracking-wider px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-md active:scale-95"
          >
            <Play className="h-3 w-3 fill-current" />
            Start WIP Work
          </button>
        )}
      </div>

      {/* Progress timer bar */}
      <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-75 ease-linear" style={{ width: `${progress}%` }} />
    </div>
  );
}

const playToastChime = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc1.type = "sine";
    osc2.type = "sine";
    
    osc1.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
    osc2.frequency.setValueAtTime(987.77, ctx.currentTime + 0.08); // B5
    
    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc1.start();
    osc1.stop(ctx.currentTime + 0.3);
    
    osc2.start(ctx.currentTime + 0.08);
    osc2.stop(ctx.currentTime + 0.6);
  } catch (err) {
    console.warn("Could not play toast audio chime:", err);
  }
};

interface TechnicianJobsProps {
  jobCards: JobCard[];
  employeeId: number | null;
  onUpdateJobStatus: (jobId: number, status: JobCard["status"]) => void;
  onRefresh: () => void;
}

export function TechnicianJobsPanel({ jobCards, employeeId, onUpdateJobStatus, onRefresh }: TechnicianJobsProps) {
  const [success, setSuccess] = useState<string | null>(null);
  const [toasts, setToasts] = useState<{
    id: string;
    jobId: number;
    jobCardNo: string;
    title: string;
    description: string;
    priority: 'Normal' | 'Express';
    job: JobCard;
  }[]>([]);

  // Track previously seen job IDs
  const prevJobIdsRef = useRef<Set<number>>(new Set());
  const isInitialMount = useRef(true);

  // Hardcode fallback to general technician mapping for demo
  const myAllocatedJobs = useMemo(() => {
    // Return all assigned job cards that are being actively worked on
    return jobCards.filter(job => job.status !== "Completed");
  }, [jobCards]);

  // Monitor for newly assigned job cards
  useEffect(() => {
    const currentActiveJobIds = new Set(myAllocatedJobs.map(j => j.job_id));
    
    if (isInitialMount.current) {
      prevJobIdsRef.current = currentActiveJobIds;
      isInitialMount.current = false;
      return;
    }
    
    const newJobs = myAllocatedJobs.filter(job => !prevJobIdsRef.current.has(job.job_id));
    
    if (newJobs.length > 0) {
      const newToasts = newJobs.map(job => {
        const id = Math.random().toString(36).substring(2, 9);
        return {
          id,
          jobId: job.job_id,
          jobCardNo: job.job_card_no,
          title: "New Job Assigned",
          description: `${job.vehicle_make} ${job.vehicle_model} (${job.vrn})`,
          priority: job.priority || "Normal",
          job
        };
      });
      
      setToasts(prev => [...prev, ...newToasts]);
      playToastChime();
    }
    
    prevJobIdsRef.current = currentActiveJobIds;
  }, [myAllocatedJobs]);

  const handleAction = (jobId: number, action: JobCard["status"]) => {
    onUpdateJobStatus(jobId, action);
    setSuccess(`Status updated to ${action} successfully!`);
    setTimeout(() => setSuccess(null), 3000);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Alert Banner */}
        {success && (
          <div className="rounded-xl bg-emerald-500/10 p-4 border border-emerald-500/20 flex items-start gap-3 text-emerald-400 text-xs animate-in slide-in-from-top-2 duration-200">
            <CheckCircle className="h-5 w-5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Quick metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Allocated Jobs</p>
              <p className="text-2xl font-black text-slate-800 mt-1">{myAllocatedJobs.length}</p>
            </div>
            <div className="p-3 bg-orange-500/10 text-orange-600 rounded-xl">
              <Wrench className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Wip Jobs</p>
              <p className="text-2xl font-black text-slate-800 mt-1">
                {myAllocatedJobs.filter(j => j.status === "WIP").length}
              </p>
            </div>
            <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
              <Clock className="h-6 w-6 animate-pulse" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tasks Ready for QC</p>
              <p className="text-2xl font-black text-slate-800 mt-1">
                {myAllocatedJobs.filter(j => j.status === "Service Completed").length}
              </p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Allocated List */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Wrench className="h-4 w-4 text-orange-500" />
              <span>My Active Assignments Ledger</span>
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const id = Math.random().toString(36).substring(2, 9);
                  const demoJob: JobCard = {
                    job_id: Math.floor(Math.random() * 100000),
                    job_card_no: `JC-DEMO-${Math.floor(1000 + Math.random() * 9000)}`,
                    vrn: "DL3C-AB-1234",
                    customer_name: "John Doe (Demo)",
                    customer_mobile: "+91 98765 43210",
                    vehicle_make: "TATA",
                    vehicle_model: "Nexon",
                    vehicle_year: 2022,
                    km_reading: 12450,
                    sr_type_id: 1,
                    job_description: "General service & brake check. Demo assignment notification.",
                    priority: Math.random() > 0.5 ? "Express" : "Normal",
                    bay_id: null,
                    status: "Waiting",
                    etd: "2026-06-30T18:00:00Z",
                    started_at: null,
                    completed_at: null,
                    invoiced_at: null,
                    created_by: 1,
                    created_at: new Date().toISOString()
                  };
                  setToasts(prev => [...prev, {
                    id,
                    jobId: demoJob.job_id,
                    jobCardNo: demoJob.job_card_no,
                    title: "Demo Job Assigned",
                    description: `${demoJob.vehicle_make} ${demoJob.vehicle_model} (${demoJob.vrn})`,
                    priority: demoJob.priority,
                    job: demoJob
                  }]);
                  playToastChime();
                }}
                title="Trigger Demo Assignment Toast"
                className="text-slate-400 hover:text-orange-500 focus:outline-none cursor-pointer flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
              >
                <Bell className="h-3.5 w-3.5" />
                <span>Test Alert</span>
              </button>
              <button 
                onClick={onRefresh}
                className="text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {myAllocatedJobs.map((job) => (
              <div key={job.job_id} className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50/50 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-800">{job.job_card_no}</span>
                    <span className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                      job.status === "Active" ? "bg-orange-100 text-orange-800 border-orange-200 animate-pulse" : "bg-slate-100 text-slate-800"
                    }`}>
                      {job.status === "Waiting" ? "Allocated" : job.status === "Active" ? "WIP" : job.status === "Completed" ? "Service Completed" : job.status}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-600">{job.vehicle_make} {job.vehicle_model} ({job.vrn})</p>
                  <p className="text-[10px] text-slate-400">Owner: {job.customer_name} • {job.customer_mobile}</p>
                  {job.notes && (
                    <p className="text-[10px] text-amber-600 italic bg-amber-50/50 px-2 py-1 rounded border border-amber-100 mt-1 inline-block">
                      Note: {job.notes}
                    </p>
                  )}
                </div>

                {/* Status Control Actions */}
                <div className="flex gap-2 w-full md:w-auto">
                  {job.status === "Waiting" && (
                    <button
                      onClick={() => handleAction(job.job_id, "Active")}
                      className="w-full md:w-auto flex items-center justify-center gap-1 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                    >
                      <Play className="h-3 w-3" />
                      <span>Start WIP Work</span>
                    </button>
                  )}

                  {job.status === "Active" && (
                    <>
                      <button
                        onClick={() => handleAction(job.job_id, "Waiting")}
                        className="flex-1 md:flex-none flex items-center justify-center gap-1 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                      >
                        <Pause className="h-3 w-3" />
                        <span>Pause Job</span>
                      </button>
                      <button
                        onClick={() => handleAction(job.job_id, "Completed")}
                        className="flex-1 md:flex-none flex items-center justify-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Finish & QC</span>
                      </button>
                    </>
                  )}

                  {job.status === "Completed" && (
                    <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-100 px-3 py-2 rounded-lg border border-emerald-200">
                      Awaiting Supervisor QC Release
                    </div>
                  )}
                </div>
              </div>
            ))}

            {myAllocatedJobs.length === 0 && (
              <div className="p-12 text-center text-slate-400 text-xs">
                Excellent! No allocated job cards to work on right now.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notifications Floating Stack */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <TechnicianToastItem 
              toast={toast} 
              onDismiss={(id) => setToasts(prev => prev.filter(t => t.id !== id))} 
              onStartWork={(jobId) => handleAction(jobId, "Active")}
            />
          </div>
        ))}
      </div>
    </>
  );
}


// ============================================================================
// TECHNICIAN ROLE: My KPI Metrics Panel
// ============================================================================
interface TechnicianKpiProps {
  employees: Employee[];
  employeeId: number | null;
}

export function TechnicianKpiPanel({ employees, employeeId }: TechnicianKpiProps) {
  // Let's find current employee profile or use demo values if empty
  const currentEmp = useMemo(() => {
    return employees.find(e => e.employee_id === employeeId) || employees[0];
  }, [employees, employeeId]);

  if (!currentEmp) {
    return <div className="text-slate-400 text-xs text-center py-12">Technician profile not found.</div>;
  }

  const target = currentEmp.target_revenue || 50000;
  const current = currentEmp.allocated_revenue || 0;
  const kpiPercentage = Math.round((current / (target || 1)) * 100);

  const kpiChartData = [
    { name: "My Work Contribution", Current: current, Target: target }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">My Target Revenue</p>
            <p className="text-2xl font-black text-slate-800 mt-1">₹{target.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-orange-500/10 text-orange-600 rounded-xl">
            <Target className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">My Achieved Revenue</p>
            <p className="text-2xl font-black text-slate-800 mt-1">₹{current.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">KPI Completion Index</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{kpiPercentage}%</p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
            <Percent className="h-6 w-6" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-5">Monthly Target vs Accomplishment</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={kpiChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
              <Tooltip formatter={(value) => `₹${Number(value).toLocaleString()}`} />
              <Legend verticalAlign="top" height={36} iconSize={10} iconType="circle" />
              <Bar dataKey="Current" fill="#f97316" radius={[4, 4, 0, 0]} barSize={50} name="Achieved Revenue" />
              <Bar dataKey="Target" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={50} name="Assigned Goal" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}


// ============================================================================
// TECHNICIAN ROLE: My Profile Information Panel
// ============================================================================
interface TechnicianProfileProps {
  employees: Employee[];
  employeeId: number | null;
}

export function TechnicianProfilePanel({ employees, employeeId: propsEmployeeId }: TechnicianProfileProps) {
  const [employee, setEmployee] = useState<any>(null);
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form edit states
  const [mobile, setMobile] = useState("");
  const [altMobile, setAltMobile] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/my-profile", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEmployee(data.employee);
        setPendingRequest(data.pendingRequest);
        setMobile(data.employee.mobile || "");
        setAltMobile(data.employee.alt_mobile || "");
        setEmail(data.employee.email || "");
      } else {
        setError(data.error || "Failed to load profile.");
      }
    } catch (err) {
      setError("Network error: failed to fetch profile details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setToast(null);

    // Format Validations
    const mobileRegex = /^\+?[0-9]{10,15}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!mobileRegex.test(mobile.replace(/\s+/g, ""))) {
      setToast({ message: "Invalid mobile number format. Must contain 10-15 digits.", type: "error" });
      setSaving(false);
      return;
    }
    if (altMobile && !mobileRegex.test(altMobile.replace(/\s+/g, ""))) {
      setToast({ message: "Invalid alternate mobile format.", type: "error" });
      setSaving(false);
      return;
    }
    if (!emailRegex.test(email)) {
      setToast({ message: "Invalid email address format.", type: "error" });
      setSaving(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/my-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ mobile, alt_mobile: altMobile || null, email })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setToast({ message: data.message, type: "success" });
        fetchProfile();
      } else {
        setToast({ message: data.error || "Failed to submit updates.", type: "error" });
      }
    } catch (err) {
      setToast({ message: "Network error: failed to save changes.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // Fallback if loading
  const currentEmp = employee || employees.find(e => e.employee_id === propsEmployeeId) || employees[0];

  if (loading && !currentEmp) {
    return (
      <div className="flex justify-center items-center h-48">
        <RefreshCw className="h-6 w-6 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!currentEmp) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200 shadow-sm text-xs font-medium">
        Profile details not mapped. Please contact administrator.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Pending Approval Alert Box */}
      {pendingRequest && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 items-start shadow-sm">
          <Clock className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider">Pending HR/Admin Approval</h4>
            <p className="text-xs text-amber-700">
              An update request for your contact details is currently awaiting review. The changes will not become active until approved.
            </p>
            <div className="pt-1.5 grid grid-cols-3 gap-4 text-[10px] font-mono text-amber-800">
              <div><span className="font-bold">Requested Phone:</span> {pendingRequest.mobile}</div>
              <div><span className="font-bold">Alt Phone:</span> {pendingRequest.alt_mobile || "None"}</div>
              <div><span className="font-bold">Requested Email:</span> {pendingRequest.email}</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Profile Info Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-5">
        
        {/* Left Column Profile Banner Summary */}
        <div className="md:col-span-2 bg-slate-900 text-white p-6 flex flex-col justify-between relative min-h-[300px]">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-orange-600/30 to-indigo-600/30 pointer-events-none" />
          
          <div className="relative space-y-4">
            <div className="w-20 h-20 bg-orange-500 rounded-2xl flex items-center justify-center border-4 border-slate-800 shadow-md text-white font-black text-3xl uppercase">
              {currentEmp.full_name.charAt(0)}
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight uppercase">{currentEmp.full_name}</h1>
              <p className="text-xs text-slate-400 font-mono">ID: {currentEmp.employee_code || `EMP0${currentEmp.employee_id}`}</p>
            </div>
          </div>

          <div className="relative space-y-2 pt-6 border-t border-slate-800/80">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Role & Permissions</div>
            <p className="text-xs font-bold uppercase tracking-wide text-orange-400">
              {currentEmp.role ? currentEmp.role.split("_").join(" ") : "Staff Member"}
            </p>
            <div className="flex gap-2 pt-2">
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border bg-emerald-950/80 text-emerald-400 border-emerald-800/50 uppercase tracking-wider">
                Active Duty
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border bg-slate-800 text-slate-300 border-slate-700/50 uppercase tracking-wider font-mono">
                {currentEmp.employee_grade || "Senior"}
              </span>
            </div>
          </div>
        </div>

        {/* Right Columns Grid Details */}
        <div className="md:col-span-3 p-6 space-y-6">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2">Profile Overview</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Department</span>
              <p className="text-xs font-black text-slate-800 uppercase">{currentEmp.department || "Workshop Operations"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Designation</span>
              <p className="text-xs font-black text-slate-800 uppercase">{currentEmp.designation || currentEmp.role.split("_").join(" ")}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Workshop Terminal</span>
              <p className="text-xs font-black text-slate-800 uppercase">{currentEmp.workshop || "Devalapura Terminal 1"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Reporting Manager</span>
              <p className="text-xs font-black text-slate-800 uppercase">{currentEmp.reporting_manager || "Workshop Manager (Admin)"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Date of Joining</span>
              <p className="text-xs font-mono font-bold text-slate-800">{currentEmp.date_of_joining || "2026-06-01"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Aadhaar (Last 4 digits)</span>
              <p className="text-xs font-mono font-bold text-slate-800">
                {currentEmp.aadhaar ? `********${currentEmp.aadhaar.slice(-4)}` : "********9088"}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">PAN Number (Masked)</span>
              <p className="text-xs font-mono font-bold text-slate-800">{currentEmp.pan ? `${currentEmp.pan.slice(0, 5)}*****` : "ABCDE*****F"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Basic Salary Details</span>
              <p className="text-xs font-mono font-bold text-slate-800">₹{Number(currentEmp.basic_salary || 0).toLocaleString()}/month</p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-2">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-slate-400" /> Bank Account Details (Salary)
            </span>
            <p className="text-xs font-bold text-slate-800">
              {currentEmp.bank_details || "HDFC Bank Ltd, A/C: *******4521, IFSC: HDFC0002145"}
            </p>
          </div>
        </div>
      </div>

      {/* Profile Contact Edit Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="border-b pb-3 flex justify-between items-center">
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Update Personal Contacts</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Edit only your personal contact details. Updates may require HR approval.</p>
          </div>
          <span className="text-[9px] font-black uppercase text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full">
            Editable Fields Only
          </span>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Mobile Number</label>
              <input
                type="text"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="Enter personal mobile number"
                className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-slate-400 focus:bg-white"
                required
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Alternate Mobile Number</label>
              <input
                type="text"
                value={altMobile}
                onChange={(e) => setAltMobile(e.target.value)}
                placeholder="Alternate phone (optional)"
                className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-slate-400 focus:bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Personal Email ID</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter personal email ID"
                className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-slate-400 focus:bg-white"
                required
              />
            </div>
          </div>

          {toast && (
            <div className={`p-3 rounded-xl border text-xs font-bold ${toast.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"}`}>
              {toast.message}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-300 text-xs font-black uppercase tracking-wider px-6 py-2.5 rounded-xl shadow-sm transition-all duration-150"
            >
              {saving ? "Saving Changes..." : "Request Profile Update"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

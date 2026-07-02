import React from "react";
import { 
  Wrench, 
  Clock, 
  CheckCircle, 
  DollarSign, 
  AlertTriangle, 
  UserCheck,
  Play,
  CheckCircle2,
  Calendar
} from "lucide-react";
import { JobCard, Bay, AlertLog, Employee } from "../types";

interface DashboardProps {
  jobCards: JobCard[];
  bays: Bay[];
  alerts: AlertLog[];
  employees: Employee[];
  onAcknowledgeAlert: (id: number) => void;
  onSelectJob: (job: JobCard) => void;
  onTabChange: (tab: string) => void;
  projectedRevenue?: number;
  generatedRevenue?: number;
}

export default function Dashboard({
  jobCards,
  bays,
  alerts,
  employees,
  onAcknowledgeAlert,
  onSelectJob,
  onTabChange,
  projectedRevenue = 0,
  generatedRevenue = 0
}: DashboardProps) {
  // Active jobs: employee_id is assigned in job_card_technician (technician_assignments) and status is In Progress
  const activeJobs = jobCards.filter(j => 
    j.job_status_master === "In Progress" && 
    j.technician_assignments && j.technician_assignments.length > 0
  );
  const waitingJobs = jobCards.filter(j => j.status === "Waiting");
  const completedJobs = jobCards.filter(j => j.status === "Completed");
  const invoicedJobs = jobCards.filter(j => j.status === "Invoiced");

  // State A: Waiting: No Mechanic, No Bay
  const stateAJobs = jobCards.filter(j => 
    j.job_status_master === "Open" && 
    !j.in_job_card_technician && 
    !j.in_bay_queue
  );

  // State B: Waiting: Bay Assigned, No Mechanic
  const stateBJobs = jobCards.filter(j => 
    j.bay_queue_status === "Waiting" && 
    !j.in_job_card_technician
  );

  // State C: In Parking Queue
  const stateCJobs = jobCards.filter(j => 
    j.live_status_master === "Parking"
  );

  // Approximate revenue calculations
  const totalRevenue = jobCards.length * 4500; // estimated/average for display
  const projVal = projectedRevenue || 0;
  const genVal = generatedRevenue || 0;
  const gapVal = projVal - genVal;
  const isGreen = genVal >= projVal;
  const isAmber = gapVal > 0;

  const getElapsedTimeStr = (assignedAt: string | null) => {
    if (!assignedAt) return "—";
    const start = new Date(assignedAt).getTime();
    if (isNaN(start)) return "—";
    const now = new Date().getTime();
    const diffMs = now - start;
    if (diffMs < 0) return "0m";
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (diffHrs > 0) {
      return `${diffHrs}h ${diffMins}m`;
    }
    return `${diffMins}m`;
  };

  const getElapsedTimeHours = (assignedAt: string | null) => {
    if (!assignedAt) return 0;
    const start = new Date(assignedAt).getTime();
    if (isNaN(start)) return 0;
    const now = new Date().getTime();
    return (now - start) / (1000 * 60 * 60);
  };

  const checkTatBreach = (serviceType: string | null, elapsedHours: number) => {
    const t = (serviceType || "").toLowerCase();
    if (t.includes("running") && elapsedHours > 8) return true;
    if (t.includes("schedule") && elapsedHours > 4) return true;
    if (t.includes("accidental") && elapsedHours > 72) return true;
    if (t.includes("onsite") && elapsedHours > 6) return true;
    return false;
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Welcome */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">Workshop Overview</h1>
          <p className="text-xs text-slate-500 font-medium">Live monitoring of bays, jobs, and technician assignments.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            System Live: 100% Online
          </span>
        </div>
      </div>

      {/* 2. Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between w-full">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Repair Jobs</p>
              <p className="text-2xl font-black text-slate-900">{activeJobs.length}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600">
              <Wrench className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="flex flex-col gap-2 pt-1 border-t border-slate-100 max-h-[140px] overflow-y-auto pr-1">
            {activeJobs.length === 0 ? (
              <p className="text-[10px] text-slate-400 italic">No active repair jobs</p>
            ) : (
              activeJobs.map(j => {
                const mainAssignment = j.technician_assignments?.[0];
                const techName = mainAssignment ? mainAssignment.technician_name : "Unknown";
                const assignedAt = mainAssignment ? mainAssignment.assigned_at : null;
                const elapsedHours = getElapsedTimeHours(assignedAt);
                const elapsedStr = getElapsedTimeStr(assignedAt);
                const isBreached = checkTatBreach(j.service_type_master, elapsedHours);
                
                return (
                  <div key={j.job_id} className="flex flex-col gap-0.5 border-b border-slate-50 pb-1.5 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-mono font-bold text-slate-800">{j.vrn}</span>
                      <span className="text-slate-500 font-semibold">{elapsedStr}</span>
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-slate-400">
                      <span>Tech: {techName}</span>
                      {isBreached && (
                        <span className="bg-red-500/10 text-red-700 border border-red-500/20 px-1 py-0.5 rounded text-[8px] font-black uppercase tracking-wider animate-pulse">
                          TAT Alert
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between w-full">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Waiting in Queue</p>
              <p className="text-2xl font-black text-slate-900">{waitingJobs.length}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Clock className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-100">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-500 font-medium">No Mech, No Bay:</span>
              <span className="px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-700 border border-red-200">{stateAJobs.length}</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-500 font-medium">Bay Assigned, No Mech:</span>
              <span className="px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-700 border border-amber-200">{stateBJobs.length}</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-500 font-medium">In Parking Queue:</span>
              <span className="px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200">{stateCJobs.length}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completed Today</p>
            <p className="text-2xl font-black text-slate-900">{jobCards.filter(j => j.completed_today === true).length}</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-green-50 border border-green-200 flex items-center justify-center text-green-600">
            <CheckCircle className="h-4.5 w-4.5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between w-full">
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Revenue Today</p>
              <p className={`text-lg font-black ${isGreen ? "text-emerald-600" : isAmber ? "text-amber-600" : "text-slate-900"}`}>
                ₹{genVal.toLocaleString()}
              </p>
            </div>
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center border ${
              isGreen ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-amber-50 border-amber-200 text-amber-600"
            }`}>
              <DollarSign className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="flex flex-col gap-1 pt-1 border-t border-slate-100 text-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Projected:</span>
              <span className="font-bold text-slate-800">₹{projVal.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Generated:</span>
              <span className="font-bold text-slate-800">₹{genVal.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Gap:</span>
              <span className={`px-1.5 py-0.5 rounded font-black text-[9px] uppercase tracking-wider ${
                isGreen ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
              }`}>
                ₹{gapVal.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bays & Alerts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left: Interactive Bay Status Tracker */}
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 bg-slate-50/50 -mx-4 -mt-4 p-4">
            <div className="space-y-0.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">Bay Status Tracker</h2>
              <p className="text-[10px] text-slate-400 font-medium leading-none">Allocation of physical workshop bays.</p>
            </div>
            <button 
              onClick={() => onTabChange("jobs")}
              className="text-[10px] font-bold text-orange-600 hover:text-orange-700 tracking-wider uppercase"
            >
              ALLOCATE BAY →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {bays.map((bay) => {
              // Find the active job assigned to this bay
              const currentJob = jobCards.find(j => j.bay_id === bay.bay_id && ["Active", "Carry Forward", "Rework", "Completed"].includes(j.status));

              let statusColor = "bg-slate-50 text-slate-600 border-slate-200";
              let badgeColor = "bg-slate-100 text-slate-800";
              if (bay.status === "Active") {
                statusColor = "bg-green-50 text-green-900 border-green-200";
                badgeColor = "bg-green-100 text-green-800";
              } else if (bay.status === "Carry Forward") {
                statusColor = "bg-orange-50 text-orange-900 border-orange-200";
                badgeColor = "bg-orange-100 text-orange-800";
              } else if (bay.status === "Rework") {
                statusColor = "bg-red-50 text-red-900 border-red-200";
                badgeColor = "bg-red-100 text-red-800";
              } else if (bay.status === "Reserved") {
                statusColor = "bg-blue-50 text-blue-900 border-blue-200";
                badgeColor = "bg-blue-100 text-blue-800";
              }

              return (
                <div 
                  key={bay.bay_id} 
                  className={`p-3 rounded-lg border ${statusColor} transition-all hover:shadow-xs flex flex-col justify-between h-36`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[9px] font-mono font-bold uppercase tracking-widest opacity-75">{bay.bay_type} Bay</span>
                      <h3 className="font-bold text-sm mt-0.5">{bay.bay_name}</h3>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${badgeColor}`}>
                      {bay.status}
                    </span>
                  </div>

                  {currentJob ? (
                    <div 
                      onClick={() => onSelectJob(currentJob)}
                      className="bg-white/90 backdrop-blur-xs p-2 rounded border border-slate-200/60 hover:bg-white cursor-pointer transition-all space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono font-bold text-slate-800">{currentJob.vrn}</span>
                        <span className="text-[10px] text-slate-500 font-bold">ETD: {new Date(currentJob.etd).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      <p className="text-[10px] text-slate-600 line-clamp-1 font-medium">{currentJob.customer_name} • {currentJob.vehicle_make} {currentJob.vehicle_model}</p>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-500 italic py-2 flex items-center gap-1.5 font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                      No active vehicle assigned
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Live Alerts Feed & Daily Stats */}
        <div className="space-y-6">
          
          {/* Active Alerts Feed */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 bg-slate-50/50 -mx-4 -mt-4 p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4.5 w-4.5 text-orange-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">Breach Alerts</h2>
              </div>
              <span className="text-[10px] font-mono bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                {alerts.filter(a => a.status === "Active").length} ACTIVE
              </span>
            </div>

            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1 pt-1">
              {alerts.filter(a => a.status === "Active").length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs font-medium">
                  All systems operating normally. No active breach alerts.
                </div>
              ) : (
                alerts.filter(a => a.status === "Active").map((alert) => (
                  <div key={alert.alert_id} className="p-2.5 bg-slate-50 rounded border border-slate-200 space-y-2 text-[11px]">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-slate-800 leading-normal">{alert.alert_message}</p>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        alert.severity === "Critical" ? "bg-red-100 text-red-800" : "bg-orange-100 text-orange-800"
                      }`}>
                        {alert.severity}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                      <span>{new Date(alert.created_at).toLocaleTimeString()}</span>
                      <button 
                        onClick={() => onAcknowledgeAlert(alert.alert_id)}
                        className="text-orange-600 font-bold hover:underline uppercase tracking-wider text-[9px]"
                      >
                        Acknowledge
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Staffing Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 bg-slate-50/50 -mx-4 -mt-4 p-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                <UserCheck className="h-4.5 w-4.5 text-orange-600" />
                Technician Roster
              </h2>
            </div>
            <div className="space-y-2.5 pt-1">
              {employees.filter(e => ["Technician", "Electrician", "Add Tech"].includes(e.role)).slice(0, 4).map((emp) => (
                <div key={emp.employee_id} className="flex items-center justify-between text-xs border-b border-slate-50 pb-2.5 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-md bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-xs">
                      {emp.full_name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{emp.full_name}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{emp.role} • {emp.employee_grade}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100 uppercase tracking-wider">
                    READY
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

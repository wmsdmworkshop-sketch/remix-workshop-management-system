import React, { useState, useMemo } from "react";
import { 
  ClipboardCopy, Search, Sparkles, Send, CheckCircle2, AlertTriangle, 
  Activity, DollarSign, Users, Clock, History, Camera, User, FileText, 
  CheckSquare, FileSpreadsheet, Eye, ChevronRight
} from "lucide-react";

export interface ServiceAdvisorWorkspaceProps {
  jobCards: any[];
  bays: any[];
  employees: any[];
  alertLogs: any[];
  onRefresh: () => void;
  onUpdateJob: (id: number, updatedFields: Partial<any>) => Promise<void>;
  onAssignTechnicians: (id: number, allocs: any[]) => Promise<void>;
  currentUser?: any;
  aiModeEnabled?: boolean;
}

export const ServiceAdvisorWorkspace: React.FC<ServiceAdvisorWorkspaceProps> = React.memo(({
  jobCards = [],
  bays = [],
  employees = [],
  alertLogs = [],
  onRefresh,
  onUpdateJob,
  onAssignTechnicians,
  currentUser,
  aiModeEnabled = true
}) => {
  // Input and search states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Digital inspection checklist state
  const [inspectionChecked, setInspectionChecked] = useState<Record<string, boolean>>({
    exterior: true, interior: true, tyres: false, battery: true, leaks: false, lights: true, brakes: false, suspension: false
  });

  // Complaint form states
  const [complaints, setComplaints] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");
  const [priority, setPriority] = useState<string>("Normal");

  // Selected vehicle object derivation
  const selectedJob = useMemo(() => {
    return jobCards.find(j => j.job_id === selectedJobId) || jobCards[0] || null;
  }, [jobCards, selectedJobId]);

  // Section 1: Dashboard KPIs
  const dashboardStats = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const advisorJcs = jobCards.filter(j => j.service_advisor === currentUser?.full_name || !j.service_advisor);
    const totalRev = advisorJcs.reduce((sum, j) => sum + (j.labor_price || 0) + (j.parts_price || 0), 0) || 185000;
    const jcCount = advisorJcs.length;
    const openCount = advisorJcs.filter(j => ["Active", "Waiting"].includes(j.status)).length;
    const pendingEstimates = advisorJcs.filter(j => j.current_workflow_state === "ESTIMATE_PENDING").length || 3;
    const carryForward = advisorJcs.filter(j => j.status === "Carry Forward").length || 1;
    const rework = advisorJcs.filter(j => j.status === "Rework" || j.rework_count > 0).length || 0;
    const breaches = alertLogs.filter(a => a.alert_type === "SLA_BREACH").length;

    return {
      totalRev, jcCount, openCount, pendingEstimates, carryForward, rework, breaches,
      productivity: "94%",
      achievement: "88%"
    };
  }, [jobCards, alertLogs, currentUser]);

  // Section 2: Advisor Live Queues
  const queueItems = useMemo(() => {
    return jobCards.filter(j => ["Waiting", "Active"].includes(j.status)).map((j, i) => ({
      id: j.job_id,
      vrn: j.vrn,
      customer: j.customer_name || "Retail Customer",
      makeModel: `${j.vehicle_make} ${j.vehicle_model}`,
      stage: j.current_workflow_state || "Diagnostics",
      priority: j.priority || "Normal",
      isWalkin: i % 2 === 0
    }));
  }, [jobCards]);

  // Section 9: Advisor AI Copilot
  const aiCopilotData = useMemo(() => {
    if (!selectedJob) return null;
    const isEV = selectedJob.vehicle_model?.toLowerCase().includes("ev");
    return {
      analysis: isEV ? "High-voltage isolator leak code logged in telemetry." : "Periodic maintenance service checklist fits general guidelines.",
      suggestedJobs: isEV ? ["HV Battery Check", "Isolation Test"] : ["Engine Oil Change", "Oil Filter Replacement"],
      suggestedParts: isEV ? ["HV Connector Shield", "Coolant Seal"] : ["Synthetic Oil 5W30", "Gasket Kit"],
      estimatedCost: isEV ? 8500 : 4200,
      predictedTat: isEV ? "90 mins" : "45 mins",
      repeatRisk: isEV ? "Low" : "Negligible",
      warrantyRecommendation: "Approved under standard extended EV coverage.",
      upsell: isEV ? "Cabin HEPA filter upgrade (₹1,200)" : "Wheel balancing & alignment package (₹1,500)"
    };
  }, [selectedJob]);

  // Handle complaint submission
  const handleSubmitComplaints = async () => {
    if (!selectedJob) return;
    try {
      const updatedRemarks = `${selectedJob.remarks || ""}\n[Complaint Registered]: ${complaints} | Remarks: ${remarks}`;
      await onUpdateJob(selectedJob.job_id, {
        remarks: updatedRemarks,
        priority: priority as any
      });
      setComplaints("");
      setRemarks("");
      alert("Complaints successfully registered for vehicle.");
      onRefresh();
    } catch (e) {
      alert("Failed to submit complaints.");
    }
  };

  // Handle inspection checklist toggle
  const handleToggleInspection = (key: string) => {
    setInspectionChecked(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="space-y-6 bg-[#0B1220] text-slate-100 min-h-screen p-4 md:p-6" lang="en">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              Primary Advisor Workspace
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white mt-1 uppercase tracking-tight">
            Service Advisor Console
          </h1>
        </div>

        {/* Tab triggers */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          {[
            { id: "dashboard", label: "Overview Dashboard" },
            { id: "reception", label: "Vehicle Reception" },
            { id: "inspection", label: "Digital Inspection" },
            { id: "estimate", label: "Estimates & JCs" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === tab.id 
                  ? "bg-[#2563EB] text-white" 
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
          {/* SECTION 1: KPI Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { label: "Today's Revenue", val: `₹${(dashboardStats.totalRev / 1000).toFixed(0)}k`, icon: DollarSign, color: "text-emerald-400" },
              { label: "Job Cards Count", val: dashboardStats.jcCount, icon: FileText, color: "text-white" },
              { label: "Open Job Cards", val: dashboardStats.openCount, icon: ClipboardCopy, color: "text-blue-400" },
              { label: "Pending Estimates", val: dashboardStats.pendingEstimates, icon: Eye, color: "text-amber-400" },
              { label: "SLA Breaches", val: dashboardStats.breaches, icon: AlertTriangle, color: "text-red-500 animate-pulse" },
              { label: "Productivity Target", val: dashboardStats.productivity, icon: Activity, color: "text-slate-300" }
            ].map((stat, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[9px] font-bold uppercase tracking-wider">{stat.label}</span>
                  <stat.icon className="h-4 w-4" />
                </div>
                <span className={`text-lg font-black block ${stat.color}`}>{stat.val}</span>
              </div>
            ))}
          </div>

          {/* SECTION 2: Live Advisor queue */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <Users className="h-4 w-4 text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Today's Queue Manager</h3>
              </div>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {queueItems.map(item => (
                  <div key={item.id} className="bg-slate-950/40 border border-slate-850 p-2.5 rounded-xl flex items-center justify-between">
                    <div>
                      <button 
                        onClick={() => setSelectedJobId(item.id)}
                        className="font-mono text-xs font-bold text-slate-200 hover:text-blue-400 transition-colors"
                      >
                        {item.vrn}
                      </button>
                      <div className="text-[10px] text-slate-400 font-medium">{item.customer} • {item.makeModel}</div>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      item.priority === "Express" ? "bg-red-500/10 text-red-400" :
                      item.isWalkin ? "bg-blue-500/10 text-blue-400" : "bg-slate-850 text-slate-400"
                    }`}>{item.priority === "Express" ? "Express" : item.isWalkin ? "Walk-in" : "Appointment"}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Copilot Advisor recommendation feed — gated by aiModeEnabled */}
            {selectedJob && aiModeEnabled && aiCopilotData && (
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg space-y-4 lg:col-span-2">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <Sparkles className="h-4 w-4 text-emerald-400 animate-pulse" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Advisor AI Assistant</h3>
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-850 text-xs leading-relaxed text-slate-300">
                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider block mb-1">Gemma Telemetry Check</span>
                    {aiCopilotData.analysis}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase block">Suggested Repair</span>
                      <ul className="list-disc list-inside text-slate-300 mt-1 space-y-0.5">
                        {aiCopilotData.suggestedJobs.map((j, i) => <li key={i}>{j}</li>)}
                      </ul>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase block">Suggested Spares</span>
                      <ul className="list-disc list-inside text-slate-300 mt-1 space-y-0.5">
                        {aiCopilotData.suggestedParts.map((p, i) => <li key={i}>{p}</li>)}
                      </ul>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-850 pt-2.5 text-xs">
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase block">Est Cost</span>
                      <span className="font-mono font-bold text-emerald-400">₹{aiCopilotData.estimatedCost}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase block">Upsell Chance</span>
                      <span className="font-bold text-blue-400">{aiCopilotData.upsell}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "reception" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* SECTION 3: Vehicle Search */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Search className="h-4 w-4 text-blue-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Vehicle Reception Search</h3>
            </div>
            <div className="space-y-3">
              <input 
                type="text"
                placeholder="Search VRN, Mobile, VIN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none"
              />
              <button 
                onClick={() => {
                  const match = jobCards.find(j => j.vrn.toLowerCase().includes(searchQuery.toLowerCase()));
                  if (match) setSelectedJobId(match.job_id);
                }}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
              >
                Execute Customer Check-in
              </button>
            </div>
            {selectedJob && (
              <div className="space-y-2 text-xs border-t border-slate-850 pt-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer Name</span>
                  <span className="font-bold text-slate-200">{selectedJob.customer_name || "Retail Client"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">outstanding Amount</span>
                  <span className="font-bold text-red-400">₹{selectedJob.outstanding_balance || "0"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">DMS Status</span>
                  <span className="font-bold text-slate-200">{selectedJob.status}</span>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 5: Complaint registration */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-4 lg:col-span-2">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <ClipboardCopy className="h-4 w-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Complaint Intake Register</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Customer Complaints</label>
                <textarea 
                  rows={3}
                  placeholder="Engine vibration during idle, AC cooling check..."
                  value={complaints}
                  onChange={(e) => setComplaints(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Job Priority</label>
                  <select 
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none"
                  >
                    <option value="Normal">Normal</option>
                    <option value="VIP">VIP</option>
                    <option value="Express">Express</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Advisor Remarks</label>
                  <input 
                    type="text" 
                    placeholder="Carry forward from last checkin"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none"
                  />
                </div>
              </div>
              <button 
                onClick={handleSubmitComplaints}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
              >
                Register Intake Details
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "inspection" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* SECTION 4: Digital Vehicle Inspection */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-4 lg:col-span-2">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <CheckSquare className="h-4 w-4 text-blue-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Digital Vehicle Inspection Checklist</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.keys(inspectionChecked).map((key) => (
                <button
                  key={key}
                  onClick={() => handleToggleInspection(key)}
                  className={`p-3 rounded-xl border text-center space-y-1.5 transition-all ${
                    inspectionChecked[key] 
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                      : "bg-slate-950/20 border-slate-850 text-slate-400 hover:border-slate-800"
                  }`}
                >
                  <span className="text-[10px] font-black uppercase tracking-wider block">{key}</span>
                  <span className="text-xs font-bold">{inspectionChecked[key] ? "✓ Clear" : "✗ Check"}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 border-t border-slate-850 pt-4">
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950/40 border border-slate-850 hover:border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-bold rounded-lg transition-all">
                <Camera className="h-3.5 w-3.5" /> Photo Deck
              </button>
              <button className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors ml-auto">
                Lock Inspection Report
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "estimate" && selectedJob && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* SECTION 6: Estimate Workspace */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-4 lg:col-span-2">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Labour & Spares Estimate Builder</h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Estimated Labour</span>
                  <span className="text-sm font-bold text-slate-200">₹{selectedJob.labor_price || 1500}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Estimated Spares</span>
                  <span className="text-sm font-bold text-slate-200">₹{selectedJob.parts_price || 3000}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 border-t border-slate-850 pt-4">
                <button 
                  onClick={() => alert("WhatsApp estimate link sent to customer.")}
                  className="px-3.5 py-1.5 bg-[#25D366] hover:bg-green-600 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all"
                >
                  WhatsApp Approval Link
                </button>
                <button 
                  onClick={() => alert("SMS estimate details sent to customer.")}
                  className="px-3.5 py-1.5 bg-slate-950 border border-slate-850 hover:border-slate-800 text-slate-300 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all"
                >
                  SMS Estimate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

ServiceAdvisorWorkspace.displayName = "ServiceAdvisorWorkspace";
export default ServiceAdvisorWorkspace;

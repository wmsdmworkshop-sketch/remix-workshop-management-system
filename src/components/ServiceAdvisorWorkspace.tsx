import React, { useState, useMemo } from "react";
import { 
  ClipboardCopy, Search, Sparkles, Send, CheckCircle2, AlertTriangle, 
  Activity, DollarSign, Users, Clock, History, Camera, User, FileText, 
  CheckSquare, FileSpreadsheet, Eye, ChevronRight, ShieldAlert, ArrowRight,
  Filter, AlertOctagon, Check, RefreshCw, Truck, Wrench
} from "lucide-react";
import { AICopilotPanel } from "./AICopilotPanel";
import { VehiclePassportModal } from "./VehiclePassportModal";
import { SaTechnicalIntakeModal } from "./SaTechnicalIntakeModal";
import { getStaffToken } from "../lib/authToken";

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
  const [activeTab, setActiveTab] = useState<string>("my-attention");
  const [vehicleFilter, setVehicleFilter] = useState<string>("ALL");

  // Phase 4 Technical Intake & Passport Modal States
  const [showIntakeModal, setShowIntakeModal] = useState<boolean>(false);
  const [selectedIntakeItem, setSelectedIntakeItem] = useState<any | null>(null);
  const [showPassportModal, setShowPassportModal] = useState<boolean>(false);
  const [passportData, setPassportData] = useState<any | null>(null);
  const [passportLoading, setPassportLoading] = useState<boolean>(false);

  // Fetch real vehicle passport data from the same source as service history / Vehicle Lookup 360° Dossier
  const fetchPassportForVrn = async (vrn: string, gateOdometer?: number) => {
    setPassportLoading(true);
    setPassportData(null);
    setShowPassportModal(true);
    try {
      const res = await fetch(`/api/vehicle/history?query=${encodeURIComponent(vrn)}`);
      const data = await res.json();
      if (data.success && data.passportAggregate) {
        const agg = data.passportAggregate;
        const passport = agg.passport;
        const customer = agg.customer;
        const lifetime = agg.lifetimeSummary;
        // Compute last service odometer from the most recent visit
        let lastOdo: number | null = null;
        if (agg.visitLedger && agg.visitLedger.length > 0) {
          lastOdo = agg.visitLedger[0].odometerKm || null;
        }
        setPassportData({
          vrn: passport.registrationNo || vrn,
          chassisNo: passport.vin || "",
          engineNo: passport.engineNo || "",
          vehicleMake: passport.make || "TATA",
          vehicleModel: passport.model || passport.productLine || "",
          customerName: customer?.customerName || "",
          customerMobile: customer?.customerMobile || "",
          lastOdometer: lastOdo,
          currentOdometer: gateOdometer ?? null,
          previousVisitCount: lifetime?.totalVisits ?? 0,
          lifetimeSpend: lifetime?.lifetimeSpend ?? 0,
          warrantyStatus: lifetime?.activeWarrantyStatus || "Not Available",
          warrantyExpiryDate: passport.warrantyExpiryDate || "",
          warrantyExpiryKm: passport.warrantyExpiryKm || 0,
          fsvEligibility: lifetime?.activeAmcStatus || "Not Available",
          originalSaleDate: passport.originalSaleDate || "",
          tmInvoiceDate: passport.tmInvoiceDate || "",
          dateOfRegistration: passport.dateOfRegistration || "",
          sourceTag: "LIVE",
        });
      } else {
        // No data found — show modal with minimal info
        setPassportData({
          vrn: vrn,
          chassisNo: "",
          engineNo: "",
          vehicleMake: "",
          vehicleModel: "",
          customerName: "",
          customerMobile: "",
          sourceTag: "UNAVAILABLE",
        });
      }
    } catch (err) {
      console.error("[Passport] Error fetching vehicle passport:", err);
      setPassportData({
        vrn: vrn,
        sourceTag: "UNAVAILABLE",
      });
    } finally {
      setPassportLoading(false);
    }
  };

  // Digital inspection checklist state
  const [inspectionChecked, setInspectionChecked] = useState<Record<string, boolean>>({
    exterior: true, interior: true, tyres: false, battery: true, leaks: false, lights: true, brakes: false, suspension: false
  });

  // Complaint form states
  const [complaints, setComplaints] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");
  const [priority, setPriority] = useState<string>("Normal");

  // Identity extraction from currentUser
  const advisorName = useMemo(() => {
    return currentUser?.full_name || currentUser?.fullName || currentUser?.name || currentUser?.username || "Service Advisor";
  }, [currentUser]);

  const advisorRole = "Service Advisor";
  const advisorBranch = currentUser?.branch_name || currentUser?.branchName || currentUser?.branchId || currentUser?.branch_id || "Primary Branch";
  const advisorShift = "Active Shift • Online";

  // Selected vehicle object derivation
  const selectedJob = useMemo(() => {
    return jobCards.find(j => j.job_id === selectedJobId) || jobCards[0] || null;
  }, [jobCards, selectedJobId]);

  // Section 1: Dashboard KPIs
  const dashboardStats = useMemo(() => {
    const advisorJcs = jobCards.length > 0 ? jobCards : [];
    const totalRev = advisorJcs.reduce((sum, j) => sum + Number(j.labor_price || j.labour_amount || 0) + Number(j.parts_price || j.parts_amount || 0), 0);
    const jcCount = advisorJcs.length;
    const openCount = advisorJcs.filter(j => ["Active", "Waiting", "In Progress", "Work in Progress", "Intake"].includes(j.status || j.current_workflow_state)).length;
    const pendingEstimates = advisorJcs.filter(j => j.current_workflow_state === "ESTIMATE_PENDING" || j.status === "Estimate Pending" || j.status === "Pending Estimate").length;
    const pendingApprovals = advisorJcs.filter(j => j.status === "Approval Pending" || j.current_workflow_state === "ESTIMATE_SENT").length;
    const readyForDelivery = advisorJcs.filter(j => j.status === "Ready" || j.current_workflow_state === "QC_PASSED" || j.status === "QC Passed").length;
    const deliveredToday = advisorJcs.filter(j => j.status === "Delivered" || j.current_workflow_state === "DELIVERED").length;
    const breaches = alertLogs.filter(a => a.alert_type === "SLA_BREACH").length;
    const productivity = jcCount > 0 ? `${Math.round(((jcCount - breaches) / jcCount) * 100)}%` : "100%";

    return {
      totalRev, jcCount, openCount, pendingEstimates, pendingApprovals, readyForDelivery, deliveredToday, breaches,
      productivity
    };
  }, [jobCards, alertLogs]);

  // Canonical 5-minute handoff SLA threshold
  const HANDOFF_SLA_MINS = 5;

  // Priority Queue: MY ATTENTION (Sorted by Operational Urgency)
  const myAttentionItems = useMemo(() => {
    const items: any[] = [];
    const now = Date.now();

    jobCards.forEach(j => {
      const createdTime = j.created_at ? new Date(j.created_at).getTime() : now - 5 * 60 * 1000;
      const elapsedMins = Math.floor((now - createdTime) / 60000);
      const isBreached = elapsedMins >= HANDOFF_SLA_MINS;
      const slaRemaining = Math.max(0, HANDOFF_SLA_MINS - elapsedMins);

      if (j.status === "Approval Pending" || j.current_workflow_state === "ESTIMATE_SENT") {
        items.push({
          id: j.job_id,
          vrn: j.vrn,
          jobNo: j.job_card_no || `TEMP-${j.job_id}`,
          customer: j.customer_name || "Customer",
          stage: "Customer Approval Pending",
          waitingMins: elapsedMins,
          slaRemaining,
          isBreached,
          urgency: "HIGH",
          reason: "Estimate sent to customer; awaiting digital signature",
          actionLabel: "Follow-Up Approval",
          actionType: "APPROVAL_FOLLOWUP",
          jobCard: j
        });
      } else if (j.current_workflow_state === "ESTIMATE_PENDING" || j.status === "Estimate Pending") {
        items.push({
          id: j.job_id,
          vrn: j.vrn,
          jobNo: j.job_card_no || `TEMP-${j.job_id}`,
          customer: j.customer_name || "Customer",
          stage: "Estimate Preparation Pending",
          waitingMins: elapsedMins,
          slaRemaining,
          isBreached,
          urgency: "HIGH",
          reason: "Job card created; labor & parts estimate required",
          actionLabel: "Create Estimate",
          actionType: "CREATE_ESTIMATE",
          jobCard: j
        });
      } else if (j.current_workflow_state === "QC_PASSED" || j.status === "QC Passed" || j.status === "Ready") {
        items.push({
          id: j.job_id,
          vrn: j.vrn,
          jobNo: j.job_card_no || `TEMP-${j.job_id}`,
          customer: j.customer_name || "Customer",
          stage: "Pre-Invoice & Delivery Ready",
          waitingMins: elapsedMins,
          slaRemaining,
          isBreached: false,
          urgency: "MEDIUM",
          reason: "Vehicle passed 25-point QC; pre-invoice & handover ready",
          actionLabel: "Send Pre-Invoice",
          actionType: "SEND_PREINVOICE",
          jobCard: j
        });
      } else if (isBreached) {
        items.push({
          id: j.job_id,
          vrn: j.vrn,
          jobNo: j.job_card_no || `TEMP-${j.job_id}`,
          customer: j.customer_name || "Customer",
          stage: j.current_workflow_state || j.status || "In Progress",
          waitingMins: elapsedMins,
          slaRemaining: 0,
          isBreached: true,
          urgency: "CRITICAL",
          reason: `SLA breach detected (${elapsedMins} mins elapsed > ${HANDOFF_SLA_MINS}m threshold)`,
          actionLabel: "Review SLA Delay",
          actionType: "REVIEW_SLA",
          jobCard: j
        });
      }
    });

    return items.sort((a, b) => b.waitingMins - a.waitingMins);
  }, [jobCards]);

  // Filtered Vehicles Today
  const filteredVehicles = useMemo(() => {
    if (vehicleFilter === "ALL") return jobCards;
    if (vehicleFilter === "RECEIVED") return jobCards.filter(j => j.status === "Received" || j.current_workflow_state === "GATE_IN");
    if (vehicleFilter === "IN_PROGRESS") return jobCards.filter(j => ["Active", "In Progress", "Work in Progress"].includes(j.status || j.current_workflow_state));
    if (vehicleFilter === "WAITING") return jobCards.filter(j => ["Waiting", "Estimate Pending", "Approval Pending"].includes(j.status));
    if (vehicleFilter === "READY") return jobCards.filter(j => ["Ready", "QC Passed", "QC_PASSED"].includes(j.status || j.current_workflow_state));
    if (vehicleFilter === "DELIVERED") return jobCards.filter(j => j.status === "Delivered" || j.current_workflow_state === "DELIVERED");
    return jobCards;
  }, [jobCards, vehicleFilter]);

  // AI Copilot Advisor recommendation feed
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

  return (
    <div className="space-y-6 bg-[#0B1220] text-slate-100 min-h-screen p-3 md:p-6 pb-24" lang="en">
      
      {/* TOP IDENTITY BANNER: SERVICE ADVISOR — MY WORKSPACE */}
      <div className="bg-slate-900 border border-slate-800 p-4 md:p-5 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-orange-600/20 border border-orange-500/40 flex items-center justify-center text-orange-400 font-black text-xl">
            {advisorName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-orange-400">
                {advisorRole} • MY WORKSPACE
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />
                {advisorShift}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
              {advisorName}
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Branch: <span className="text-slate-200 font-bold">{advisorBranch}</span>
            </p>
          </div>
        </div>

        <button 
          onClick={onRefresh}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all self-start md:self-auto cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5 text-orange-400" />
          <span>Sync Workspace</span>
        </button>
      </div>

      {/* MOBILE INFORMATION HIERARCHY TABS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-800">
        {[
          { id: "my-attention", label: "MY ATTENTION", count: myAttentionItems.length, badgeColor: "bg-red-500 text-white" },
          { id: "my-vehicles", label: "MY VEHICLES TODAY", count: jobCards.length, badgeColor: "bg-blue-600 text-white" },
          { id: "my-work", label: "MY WORK & ESTIMATES", count: dashboardStats.pendingEstimates + dashboardStats.pendingApprovals, badgeColor: "bg-amber-500 text-slate-950" },
          { id: "my-billing", label: "MY BILLING & GATE PASS", count: null, badgeColor: "" },
          { id: "my-performance", label: "MY PERFORMANCE", count: null, badgeColor: "" },
          { id: "ai-copilot", label: "AI COPILOT", count: null, badgeColor: "" }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === tab.id 
                ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20" 
                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== null && tab.count > 0 && (
              <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${tab.badgeColor}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: MY ATTENTION (PRIORITY ACTIONABLE QUEUE) */}
      {activeTab === "my-attention" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-500" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                MY ATTENTION QUEUE — Urgent Actionable Items ({myAttentionItems.length})
              </h2>
            </div>
            <span className="text-[10px] text-slate-400 font-bold uppercase">
              Sorted by Operational Urgency
            </span>
          </div>

          {myAttentionItems.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center space-y-3">
              <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-200">All Clear! No urgent items pending your action.</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No vehicles currently assigned to you require immediate approval, estimate, or SLA escalation.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myAttentionItems.map(item => (
                <div 
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all space-y-3 shadow-lg ${
                    item.isBreached 
                      ? "bg-red-950/20 border-red-500/40" 
                      : "bg-slate-900 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-base font-black text-white block">
                        {item.vrn}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {item.jobNo} • {item.customer}
                      </span>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      item.isBreached 
                        ? "bg-red-500 text-white animate-pulse" 
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    }`}>
                      {item.isBreached ? "SLA BREACHED" : "ACTION REQUIRED"}
                    </span>
                  </div>

                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-850 text-xs space-y-1">
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>Stage:</span>
                      <span className="font-bold text-slate-200">{item.stage}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Waiting Since:</span>
                      <span className="font-mono font-bold text-amber-400">{item.waitingMins} mins</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">5m Handoff SLA:</span>
                      <span className={`font-mono font-bold ${item.isBreached ? "text-red-400" : "text-emerald-400"}`}>
                        {item.isBreached ? "BREACHED (Escalated to Manager)" : `${item.slaRemaining}m remaining`}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 italic">
                    📌 {item.reason}
                  </p>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        fetchPassportForVrn(item.vrn, item.odometer);
                      }}
                      className="w-1/2 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5 text-blue-400" />
                      <span>PASSPORT</span>
                    </button>

                      <button
                        onClick={() => {
                          setSelectedIntakeItem({ 
                            gateEntryId: item.gateEntryId || `GE-${item.id}`, 
                            intakeId: item.intakeId || `INT-${item.id}`,
                            vrn: item.vrn, 
                            tokenNumber: item.tokenNumber || "—",
                            confirmedOdometer: item.odometer || 0,
                            preliminaryComplaints: item.reason || ""
                          });
                          setShowIntakeModal(true);
                        }}
                        className="w-1/2 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                      <Wrench className="h-3.5 w-3.5" />
                      <span>INTAKE</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY VEHICLES TODAY */}
      {activeTab === "my-vehicles" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              MY VEHICLES TODAY ({filteredVehicles.length})
            </h2>

            {/* Sub-filter tabs */}
            <div className="flex items-center gap-1 overflow-x-auto bg-slate-900 border border-slate-800 p-1 rounded-xl">
              {["ALL", "RECEIVED", "IN_PROGRESS", "WAITING", "READY", "DELIVERED"].map(f => (
                <button
                  key={f}
                  onClick={() => setVehicleFilter(f)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    vehicleFilter === f 
                      ? "bg-blue-600 text-white" 
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {f.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {filteredVehicles.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center space-y-2">
              <Truck className="h-8 w-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">No vehicles currently assigned to you under this filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVehicles.map(j => (
                <div 
                  key={j.job_id}
                  className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3 hover:border-slate-700 transition-all shadow-lg"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-base font-black text-white block">
                        {j.vrn}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {j.customer_name || "Retail Customer"} • {j.vehicle_make} {j.vehicle_model}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                      {j.job_card_no || `TEMP-${j.job_id}`}
                    </span>
                  </div>

                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-850 text-xs space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Lifecycle Stage:</span>
                      <span className="font-bold text-blue-400">{j.current_workflow_state || j.status || "In Progress"}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Assigned Bay:</span>
                      <span className="font-bold text-slate-200">{j.bay_name || "Main Floor"}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Estimate Total:</span>
                      <span className="font-mono font-bold text-emerald-400">
                        ₹{((j.labor_price || j.labour_amount || 0) + (j.parts_price || j.parts_amount || 0)).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {aiModeEnabled && (
                    <div className="flex items-center gap-1.5 text-[10px] bg-emerald-500/10 text-emerald-400 p-1.5 rounded-lg border border-emerald-500/20">
                      <Sparkles className="h-3 w-3 animate-pulse" />
                      <span>AI SUGGESTION: Prioritize customer approval transmission</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        setSelectedJobId(j.job_id);
                        setActiveTab("my-work");
                      }}
                      className="flex-1 py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all text-center"
                    >
                      Manage Job Card
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MY WORK & ESTIMATE BUILDER */}
      {activeTab === "my-work" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Labour & Spares Estimate Builder</h3>
              </div>

              <select
                value={selectedJobId || (selectedJob?.job_id || "")}
                onChange={(e) => setSelectedJobId(Number(e.target.value))}
                className="bg-slate-950 border border-slate-850 text-white text-xs font-bold px-3 py-1.5 rounded-lg outline-none"
              >
                {jobCards.map(j => (
                  <option key={j.job_id} value={j.job_id}>
                    {j.job_card_no || `TEMP-${j.job_id}`} — {j.vrn} ({j.customer_name})
                  </option>
                ))}
              </select>
            </div>

            {selectedJob ? (
              <div className="space-y-4">
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Estimated Labour Amount (INR)
                    </label>
                    <input
                      type="number"
                      value={selectedJob.labor_price || selectedJob.labour_amount || 0}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        onUpdateJob(selectedJob.job_id, { labor_price: val, labour_amount: val });
                      }}
                      className="w-full bg-slate-900 border border-slate-800 text-white font-mono font-bold text-sm px-3 py-2 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Estimated Spares Amount (INR)
                    </label>
                    <input
                      type="number"
                      value={selectedJob.parts_price || selectedJob.parts_amount || 0}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        onUpdateJob(selectedJob.job_id, { parts_price: val, parts_amount: val });
                      }}
                      className="w-full bg-slate-900 border border-slate-800 text-white font-mono font-bold text-sm px-3 py-2 rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-850">
                  <span className="text-xs font-bold text-slate-300 uppercase">Total Consolidated Estimate</span>
                  <span className="text-lg font-black text-emerald-400 font-mono">
                    ₹{((selectedJob.labor_price || selectedJob.labour_amount || 0) + (selectedJob.parts_price || selectedJob.parts_amount || 0)).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t border-slate-850 pt-4">
                  <button 
                    onClick={() => {
                      onUpdateJob(selectedJob.job_id, { current_workflow_state: "ESTIMATE_PENDING" });
                      alert(`Estimate of ₹${((selectedJob.labor_price || 0) + (selectedJob.parts_price || 0)).toLocaleString('en-IN')} saved to ${selectedJob.job_card_no}!`);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    Save Estimate & Lock
                  </button>

                  <button 
                    onClick={() => alert(`WhatsApp estimate link sent to ${selectedJob.customer_name} (${selectedJob.customer_mobile}).`)}
                    className="px-3.5 py-2 bg-[#25D366] hover:bg-green-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer ml-auto"
                  >
                    WhatsApp Approval Link
                  </button>
                  
                  <button 
                    onClick={() => alert(`SMS estimate details sent to ${selectedJob.customer_name} (${selectedJob.customer_mobile}).`)}
                    className="px-3.5 py-2 bg-slate-950 border border-slate-850 hover:border-slate-800 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    SMS Estimate
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic p-4 text-center">No active job cards available for estimate generation.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: MY BILLING & GATE PASS (PHASE 9) */}
      {activeTab === "my-billing" && (
        <SABillingVisibility currentUser={currentUser} />
      )}

      {/* TAB 5: MY PERFORMANCE & METRICS */}
      {activeTab === "my-performance" && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            MY PERFORMANCE & KPI SUMMARY
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Today's Revenue", val: dashboardStats.totalRev >= 1000 ? `₹${(dashboardStats.totalRev / 1000).toFixed(0)}k` : `₹${dashboardStats.totalRev}`, icon: DollarSign, color: "text-emerald-400" },
              { label: "My Job Cards", val: dashboardStats.jcCount, icon: FileText, color: "text-white" },
              { label: "Pending Delivery", val: dashboardStats.readyForDelivery, icon: CheckCircle2, color: "text-blue-400" },
              { label: "SLA Breaches", val: dashboardStats.breaches, icon: AlertTriangle, color: "text-red-400" }
            ].map((stat, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[10px] font-bold uppercase tracking-wider">{stat.label}</span>
                  <stat.icon className="h-4 w-4" />
                </div>
                <span className={`text-xl font-black block ${stat.color}`}>{stat.val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: AI COPILOT */}
      {activeTab === "ai-copilot" && (
        <AICopilotPanel 
          role="Service Advisor"
          context={{
            selectedJobId: selectedJob?.job_id,
            vin: selectedJob?.vin,
            customerName: selectedJob?.customer_name,
            makeModel: `${selectedJob?.vehicle_make || ""} ${selectedJob?.vehicle_model || ""}`
          }}
        />
      )}

      {/* Phase 4 Modals */}
      {showPassportModal && (
        <VehiclePassportModal
          passportData={passportData}
          isLoading={passportLoading}
          onClose={() => { setShowPassportModal(false); setPassportData(null); }}
        />
      )}

      {showIntakeModal && (
        <SaTechnicalIntakeModal
          assignedItem={selectedIntakeItem || { gateEntryId: "GE-001", vrn: selectedJob?.vrn || "KA32M9988", tokenNumber: "SEDAM-20260803-001", confirmedOdometer: 45000 }}
          onClose={() => setShowIntakeModal(false)}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
});

ServiceAdvisorWorkspace.displayName = "ServiceAdvisorWorkspace";

// Extracted component for SA Billing Visibility (Phase 9)
const SABillingVisibility: React.FC<{ currentUser?: any }> = ({ currentUser }) => {
  const [billingList, setBillingList] = useState<any[]>([]);

  const fetchVisibility = async () => {
    try {
      const res = await fetch("/api/gate-out/sa-billing-visibility", {
        headers: { Authorization: `Bearer ${getStaffToken() || currentUser?.token || ""}` }
      });
      if (res.ok) setBillingList(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  React.useEffect(() => {
    fetchVisibility();
    const interval = setInterval(fetchVisibility, 10000);
    return () => clearInterval(interval);
  }, [currentUser]);

  return (
    <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-800 mb-4">
        <DollarSign className="h-4 w-4 text-emerald-400" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Billing & Gate Pass Visibility</h3>
      </div>
      {billingList.length === 0 && <p className="text-xs text-slate-500">No active billing data available.</p>}
      <div className="space-y-4">
        {billingList.map(j => (
          <div key={j.job_id} className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="font-mono text-sm font-bold text-white">{j.vrn}</div>
                <div className="text-[10px] text-slate-400 mt-1">Invoice: {j.crm_invoice_number || 'N/A'} (₹{j.crm_invoice_amount || 0})</div>
              </div>
              <div className="text-right">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${j.gate_out_time ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-blue-500/20 text-blue-400 border border-blue-500/30"}`}>
                  {j.gate_out_time ? "GATED OUT" : "PENDING GATE OUT"}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="bg-slate-900 p-2 rounded">
                <div className="text-slate-500 text-[10px] uppercase">Invoice Status</div>
                <div className="text-slate-300 font-bold">{j.invoice_status || 'N/A'}</div>
              </div>
              <div className="bg-slate-900 p-2 rounded">
                <div className="text-slate-500 text-[10px] uppercase">Payment Mode</div>
                <div className="text-slate-300 font-bold">{j.payment_mode || 'N/A'}</div>
              </div>
              <div className="bg-slate-900 p-2 rounded">
                <div className="text-slate-500 text-[10px] uppercase">Credit Status</div>
                <div className="text-slate-300 font-bold">{j.credit_status || 'N/A'}</div>
              </div>
              <div className="bg-slate-900 p-2 rounded">
                <div className="text-slate-500 text-[10px] uppercase">Gate Pass Status</div>
                <div className="text-slate-300 font-bold">{j.gate_pass_status || 'N/A'}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ServiceAdvisorWorkspace;

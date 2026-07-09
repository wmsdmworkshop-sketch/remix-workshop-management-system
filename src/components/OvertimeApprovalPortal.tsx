import React, { useState, useEffect } from "react";
import {
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  MapPin,
  Camera,
  Search,
  TrendingUp,
  DollarSign,
  User,
  Shield,
  FileText,
  Loader2,
  RefreshCw,
  Eye,
  MessageSquare,
  AlertTriangle,
  UserCheck
} from "lucide-react";

interface OvertimeRequest {
  ot_id: number;
  employee_id: number;
  ot_category: string;
  date: string;
  shift_id: number;
  ot_start_time: string;
  ot_end_time: string;
  total_hours: number;
  benefit_type: string;
  ot_reason_category: string;
  job_card_id?: number | null;
  workshop_id?: number | null;
  department?: string | null;
  work_description?: string | null;
  comp_attendance_credit_earned?: number;
  snapshot_basic_salary?: number;
  snapshot_days_in_month?: number;
  hourly_salary_rate?: number;
  calculated_amount?: number;
  max_allowed_cap?: number;
  final_payable_amount?: number;
  capping_reason?: string | null;
  current_level: number;
  current_status: string;
  paid_at?: string | null;
  payment_reference?: string | null;
  created_at?: string;
  employee_name?: string;
  employee_code?: string;
  employee_role?: string;
  workshop_name?: string;
  shift_type?: string;
  gps_lat?: number;
  gps_lng?: number;
  gps_matched?: boolean;
  face_verification_provider?: string | null;
  face_match_result?: string | null;
  face_match_score?: number | null;
  face_verification_time?: string | null;
  ocr_provider?: string | null;
  ocr_confidence?: number | null;
  ocr_verification_time?: string | null;
}

interface OvertimeApprovalPortalProps {
  currentUser: any;
  token: string | null;
  employees: any[];
  jobCards: any[];
}

export default function OvertimeApprovalPortal({
  currentUser,
  token,
  employees,
  jobCards
}: OvertimeApprovalPortalProps) {
  const [requests, setRequests] = useState<OvertimeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Selected request details state
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Action remarks / payment details
  const [remarks, setRemarks] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [workshopFilter, setWorkshopFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");

  // Error/Success state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingRequests();
  }, [currentUser]);

  const fetchPendingRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/overtime/pending", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        
        // Enrich pending records with employee names from global directory for robust filtering/searching
        const enriched = data.map((r: OvertimeRequest) => {
          const emp = employees.find(e => e.employee_id === r.employee_id);
          const jc = jobCards.find(j => j.job_id === r.job_card_id);
          return {
            ...r,
            employee_name: emp ? emp.full_name : `Employee ID: ${r.employee_id}`,
            employee_code: emp ? emp.employee_code : "",
            employee_role: emp ? emp.role : "",
            job_card_no: jc ? jc.job_card_no : "N/A"
          };
        });

        setRequests(enriched);
      }
    } catch (err) {
      console.error("Error loading approvals:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPendingRequests();
    setRefreshing(false);
  };

  const loadDetails = async (id: number) => {
    try {
      const res = await fetch(`/api/overtime/request/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedRequest(data);
        setRemarks("");
        setPaymentRef("");
        setErrorMessage(null);
        setSuccessMessage(null);
      }
    } catch (err) {
      console.error("Failed to load details:", err);
    }
  };

  // Approval action dispatcher
  const handleAction = async (action: 'approve' | 'reject' | 'hold') => {
    if ((action === 'reject' || action === 'hold') && (!remarks || remarks.trim() === '')) {
      setErrorMessage(`Remarks are mandatory when placing a request on ${action.toUpperCase()}.`);
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setActionLoading(true);

    try {
      const res = await fetch(`/api/overtime/request/${selectedRequest.ot_id}/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ remarks })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage(`Request successfully ${action}d!`);
        setTimeout(async () => {
          setSelectedRequest(null);
          await fetchPendingRequests();
        }, 1500);
      } else {
        setErrorMessage(data.error || `Failed to execute ${action} action.`);
      }
    } catch (err) {
      setErrorMessage("Network error: failed to execute action.");
    } finally {
      setActionLoading(false);
    }
  };

  // Cashier Payment Settlement Action
  const handlePayment = async () => {
    if (!paymentRef || paymentRef.trim() === '') {
      setErrorMessage("Payment transaction reference is required.");
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setActionLoading(true);

    try {
      const res = await fetch(`/api/overtime/request/${selectedRequest.ot_id}/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ reference: paymentRef, remarks })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage("Overtime request marked as PAID successfully!");
        setTimeout(async () => {
          setSelectedRequest(null);
          await fetchPendingRequests();
        }, 1500);
      } else {
        setErrorMessage(data.error || "Failed to submit payment details.");
      }
    } catch (err) {
      setErrorMessage("Network error: failed to settle payment.");
    } finally {
      setActionLoading(false);
    }
  };

  // Get active roles for current user
  const roleNameDisplay = currentUser.role
    .split("_")
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  // Filters application
  const filteredRequests = requests.filter(r => {
    const search = searchQuery.toLowerCase();
    const matchesSearch =
      r.employee_name?.toLowerCase().includes(search) ||
      r.ot_id.toString().includes(search) ||
      (r.job_card_no && r.job_card_no.toLowerCase().includes(search));

    const matchesCategory = categoryFilter === "ALL" || r.ot_category === categoryFilter;
    const matchesWorkshop = workshopFilter === "ALL" || r.workshop_id?.toString() === workshopFilter;
    const matchesDate = !dateFilter || r.date === dateFilter;

    return matchesSearch && matchesCategory && matchesWorkshop && matchesDate;
  });

  // Extract unique workshops from records for filter dropdown
  const uniqueWorkshops = Array.from(new Set(requests.map(r => r.workshop_id).filter(Boolean)));

  // Status timeline generator
  const renderTimeline = (currentLevel: number, status: string) => {
    const steps = [
      { label: "Submitted", active: true, completed: true },
      { label: "Supervisor", level: 1 },
      { label: "Manager", level: 2 },
      { label: "GM Service", level: 3 },
      { label: "Cashier", level: 4 }
    ];

    return (
      <div className="flex items-center justify-between w-full p-4 bg-slate-900/60 rounded-xl border border-slate-800/80 gap-1 text-[10px] md:text-xs">
        {steps.map((step, idx) => {
          let isActive = false;
          let isCompleted = false;

          if (step.label === "Submitted") {
            isCompleted = true;
          } else {
            const stepLvl = step.level!;
            if (status === "REJECTED") {
              isCompleted = stepLvl < currentLevel;
              isActive = stepLvl === currentLevel;
            } else if (status === "PAID") {
              isCompleted = true;
            } else if (status === "APPROVED" && stepLvl === 4) {
              isActive = true;
            } else if (status === "APPROVED") {
              isCompleted = true;
            } else {
              isCompleted = stepLvl < currentLevel;
              isActive = stepLvl === currentLevel;
            }
          }

          return (
            <React.Fragment key={idx}>
              <div className="flex items-center gap-1.5 shrink-0">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[9px] ${
                  isCompleted 
                    ? "bg-emerald-500 text-[#0B1220]" 
                    : isActive 
                      ? status === "REJECTED" ? "bg-rose-500 text-white animate-pulse" : "bg-gradient-to-r from-[#2563EB] to-[#06B6D4] text-white animate-pulse"
                      : "bg-slate-800 text-slate-500"
                }`}>
                  {isCompleted ? "✓" : idx + 1}
                </div>
                <div className="hidden sm:block">
                  <h4 className={`text-[10px] font-bold ${isCompleted ? "text-slate-300" : isActive ? "text-white" : "text-slate-500"}`}>
                    {step.label}
                  </h4>
                </div>
              </div>
              {idx < steps.length - 1 && (
                <div className="flex-1 h-[1.5px] bg-slate-800 mx-1">
                  <div className={`h-full ${isCompleted ? "bg-emerald-500" : "bg-transparent"}`} style={{ width: "100%" }}></div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6 text-slate-200">
      
      {/* Portal Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800/80 pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#2563EB]" />
            <h1 className="text-2xl font-black tracking-tight text-white uppercase">Overtime Approvals Panel</h1>
          </div>
          <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">
            Reviewing Queue as: <span className="text-[#06B6D4]">{roleNameDisplay}</span>
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-slate-850 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold transition-all text-slate-300 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Reload Queue
        </button>
      </div>

      {/* Filters Dashboard Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-[#111827]/40 p-4 rounded-2xl border border-slate-850 shadow-md">
        {/* Search */}
        <div>
          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block mb-1">Search</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search Employee, Request ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0B1220] border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs font-bold text-slate-200 focus:outline-none"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          </div>
        </div>

        {/* Category Filter */}
        <div>
          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block mb-1">OT Category</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full bg-[#0B1220] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            <option value="WORKSHOP">Workshop Overtime</option>
            <option value="ADMINISTRATIVE">Administrative Overtime</option>
          </select>
        </div>

        {/* Workshop Filter */}
        <div>
          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block mb-1">Workshop Branch</label>
          <select
            value={workshopFilter}
            onChange={(e) => setWorkshopFilter(e.target.value)}
            className="w-full bg-[#0B1220] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Workshops</option>
            {uniqueWorkshops.map(id => (
              <option key={id} value={String(id)}>Workshop Branch #{id}</option>
            ))}
          </select>
        </div>

        {/* Date Filter */}
        <div>
          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block mb-1">Select Date</label>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full bg-[#0B1220] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-300 focus:outline-none"
          />
        </div>
      </div>

      {/* Main Ledger Area */}
      <div className="bg-[#111827]/60 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
        <div className="p-5 border-b border-slate-800/80">
          <h3 className="text-sm font-black text-white uppercase tracking-wider">Pending Approvals Queue</h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Requests currently awaiting your stage clearance</p>
        </div>

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin" />
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Loading approval queue...</span>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-500">
            <CheckCircle className="w-12 h-12 stroke-[1.5] text-slate-700" />
            <span className="text-xs font-bold uppercase tracking-wider">Approval queue is clear. No pending items found.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0B1220]/65 text-slate-400 border-b border-slate-800/80 uppercase font-black tracking-wider text-[10px]">
                  <th className="py-3 px-4">Request No</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Hours</th>
                  <th className="py-3 px-4">Benefit</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredRequests.map((r) => (
                  <tr key={r.ot_id} className="hover:bg-slate-800/30 transition-all font-medium">
                    <td className="py-3.5 px-4 font-bold text-white font-mono">OT-{r.ot_id}</td>
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-bold text-slate-200">{r.employee_name}</p>
                        <p className="text-[9px] text-slate-500 font-mono mt-0.5">{r.employee_code}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-semibold">{r.employee_role}</td>
                    <td className="py-3.5 px-4">{r.date}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                        r.ot_category === "WORKSHOP" ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400"
                      }`}>
                        {r.ot_category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-300">{r.total_hours} hrs</td>
                    <td className="py-3.5 px-4 font-bold text-slate-300 uppercase tracking-widest text-[9px]">
                      {r.benefit_type === "MONETARY" ? "Monetary" : "Comp Credit"}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => loadDetails(r.ot_id)}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-[#2563EB]/15 hover:bg-[#2563EB]/25 text-[#06B6D4] rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border border-[#2563EB]/25"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Review Request
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected Request Review Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-[#0B1220]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-800/80 rounded-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800/80 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Review Request #OT-{selectedRequest.ot_id}</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Logged by {selectedRequest.employee_name} ({selectedRequest.employee_code})</p>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="w-7 h-7 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg flex items-center justify-center transition-all border border-slate-700/80"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 overflow-y-auto">

              {/* Success/Error messages */}
              {errorMessage && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                  <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                  {errorMessage}
                </div>
              )}

              {successMessage && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                  <CheckCircle className="w-4.5 h-4.5 shrink-0" />
                  {successMessage}
                </div>
              )}

              {/* Status Timeline */}
              <div>
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block mb-2">Workflow Status</span>
                {renderTimeline(selectedRequest.current_level, selectedRequest.current_status)}
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-900/40 rounded-2xl border border-slate-850 text-xs">
                <div>
                  <span className="text-[9px] text-slate-500 font-black uppercase block">Employee Grade</span>
                  <span className="text-white font-bold mt-1 block">{selectedRequest.employee_grade || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-black uppercase block">Date & Shift</span>
                  <span className="text-white font-bold mt-1 block">{selectedRequest.date} ({selectedRequest.shift_type || "General"})</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-black uppercase block">Overtime Hours</span>
                  <span className="text-[#06B6D4] font-black mt-1 block">{selectedRequest.total_hours} hrs ({selectedRequest.ot_start_time.substring(0,5)} - {selectedRequest.ot_end_time.substring(0,5)})</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-black uppercase block">Benefit Type</span>
                  <span className="text-white font-bold mt-1 block uppercase">{selectedRequest.benefit_type}</span>
                </div>
              </div>

              {/* Category specifics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-900/20 rounded-xl border border-slate-800/60 text-xs">
                  <span className="text-[9px] text-slate-500 font-black uppercase block">Reason Category</span>
                  <p className="text-slate-200 font-semibold mt-1">{selectedRequest.ot_reason_category}</p>
                  {selectedRequest.remarks && (
                    <p className="text-slate-400 italic mt-1.5 font-medium">Remarks: "{selectedRequest.remarks}"</p>
                  )}
                </div>
                <div className="p-4 bg-slate-900/20 rounded-xl border border-slate-800/60 text-xs">
                  <span className="text-[9px] text-slate-500 font-black uppercase block">Linked Asset/Ref</span>
                  {selectedRequest.ot_category === "WORKSHOP" ? (
                    <div className="mt-1 space-y-0.5 font-semibold text-slate-300">
                      <p>Job Card: <span className="text-white font-mono font-bold">{selectedRequest.job_card_no || "N/A"}</span></p>
                      <p>Workshop Name: <span className="text-white">{selectedRequest.workshop_name || "Assigned Branch"}</span></p>
                    </div>
                  ) : (
                    <div className="mt-1 space-y-0.5 font-semibold text-slate-300">
                      <p>Department: <span className="text-white">{selectedRequest.department || "Admin"}</span></p>
                      <p>Work Details: <span className="text-white font-normal block mt-1">{selectedRequest.work_description}</span></p>
                    </div>
                  )}
                </div>
              </div>

              {/* Calculation Breakdown & Caps */}
              <div className="bg-[#0B1220]/75 p-5 rounded-2xl border border-slate-850 space-y-4">
                <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-[#2563EB]" />
                  Salary Calculation & Capping Summary
                </h4>
                {selectedRequest.benefit_type === "MONETARY" ? (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs font-semibold">
                    <div>
                      <span className="text-[9px] text-slate-500 font-black uppercase block">Basic Salary</span>
                      <span className="text-slate-200 font-bold block mt-0.5">{selectedRequest.snapshot_basic_salary} INR</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 font-black uppercase block">Calculated OT Rate</span>
                      <span className="text-slate-200 font-bold block mt-0.5">{selectedRequest.hourly_salary_rate} INR/hr (x1.5)</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 font-black uppercase block">Raw OT Amount</span>
                      <span className="text-slate-200 font-bold block mt-0.5">{selectedRequest.calculated_amount} INR</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 font-black uppercase block">Max Day Cap Limit</span>
                      <span className="text-slate-200 font-bold block mt-0.5">{selectedRequest.max_allowed_cap} INR</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 font-black uppercase block">Final Payable</span>
                      <span className="text-emerald-400 font-black block mt-0.5 text-sm">{selectedRequest.final_payable_amount} INR</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <span className="text-[9px] text-slate-500 font-black uppercase block">Compensatory Credit Payout</span>
                    <span className="text-emerald-400 font-black block text-sm mt-0.5">+{selectedRequest.comp_attendance_credit_earned} Attendance Credits</span>
                  </div>
                )}

                {selectedRequest.capping_reason && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300 font-medium flex gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    {selectedRequest.capping_reason}
                  </div>
                )}
              </div>

              {/* Previews: GPS Map, Selfie, Job Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Geofence Check / GPS Map */}
                <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/60 text-xs flex flex-col justify-between min-h-48">
                  <div>
                    <span className="text-[10px] text-slate-500 font-black uppercase block mb-1">GPS Geofence Location check</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase inline-block ${
                      selectedRequest.gps_matched ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                    }`}>
                      {selectedRequest.gps_matched ? "Matched Geofence" : "Geofence Violation"}
                    </span>
                  </div>
                  {/* Mock Map Canvas */}
                  <div className="bg-[#0B1220] rounded-xl flex-1 mt-3 relative overflow-hidden flex items-center justify-center border border-slate-850">
                    <div className="absolute inset-0 bg-slate-900 opacity-20 bg-[radial-gradient(#2563eb_1px,transparent_1px)] [background-size:16px_16px]"></div>
                    <MapPin className="w-8 h-8 text-[#06B6D4] animate-bounce z-10" />
                    <div className="absolute bottom-2 left-2 text-[8px] font-mono text-slate-500 font-bold z-10">
                      Coords: {selectedRequest.gps_lat}, {selectedRequest.gps_lng}
                    </div>
                  </div>
                </div>

                {/* Selfie Biometrics */}
                <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/60 text-xs flex flex-col justify-between min-h-48">
                  <div>
                    <span className="text-[10px] text-slate-500 font-black uppercase block mb-1">Biometric Selfie check</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase inline-block ${
                      selectedRequest.face_match_result === "Matched" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                    }`}>
                      {selectedRequest.face_match_result || "Not Verified"}
                    </span>
                  </div>
                  <div className="bg-[#0B1220] rounded-xl flex-1 mt-3 relative overflow-hidden flex items-center justify-center border border-slate-850">
                    <Camera className="w-8 h-8 text-slate-600 z-10" />
                    <div className="absolute bottom-2 left-2 text-[8px] font-mono text-slate-500 font-bold z-10">
                      Score: {selectedRequest.face_match_score ? `${(Number(selectedRequest.face_match_score)*100).toFixed(1)}%` : "N/A"}
                    </div>
                  </div>
                </div>

                {/* Job Card Photo Preview */}
                <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/60 text-xs flex flex-col justify-between min-h-48">
                  <div>
                    <span className="text-[10px] text-slate-500 font-black uppercase block mb-1">OCR Document Scan</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase inline-block ${
                      selectedRequest.ocr_confidence ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-500"
                    }`}>
                      {selectedRequest.ocr_confidence ? "Document Processed" : "No Document"}
                    </span>
                  </div>
                  <div className="bg-[#0B1220] rounded-xl flex-1 mt-3 relative overflow-hidden flex items-center justify-center border border-slate-850">
                    <FileText className="w-8 h-8 text-slate-600 z-10" />
                    <div className="absolute bottom-2 left-2 text-[8px] font-mono text-slate-500 font-bold z-10">
                      Confidence: {selectedRequest.ocr_confidence ? `${(Number(selectedRequest.ocr_confidence)*100).toFixed(1)}%` : "N/A"}
                    </div>
                  </div>
                </div>

              </div>

              {/* Audit / Workflow Action Logs */}
              {selectedRequest.history && selectedRequest.history.length > 0 && (
                <div className="space-y-3">
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">Decision audit history</span>
                  <div className="bg-[#0B1220]/60 rounded-xl border border-slate-800/80 overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-900/40 text-slate-500 uppercase font-black tracking-wider text-[9px] border-b border-slate-800/80">
                          <th className="py-2.5 px-4">Level</th>
                          <th className="py-2.5 px-4">Approver</th>
                          <th className="py-2.5 px-4">Role</th>
                          <th className="py-2.5 px-4">Action Date</th>
                          <th className="py-2.5 px-4">Decision</th>
                          <th className="py-2.5 px-4">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {selectedRequest.history.map((h: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-800/10">
                            <td className="py-2.5 px-4 font-bold text-slate-350">Stage {h.level}</td>
                            <td className="py-2.5 px-4 font-mono">ID: {h.approver_id}</td>
                            <td className="py-2.5 px-4 text-slate-400 font-bold uppercase tracking-wider text-[9px]">{h.approver_role}</td>
                            <td className="py-2.5 px-4">{h.action_date} {h.action_time}</td>
                            <td className="py-2.5 px-4 font-bold">{h.decision}</td>
                            <td className="py-2.5 px-4 italic text-slate-400">{h.remarks || "No remarks"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Action input panel */}
              <div className="border-t border-slate-800/80 pt-6 space-y-4">
                
                {/* Remarks Input */}
                <div>
                  <label className="text-[10px] text-slate-500 font-black uppercase block tracking-wider mb-2">Remarks / Decision Comments</label>
                  <textarea
                    rows={2}
                    placeholder="Provide comments (Mandatory for REJECT or HOLD)..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full bg-[#0B1220] border border-slate-800 rounded-xl p-3 text-xs font-bold text-slate-200 focus:outline-none focus:border-[#2563EB]"
                  />
                </div>

                {/* Cashier Payment Settlements Panel */}
                {(currentUser.role === "cashier" || currentUser.role === "admin" || currentUser.role === "developer") && selectedRequest.current_status === "APPROVED" && (
                  <div className="p-4 bg-slate-900/55 rounded-2xl border border-slate-850 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-[#06B6D4] font-black uppercase block tracking-wider mb-1.5">Payment Reference Code</label>
                      <input
                        type="text"
                        placeholder="e.g. Bank Payout Transaction UTR No..."
                        value={paymentRef}
                        onChange={(e) => setPaymentRef(e.target.value)}
                        className="w-full bg-[#0B1220] border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-[#06B6D4]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#06B6D4] font-black uppercase block tracking-wider mb-1.5">Settlement Date</label>
                      <input
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="w-full bg-[#0B1220] border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-[#06B6D4]"
                      />
                    </div>
                  </div>
                )}

                {/* Confirm buttons */}
                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRequest(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-700/80"
                  >
                    Cancel
                  </button>

                  <div className="flex gap-2">
                    {/* General Stage Actions */}
                    {selectedRequest.current_status !== "APPROVED" && selectedRequest.current_status !== "PAID" && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleAction('hold')}
                          disabled={actionLoading}
                          className="px-4 py-2 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/35 text-purple-400 rounded-xl text-xs font-bold transition-all"
                        >
                          Place On Hold
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAction('reject')}
                          disabled={actionLoading}
                          className="px-4 py-2 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-rose-400 rounded-xl text-xs font-bold transition-all"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAction('approve')}
                          disabled={actionLoading}
                          className="px-6 py-2 bg-gradient-to-r from-[#2563EB] to-[#06B6D4] hover:opacity-95 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-[#2563EB]/15 flex items-center gap-1.5"
                        >
                          {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          Approve Request
                        </button>
                      </>
                    )}

                    {/* Cashier Payment Settlement Action */}
                    {(currentUser.role === "cashier" || currentUser.role === "admin" || currentUser.role === "developer") && selectedRequest.current_status === "APPROVED" && (
                      <button
                        type="button"
                        onClick={handlePayment}
                        disabled={actionLoading}
                        className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-95 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/15 flex items-center gap-1.5"
                      >
                        {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Settle Payment (Mark Paid)
                      </button>
                    )}
                  </div>

                </div>

              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}

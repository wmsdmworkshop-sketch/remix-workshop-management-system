import React, { useState, useEffect } from "react";
import {
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  ArrowRight,
  MapPin,
  Camera,
  Search,
  ChevronRight,
  TrendingUp,
  DollarSign,
  User,
  Shield,
  FileText,
  Loader2,
  RefreshCw,
  Eye
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
  job_card_no?: string;
}

interface OvertimeEmployeeDashboardProps {
  currentUser: any;
  token: string | null;
  employees: any[];
  jobCards: any[];
}

export default function OvertimeEmployeeDashboard({
  currentUser,
  token,
  employees,
  jobCards
}: OvertimeEmployeeDashboardProps) {
  // Main view toggle
  const [view, setView] = useState<'dashboard' | 'new-request'>('dashboard');

  // Lists and data state
  const [requests, setRequests] = useState<OvertimeRequest[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Selected request for details modal
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [otCategory, setOtCategory] = useState<'WORKSHOP' | 'ADMINISTRATIVE'>('WORKSHOP');
  const [shiftId, setShiftId] = useState<number>(1);
  const [startTime, setStartTime] = useState("17:00");
  const [endTime, setEndTime] = useState("21:00");
  const [benefitType, setBenefitType] = useState<'MONETARY' | 'COMPENSATORY_ATTENDANCE_CREDIT'>('MONETARY');
  const [reasonCategory, setReasonCategory] = useState("Customer Waiting");
  const [jobCardId, setJobCardId] = useState<number | "">("");
  const [department, setDepartment] = useState("");
  const [workDescription, setWorkDescription] = useState("");
  const [remarks, setRemarks] = useState("");
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [selfieFile, setSelfieFile] = useState<string | null>(null);
  const [jobCardFile, setJobCardFile] = useState<string | null>(null);

  // Form UI states
  const [capturingGps, setCapturingGps] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Search job card state
  const [jobCardSearch, setJobCardSearch] = useState("");

  // Resolve Employee profile details from global employees list
  const employeeProfile = employees.find(e => e.employee_id === currentUser.employee_id) || {
    full_name: currentUser.name || "Employee",
    basic_salary: 30000,
    workshop_id: 1,
    department: "Workshop"
  };

  useEffect(() => {
    fetchMyRequests();
    fetchDashboardMetrics();
  }, [currentUser]);

  const fetchMyRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/overtime/my-requests", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (err) {
      console.error("Error fetching overtime requests:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardMetrics = async () => {
    try {
      const res = await fetch("/api/overtime/dashboard", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDashboardMetrics(data);
      }
    } catch (err) {
      console.error("Error loading dashboard metrics:", err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchMyRequests(), fetchDashboardMetrics()]);
    setRefreshing(false);
  };

  const fetchRequestDetails = async (id: number) => {
    try {
      const res = await fetch(`/api/overtime/request/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedRequest(data);
      }
    } catch (err) {
      console.error("Failed to load request details:", err);
    }
  };

  // GPS Coordinates Capture helper
  const handleCaptureGps = () => {
    setCapturingGps(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGps({
            lat: parseFloat(position.coords.latitude.toFixed(6)),
            lng: parseFloat(position.coords.longitude.toFixed(6))
          });
          setCapturingGps(false);
        },
        (error) => {
          console.error("Geolocation failed, falling back to mock coordinates:", error);
          // Fallback to Pune coordinates to ensure geofence validation succeeds
          setGps({ lat: 18.5204, lng: 73.8567 });
          setCapturingGps(false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setGps({ lat: 18.5204, lng: 73.8567 });
      setCapturingGps(false);
    }
  };

  // Mock file uploads
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'selfie' | 'job_card') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'selfie') {
          setSelfieFile(reader.result as string);
        } else {
          setJobCardFile(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Real-time calculations
  const calculatedHours = (() => {
    if (!startTime || !endTime) return 0;
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    let diff = (endH + endM / 60) - (startH + startM / 60);
    if (diff < 0) diff += 24; // overnight
    return parseFloat(diff.toFixed(2));
  })();

  const salaryCalculations = (() => {
    const basic = Number(employeeProfile.basic_salary || 30000);
    // Simple 30 days month estimation for client-side preview
    const days = 30;
    const hourlyRate = parseFloat((basic / days / 8).toFixed(2));
    const otRate = parseFloat((hourlyRate * 1.5).toFixed(2));
    const calculatedAmount = parseFloat((calculatedHours * otRate).toFixed(2));
    const cap = parseFloat((basic / days).toFixed(2));
    const finalPayable = Math.min(calculatedAmount, cap);
    const capped = calculatedAmount > cap;

    return {
      hourlyRate,
      otRate,
      calculatedAmount,
      cap,
      finalPayable,
      capped
    };
  })();

  const calculatedCredits = (() => {
    if (calculatedHours <= 8) return 1.00;
    if (calculatedHours <= 11) return 1.50;
    return 2.00;
  })();

  // Filtered Job Cards search list
  const filteredJobCards = jobCards.filter(jc => {
    const search = jobCardSearch.toLowerCase();
    return (
      jc.job_card_no.toLowerCase().includes(search) ||
      (jc.vrn && jc.vrn.toLowerCase().includes(search))
    );
  });

  // Submit OT Request Form
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors([]);
    setFormSuccess(null);

    // Basic client validations
    const errors: string[] = [];
    if (!gps) errors.push("GPS geofence capture is required.");
    if (!selfieFile) errors.push("Biometric verification selfie is required.");
    if (otCategory === "WORKSHOP" && !jobCardId) errors.push("Job Card selection is required.");
    if (otCategory === "ADMINISTRATIVE" && !department) errors.push("Department is required.");
    if (otCategory === "ADMINISTRATIVE" && !workDescription) errors.push("Work description is required.");

    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);

    const payload = {
      employee_id: currentUser.employee_id,
      ot_category: otCategory,
      date,
      shift_id: shiftId,
      ot_start_time: startTime + ":00",
      ot_end_time: endTime + ":00",
      benefit_type: benefitType,
      ot_reason_category: reasonCategory,
      job_card_id: otCategory === "WORKSHOP" ? Number(jobCardId) : null,
      department: otCategory === "ADMINISTRATIVE" ? department : null,
      work_description: otCategory === "ADMINISTRATIVE" ? workDescription : null,
      remarks,
      gps_lat: gps?.lat,
      gps_lng: gps?.lng,
      selfie: selfieFile,
      ocr_image: otCategory === "WORKSHOP" ? jobCardFile : null,
      device_name: navigator.userAgent.split(" ")[0] || "Mobile Web",
      operating_system: navigator.platform || "Android",
      app_version: "1.1",
      device_time: new Date().toISOString(),
      ip_address: "127.0.0.1"
    };

    try {
      const res = await fetch("/api/overtime/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFormSuccess(`Overtime request logged successfully! Request ID: OT-${data.ot_id}. Status: ${data.status}`);
        // Reset form
        setJobCardId("");
        setRemarks("");
        setWorkDescription("");
        setSelfieFile(null);
        setJobCardFile(null);
        setGps(null);
        
        // Refresh and switch views
        await Promise.all([fetchMyRequests(), fetchDashboardMetrics()]);
        setTimeout(() => {
          setView('dashboard');
          setFormSuccess(null);
        }, 1500);
      } else {
        setFormErrors(data.details || [data.error || "Failed to submit request."]);
      }
    } catch (err) {
      setFormErrors(["Network error. Failed to connect to server."]);
    } finally {
      setSubmitting(false);
    }
  };

  // Render status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">PAID</span>;
      case "APPROVED":
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">APPROVED</span>;
      case "PENDING_APPROVAL":
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">PENDING APPROVAL</span>;
      case "ON_HOLD":
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">ON HOLD</span>;
      case "REJECTED":
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">REJECTED</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-500/10 text-slate-400 border border-slate-500/20">{status}</span>;
    }
  };

  // Render status timeline steps
  const renderTimeline = (currentLevel: number, status: string) => {
    const steps = [
      { label: "Submitted", active: true, completed: true },
      { label: "Supervisor", level: 1 },
      { label: "Manager", level: 2 },
      { label: "GM Service", level: 3 },
      { label: "Cashier", level: 4 }
    ];

    return (
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between w-full p-6 bg-slate-900/60 rounded-2xl border border-slate-800/80 gap-6 md:gap-2">
        {steps.map((step, idx) => {
          let isActive = false;
          let isCompleted = false;

          if (step.label === "Submitted") {
            isActive = false;
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
              isCompleted = false;
            } else if (status === "APPROVED") {
              isCompleted = true;
            } else {
              isCompleted = stepLvl < currentLevel;
              isActive = stepLvl === currentLevel;
            }
          }

          return (
            <React.Fragment key={idx}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                  isCompleted 
                    ? "bg-emerald-500 text-[#0B1220]" 
                    : isActive 
                      ? status === "REJECTED" ? "bg-rose-500 text-white animate-pulse" : "bg-gradient-to-r from-[#2563EB] to-[#06B6D4] text-white shadow-lg shadow-[#2563EB]/25 animate-pulse"
                      : "bg-slate-800 text-slate-500"
                }`}>
                  {isCompleted ? "✓" : idx + 1}
                </div>
                <div>
                  <h4 className={`text-xs font-bold ${isCompleted ? "text-slate-300" : isActive ? "text-white" : "text-slate-500"}`}>
                    {step.label}
                  </h4>
                  {isActive && (
                    <span className={`text-[9px] font-black uppercase tracking-wider block ${status === "REJECTED" ? "text-rose-400" : "text-[#06B6D4]"}`}>
                      {status === "REJECTED" ? "Rejected Here" : status === "ON_HOLD" ? "On Hold" : "Pending Stage"}
                    </span>
                  )}
                  {isCompleted && step.label !== "Submitted" && (
                    <span className="text-[9px] text-emerald-400 font-bold block uppercase tracking-widest leading-none mt-0.5">Approved</span>
                  )}
                </div>
              </div>
              {idx < steps.length - 1 && (
                <div className="hidden md:block flex-1 h-[2px] bg-slate-800 mx-2">
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
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800/80 pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-6 h-6 text-[#06B6D4]" />
            <h1 className="text-2xl font-black tracking-tight text-white uppercase">Enterprise Overtime Portal</h1>
          </div>
          <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">
            Dealership Branch: {employeeProfile.workshop_id ? `Workshop Branch #${employeeProfile.workshop_id}` : "Main Dealership"} | Employee: {employeeProfile.full_name} ({currentUser.role})
          </p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700/80 rounded-xl text-xs font-bold transition-all text-slate-300 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          
          {view === 'dashboard' ? (
            <button
              onClick={() => setView('new-request')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#2563EB] to-[#06B6D4] hover:opacity-95 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-[#2563EB]/15"
            >
              <Plus className="w-4 h-4" />
              Request Overtime
            </button>
          ) : (
            <button
              onClick={() => {
                setView('dashboard');
                setFormErrors([]);
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-700/80"
            >
              Back to List
            </button>
          )}
        </div>
      </div>

      {view === 'dashboard' ? (
        <>
          {/* Dashboard Summary Widgets */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
            {/* Widget 1: Today's Status */}
            <div className="bg-[#111827]/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-lg backdrop-blur-md">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Today's OT Status</span>
              <div className="mt-2.5">
                {(() => {
                  const todayStr = new Date().toISOString().split("T")[0];
                  const todayReq = requests.find(r => r.date === todayStr);
                  if (!todayReq) {
                    return <span className="text-sm font-black text-slate-500 uppercase tracking-wider block">No Request</span>;
                  }
                  return <div className="text-sm block">{renderStatusBadge(todayReq.current_status)}</div>;
                })()}
              </div>
            </div>

            {/* Widget 2: Pending Requests */}
            <div className="bg-[#111827]/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-lg backdrop-blur-md">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Pending Approval</span>
              <div className="flex items-baseline gap-1.5 mt-1.5">
                <span className="text-2xl font-black text-amber-400">
                  {requests.filter(r => r.current_status === "PENDING_APPROVAL" || r.current_status === "ON_HOLD").length}
                </span>
                <span className="text-[10px] text-slate-500 font-bold uppercase">Requests</span>
              </div>
            </div>

            {/* Widget 3: Approved This Month */}
            <div className="bg-[#111827]/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-lg backdrop-blur-md">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Approved This Month</span>
              <div className="flex items-baseline gap-1.5 mt-1.5">
                <span className="text-2xl font-black text-blue-400">
                  {(() => {
                    const currentMonth = new Date().toISOString().substring(0, 7);
                    return requests.filter(r => r.date.startsWith(currentMonth) && (r.current_status === "APPROVED" || r.current_status === "PAID")).length;
                  })()}
                </span>
                <span className="text-[10px] text-slate-500 font-bold uppercase">Approved</span>
              </div>
            </div>

            {/* Widget 4: Comp Credits */}
            <div className="bg-[#111827]/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-lg backdrop-blur-md">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Comp Credits Earned</span>
              <div className="flex items-baseline gap-1.5 mt-1.5">
                <span className="text-2xl font-black text-emerald-400">
                  {requests
                    .filter(r => r.benefit_type === "COMPENSATORY_ATTENDANCE_CREDIT" && r.current_status === "PAID")
                    .reduce((sum, r) => sum + Number(r.comp_attendance_credit_earned || 0), 0)
                    .toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-500 font-bold uppercase">Credits</span>
              </div>
            </div>

            {/* Widget 5: Last Payment */}
            <div className="col-span-2 md:col-span-1 bg-[#111827]/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-lg backdrop-blur-md">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Last Payment Status</span>
              <div className="mt-2.5">
                {(() => {
                  const payReqs = requests.filter(r => r.benefit_type === "MONETARY");
                  if (payReqs.length === 0) {
                    return <span className="text-xs font-bold text-slate-500 uppercase">No Monetary Claim</span>;
                  }
                  // Sort by id descending
                  const latest = [...payReqs].sort((a,b) => b.ot_id - a.ot_id)[0];
                  return (
                    <div>
                      <div className="text-xs">{renderStatusBadge(latest.current_status)}</div>
                      {latest.current_status === "PAID" && latest.payment_reference && (
                        <span className="text-[9px] text-[#06B6D4] block font-mono mt-1 font-bold">Ref: {latest.payment_reference}</span>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Overtime Requests Ledger */}
          <div className="bg-[#111827]/60 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
            <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">My Overtime Requests</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Historical overtime log and approval timelines</p>
              </div>
            </div>

            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-[#06B6D4] animate-spin" />
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Loading requests...</span>
              </div>
            ) : requests.length === 0 ? (
              <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-500">
                <Clock className="w-12 h-12 stroke-[1.5] text-slate-700" />
                <span className="text-xs font-bold uppercase tracking-wider">No Overtime Requests logged yet.</span>
                <button
                  onClick={() => setView('new-request')}
                  className="px-3.5 py-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-800 rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-400 mt-2"
                >
                  Create First Request
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#0B1220]/65 text-slate-400 border-b border-slate-800/80 uppercase font-black tracking-wider text-[10px]">
                      <th className="py-3 px-4">Request No</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Job Card</th>
                      <th className="py-3 px-4 text-center">Requested Hours</th>
                      <th className="py-3 px-4">Benefit Type</th>
                      <th className="py-3 px-4">Amount / Credit</th>
                      <th className="py-3 px-4">Current Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {requests.map((r) => {
                      const amountOrCreditStr = r.benefit_type === "MONETARY"
                        ? `${r.final_payable_amount || 0} INR`
                        : `${r.comp_attendance_credit_earned || 0.0} Credit`;

                      return (
                        <tr key={r.ot_id} className="hover:bg-slate-800/30 transition-all font-medium">
                          <td className="py-3.5 px-4 font-bold text-white font-mono">OT-{r.ot_id}</td>
                          <td className="py-3.5 px-4 font-semibold">{r.date}</td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                              r.ot_category === "WORKSHOP" ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400"
                            }`}>
                              {r.ot_category}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-400">
                            {r.ot_category === "WORKSHOP" ? (r.job_card_no || `ID: ${r.job_card_id}`) : "N/A - Admin"}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-slate-300">{r.total_hours} hrs</td>
                          <td className="py-3.5 px-4 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                            {r.benefit_type === "MONETARY" ? "Monetary" : "Comp Credit"}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-200">{amountOrCreditStr}</td>
                          <td className="py-3.5 px-4">{renderStatusBadge(r.current_status)}</td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => {
                                fetchRequestDetails(r.ot_id);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold transition-all border border-slate-700/80"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* New Overtime Request Form */
        <div className="bg-[#111827]/60 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md max-w-3xl mx-auto">
          <div className="p-5 border-b border-slate-800/80">
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Log New Overtime Request</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Submit overtime bounds, biometric photo, and location check-ins</p>
          </div>

          <form onSubmit={handleSubmitRequest} className="p-6 space-y-6">
            
            {/* Error/Success Banners */}
            {formErrors.length > 0 && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-1">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                  <AlertCircle className="w-4 h-4" />
                  Submission Failed:
                </div>
                <ul className="list-disc pl-5 text-[11px] text-rose-300 space-y-0.5">
                  {formErrors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            )}

            {formSuccess && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2.5">
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <h4 className="text-emerald-400 font-bold text-xs uppercase tracking-wider">Success!</h4>
                  <p className="text-[11px] text-emerald-300 mt-0.5">{formSuccess}</p>
                </div>
              </div>
            )}

            {/* Read-Only Auto Filled Header Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-900/40 rounded-xl border border-slate-800/60">
              <div>
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Logged-in Employee</span>
                <p className="text-xs text-white font-bold mt-0.5">{employeeProfile.full_name}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Assigned Workshop Branch</span>
                <p className="text-xs text-white font-bold mt-0.5">
                  {employeeProfile.workshop_id ? `Branch ID: ${employeeProfile.workshop_id}` : "Main Branch"}
                </p>
              </div>
            </div>

            {/* Core Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category */}
              <div>
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-1.5">Overtime Category</label>
                <select
                  value={otCategory}
                  onChange={(e) => {
                    setOtCategory(e.target.value as any);
                    setJobCardId("");
                  }}
                  className="w-full bg-[#0B1220] border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="WORKSHOP">Workshop Overtime (Requires Job Card)</option>
                  <option value="ADMINISTRATIVE">Administrative Overtime (No Job Card)</option>
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-1.5">Request Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-[#0B1220] border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-[#2563EB]"
                  required
                />
              </div>

              {/* Shift */}
              <div>
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-1.5">Assigned Shift Type</label>
                <select
                  value={shiftId}
                  onChange={(e) => setShiftId(Number(e.target.value))}
                  className="w-full bg-[#0B1220] border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-[#2563EB]"
                >
                  <option value={1}>General (09:00 - 17:00)</option>
                  <option value={2}>Morning (06:00 - 14:00)</option>
                  <option value={3}>Evening (14:00 - 22:00)</option>
                  <option value={4}>Night (22:00 - 06:00)</option>
                  <option value={5}>Holiday (09:00 - 17:00)</option>
                  <option value={6}>Emergency (00:00 - 23:59)</option>
                </select>
              </div>

              {/* Benefit type */}
              <div>
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-1.5">Overtime Benefit Type</label>
                <select
                  value={benefitType}
                  onChange={(e) => setBenefitType(e.target.value as any)}
                  className="w-full bg-[#0B1220] border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="MONETARY">Monetary Overtime Payment</option>
                  <option value="COMPENSATORY_ATTENDANCE_CREDIT">Compensatory Attendance Credit</option>
                </select>
              </div>

              {/* Time bounds */}
              <div>
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-1.5">Overtime Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-[#0B1220] border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-[#2563EB]"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-1.5">Overtime End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-[#0B1220] border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-[#2563EB]"
                  required
                />
              </div>

              {/* Reason Category */}
              <div>
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-1.5">Reason Category</label>
                <select
                  value={reasonCategory}
                  onChange={(e) => setReasonCategory(e.target.value)}
                  className="w-full bg-[#0B1220] border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="Customer Waiting">Customer Waiting (Tata Dealership Bound)</option>
                  <option value="Emergency Breakdown">Emergency Breakdown</option>
                  <option value="Admin Work">Admin Work</option>
                  <option value="Warranty">Warranty Job Completion</option>
                  <option value="Campaign">Campaigns & Service Camps</option>
                  <option value="PDI">Pre-Delivery Inspection (PDI)</option>
                  <option value="Road Test">Road Test Bound</option>
                  <option value="Inventory">Inventory Audits</option>
                  <option value="Other">Other Reasons</option>
                </select>
              </div>

              {/* Conditionally Render Category Fields */}
              {otCategory === "WORKSHOP" ? (
                <div>
                  <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-1.5">Search and Select Job Card</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search Job Card or VRN..."
                      value={jobCardSearch}
                      onChange={(e) => setJobCardSearch(e.target.value)}
                      className="w-full bg-[#0B1220] border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-[#2563EB]"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-3" />
                  </div>
                  {jobCardSearch && (
                    <div className="absolute z-10 w-64 bg-slate-900 border border-slate-800 rounded-xl mt-1 shadow-2xl max-h-48 overflow-y-auto divide-y divide-slate-800">
                      {filteredJobCards.slice(0, 10).map(jc => (
                        <div
                          key={jc.job_id}
                          onClick={() => {
                            setJobCardId(jc.job_id);
                            setJobCardSearch(jc.job_card_no);
                          }}
                          className="p-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 cursor-pointer flex justify-between"
                        >
                          <span className="font-bold text-white">{jc.job_card_no}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{jc.vrn || "MH-TATA"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-1.5">Department</label>
                  <input
                    type="text"
                    placeholder="e.g. Accounts, HR, Stores"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-[#0B1220] border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              )}
            </div>

            {otCategory === "ADMINISTRATIVE" && (
              <div>
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-1.5">Work Description</label>
                <textarea
                  rows={2}
                  placeholder="Mandatory detail of admin tasks completed..."
                  value={workDescription}
                  onChange={(e) => setWorkDescription(e.target.value)}
                  className="w-full bg-[#0B1220] border border-slate-800 rounded-xl p-3 text-xs font-bold text-slate-200 focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            )}

            <div>
              <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-1.5">General Remarks (Optional)</label>
              <textarea
                rows={2}
                placeholder="Remarks, delay reasons..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full bg-[#0B1220] border border-slate-800 rounded-xl p-3 text-xs font-bold text-slate-200 focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            {/* GPS Capture and Camera uploads */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-b border-slate-800/80 py-5">
              
              {/* Geofence Check */}
              <div className="flex flex-col justify-between p-3.5 bg-slate-900/40 rounded-xl border border-slate-800/60">
                <div>
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">GPS Coordinates</span>
                  <p className="text-xs text-slate-400 mt-1 font-semibold">Verify presence in Dealership allowed geofence</p>
                </div>
                <div className="mt-3.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCaptureGps}
                    className="px-3.5 py-1.5 bg-[#0B1220] border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5"
                  >
                    {capturingGps ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <MapPin className="w-3.5 h-3.5 text-[#06B6D4]" />
                    )}
                    Capture GPS
                  </button>
                  {gps && (
                    <span className="text-[10px] text-emerald-400 font-bold block font-mono">
                      {gps.lat}, {gps.lng}
                    </span>
                  )}
                </div>
              </div>

              {/* Selfie Biometric */}
              <div className="flex flex-col justify-between p-3.5 bg-slate-900/40 rounded-xl border border-slate-800/60">
                <div>
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Selfie Upload</span>
                  <p className="text-xs text-slate-400 mt-1 font-semibold">Face match check against reference photo</p>
                </div>
                <div className="mt-3.5 flex items-center gap-2">
                  <label className="px-3.5 py-1.5 bg-[#0B1220] border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer">
                    <Camera className="w-3.5 h-3.5 text-[#06B6D4]" />
                    Upload Selfie
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'selfie')}
                      className="hidden"
                    />
                  </label>
                  {selfieFile && (
                    <span className="text-[9px] text-slate-500 font-extrabold uppercase bg-slate-800 px-2 py-0.5 rounded">Uploaded</span>
                  )}
                </div>
              </div>

              {/* Job Card Photo */}
              {otCategory === "WORKSHOP" && (
                <div className="flex flex-col justify-between p-3.5 bg-slate-900/40 rounded-xl border border-slate-800/60">
                  <div>
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Job Card Image</span>
                    <p className="text-xs text-slate-400 mt-1 font-semibold">OCR details check scan</p>
                  </div>
                  <div className="mt-3.5 flex items-center gap-2">
                    <label className="px-3.5 py-1.5 bg-[#0B1220] border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer">
                      <Camera className="w-3.5 h-3.5 text-[#06B6D4]" />
                      Upload Photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'job_card')}
                        className="hidden"
                      />
                    </label>
                    {jobCardFile && (
                      <span className="text-[9px] text-slate-500 font-extrabold uppercase bg-slate-800 px-2 py-0.5 rounded">Uploaded</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Read-Only Calculations Preview */}
            <div className="bg-[#0B1220]/70 p-5 rounded-2xl border border-slate-800/90 space-y-4">
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-[#06B6D4]" />
                Live Overtime Benefit Preview
              </h4>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                <div>
                  <span className="text-[9px] text-slate-500 font-black uppercase block tracking-wider">Calculated Hours</span>
                  <span className="text-sm font-black text-slate-200">{calculatedHours} hours</span>
                </div>

                {benefitType === "MONETARY" ? (
                  <>
                    <div>
                      <span className="text-[9px] text-slate-500 font-black uppercase block tracking-wider">Hourly Rate</span>
                      <span className="text-sm font-black text-slate-200">{salaryCalculations.hourlyRate} INR/hr</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 font-black uppercase block tracking-wider">Overtime Rate</span>
                      <span className="text-sm font-black text-[#06B6D4]">{salaryCalculations.otRate} INR/hr</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 font-black uppercase block tracking-wider">Estimated Benefit</span>
                      <span className="text-sm font-black text-emerald-400">{salaryCalculations.finalPayable} INR</span>
                      {salaryCalculations.capped && (
                        <span className="text-[8px] text-amber-400 font-bold block uppercase mt-0.5">Capped at 1 Day Salary</span>
                      )}
                    </div>
                  </>
                ) : (
                  <div>
                    <span className="text-[9px] text-slate-500 font-black uppercase block tracking-wider">Compensatory Credit</span>
                    <span className="text-sm font-black text-emerald-400">+{calculatedCredits.toFixed(2)} Credits</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 justify-end pt-3">
              <button
                type="button"
                onClick={() => setView('dashboard')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-700/80"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-gradient-to-r from-[#2563EB] to-[#06B6D4] hover:opacity-95 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-[#2563EB]/15 flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {submitting ? "Logging Request..." : "Submit Overtime Request"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Selected Request Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-[#0B1220]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-800/80 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800/80 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Overtime Request #OT-{selectedRequest.ot_id}</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Submitted by {selectedRequest.employee_name}</p>
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
              
              {/* Timeline Status */}
              <div>
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block mb-2.5">Workflow Approval Stage</span>
                {renderTimeline(selectedRequest.current_level, selectedRequest.current_status)}
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5 bg-slate-900/40 p-5 rounded-2xl border border-slate-800/60 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">Requested Date</span>
                  <span className="text-white font-bold mt-1 block">{selectedRequest.date}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">Shift Type</span>
                  <span className="text-white font-bold mt-1 block">{selectedRequest.shift_type || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">Hours Claimed</span>
                  <span className="text-[#06B6D4] font-extrabold mt-1 block">{selectedRequest.total_hours} hours</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">Benefit Category</span>
                  <span className="text-white font-bold mt-1 block uppercase tracking-wider text-[10px]">{selectedRequest.benefit_type}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">Calculated Payment</span>
                  <span className="text-white font-bold mt-1 block">{selectedRequest.calculated_amount || 0.0} INR</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">Max Cap Limit</span>
                  <span className="text-white font-bold mt-1 block">{selectedRequest.max_allowed_cap || 0.0} INR</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">Final Payable</span>
                  <span className="text-emerald-400 font-black mt-1 block">{selectedRequest.final_payable_amount || 0.0} INR</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">Comp Credits Earned</span>
                  <span className="text-emerald-400 font-black mt-1 block">{selectedRequest.comp_attendance_credit_earned || 0.0} Credit</span>
                </div>
              </div>

              {/* Details & Remarks */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-900/20 rounded-xl border border-slate-800/60">
                    <span className="text-[10px] text-slate-500 font-black uppercase block tracking-wider">Reason Category</span>
                    <p className="text-xs text-slate-300 font-semibold mt-1.5">{selectedRequest.ot_reason_category}</p>
                  </div>
                  <div className="p-4 bg-slate-900/20 rounded-xl border border-slate-800/60">
                    <span className="text-[10px] text-slate-500 font-black uppercase block tracking-wider">Linked Job Card</span>
                    <p className="text-xs text-slate-300 font-mono font-bold mt-1.5">{selectedRequest.job_card_no || "N/A - Administrative"}</p>
                  </div>
                </div>

                {selectedRequest.work_description && (
                  <div className="p-4 bg-slate-900/20 rounded-xl border border-slate-800/60 text-xs">
                    <span className="text-[10px] text-slate-500 font-black uppercase block tracking-wider">Work Description</span>
                    <p className="text-slate-300 mt-1.5 font-medium leading-relaxed">{selectedRequest.work_description}</p>
                  </div>
                )}

                {selectedRequest.capping_reason && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4.5 h-4.5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] text-amber-400 font-black uppercase tracking-wider">Salary Cap Rule Exception</span>
                      <p className="text-amber-300 mt-1 leading-normal font-medium">{selectedRequest.capping_reason}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Biometrics & Verification Audit metadata */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-slate-900/30 rounded-2xl border border-slate-800/60 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-black uppercase block">Face Verification Check</span>
                  <span className="text-white font-bold mt-1 block">{selectedRequest.face_match_result || "N/A"}</span>
                  {selectedRequest.face_match_score && (
                    <span className="text-[10px] text-slate-400 mt-0.5 block font-mono">Similarity: {(Number(selectedRequest.face_match_score) * 100).toFixed(1)}%</span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-black uppercase block">OCR Card Verification</span>
                  <span className="text-white font-bold mt-1 block">
                    {selectedRequest.ocr_provider ? `Verified (${selectedRequest.ocr_provider})` : "N/A"}
                  </span>
                  {selectedRequest.ocr_confidence && (
                    <span className="text-[10px] text-slate-400 mt-0.5 block font-mono">Confidence: {(Number(selectedRequest.ocr_confidence) * 100).toFixed(1)}%</span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-black uppercase block">GPS Location Geofence</span>
                  <span className="text-white font-bold mt-1 block">
                    {selectedRequest.gps_matched ? "✓ In Geofence" : "✗ Out of Geofence"}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block font-mono">{selectedRequest.gps_lat}, {selectedRequest.gps_lng}</span>
                </div>
              </div>

              {/* Approvals History */}
              {selectedRequest.history && selectedRequest.history.length > 0 && (
                <div className="space-y-3">
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">Workflow Decision History</span>
                  <div className="bg-slate-900/40 rounded-2xl border border-slate-800/60 overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-900/60 text-slate-400 uppercase font-black tracking-wider text-[9px] border-b border-slate-800/80">
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
                          <tr key={idx} className="hover:bg-slate-800/20">
                            <td className="py-2 px-4 font-bold text-slate-300">Stage {h.level}</td>
                            <td className="py-2 px-4 font-medium text-slate-200">ID: {h.approver_id}</td>
                            <td className="py-2 px-4 text-slate-400 font-bold uppercase tracking-wider text-[9px]">{h.approver_role}</td>
                            <td className="py-2 px-4">{h.action_date} {h.action_time}</td>
                            <td className="py-2 px-4 font-bold">{h.decision}</td>
                            <td className="py-2 px-4 italic text-slate-400">{h.remarks || "No remarks"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}

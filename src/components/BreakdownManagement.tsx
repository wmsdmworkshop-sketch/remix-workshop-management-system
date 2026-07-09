import React, { useState, useEffect } from "react";
import { 
  AlertTriangle, 
  MapPin, 
  Users, 
  Clock, 
  CheckCircle2, 
  Navigation, 
  Phone, 
  SlidersHorizontal,
  ChevronRight,
  TrendingUp, 
  FileText, 
  Activity, 
  Truck, 
  Plus, 
  DollarSign, 
  Play, 
  Search,
  Sparkles,
  Map,
  MessageSquare,
  User,
  Heart,
  Wrench,
  Trash2,
  Edit2
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";

interface Breakdown {
  breakdown_id: number;
  sr_number: string;
  complaint_date: string;
  tata_complaint_number: string | null;
  internal_breakdown_number: string;
  vehicle_number: string;
  priority: string;
  sla_limit_hours: number;
  driver_name: string | null;
  driver_mobile: string | null;
  alternate_mobile: string | null;
  fleet_owner: string | null;
  fleet_manager: string | null;
  fleet_manager_mobile: string | null;
  assigned_qrt: number | null;
  assigned_advisor_id: number | null;
  preferred_workshop_id: number | null;
  auto_suggested_workshop_id: number | null;
  assigned_workshop_id: number | null;
  vehicle_movable: boolean;
  towing_required: boolean;
  parts_required: boolean;
  resolved_at_site: boolean;
  expected_eta: string | null;
  actual_arrival_time: string | null;
  delay_minutes: number;
  delay_reason: string | null;
  location: string | null;
  gps_latitude: number | null;
  gps_longitude: number | null;
  gps_address: string | null;
  gps_maps_link: string | null;
  job_card_number: string | null;
  odometer: number | null;
  claim_type: string | null;
  parts_amount: number | string;
  labour_amount: number | string;
  description_remarks: string | null;
  current_status: string;
  status_history: string | null;
  communications?: any[];
  attachments?: any[];
}

interface QRTTeam {
  qrt_id: number;
  team_name: string;
  technician_id: number | null;
  assistant_id: number | null;
  helper_id: number | null;
  electrician_id: number | null;
  vehicle_no: string | null;
  phone_numbers: string | null;
  availability: number;
  current_assignment: number | null;
}

interface VehicleHealthCard {
  vrn: string;
  warranty: string;
  campaigns: string[];
  lastServiceDate: string;
  lastOdometer: number;
  repeatBreakdowns: number;
}

export default function BreakdownManagement() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "tracking" | "qrt" | "reports">("dashboard");
  const [breakdowns, setBreakdowns] = useState<Breakdown[]>([]);
  const [qrtTeams, setQrtTeams] = useState<QRTTeam[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [workshops, setWorkshops] = useState<any[]>([]);
  
  const [stats, setStats] = useState<any>({
    todayComplaints: 0,
    openComplaints: 0,
    towed: 0,
    siteResolved: 0,
    slaCompliancePct: 100,
    repeatBreakdownsCount: 0,
    avgResponse: 45,
    avgResolution: 180,
    oldestOpen: null
  });
  
  const [loading, setLoading] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showQrtModal, setShowQrtModal] = useState(false);
  const [selectedBreakdown, setSelectedBreakdown] = useState<Breakdown | null>(null);
  const [healthCard, setHealthCard] = useState<VehicleHealthCard | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  // Form Fields for Complaint Logging
  const [newVehicle, setNewVehicle] = useState("");
  const [newPriority, setNewPriority] = useState("P2 - Customer Waiting");
  const [newComplaint, setNewComplaint] = useState("");
  const [newDriver, setNewDriver] = useState("");
  const [newDriverMobile, setNewDriverMobile] = useState("");
  const [newAltMobile, setNewAltMobile] = useState("");
  const [newFleetOwner, setNewFleetOwner] = useState("");
  const [newFleetManager, setNewFleetManager] = useState("");
  const [newFleetManagerMobile, setNewFleetManagerMobile] = useState("");
  const [newPreferredWorkshop, setNewPreferredWorkshop] = useState("");
  const [newLat, setNewLat] = useState("18.5204");
  const [newLng, setNewLng] = useState("73.8567");
  const [newGpsAddress, setNewGpsAddress] = useState("");
  const [newTataComplaintNum, setNewTataComplaintNum] = useState("");
  const [newOdo, setNewOdo] = useState("");
  const [newClaimType, setNewClaimType] = useState("Paid");
  const [newRemarks, setNewRemarks] = useState("");

  // QRT Management Fields
  const [editingQrt, setEditingQrt] = useState<QRTTeam | null>(null);
  const [qrtName, setQrtName] = useState("");
  const [qrtVehicle, setQrtVehicle] = useState("");
  const [qrtPhone, setQrtPhone] = useState("");
  const [qrtTech, setQrtTech] = useState("");
  const [qrtAssistant, setQrtAssistant] = useState("");
  const [qrtHelper, setQrtHelper] = useState("");
  const [qrtElectrician, setQrtElectrician] = useState("");

  // Timeline / Status Update Fields
  const [statusRemarks, setStatusRemarks] = useState("");
  const [responsibleEmp, setResponsibleEmp] = useState("");
  const [delayReason, setDelayReason] = useState("");
  const [showDelayInput, setShowDelayInput] = useState(false);

  // Communication Fields
  const [commType, setCommType] = useState("SMS");
  const [commRecipient, setCommRecipient] = useState("Customer");
  const [commMessage, setCommMessage] = useState("");

  // Notifications simulation
  const [notification, setNotification] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [bdRes, qrtRes, statsRes, empRes, wsRes] = await Promise.all([
        fetch("/api/breakdowns").then(r => r.json()),
        fetch("/api/qrt_teams").then(r => r.json()),
        fetch("/api/breakdowns/analytics/dashboard").then(r => r.json()),
        fetch("/api/employees").then(r => r.json()),
        fetch("/api/workshops").then(r => r.json())
      ]);
      console.log("/api/breakdowns", bdRes);
      setBreakdowns(Array.isArray(bdRes) ? bdRes : []);

      console.log("/api/qrt_teams", qrtRes);
      setQrtTeams(Array.isArray(qrtRes) ? qrtRes : []);

      console.log("/api/breakdowns/analytics/dashboard", statsRes);
      setStats(statsRes && typeof statsRes === "object" ? statsRes : {});

      console.log("/api/employees", empRes);
      setEmployees(Array.isArray(empRes) ? empRes : []);

      console.log("/api/workshops", wsRes);
      setWorkshops(Array.isArray(wsRes) ? wsRes : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const triggerNotify = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 5000);
  };

  // Auto-fetch health card on VRN typing
  useEffect(() => {
    if (newVehicle.length >= 4) {
      const delayDebounceFn = setTimeout(async () => {
        setHealthLoading(true);
        try {
          const res = await fetch(`/api/vehicles/${newVehicle}/health-card`);
          if (res.ok) {
            const data = await res.json();
            setHealthCard(data);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setHealthLoading(false);
        }
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    } else {
      setHealthCard(null);
    }
  }, [newVehicle]);

  // Log breakdown complaint
  const handleLogBreakdown = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicle.trim()) return;

    try {
      const res = await fetch("/api/breakdowns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicle_number: newVehicle,
          priority: newPriority,
          complaint: newComplaint,
          driver_name: newDriver,
          driver_mobile: newDriverMobile,
          alternate_mobile: newAltMobile,
          fleet_owner: newFleetOwner,
          fleet_manager: newFleetManager,
          fleet_manager_mobile: newFleetManagerMobile,
          preferred_workshop_id: parseInt(newPreferredWorkshop) || null,
          gps_latitude: parseFloat(newLat) || null,
          gps_longitude: parseFloat(newLng) || null,
          gps_address: newGpsAddress,
          tata_complaint_number: newTataComplaintNum,
          odometer: parseInt(newOdo) || null,
          claim_type: newClaimType,
          description_remarks: newRemarks
        })
      });
      if (res.ok) {
        triggerNotify(`Incident registered for Vehicle ${newVehicle}`);
        setShowLogModal(false);
        resetForm();
        fetchAll();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setNewVehicle("");
    setNewComplaint("");
    setNewDriver("");
    setNewDriverMobile("");
    setNewAltMobile("");
    setNewFleetOwner("");
    setNewFleetManager("");
    setNewFleetManagerMobile("");
    setNewPreferredWorkshop("");
    setNewLat("18.5204");
    setNewLng("73.8567");
    setNewGpsAddress("");
    setNewTataComplaintNum("");
    setNewOdo("");
    setNewRemarks("");
  };

  // Convert incident to Job Card
  const handleConvertJobCard = async (id: number) => {
    try {
      const res = await fetch(`/api/breakdowns/${id}/convert`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        triggerNotify(`Successfully converted to Job Card ${data.job_card_no}!`);
        fetchAll();
        if (selectedBreakdown?.breakdown_id === id) {
          loadDetails(id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Log Communication
  const handleLogCommunication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBreakdown || !commMessage.trim() || !responsibleEmp) return;

    try {
      const res = await fetch(`/api/breakdowns/${selectedBreakdown.breakdown_id}/communication`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          communication_type: commType,
          sender_id: parseInt(responsibleEmp),
          recipient_role: commRecipient,
          message: commMessage
        })
      });
      if (res.ok) {
        triggerNotify("Customer communication dispatched and logged.");
        setCommMessage("");
        loadDetails(selectedBreakdown.breakdown_id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadDetails = async (id: number) => {
    try {
      const res = await fetch(`/api/breakdowns/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedBreakdown(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Status Lifecycle Update
  const handleStatusChange = async (id: number, nextStatus: string) => {
    if (!responsibleEmp) {
      alert("Please select the responsible employee update dispatcher.");
      return;
    }

    if (nextStatus === "Technician Arrived" && !delayReason && showDelayInput) {
      alert("Delay detected. Please provide a reason.");
      return;
    }

    try {
      const res = await fetch(`/api/breakdowns/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          remarks: statusRemarks || `Updated to ${nextStatus}`,
          responsible_employee_id: parseInt(responsibleEmp),
          delay_reason: delayReason || null
        })
      });

      if (res.ok) {
        triggerNotify(`Breakdown status updated to: ${nextStatus}`);
        setStatusRemarks("");
        setDelayReason("");
        setShowDelayInput(false);
        fetchAll();
        loadDetails(id);
      } else {
        const data = await res.json();
        if (data.error && data.error.includes("Delay")) {
          setShowDelayInput(true);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // QRT Master CRUD Operations
  const handleSaveQrtTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrtName.trim()) return;

    const payload = {
      team_name: qrtName,
      vehicle_no: qrtVehicle,
      phone_numbers: qrtPhone,
      technician_id: parseInt(qrtTech) || null,
      assistant_id: parseInt(qrtAssistant) || null,
      helper_id: parseInt(qrtHelper) || null,
      electrician_id: parseInt(qrtElectrician) || null
    };

    try {
      let res;
      if (editingQrt) {
        res = await fetch(`/api/qrt_teams/${editingQrt.qrt_id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch("/api/qrt_teams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        triggerNotify(editingQrt ? "QRT Team Master updated." : "QRT Team Master created.");
        setShowQrtModal(false);
        setEditingQrt(null);
        clearQrtForm();
        fetchAll();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const clearQrtForm = () => {
    setQrtName("");
    setQrtVehicle("");
    setQrtPhone("");
    setQrtTech("");
    setQrtAssistant("");
    setQrtHelper("");
    setQrtElectrician("");
  };

  const handleEditQrt = (team: QRTTeam) => {
    setEditingQrt(team);
    setQrtName(team.team_name);
    setQrtVehicle(team.vehicle_no || "");
    setQrtPhone(team.phone_numbers || "");
    setQrtTech(team.technician_id ? String(team.technician_id) : "");
    setQrtAssistant(team.assistant_id ? String(team.assistant_id) : "");
    setQrtHelper(team.helper_id ? String(team.helper_id) : "");
    setQrtElectrician(team.electrician_id ? String(team.electrician_id) : "");
    setShowQrtModal(true);
  };

  const handleDeleteQrt = async (id: number) => {
    if (!confirm("Are you sure you want to delete this QRT squad?")) return;
    try {
      const res = await fetch(`/api/qrt_teams/${id}`, { method: "DELETE" });
      if (res.ok) {
        triggerNotify("QRT Team deleted from Master.");
        fetchAll();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleQrtAssignment = async (bdId: number, qrtId: number) => {
    const advisorId = prompt("Assign Service Advisor Employee ID (Optional):");
    const etaStr = prompt("Provide Expected ETA (YYYY-MM-DD HH:MM:SS):");
    const wsId = prompt("Assign Workshop ID:");

    try {
      const res = await fetch(`/api/breakdowns/${bdId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrt_id: qrtId,
          assigned_advisor_id: parseInt(advisorId || "") || null,
          expected_eta: etaStr || null,
          assigned_workshop_id: parseInt(wsId || "") || null
        })
      });
      if (res.ok) {
        triggerNotify("QRT Squad successfully dispatched.");
        fetchAll();
        loadDetails(bdId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8 bg-[#0B1220] text-slate-100 min-h-screen p-4 md:p-6 font-sans">
      
      {/* Dynamic Toast Notification Banner */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 bg-[#111827] border border-rose-500/50 rounded-xl p-4 shadow-2xl flex items-center gap-3 animate-pulse">
          <div className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
          <span className="text-xs font-bold text-slate-100">{notification}</span>
        </div>
      )}

      {/* Module Title with Gradient */}
      <div className="relative overflow-hidden rounded-[18px] bg-slate-900/60 border border-slate-800/80 p-6 md:p-8 backdrop-blur-md shadow-2xl">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-radial from-rose-500/10 to-transparent pointer-events-none rounded-full blur-3xl -mr-48 -mt-48" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                WMS ROAD INCIDENT DISPATCH
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              BREAKDOWN MANAGEMENT
            </h1>
            <p className="text-sm text-slate-400 max-w-xl font-medium">
              Real-time emergency dispatching, geodetic suggestions, SLAs tracking, and seamless Job Card handoffs.
            </p>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={() => setShowLogModal(true)}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-lg shadow-rose-950/30 flex items-center gap-2 transition-all"
            >
              <Plus className="h-4 w-4" /> Log Breakdown
            </button>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-3 border-t border-slate-800/80 mt-6 pt-5">
          {["dashboard", "tracking", "qrt", "reports"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                activeTab === tab 
                  ? "bg-gradient-to-r from-rose-600 to-amber-500 text-white border-transparent shadow-lg shadow-rose-950/25" 
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "dashboard" && (
        <>
          {/* Dashboard KPIs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-[18px] p-5 backdrop-blur-md shadow-lg flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Today's Complaints</span>
                <span className="text-3xl font-black text-white">{stats.todayComplaints || 0}</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <FileText className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-[18px] p-5 backdrop-blur-md shadow-lg flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Open Cases</span>
                <span className="text-3xl font-black text-rose-500">{stats.openComplaints || 0}</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <AlertTriangle className="h-5 w-5 animate-pulse" />
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-[18px] p-5 backdrop-blur-md shadow-lg flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">SLA Compliance</span>
                <span className="text-3xl font-black text-emerald-400">{stats.slaCompliancePct || 100}%</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Clock className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-[18px] p-5 backdrop-blur-md shadow-lg flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Repeat Breakdowns</span>
                <span className="text-3xl font-black text-amber-500">{stats.repeatBreakdownsCount || 0}</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-550">
                <Activity className="h-5 w-5 animate-pulse" />
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === "tracking" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white uppercase font-mono">Active Breakdown Incidents</h2>
              <p className="text-xs text-slate-400">Manage dispatch lifecycle, QRT updates, diagnostics, and staff communication.</p>
            </div>
            
            {/* Responsible Dispatcher Picker */}
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Responsible Operator:</label>
              <select
                value={responsibleEmp}
                onChange={(e) => setResponsibleEmp(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-bold"
              >
                <option value="">-- Select Operator --</option>
                {employees.map(emp => (
                  <option key={emp.employee_id} value={emp.employee_id}>{emp.full_name} ({emp.role})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {breakdowns.length === 0 ? (
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-12 text-center text-slate-500 italic text-xs">
                  No breakdown logs registered.
                </div>
              ) : (
                breakdowns.map((bd) => (
                  <div 
                    key={bd.breakdown_id}
                    onClick={() => {
                      setSelectedBreakdown(bd);
                      loadDetails(bd.breakdown_id);
                    }}
                    className={`bg-slate-900/60 border rounded-[18px] p-5 backdrop-blur-md cursor-pointer transition-all hover:scale-[1.005] ${
                      selectedBreakdown?.breakdown_id === bd.breakdown_id ? "border-rose-500" : "border-slate-800/80"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-400">{bd.internal_breakdown_number}</span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase ${
                            bd.priority.startsWith("P1") ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          }`}>
                            {bd.priority}
                          </span>
                        </div>
                        <h4 className="text-base font-extrabold text-white mt-1.5">{bd.vehicle_number}</h4>
                        <p className="text-xs text-slate-400 line-clamp-1 mt-1 font-medium">{bd.complaint}</p>
                      </div>

                      <div className="text-right text-[11px] text-slate-500">
                        <p>Status: <span className="font-bold text-rose-400">{bd.current_status}</span></p>
                        <p className="mt-1 font-mono text-[9px]">{bd.gps_address || "Highway Milestone"}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Incident Details Sidebar */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-[18px] p-5 backdrop-blur-md shadow-2xl h-fit">
              {selectedBreakdown ? (
                <div className="space-y-6">
                  <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Incident Details</span>
                      <h3 className="font-extrabold text-slate-200 mt-0.5">{selectedBreakdown.vehicle_number}</h3>
                    </div>
                    {selectedBreakdown.job_card_number ? (
                      <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2.5 py-1 rounded-lg font-mono">
                        Job Card: {selectedBreakdown.job_card_number}
                      </span>
                    ) : (
                      <button 
                        onClick={() => handleConvertJobCard(selectedBreakdown.breakdown_id)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all"
                      >
                        Convert to JC
                      </button>
                    )}
                  </div>

                  <div className="space-y-4 text-xs">
                    <div>
                      <span className="text-slate-500 block mb-1">Complaint Description:</span>
                      <p className="text-slate-300 font-medium leading-relaxed bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl">{selectedBreakdown.complaint}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-[11px]">
                      <div>
                        <span className="text-slate-500 block">Tata Complaint No:</span>
                        <span className="font-bold text-slate-200 font-mono">{selectedBreakdown.tata_complaint_number || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">SLA Target Limit:</span>
                        <span className="font-bold text-rose-400 font-mono">{selectedBreakdown.sla_limit_hours} Hours</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Preferred Workshop:</span>
                        <span className="font-bold text-slate-200">
                          {workshops.find(w => w.workshop_id === selectedBreakdown.preferred_workshop_id)?.workshop_name || "Not Specified"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Suggested Workshop:</span>
                        <span className="font-bold text-slate-200">
                          {workshops.find(w => w.workshop_id === selectedBreakdown.auto_suggested_workshop_id)?.workshop_name || "Auto Proximity"}
                        </span>
                      </div>
                    </div>

                    {/* Site Diagnosis Checklist Display */}
                    <div className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-xl space-y-2">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Field Diagnosis</span>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <span className={`px-2 py-0.5 rounded text-center ${selectedBreakdown.vehicle_movable ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                          Movable: {selectedBreakdown.vehicle_movable ? "Yes" : "No"}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-center ${selectedBreakdown.towing_required ? "bg-rose-500/10 text-rose-400" : "bg-slate-800 text-slate-500"}`}>
                          Towing Required: {selectedBreakdown.towing_required ? "Yes" : "No"}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-center ${selectedBreakdown.parts_required ? "bg-amber-500/10 text-amber-400" : "bg-slate-800 text-slate-500"}`}>
                          Parts Needed: {selectedBreakdown.parts_required ? "Yes" : "No"}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-center ${selectedBreakdown.resolved_at_site ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-500"}`}>
                          Resolved at Site: {selectedBreakdown.resolved_at_site ? "Yes" : "No"}
                        </span>
                      </div>
                    </div>

                    {/* SLA Delay Adjudication */}
                    {showDelayInput && (
                      <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl space-y-2">
                        <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block">SLA Delay Alert!</span>
                        <input
                          type="text"
                          placeholder="Provide delay reason (Mandatory)..."
                          value={delayReason}
                          onChange={(e) => setDelayReason(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs focus:outline-none focus:border-rose-500 text-slate-200"
                        />
                      </div>
                    )}

                    {/* Dispatch Workflow Status Route */}
                    <div className="border-t border-slate-800/80 pt-4 space-y-2">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Dispatch Lifecycle updates</span>
                      <div className="grid grid-cols-2 gap-2">
                        {["QRT Dispatched", "Technician Arrived", "Diagnosis Completed", "Closed"].map((s) => (
                          <button
                            key={s}
                            disabled={!responsibleEmp}
                            onClick={() => handleStatusChange(selectedBreakdown.breakdown_id, s)}
                            className="bg-slate-950 hover:bg-slate-800 disabled:opacity-50 text-[10px] text-slate-350 py-2 rounded-lg border border-slate-800 transition-all font-bold"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Customer & Staff Communication Panel */}
                    <div className="border-t border-slate-800/80 pt-4 space-y-3">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Customer & Team Comms</span>
                      
                      {/* Communications History */}
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {selectedBreakdown.communications?.map((c: any, idx: number) => (
                          <div key={idx} className="bg-slate-950/50 p-2 rounded-lg border border-slate-800/60 text-[10px] text-slate-400 leading-normal">
                            <div className="flex justify-between font-bold text-slate-300 mb-0.5">
                              <span>{c.communication_type} to {c.recipient_role}</span>
                              <span className="font-mono text-slate-500">{new Date(c.sent_at).toLocaleTimeString()}</span>
                            </div>
                            <p>"{c.message}"</p>
                          </div>
                        ))}
                      </div>

                      {/* Log New Communication */}
                      <form onSubmit={handleLogCommunication} className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={commType}
                            onChange={(e) => setCommType(e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-[10px] text-slate-300 font-bold"
                          >
                            <option value="SMS">SMS Message</option>
                            <option value="Call">Call Log</option>
                            <option value="WhatsApp">WhatsApp</option>
                          </select>
                          <select
                            value={commRecipient}
                            onChange={(e) => setCommRecipient(e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-[10px] text-slate-300 font-bold"
                          >
                            <option value="Customer">Customer</option>
                            <option value="Driver">Driver</option>
                            <option value="Fleet Manager">Fleet Manager</option>
                          </select>
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Message body details..."
                            value={commMessage}
                            onChange={(e) => setCommMessage(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 pr-8 text-[11px] focus:outline-none focus:border-rose-500"
                          />
                          <button
                            type="submit"
                            className="absolute right-2 top-2 text-[#06B6D4] hover:text-[#2563EB] transition-all"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Status History Timeline */}
                    <div className="border-t border-slate-800/80 pt-4 space-y-3">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Incident Tracking Logs</span>
                      <div className="space-y-3 max-h-48 overflow-y-auto">
                        {(() => {
                          let history = [];
                          try {
                            history = JSON.parse(selectedBreakdown.status_history || "[]");
                          } catch (e) {
                            history = [];
                          }
                          return history.map((h: any, idx: number) => (
                            <div key={idx} className="bg-slate-950/40 border border-slate-800/50 rounded-lg p-2.5 space-y-1">
                              <div className="flex items-center justify-between text-[9px]">
                                <span className="font-bold text-[#06B6D4]">{h.status}</span>
                                <span className="text-slate-500 font-mono">{h.date} {h.time}</span>
                              </div>
                              <p className="text-[10px] text-slate-400">By: <span className="font-bold text-slate-300">{h.user}</span></p>
                              {h.remarks && <p className="text-[10px] text-slate-400 italic">"{h.remarks}"</p>}
                              {h.delay_reason && <p className="text-[10px] text-rose-400 font-semibold font-mono">Delay: {h.delay_reason}</p>}
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 text-xs italic">
                  Select a roadside complaint to view ETA, check Health Card, and track QRT.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "qrt" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white uppercase font-mono">QRT Squad Dispatch Master</h2>
              <p className="text-xs text-slate-400">Roster management, QRT vehicles, and technician utilization configuration.</p>
            </div>
            
            <button 
              onClick={() => {
                setEditingQrt(null);
                clearQrtForm();
                setShowQrtModal(true);
              }}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all"
            >
              <Plus className="h-4 w-4" /> Create Squad
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {qrtTeams.map((team) => (
              <div key={team.qrt_id} className="bg-slate-900/60 border border-slate-800/80 rounded-[18px] p-5 backdrop-blur-md shadow-lg flex flex-col justify-between h-64">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center font-black text-white text-sm">
                      {team.team_name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-200">{team.team_name}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">{team.vehicle_no || "MH-12-Q-0000"}</p>
                    </div>
                  </div>
                  <span className={`h-2.5 w-2.5 rounded-full ${team.availability ? "bg-emerald-500" : "bg-red-500"}`} />
                </div>

                <div className="space-y-2 border-t border-slate-800/60 pt-3 text-[11px] text-slate-400">
                  <div className="flex items-center justify-between">
                    <span>Lead Tech:</span>
                    <span className="font-bold text-slate-200">
                      {employees.find(e => e.employee_id === team.technician_id)?.full_name || "Unassigned"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Assistant Tech:</span>
                    <span className="font-bold text-slate-200">
                      {employees.find(e => e.employee_id === team.assistant_id)?.full_name || "Unassigned"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Task Assignment:</span>
                    <span className="font-bold text-slate-300 truncate max-w-[120px]">
                      {team.current_assignment ? `Breakdown #${team.current_assignment}` : "None / Idle"}
                    </span>
                  </div>
                </div>

                {/* Dispatch Toggle & Master Actions */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/50">
                  {selectedBreakdown && selectedBreakdown.current_status === "Complaint Received" && team.availability === 1 && (
                    <button
                      onClick={() => handleQrtAssignment(selectedBreakdown.breakdown_id, team.qrt_id)}
                      className="flex-1 bg-rose-600 hover:bg-rose-500 text-[10px] text-white font-bold py-2 rounded-lg border border-transparent transition-all text-center uppercase tracking-wider"
                    >
                      Dispatch
                    </button>
                  )}
                  <button
                    onClick={() => handleEditQrt(team)}
                    className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition-all"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteQrt(team.qrt_id)}
                    className="p-2 bg-slate-950 hover:bg-rose-950 text-rose-500 hover:text-rose-400 rounded-lg border border-slate-800 transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "reports" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white uppercase font-mono">Incident Dispatch Analytics</h2>
            <p className="text-xs text-slate-400">Response efficiency metrics, SLA analysis, and technician dispatcher tracking.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-[18px] p-5 backdrop-blur-md shadow-xl space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-3">Monthly Cost Split (₹ Lakhs)</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[
                    { month: "Jan", parts: 12, labour: 5 },
                    { month: "Feb", parts: 18, labour: 8 },
                    { month: "Mar", parts: 15, labour: 6 },
                    { month: "Apr", parts: 22, labour: 10 },
                    { month: "May", parts: 29, labour: 12 },
                    { month: "Jun", parts: 24, labour: 11 }
                  ]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                    <XAxis dataKey="month" stroke="#6B7280" fontSize={10} />
                    <YAxis stroke="#6B7280" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: "#111827", borderColor: "#1F2937" }} />
                    <Area type="monotone" dataKey="parts" stroke="#06B6D4" fill="rgba(6, 182, 212, 0.1)" strokeWidth={2} name="Spares Cost" />
                    <Area type="monotone" dataKey="labour" stroke="#2563EB" fill="rgba(37, 99, 235, 0.1)" strokeWidth={2} name="Labour Cost" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-[18px] p-5 backdrop-blur-md shadow-xl space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-3">Response vs Resolution Trend (Mins)</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: "Alpha", response: 32, resolution: 140 },
                    { name: "Beta", response: 45, resolution: 180 },
                    { name: "Gamma", response: 28, resolution: 120 },
                    { name: "Delta", response: 50, resolution: 210 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                    <XAxis dataKey="name" stroke="#6B7280" fontSize={10} />
                    <YAxis stroke="#6B7280" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: "#111827", borderColor: "#1F2937" }} />
                    <Legend />
                    <Bar dataKey="response" fill="#06B6D4" name="Response Time" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="resolution" fill="#2563EB" name="Resolution Time" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Log Breakdown Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full shadow-2xl p-6 relative overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-amber-500" />
            <h3 className="text-base font-extrabold text-white uppercase tracking-wider mb-4">Log Highway Breakdown Incident</h3>
            
            <form onSubmit={handleLogBreakdown} className="space-y-4 text-xs text-slate-300">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase tracking-widest block">Vehicle Number *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. MH-12-AB-1234"
                    value={newVehicle}
                    onChange={(e) => setNewVehicle(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-rose-500 font-mono uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase tracking-widest block">Priority Class *</label>
                  <select 
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none"
                  >
                    <option value="P1 - Vehicle Off Road (VOR)">P1 - Vehicle Off Road (VOR) [2h SLA]</option>
                    <option value="P2 - Customer Waiting">P2 - Customer Waiting [4h SLA]</option>
                    <option value="P3 - Can Drive to Workshop">P3 - Can Drive to Workshop [24h SLA]</option>
                    <option value="P4 - Planned Visit">P4 - Planned Visit [48h SLA]</option>
                  </select>
                </div>
              </div>

              {/* Vehicle Health Card Display */}
              {healthLoading && <p className="text-[10px] text-rose-400 animate-pulse uppercase tracking-wider">Loading Vehicle Health Card...</p>}
              {healthCard && (
                <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-xl space-y-2 relative">
                  <span className="text-[10px] text-[#06B6D4] font-black uppercase tracking-widest block">VEHICLE HEALTH CARD</span>
                  <div className="grid grid-cols-2 gap-3 text-[10px]">
                    <div>Warranty Status: <span className="font-bold text-slate-200">{healthCard.warranty}</span></div>
                    <div>Repeat Breakdowns: <span className="font-bold text-rose-450">{healthCard.repeatBreakdowns} Logs</span></div>
                    <div>Last Service Date: <span className="font-bold text-slate-200">{healthCard.lastServiceDate}</span></div>
                    <div>Last Odometer: <span className="font-bold text-slate-200">{healthCard.lastOdometer} Km</span></div>
                  </div>
                  {healthCard.campaigns.length > 0 && (
                    <div className="mt-2 text-[9px] text-amber-400 font-bold bg-amber-500/10 p-2 rounded border border-amber-500/20">
                      Campaign Alerts: {healthCard.campaigns.join(", ")}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase tracking-widest block">Driver Name</label>
                  <input 
                    type="text" 
                    placeholder="Driver Name"
                    value={newDriver}
                    onChange={(e) => setNewDriver(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase tracking-widest block">Driver Mobile</label>
                  <input 
                    type="text" 
                    placeholder="Driver Phone"
                    value={newDriverMobile}
                    onChange={(e) => setNewDriverMobile(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase tracking-widest block">Alternate Mobile</label>
                  <input 
                    type="text" 
                    placeholder="Alternate Phone"
                    value={newAltMobile}
                    onChange={(e) => setNewAltMobile(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase tracking-widest block">Fleet Owner</label>
                  <input 
                    type="text" 
                    placeholder="Company / Owner"
                    value={newFleetOwner}
                    onChange={(e) => setNewFleetOwner(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase tracking-widest block">Fleet Manager</label>
                  <input 
                    type="text" 
                    placeholder="Manager Name"
                    value={newFleetManager}
                    onChange={(e) => setNewFleetManager(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase tracking-widest block">Manager Mobile</label>
                  <input 
                    type="text" 
                    placeholder="Manager Phone"
                    value={newFleetManagerMobile}
                    onChange={(e) => setNewFleetManagerMobile(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase tracking-widest block">Preferred Workshop Branch</label>
                  <select 
                    value={newPreferredWorkshop}
                    onChange={(e) => setNewPreferredWorkshop(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5"
                  >
                    <option value="">-- Select Workshop --</option>
                    {workshops.map(ws => (
                      <option key={ws.workshop_id} value={ws.workshop_id}>{ws.workshop_name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase tracking-widest block">Tata CRM Complaint Number</label>
                  <input 
                    type="text" 
                    placeholder="e.g. TML-10294"
                    value={newTataComplaintNum}
                    onChange={(e) => setNewTataComplaintNum(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase tracking-widest block">GPS Latitude</label>
                  <input 
                    type="text" 
                    value={newLat}
                    onChange={(e) => setNewLat(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase tracking-widest block">GPS Longitude</label>
                  <input 
                    type="text" 
                    value={newLng}
                    onChange={(e) => setNewLng(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase tracking-widest block">Milestone / Highway Address</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Highway Milestone 42"
                    value={newGpsAddress}
                    onChange={(e) => setNewGpsAddress(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-400 uppercase tracking-widest block">Incident Complaint Details *</label>
                <textarea 
                  placeholder="Engine overheating, transmission failure, air pressure lock..."
                  value={newComplaint}
                  onChange={(e) => setNewComplaint(e.target.value)}
                  required
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 leading-normal"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase tracking-widest block">Odometer Reading</label>
                  <input 
                    type="number" 
                    placeholder="Current Mileage"
                    value={newOdo}
                    onChange={(e) => setNewOdo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase tracking-widest block">Claim Type</label>
                  <select 
                    value={newClaimType}
                    onChange={(e) => setNewClaimType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5"
                  >
                    <option value="Paid">Paid Breakdown</option>
                    <option value="Warranty">Warranty Coverage</option>
                    <option value="AMC">AMC Contract</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button 
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold uppercase tracking-wider"
                >
                  Dispatch Incident
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QRT Squad Create/Edit Modal */}
      {showQrtModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full shadow-2xl p-6 relative">
            <h3 className="text-base font-extrabold text-white uppercase tracking-wider mb-4">
              {editingQrt ? "Edit QRT Squad Master" : "Configure New QRT Squad"}
            </h3>

            <form onSubmit={handleSaveQrtTeam} className="space-y-4 text-xs text-slate-350">
              <div className="space-y-1">
                <label className="font-bold text-slate-400 uppercase tracking-widest block">Team Name *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. QRT Epsilon"
                  value={qrtName}
                  onChange={(e) => setQrtName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase tracking-widest block">Vehicle No</label>
                  <input 
                    type="text"
                    placeholder="MH-12-Q-0000"
                    value={qrtVehicle}
                    onChange={(e) => setQrtVehicle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 uppercase font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase tracking-widest block">Dispatcher Phone</label>
                  <input 
                    type="text"
                    placeholder="Squad Mobile"
                    value={qrtPhone}
                    onChange={(e) => setQrtPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-800/80 pt-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase tracking-widest block">Lead Technician</label>
                  <select 
                    value={qrtTech}
                    onChange={(e) => setQrtTech(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5"
                  >
                    <option value="">-- Select Employee --</option>
                    {employees.filter(e => e.role === "technician" || e.role === "admin" || e.role === "developer").map(emp => (
                      <option key={emp.employee_id} value={emp.employee_id}>{emp.full_name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase tracking-widest block">Assistant Tech</label>
                  <select 
                    value={qrtAssistant}
                    onChange={(e) => setQrtAssistant(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5"
                  >
                    <option value="">-- Select Employee --</option>
                    {employees.map(emp => (
                      <option key={emp.employee_id} value={emp.employee_id}>{emp.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase tracking-widest block">Mechanical Helper</label>
                  <select 
                    value={qrtHelper}
                    onChange={(e) => setQrtHelper(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5"
                  >
                    <option value="">-- Select Employee --</option>
                    {employees.map(emp => (
                      <option key={emp.employee_id} value={emp.employee_id}>{emp.full_name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase tracking-widest block">Electrician</label>
                  <select 
                    value={qrtElectrician}
                    onChange={(e) => setQrtElectrician(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5"
                  >
                    <option value="">-- Select Employee --</option>
                    {employees.map(emp => (
                      <option key={emp.employee_id} value={emp.employee_id}>{emp.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button 
                  type="button"
                  onClick={() => {
                    setShowQrtModal(false);
                    setEditingQrt(null);
                    clearQrtForm();
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-350 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold"
                >
                  Save Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

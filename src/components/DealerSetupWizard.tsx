import React, { useState, useEffect } from "react";
import { 
  Building, Layout, Clock, DollarSign, ShieldAlert, CheckCircle2, 
  ChevronRight, ChevronLeft, Save, UserPlus, Trash2, Users 
} from "lucide-react";

interface DealerSetupWizardProps {
  onSetupComplete: () => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

interface Employee {
  employee_id?: number;
  full_name: string;
  employee_code: string;
  role: string;
  mobile: string;
  email: string;
}

export default function DealerSetupWizard({ onSetupComplete, showToast }: DealerSetupWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  
  // Dealer configs state
  const [config, setConfig] = useState({
    dealerName: "Devanand Automobiles LLP",
    tataDealerCode: "100B210",
    branchName: "Pune Central",
    gstNo: "27AAAFD9928A1Z5",
    workdayStart: "09:00",
    workdayEnd: "18:00",
    labourRate: "450",
    bayCount: "12",
    jobCardNumberPattern: "JC-2026-####",
    invoiceNumberPattern: "INV-2026-####",
    defaultAiConfidenceThreshold: "75",
    backupIntervalHours: "24",
    notificationChannels: "SMS,Email"
  });

  // Staff creation state
  const [staffList, setStaffList] = useState<Employee[]>([]);
  const [newStaff, setNewStaff] = useState<Employee>({
    full_name: "",
    employee_code: "",
    role: "service_advisor",
    mobile: "",
    email: ""
  });

  const getActiveToken = () => {
    return localStorage.getItem("dwip_token") || localStorage.getItem("token") || localStorage.getItem("wms_token") || "";
  };

  const safeFetchJson = async (url: string, options?: RequestInit) => {
    try {
      const activeToken = getActiveToken();
      const headers = new Headers(options?.headers || {});
      if (activeToken && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${activeToken}`);
      }

      const res = await fetch(url, { ...options, headers });
      const contentType = res.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        return {
          ok: false,
          status: res.status,
          error: `Server API Error (HTTP ${res.status}): Received HTML page response instead of JSON.`,
          correction: "What to do: Your session may have expired or the API endpoint is unavailable. Please re-login as Administrator and try again."
        };
      }

      const data = await res.json();
      if (!res.ok) {
        return {
          ok: false,
          status: res.status,
          error: data.error || data.message || `Request failed with HTTP ${res.status}`,
          correction: "What to do: Verify the form fields and ensure your user profile has 'User Management' / 'Edit' authorization."
        };
      }
      return { ok: true, status: res.status, data };
    } catch (err: any) {
      return {
        ok: false,
        status: 0,
        error: `Network Error: ${err.message || "Failed to reach backend server."}`,
        correction: "What to do: Check your internet connection or server availability, then retry."
      };
    }
  };

  useEffect(() => {
    const savedToken = getActiveToken();
    setToken(savedToken);

    // Load existing dealer configs safely
    safeFetchJson("/api/v1/pilot/setup").then(res => {
      if (res.ok && res.data?.success && Object.keys(res.data.config || {}).length > 0) {
        setConfig(prev => ({ ...prev, ...res.data.config }));
      }
    });

    // Load existing staff safely
    if (savedToken) {
      safeFetchJson("/api/employees").then(res => {
        if (res.ok && Array.isArray(res.data)) {
          setStaffList(res.data);
        }
      });
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleStaffChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewStaff(prev => ({ ...prev, [name]: value }));
  };

  const handleAddStaff = async () => {
    if (!newStaff.full_name || !newStaff.employee_code || !newStaff.mobile) {
      showToast("Validation Error: Please fill in Full Name, Employee Code, and Mobile fields.", "error");
      return;
    }

    const activeToken = getActiveToken();
    if (!activeToken) {
      showToast("Session Error: Authentication token missing. Please log in again to add staff.", "error");
      return;
    }

    setLoading(true);
    const res = await safeFetchJson("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newStaff)
    });

    setLoading(false);
    if (res.ok) {
      showToast(`Staff member ${newStaff.full_name} added successfully!`, "success");
      setStaffList(prev => [...prev, res.data]);
      setNewStaff({
        full_name: "",
        employee_code: "",
        role: "service_advisor",
        mobile: "",
        email: ""
      });
    } else {
      showToast(`${res.error}. ${res.correction}`, "error");
    }
  };

  const handleDeleteStaff = async (id: number) => {
    const activeToken = getActiveToken();
    if (!activeToken) return;

    const res = await safeFetchJson(`/api/employees/${id}`, {
      method: "DELETE"
    });

    if (res.ok) {
      showToast("Staff member removed successfully", "info");
      setStaffList(prev => prev.filter(s => s.employee_id !== id));
    } else {
      showToast(`${res.error}. ${res.correction}`, "error");
    }
  };

  const handleSave = async () => {
    setLoading(true);
    const res = await safeFetchJson("/api/v1/pilot/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config)
    });

    setLoading(false);
    if (res.ok && res.data?.success) {
      showToast("Dealer setup wizard configuration completed successfully!", "success");
      localStorage.setItem("wms_setup_complete", "true");
      onSetupComplete();
    } else {
      showToast(`${res.error || "Failed to save setup configuration"}. ${res.correction || ""}`, "error");
    }
  };

  return (
    <div className="max-w-4xl mx-auto my-8 p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl text-slate-100">
      <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-800">
        <Building className="w-8 h-8 text-orange-500 animate-pulse" />
        <div>
          <h2 className="text-2xl font-bold">Dealer Setup Wizard</h2>
          <p className="text-xs text-slate-400">Configure dealership credentials, workshop parameters, and core personnel.</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex justify-between items-center mb-8 px-4">
        {[
          { num: 1, label: "Dealer Profile", icon: Building },
          { num: 2, label: "Bays & Layout", icon: Layout },
          { num: 3, label: "Core Staffing", icon: Users },
          { num: 4, label: "AI & System Settings", icon: ShieldAlert }
        ].map((s) => (
          <div key={s.num} className="flex items-center space-x-2">
            <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold border transition-all ${
              step >= s.num ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20" : "border-slate-700 text-slate-400"
            }`}>
              {step > s.num ? <CheckCircle2 className="w-5 h-5" /> : s.num}
            </div>
            <span className={`text-xs font-bold ${step >= s.num ? "text-orange-500" : "text-slate-500"}`}>{s.label}</span>
            {s.num < 4 && <div className={`w-8 h-0.5 ${step > s.num ? "bg-orange-500" : "bg-slate-800"}`} />}
          </div>
        ))}
      </div>

      {/* Step Contents */}
      <div className="min-h-[300px] mb-8 bg-slate-950 p-6 rounded-xl border border-slate-800">
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">Dealer & Branch Profile</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Dealership Name</label>
                <input name="dealerName" value={config.dealerName} onChange={handleChange} className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-slate-100 text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Tata Dealer Code</label>
                <input name="tataDealerCode" value={config.tataDealerCode} onChange={handleChange} className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-slate-100 text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Branch Name / Location</label>
                <input name="branchName" value={config.branchName} onChange={handleChange} className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-slate-100 text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">GSTIN No.</label>
                <input name="gstNo" value={config.gstNo} onChange={handleChange} className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-slate-100 text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none" />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">Workshop Bays & Operating Hours</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Total Mechanical/Dry Bays</label>
                <input name="bayCount" type="number" value={config.bayCount} onChange={handleChange} className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-slate-100 text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Shift Hours Start</label>
                <input name="workdayStart" type="time" value={config.workdayStart} onChange={handleChange} className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-slate-100 text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Shift Hours End</label>
                <input name="workdayEnd" type="time" value={config.workdayEnd} onChange={handleChange} className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-slate-100 text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Hourly Labor Cost Rate (₹)</label>
                <input name="labourRate" type="number" value={config.labourRate} onChange={handleChange} className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-slate-100 text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none" />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-orange-500">Core Staff Configuration</h3>
            
            {/* Quick Add Staff Form */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-orange-500" />
                Add Staff Member
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <input name="full_name" placeholder="Full Name" value={newStaff.full_name} onChange={handleStaffChange} className="bg-slate-950 border border-slate-850 p-2 rounded-lg text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500" />
                <input name="employee_code" placeholder="Employee Code (Unique)" value={newStaff.employee_code} onChange={handleStaffChange} className="bg-slate-950 border border-slate-850 p-2 rounded-lg text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500" />
                <select name="role" value={newStaff.role} onChange={handleStaffChange} className="bg-slate-950 border border-slate-850 p-2 rounded-lg text-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer">
                  <option value="service_advisor">Service Advisor</option>
                  <option value="technician">Technician</option>
                  <option value="spares_manager">Parts Manager</option>
                  <option value="warranty_manager">Warranty Manager</option>
                </select>
                <input name="mobile" placeholder="Mobile No." value={newStaff.mobile} onChange={handleStaffChange} className="bg-slate-950 border border-slate-850 p-2 rounded-lg text-slate-100 text-xs col-span-1 focus:outline-none focus:ring-1 focus:ring-orange-500" />
                <input name="email" placeholder="Email Address (Optional)" value={newStaff.email} onChange={handleStaffChange} className="bg-slate-950 border border-slate-850 p-2 rounded-lg text-slate-100 text-xs col-span-2 focus:outline-none focus:ring-1 focus:ring-orange-500" />
              </div>
              <div className="flex justify-end pt-1">
                <button onClick={handleAddStaff} disabled={loading} className="px-4 py-1.5 bg-orange-600 hover:bg-orange-500 rounded-lg text-white font-bold text-xs flex items-center gap-1.5 transition-colors">
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Member</span>
                </button>
              </div>
            </div>

            {/* Configured Staff List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Configured Personnel</h4>
              <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                {staffList.filter(s => ["service_advisor", "technician", "spares_manager", "warranty_manager"].includes(s.role)).map((s) => (
                  <div key={s.employee_code} className="flex justify-between items-center p-2.5 bg-slate-900/60 border border-slate-850 rounded-lg text-xs">
                    <div>
                      <span className="font-bold text-slate-200">{s.full_name}</span>
                      <span className="text-[10px] text-slate-400 ml-2">({s.employee_code})</span>
                      <span className="px-2 py-0.5 bg-slate-950 border border-slate-800 text-[10px] text-orange-400 font-extrabold rounded-md ml-3 uppercase tracking-wider">
                        {s.role.replace("_", " ")}
                      </span>
                    </div>
                    {s.employee_id && (
                      <button onClick={() => handleDeleteStaff(s.employee_id!)} className="text-slate-500 hover:text-rose-500 transition-colors p-1" title="Delete staff">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                {staffList.filter(s => ["service_advisor", "technician", "spares_manager", "warranty_manager"].includes(s.role)).length === 0 && (
                  <div className="text-center py-6 text-xs text-slate-500 bg-slate-900/20 border border-dashed border-slate-850 rounded-xl">
                    No active service advisors or technicians created yet. Add them above.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">AI Copilot & Document Formats</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">AI Recommendation Min Confidence (%)</label>
                <input name="defaultAiConfidenceThreshold" type="number" min="50" max="100" value={config.defaultAiConfidenceThreshold} onChange={handleChange} className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-slate-100 text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Database Auto Backup (Hours)</label>
                <select name="backupIntervalHours" value={config.backupIntervalHours} onChange={handleChange} className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-slate-100 text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none cursor-pointer">
                  <option value="6">Every 6 Hours</option>
                  <option value="12">Every 12 Hours</option>
                  <option value="24">Daily (24 Hours)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Job Card Sequence Format</label>
                <input name="jobCardNumberPattern" value={config.jobCardNumberPattern} onChange={handleChange} className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-slate-100 text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Invoice Sequence Format</label>
                <input name="invoiceNumberPattern" value={config.invoiceNumberPattern} onChange={handleChange} className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-slate-100 text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex justify-between items-center">
        <button disabled={step === 1} onClick={() => setStep(prev => prev - 1)} className="flex items-center space-x-2 px-4 py-2 border border-slate-700 hover:border-slate-500 rounded-lg text-slate-300 disabled:opacity-50 text-xs transition-colors">
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {step < 4 ? (
          <button onClick={() => setStep(prev => prev + 1)} className="flex items-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg text-white font-bold text-xs transition-colors">
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button disabled={loading} onClick={handleSave} className="flex items-center space-x-2 px-6 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white font-bold text-xs transition-colors">
            <Save className="w-4 h-4" />
            <span>{loading ? "Completing setup..." : "Save Config & Finish"}</span>
          </button>
        )}
      </div>
    </div>
  );
}

import React, { useState, useMemo } from "react";
import { 
  ShieldCheck, 
  Search, 
  Plus, 
  Wrench, 
  Clock, 
  TrendingUp, 
  CheckCircle, 
  AlertTriangle, 
  DollarSign, 
  FileText, 
  Package, 
  Settings, 
  Layers, 
  RefreshCw,
  Cpu,
  BadgeCheck,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Car,
  Camera,
  UploadCloud,
  Check
} from "lucide-react";
import { JobCard } from "../types";

interface PartsWarrantyManagerProps {
  jobCards: JobCard[];
  onUpdateJob: (id: number, updatedFields: Partial<JobCard>) => void;
  onRefresh: () => void;
}

interface PartRequisition {
  id: string;
  jobId: number;
  jobCardNo: string;
  partName: string;
  partCode: string;
  qty: number;
  unitPrice: number;
  status: "Requested" | "Issued" | "Backordered";
  requestedAt: string;
}

interface WarrantyClaim {
  id: string;
  jobCardNo: string;
  partName: string;
  partCode: string;
  claimAmount: number;
  status: "Draft" | "Submitted" | "Approved" | "Rejected";
  failureReason: string;
  submittedAt: string;
}

export default function PartsWarrantyManager({ 
  jobCards, 
  onUpdateJob,
  onRefresh 
}: PartsWarrantyManagerProps) {
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"inventory" | "warranty" | "circulars">("inventory");
  const [searchQuery, setSearchQuery] = useState("");

  // --- SERVICE CIRCULARS STATE ---
  const [circulars, setCirculars] = useState<any[]>([]);
  const [cirLoading, setCirLoading] = useState(false);
  const [cirSearchQuery, setCirSearchQuery] = useState("");
  const [newCirId, setNewCirId] = useState("");
  const [newCirTitle, setNewCirTitle] = useState("");
  const [newCirDate, setNewCirDate] = useState("");
  const [newCirModels, setNewCirModels] = useState("");
  const [newCirSummary, setNewCirSummary] = useState("");
  const [newCirRules, setNewCirRules] = useState("");
  const [uploadingCir, setUploadingCir] = useState(false);

  // --- WARRANTY AI VALIDATION STATE ---
  const [valJobCardId, setValJobCardId] = useState("");
  const [valDateOfSale, setValDateOfSale] = useState(new Date(Date.now() - 365 * 2 * 24 * 3600 * 1000).toISOString().split("T")[0]); // Default to 2 years ago
  const [valModelNoPpl, setValModelNoPpl] = useState("Prima");
  const [valFsbStatus, setValFsbStatus] = useState("Not Applicable");
  const [valQuery, setValQuery] = useState("");
  const [valLoading, setValLoading] = useState(false);
  const [valResult, setValResult] = useState<any | null>(null);
  const [valError, setValError] = useState<string | null>(null);

  // --- VEHICLE SELECTOR & FSB AUDIT STATE ---
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState("");
  const [onlyInWorkshop, setOnlyInWorkshop] = useState(true);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [fsbRecords, setFsbRecords] = useState<any[]>([]);
  const [fsbLoading, setFsbLoading] = useState(false);
  const [updatingFsbId, setUpdatingFsbId] = useState<number | null>(null);

  const fetchCirculars = async () => {
    setCirLoading(true);
    try {
      const res = await fetch("/api/warranty/circulars");
      if (res.ok) {
        const data = await res.json();
        setCirculars(data);
      }
    } catch (e) {
      console.error("Failed to fetch circulars:", e);
    } finally {
      setCirLoading(false);
    }
  };

  const fetchFsbRecords = async () => {
    try {
      const res = await fetch("/api/fsb");
      if (res.ok) {
        const data = await res.json();
        setFsbRecords(data);
      }
    } catch (e) {
      console.error("Failed to fetch FSB records:", e);
    }
  };

  const handleUpdateFsbStatus = async (jobCardId: number, status: string) => {
    setUpdatingFsbId(jobCardId);
    try {
      const res = await fetch("/api/fsb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_card_id: jobCardId,
          fsb_status: status
        })
      });
      if (res.ok) {
        setSuccess("FSB Status updated successfully in database!");
        fetchFsbRecords();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update FSB status.");
      }
    } catch (e: any) {
      alert(e.message || "An error occurred.");
    } finally {
      setUpdatingFsbId(null);
    }
  };

  React.useEffect(() => {
    fetchCirculars();
    fetchFsbRecords();
  }, []);

  const handleUploadCircular = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCirTitle || !newCirSummary || !newCirRules) return;
    setUploadingCir(true);
    try {
      const res = await fetch("/api/warranty/circulars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: newCirId || undefined,
          title: newCirTitle,
          date: newCirDate || undefined,
          models: newCirModels || undefined,
          summary: newCirSummary,
          warrantyRules: newCirRules
        })
      });
      if (res.ok) {
        setSuccess("Service Circular uploaded successfully to references database!");
        setNewCirId("");
        setNewCirTitle("");
        setNewCirDate("");
        setNewCirModels("");
        setNewCirSummary("");
        setNewCirRules("");
        fetchCirculars();
        setTimeout(() => setSuccess(null), 4000);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to upload circular.");
      }
    } catch (e: any) {
      alert(e.message || "An error occurred during circular upload.");
    } finally {
      setUploadingCir(false);
    }
  };

  const handleValidateWarranty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valQuery) return;
    setValLoading(true);
    setValResult(null);
    setValError(null);
    try {
      const res = await fetch("/api/warranty/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobCardId: valJobCardId || undefined,
          dateOfSale: valDateOfSale || undefined,
          modelNoPpl: valModelNoPpl || undefined,
          fsbStatus: valFsbStatus,
          query: valQuery
        })
      });
      if (res.ok) {
        const data = await res.json();
        setValResult(data);
      } else {
        const err = await res.json();
        setValError(err.error || "Validation failed.");
      }
    } catch (e: any) {
      setValError(e.message || "An unexpected error occurred during warranty validation.");
    } finally {
      setValLoading(false);
    }
  };

  const handleSelectJobCardForVal = (jcId: string) => {
    setValJobCardId(jcId);
    if (jcId) {
      const matched = jobCards.find(j => j.job_id === parseInt(jcId));
      if (matched) {
        setValModelNoPpl(matched.vehicle_model || "");
        const defaultDate = matched.date_in || new Date(Date.now() - 365 * 2 * 24 * 3600 * 1000).toISOString().split("T")[0];
        setValDateOfSale(defaultDate);
      }
    } else {
      setValModelNoPpl("");
    }
  };

  // Local state for parts requests & claims to persist dynamically during live session
  const [requisitions, setRequisitions] = useState<PartRequisition[]>([
    { id: "REQ-001", jobId: 1, jobCardNo: "JC-90412", partName: "Front Brake Pads Set", partCode: "BP-SUZ-882", qty: 1, unitPrice: 1850, status: "Requested", requestedAt: new Date(Date.now() - 3600000).toISOString() },
    { id: "REQ-002", jobId: 2, jobCardNo: "JC-90451", partName: "Synthetic Engine Oil 5W30", partCode: "EO-5W30-4L", qty: 1, unitPrice: 2200, status: "Issued", requestedAt: new Date(Date.now() - 7200000).toISOString() },
    { id: "REQ-003", jobId: 3, jobCardNo: "JC-90480", partName: "AC Cabin Air Filter", partCode: "AF-CAB-445", qty: 1, unitPrice: 650, status: "Requested", requestedAt: new Date(Date.now() - 5400000).toISOString() }
  ]);

  const [warrantyClaims, setWarrantyClaims] = useState<WarrantyClaim[]>([
    { id: "CLM-901", jobCardNo: "JC-90412", partName: "Power Steering Rack Assembly", partCode: "SR-HYU-332", claimAmount: 18500, status: "Submitted", failureReason: "Oil leakage from oil-seal within warranty term", submittedAt: new Date(Date.now() - 86400000).toISOString() },
    { id: "CLM-902", jobCardNo: "JC-90480", partName: "Electronic ABS Actuator", partCode: "ABS-ACT-991", claimAmount: 32000, status: "Approved", failureReason: "Internal solenoid coil open circuit error", submittedAt: new Date(Date.now() - 172800000).toISOString() }
  ]);

  // Form states for Part requisition
  const [reqJobId, setReqJobId] = useState("");
  const [reqPartName, setReqPartName] = useState("");
  const [reqPartCode, setReqPartCode] = useState("");
  const [reqQty, setReqQty] = useState("1");
  const [reqPrice, setReqPrice] = useState("");

  // Parts OCR upload states
  const [showPartOcrModal, setShowPartOcrModal] = useState(false);
  const [partOcrScanning, setPartOcrScanning] = useState(false);
  const [partOcrResult, setPartOcrResult] = useState<string | null>(null);
  const [partOcrFile, setPartOcrFile] = useState<string | null>(null);

  const handlePartOcrSimulation = (code: string, name: string) => {
    setPartOcrScanning(true);
    setPartOcrResult(null);
    setTimeout(() => {
      setPartOcrResult(`OCR Extract Status: SUCCESS\n-----------------------\nPart Code: ${code}\nPart Name: ${name}`);
      setPartOcrScanning(false);
      setReqPartCode(code);
      setReqPartName(name);
    }, 1200);
  };

  const handlePartOcrFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPartOcrScanning(true);
    setPartOcrResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      setPartOcrFile(event.target?.result as string);
      setTimeout(() => {
        const nameClean = file.name.toUpperCase().split(".")[0];
        let code = "PRT-904-GEN";
        let name = "General Replacement Spare Part";

        if (nameClean.includes("VALVE")) {
          code = "AXV-55210";
          name = "Axle Lift Control Valve";
        } else if (nameClean.includes("ALTERNATOR")) {
          code = "ALT-88412";
          name = "Alternator Assembly 12V";
        } else if (nameClean.includes("TURBO")) {
          code = "TBC-99044";
          name = "Garrett Turbocharger Assembly";
        } else {
          const codeParts = nameClean.match(/[A-Z0-9]{3,6}/g);
          if (codeParts && codeParts.length > 0) {
            code = codeParts.join("-");
          }
        }

        setPartOcrResult(`OCR Extract Status: SUCCESS\n-----------------------\nPart Code: ${code}\nPart Name: ${name}`);
        setReqPartCode(code);
        setReqPartName(name);
        setPartOcrScanning(false);
      }, 1200);
    };
    reader.readAsDataURL(file);
  };

  // Form states for warranty claim
  const [wClaimJobNo, setWClaimJobNo] = useState("");
  const [wPartName, setWPartName] = useState("");
  const [wPartCode, setWPartCode] = useState("");
  const [wAmount, setWAmount] = useState("");
  const [wReason, setWReason] = useState("");

  const activeJobCards = useMemo(() => {
    return jobCards.filter(j => j.status !== "Completed" && j.status !== "Invoiced");
  }, [jobCards]);

  const getFsbStatusForJob = (jobId: number): 'Settled' | 'Rejected' | 'Deviation' | 'Pending' => {
    const record = fsbRecords.find(r => Number(r.job_card_id) === Number(jobId));
    return record ? record.fsb_status : 'Pending';
  };

  const getFsbBadgeClass = (status: string) => {
    switch (status) {
      case 'Settled':
        return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
      case 'Rejected':
        return 'bg-rose-100 text-rose-800 border border-rose-200';
      case 'Deviation':
        return 'bg-amber-100 text-amber-800 border border-amber-200';
      default:
        return 'bg-slate-100 text-slate-600 border border-slate-200';
    }
  };

  const getFsbStatusIcon = (status: string) => {
    switch (status) {
      case 'Settled':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      case 'Rejected':
        return <AlertCircle className="w-3.5 h-3.5 text-rose-600" />;
      case 'Deviation':
        return <HelpCircle className="w-3.5 h-3.5 text-amber-600" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const filteredSelectorVehicles = useMemo(() => {
    return jobCards.filter(jc => {
      const matchesSearch = 
        (jc.vrn || "").toLowerCase().includes(vehicleSearchQuery.toLowerCase()) ||
        (jc.job_card_no || "").toLowerCase().includes(vehicleSearchQuery.toLowerCase()) ||
        (jc.vehicle_model || "").toLowerCase().includes(vehicleSearchQuery.toLowerCase());
      
      const isInWorkshop = jc.status !== "Completed" && jc.status !== "Invoiced";
      
      if (onlyInWorkshop) {
        return matchesSearch && isInWorkshop;
      }
      return matchesSearch;
    });
  }, [jobCards, vehicleSearchQuery, onlyInWorkshop]);

  const handleAddRequisition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqJobId || !reqPartName || !reqPartCode || !reqQty) return;

    const matchedJob = jobCards.find(j => j.job_id === parseInt(reqJobId));
    if (!matchedJob) return;

    const newReq: PartRequisition = {
      id: `REQ-${Date.now().toString().slice(-3)}`,
      jobId: matchedJob.job_id,
      jobCardNo: matchedJob.job_card_no,
      partName: reqPartName,
      partCode: reqPartCode.toUpperCase(),
      qty: parseInt(reqQty),
      unitPrice: reqPrice ? parseFloat(reqPrice) : 0,
      status: "Requested",
      requestedAt: new Date().toISOString()
    };

    setRequisitions(prev => [newReq, ...prev]);
    
    // Also, trigger "Waiting Parts" status in the main job cards for parts delay simulation
    onUpdateJob(matchedJob.job_id, { status: "Waiting", remarks: `Waiting parts: ${reqPartName} (${reqPartCode.toUpperCase()})` });

    setReqJobId("");
    setReqPartName("");
    setReqPartCode("");
    setReqQty("1");
    setReqPrice("");

    setSuccess(`Requisition registered! Job Card status updated to 'Waiting Parts'.`);
    setTimeout(() => setSuccess(null), 4000);
  };

  const handleIssuePart = (reqId: string, jobId: number, partName: string) => {
    setRequisitions(prev => prev.map(r => r.id === reqId ? { ...r, status: "Issued" } : r));
    
    // Revert Job card back to active WIP status
    onUpdateJob(jobId, { status: "Active", remarks: `Part Issued: ${partName}. Job resumed.` });
    
    setSuccess(`Part issued! Job resumed in production.`);
    setTimeout(() => setSuccess(null), 4000);
  };

  const handleAddWarrantyClaim = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wClaimJobNo || !wPartName || !wPartCode || !wAmount || !wReason) return;

    const newClaim: WarrantyClaim = {
      id: `CLM-${Date.now().toString().slice(-3)}`,
      jobCardNo: wClaimJobNo.toUpperCase(),
      partName: wPartName,
      partCode: wPartCode.toUpperCase(),
      claimAmount: parseFloat(wAmount),
      status: "Submitted",
      failureReason: wReason,
      submittedAt: new Date().toISOString()
    };

    setWarrantyClaims(prev => [newClaim, ...prev]);

    setWClaimJobNo("");
    setWPartName("");
    setWPartCode("");
    setWAmount("");
    setWReason("");

    setSuccess(`Warranty claim CLM submitted successfully to OEM clearance!`);
    setTimeout(() => setSuccess(null), 4000);
  };

  const handleUpdateClaimStatus = (claimId: string, status: WarrantyClaim["status"]) => {
    setWarrantyClaims(prev => prev.map(c => c.id === claimId ? { ...c, status } : c));
    setSuccess(`Warranty claim status cleared to ${status}.`);
    setTimeout(() => setSuccess(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Success alert banner */}
      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl flex items-center gap-3 text-xs animate-in slide-in-from-top-2 duration-200">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Primary tab select */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("inventory")}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "inventory" ? "border-orange-500 text-orange-600 font-extrabold" : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Package className="h-4 w-4" />
          <span>Parts Requisition & Inventory</span>
        </button>

        <button
          onClick={() => setActiveTab("warranty")}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "warranty" ? "border-orange-500 text-orange-600 font-extrabold" : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>OEM Warranty Claims Management</span>
        </button>

        <button
          onClick={() => setActiveTab("circulars")}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "circulars" ? "border-orange-500 text-orange-600 font-extrabold" : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Service Circulars Reference</span>
        </button>
      </div>

      {activeTab === "inventory" && (
        <div className="space-y-6">
          {/* Requisition creator */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                  <Package className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Parts Issue Requisition</h3>
                  <p className="text-[10px] text-slate-400">Request special replacement parts from the main spare parts store room</p>
                </div>
              </div>

              <form onSubmit={handleAddRequisition} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Select Active Vehicle *
                  </label>
                  <select
                    value={reqJobId}
                    required
                    onChange={(e) => setReqJobId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none"
                  >
                    <option value="">Select active Job Card...</option>
                    {activeJobCards.map(j => (
                      <option key={j.job_id} value={j.job_id}>
                        {j.job_card_no} - {j.vrn} ({j.vehicle_make})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Part Name / Description *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Front Shock Absorber LH"
                    value={reqPartName}
                    onChange={(e) => setReqPartName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>OEM Part Code / Catalog No *</span>
                    <button
                      type="button"
                      onClick={() => setShowPartOcrModal(true)}
                      className="text-[9px] text-orange-500 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Camera className="w-3 h-3" />
                      <span>OCR Capture</span>
                    </button>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SA-552-TOY"
                    value={reqPartCode}
                    onChange={(e) => setReqPartCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none uppercase font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={reqQty}
                      onChange={(e) => setReqQty(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Est Unit Price (₹) (Optional)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 3500"
                      value={reqPrice}
                      onChange={(e) => setReqPrice(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="md:col-span-2 pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Request Part & Hold Job</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Quick Metrics */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100">
                  Store Status
                </h3>
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700">Awaiting Store Release</span>
                    <span className="font-mono font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                      {requisitions.filter(r => r.status === "Requested").length} Parts
                    </span>
                  </div>

                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700">Released / Issued</span>
                    <span className="font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      {requisitions.filter(r => r.status === "Issued").length} Parts
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-slate-500 space-y-1">
                <span className="font-black text-slate-700 block uppercase">Inventory Notice:</span>
                <p>Standard Store Turnaround is 15 minutes. Delays automatically trigger a High priority Parts alert in Supervisor logs.</p>
              </div>
            </div>
          </div>

          {/* Requisitions List */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Spare Parts Requisition Index</h3>
                <p className="text-[10px] text-slate-400 font-medium">Log and issuance of materials to service bays</p>
              </div>
              <button 
                onClick={onRefresh}
                className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-5">Requisition ID</th>
                    <th className="py-3 px-5">Job Card</th>
                    <th className="py-3 px-5">Part Details</th>
                    <th className="py-3 px-5">Qty</th>
                    <th className="py-3 px-5">Est Cost</th>
                    <th className="py-3 px-5">Request Date</th>
                    <th className="py-3 px-5 text-right">Status / Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requisitions.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-5 font-mono font-bold text-slate-800">{req.id}</td>
                      <td className="py-3 px-5">
                        <span className="font-mono text-slate-700 bg-slate-100 border px-1.5 py-0.5 rounded font-bold">
                          {req.jobCardNo}
                        </span>
                      </td>
                      <td className="py-3 px-5">
                        <p className="font-semibold text-slate-800">{req.partName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{req.partCode}</p>
                      </td>
                      <td className="py-3 px-5 font-mono">{req.qty}</td>
                      <td className="py-3 px-5 font-mono">₹{(req.qty * req.unitPrice).toLocaleString()}</td>
                      <td className="py-3 px-5 text-slate-400">{new Date(req.requestedAt).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="py-3 px-5 text-right">
                        {req.status === "Issued" ? (
                          <span className="text-[9px] font-mono font-bold px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
                            Issued
                          </span>
                        ) : (
                          <button
                            onClick={() => handleIssuePart(req.id, req.jobId, req.partName)}
                            className="px-2.5 py-1 bg-orange-500 hover:bg-orange-600 text-white font-bold text-[9px] uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                          >
                            Mark Issued & Release WIP
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "warranty" && (
        <div className="space-y-6">
          {/* Vehicle Selector & FSB Audit Control Panel */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <Car className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Vehicle Directory & FSB Status Audit</h3>
                  <p className="text-xs text-slate-400 font-medium">Search vehicles, filter active workshop jobs, and audit Field Service Bulletin (FSB) claims.</p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                {/* Search VRN */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search VRN or Job Card..."
                    value={vehicleSearchQuery}
                    onChange={(e) => setVehicleSearchQuery(e.target.value)}
                    className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none w-56 font-semibold"
                  />
                </div>
                
                {/* Toggle workshop only */}
                <label className="flex items-center gap-2 cursor-pointer select-none border border-slate-200 bg-slate-50 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition">
                  <input
                    type="checkbox"
                    checked={onlyInWorkshop}
                    onChange={(e) => setOnlyInWorkshop(e.target.checked)}
                    className="rounded text-orange-500 focus:ring-orange-500 border-slate-300 h-4 w-4"
                  />
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">In Workshop Only</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Vehicle List */}
              <div className="lg:col-span-1 border border-slate-200 rounded-2xl flex flex-col overflow-hidden bg-slate-50/50">
                <div className="p-3 border-b border-slate-200 bg-slate-100/50 flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Matches ({filteredSelectorVehicles.length})</span>
                  {selectedVehicleId && (
                    <button
                      onClick={() => setSelectedVehicleId(null)}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>
                
                <div className="divide-y divide-slate-200 overflow-y-auto max-h-72">
                  {filteredSelectorVehicles.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 italic text-xs">
                      No vehicles matching criteria.
                    </div>
                  ) : (
                    filteredSelectorVehicles.map((jc) => {
                      const isSelected = selectedVehicleId === jc.job_id;
                      const fsbStatus = getFsbStatusForJob(jc.job_id);
                      const isInWip = jc.status !== "Completed" && jc.status !== "Invoiced";
                      
                      return (
                        <div
                          key={jc.job_id}
                          onClick={() => {
                            setSelectedVehicleId(jc.job_id);
                            // Auto-fill AI Validator
                            setValJobCardId(jc.job_id.toString());
                            setValModelNoPpl(jc.vehicle_model || "");
                            const defaultDate = jc.date_in || new Date(Date.now() - 365 * 2 * 24 * 3600 * 1000).toISOString().split("T")[0];
                            setValDateOfSale(defaultDate);
                            setValFsbStatus(fsbStatus === "Pending" ? "Not Applicable" : fsbStatus);
                            // Auto-fill claim form
                            setWClaimJobNo(jc.job_card_no);
                          }}
                          className={`p-3 cursor-pointer transition-all flex flex-col gap-1.5 border-l-4 ${
                            isSelected 
                              ? "bg-white border-l-indigo-600 shadow-sm" 
                              : "hover:bg-slate-100/60 border-l-transparent"
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-mono font-bold text-slate-700 bg-slate-200/60 border px-1.5 py-0.5 rounded">
                              {jc.job_card_no}
                            </span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              isInWip 
                                ? "bg-amber-100 text-amber-800 border border-amber-200" 
                                : "bg-slate-200 text-slate-600 border border-slate-300"
                            }`}>
                              {isInWip ? "In Workshop" : "Finished"}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-end">
                            <div>
                              <p className="font-bold text-slate-900 text-xs tracking-tight">{jc.vrn}</p>
                              <p className="text-[10px] text-slate-400 font-medium">{jc.vehicle_model || "Unknown Model"}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${getFsbBadgeClass(fsbStatus)}`}>
                                {getFsbStatusIcon(fsbStatus)}
                                <span>{fsbStatus}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Vehicle Details & FSB Status Manager */}
              <div className="lg:col-span-2 border border-slate-200 rounded-2xl p-5 bg-white flex flex-col justify-between">
                {!selectedVehicleId ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-2">
                    <Car className="h-10 w-10 text-slate-300 animate-pulse" />
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">No Vehicle Selected</h4>
                    <p className="text-[10px] text-slate-400 max-w-sm">
                      Select a vehicle from the matching list on the left to audit details, update Field Service Bulletin (FSB) claims status, and run automatic warranty validation checks.
                    </p>
                  </div>
                ) : (
                  (() => {
                    const matched = jobCards.find(j => j.job_id === selectedVehicleId);
                    if (!matched) return null;
                    const fsbStatus = getFsbStatusForJob(matched.job_id);
                    
                    return (
                      <div className="space-y-5 h-full flex flex-col justify-between">
                        {/* Selected info card */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                          <div>
                            <span className="text-[9px] font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-200/50 px-2 py-0.5 rounded uppercase tracking-wider">Selected Vehicle</span>
                            <h4 className="text-sm font-extrabold text-slate-900 mt-1">{matched.vrn} <span className="font-semibold text-slate-400 text-xs">({matched.vehicle_model || "N/A"})</span></h4>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Job Card: <span className="font-bold text-slate-600">{matched.job_card_no}</span> • Status: <span className="font-bold text-slate-600">{matched.status}</span></p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Current FSB Status</span>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${getFsbBadgeClass(fsbStatus)}`}>
                              {getFsbStatusIcon(fsbStatus)}
                              {fsbStatus}
                            </span>
                          </div>
                        </div>

                        {/* FSB Status update radio controls */}
                        <div className="space-y-3">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Update FSB Settlement Status
                          </label>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {[
                              { value: 'Settled', desc: 'OEM settled claim', color: 'text-emerald-700 bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50' },
                              { value: 'Rejected', desc: 'OEM rejected bulletin', color: 'text-rose-700 bg-rose-50/50 border-rose-200 hover:bg-rose-50' },
                              { value: 'Deviation', desc: 'Approved via deviation', color: 'text-amber-700 bg-amber-50/50 border-amber-200 hover:bg-amber-50' }
                            ].map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                disabled={updatingFsbId !== null}
                                onClick={() => handleUpdateFsbStatus(matched.job_id, opt.value)}
                                className={`flex flex-col p-3 rounded-xl border text-left cursor-pointer transition-all active:scale-[0.98] ${
                                  fsbStatus === opt.value
                                    ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/10 font-bold"
                                    : `border-slate-200 hover:shadow-sm ${opt.color}`
                                }`}
                              >
                                <span className="text-xs font-extrabold text-slate-800">{opt.value}</span>
                                <span className="text-[9px] text-slate-400 font-medium mt-0.5 leading-snug">{opt.desc}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Quick links / Actions */}
                        <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2.5 justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              const validatorElem = document.getElementById("ai-warranty-validator-title");
                              if (validatorElem) validatorElem.scrollIntoView({ behavior: "smooth" });
                            }}
                            className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[10px] uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Cpu className="h-3.5 w-3.5 text-indigo-500" />
                            <span>Consult AI Validator</span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => {
                              const claimFormElem = document.getElementById("log-oem-claim-form-title");
                              if (claimFormElem) claimFormElem.scrollIntoView({ behavior: "smooth" });
                            }}
                            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 shadow cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Proceed to Log Claim</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
          </div>

          {/* AI Warranty Eligibility Validator (Query Box) */}
          <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 shadow-md border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
                  <Cpu className="h-5 w-5" />
                </div>
                <div>
                  <h3 id="ai-warranty-validator-title" className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                    AI Warranty Validator <span className="text-[10px] bg-indigo-600/30 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-black animate-pulse">ACTIVE</span>
                  </h3>
                  <p className="text-xs text-slate-400">Intelligent Service Circular Compliance & Claims Audit Assistant</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                <span>Model: gemini-3.5-flash</span>
              </div>
            </div>

            <form onSubmit={handleValidateWarranty} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  1. Select Active Vehicle Job (Optional)
                </label>
                <select
                  value={valJobCardId}
                  onChange={(e) => handleSelectJobCardForVal(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">Select job card...</option>
                  {jobCards.map(j => (
                    <option key={j.job_id} value={j.job_id}>
                      {j.job_card_no} - {j.vrn} ({j.vehicle_model})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  2. Date of Sale / Commissioning
                </label>
                <input
                  type="date"
                  value={valDateOfSale}
                  onChange={(e) => setValDateOfSale(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  3. Vehicle Model / PPL Segment
                </label>
                <select
                  value={valModelNoPpl}
                  onChange={(e) => setValModelNoPpl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                >
                  {['Prima', 'Signa', 'Ultra', 'Intra', 'Ace', 'Winger', 'LPT 407', 'LPT 709', 'LPT 1109', 'LPT 1412', 'LPT 2518', 'LPT 3118', 'Starbus', 'Cityride', 'Divo'].map((model) => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  4. FSB (Field Service Bulletin) Status
                </label>
                <select
                  value={valFsbStatus}
                  onChange={(e) => setValFsbStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="Not Applicable">Not Applicable</option>
                  <option value="Applicable and Done">Applicable and Done</option>
                  <option value="Applicable and Pending">Applicable and Pending</option>
                </select>
              </div>

              <div className="md:col-span-4">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  5. Enter Warranty Query / Diagnostic failure details *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder='e.g. vehicles lift axle control valve is failed does its warranty valid'
                  value={valQuery}
                  onChange={(e) => setValQuery(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-600 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-4 flex flex-wrap gap-2 items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Example queries:</span>
                <button
                  type="button"
                  onClick={() => {
                    setValQuery("vehicles lift axle control valve is failed does its warranty valid");
                    setValModelNoPpl("ALL M&HCV BSVI Phase-II");
                    setValFsbStatus("Applicable and Done");
                  }}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[10px] text-slate-300 font-mono transition-colors cursor-pointer"
                >
                  Lift Axle Valve Failure
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setValQuery("air bellow on lift axle is leaked, is it covered under standard warranty or AMC?");
                    setValModelNoPpl("TATA SIGNA 2830.TK");
                    setValFsbStatus("Not Applicable");
                  }}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[10px] text-slate-300 font-mono transition-colors cursor-pointer"
                >
                  Air Bellow Covered?
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setValQuery("DEF tank filter requires replacement at 1,40,000 km, is it covered under standard maintenance rules?");
                    setValModelNoPpl("ALL BS6 Phase-2 HCV Cummins Engine");
                    setValFsbStatus("Not Applicable");
                  }}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[10px] text-slate-300 font-mono transition-colors cursor-pointer"
                >
                  DEF Filter Replacement
                </button>
              </div>

              <div className="md:col-span-4 pt-2">
                <button
                  type="submit"
                  disabled={valLoading}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow cursor-pointer"
                >
                  {valLoading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Consulting 20+ Service Circulars & Verifying Rules...</span>
                    </>
                  ) : (
                    <>
                      <Cpu className="h-4 w-4" />
                      <span>Validate Warranty & Circular Compliance</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Validation Result Box */}
            {valResult && (
              <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-4 animate-in fade-in duration-300">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">DECISION STATUS:</span>
                    <span className={`text-[11px] font-mono font-black px-3 py-1 rounded-full border tracking-wide uppercase flex items-center gap-1 ${
                      valResult.valid 
                        ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/30" 
                        : "bg-rose-950/40 text-rose-400 border-rose-500/30"
                    }`}>
                      <BadgeCheck className="h-3.5 w-3.5" />
                      {valResult.valid ? "WARRANTY VALID" : "WARRANTY EXPIRED / INELIGIBLE"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="text-[11px] font-mono text-slate-300 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                      Ref: <span className="font-extrabold text-orange-400">{valResult.circularNo}</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-300 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                      Section: <span className="font-semibold text-indigo-400">{valResult.sectionLine}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <p className="font-black text-slate-300 uppercase tracking-wider">Circular Logical Validation:</p>
                  <p className="text-slate-400 leading-relaxed font-sans">{valResult.reason}</p>
                </div>

                {valResult.alternativeOption && (
                  <div className="p-3 bg-slate-900/50 border border-slate-800/40 rounded-lg text-xs space-y-1">
                    <p className="font-black text-slate-400 uppercase tracking-wider text-[10px]">Alternative coverage options:</p>
                    <p className="text-slate-500 font-sans leading-relaxed">{valResult.alternativeOption}</p>
                  </div>
                )}

                {valResult.valid && (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setWClaimJobNo(valJobCardId ? jobCards.find(j => j.job_id === parseInt(valJobCardId))?.job_card_no || "" : "");
                        const lowerQuery = valQuery.toLowerCase();
                        let suggestedPart = "";
                        if (lowerQuery.includes("valve")) suggestedPart = "Lift Axle Control Valve";
                        else if (lowerQuery.includes("bellow")) suggestedPart = "Air Bellow (Lift Axle)";
                        else if (lowerQuery.includes("filter")) suggestedPart = "DEF/Supply Filter Kit";
                        else if (lowerQuery.includes("belt")) suggestedPart = "Fan Belt";
                        else suggestedPart = "Defective OEM Component";

                        setWPartName(suggestedPart);
                        setWPartCode(valResult.circularNo);
                        setWAmount("12500");
                        setWReason(`Verified valid under standard warranty by AI via Circular ${valResult.circularNo}. Section: ${valResult.sectionLine}`);
                        
                        setSuccess("Auto-populated standard OEM Claim Form from AI Validator results below!");
                        setTimeout(() => setSuccess(null), 4000);
                        
                        const formElem = document.getElementById("log-oem-claim-form-title");
                        if (formElem) formElem.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Proceed & Populate OEM Claim Form</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {valError && (
              <div className="p-4 bg-rose-950/20 border border-rose-500/20 text-rose-400 rounded-xl text-xs">
                <strong>Validation Error:</strong> {valError}
              </div>
            )}
          </div>

          {/* Log OEM Warranty Claim Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 id="log-oem-claim-form-title" className="text-xs font-bold text-slate-800 uppercase tracking-wider">Log OEM Warranty Claim</h3>
                  <p className="text-[10px] text-slate-400">File standard replacement warranty claims on failed OEM products to claim reimbursement</p>
                </div>
              </div>

              <form onSubmit={handleAddWarrantyClaim} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Related Job Card No *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. JC-90412"
                    value={wClaimJobNo}
                    onChange={(e) => setWClaimJobNo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none uppercase font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Defective Part Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Electronic EPS Controller"
                    value={wPartName}
                    onChange={(e) => setWPartName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    OEM Part Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EPS-CONT-HYU-09"
                    value={wPartCode}
                    onChange={(e) => setWPartCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Claim Amount Reimburse (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 15400"
                    value={wAmount}
                    onChange={(e) => setWAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Failure / Diagnostic Reason *
                  </label>
                  <textarea
                    required
                    placeholder="Explain the specific hardware failure diagnostic report..."
                    rows={3}
                    value={wReason}
                    onChange={(e) => setWReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none resize-none"
                  />
                </div>

                <div className="md:col-span-2 pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Submit OEM Warranty Claim</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Quick stats panel */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100">
                  OEM Claims Summary
                </h3>

                <div className="space-y-3">
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700">Claims Value Submitted</span>
                    <span className="font-mono font-bold text-indigo-700">
                      ₹{warrantyClaims.reduce((sum, c) => c.status === "Submitted" ? sum + c.claimAmount : sum, 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700">Claims Value Approved</span>
                    <span className="font-mono font-bold text-emerald-700">
                      ₹{warrantyClaims.reduce((sum, c) => c.status === "Approved" ? sum + c.claimAmount : sum, 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl text-[10px] text-slate-500">
                <p className="font-black text-indigo-900 uppercase mb-1">Clearance Terms:</p>
                <p>Ensure defective units are tagged and boxed in physical cages. OEMs inspect replaced components during audit inspections.</p>
              </div>
            </div>
          </div>

          {/* Warranty Claims List */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">OEM Warranty Claims Registry</h3>
                <p className="text-[10px] text-slate-400 font-medium">Log and clearance tracking of parts replaced under warranty</p>
              </div>
              <button 
                onClick={onRefresh}
                className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-5">Claim ID</th>
                    <th className="py-3 px-5">Job Card</th>
                    <th className="py-3 px-5">Component Details</th>
                    <th className="py-3 px-5 font-mono">Cost Value</th>
                    <th className="py-3 px-5">Failure Diagnostics</th>
                    <th className="py-3 px-5">Claim Date</th>
                    <th className="py-3 px-5 text-right">State Clearance / Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {warrantyClaims.map((claim) => (
                    <tr key={claim.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-5 font-mono font-bold text-slate-800">{claim.id}</td>
                      <td className="py-3 px-5">
                        <span className="font-mono text-slate-700 bg-slate-100 border px-1.5 py-0.5 rounded font-bold">
                          {claim.jobCardNo}
                        </span>
                      </td>
                      <td className="py-3 px-5">
                        <p className="font-semibold text-slate-800">{claim.partName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{claim.partCode}</p>
                      </td>
                      <td className="py-3 px-5 font-mono font-bold text-slate-700">₹{claim.claimAmount.toLocaleString()}</td>
                      <td className="py-3 px-5 text-slate-500 max-w-xs truncate" title={claim.failureReason}>
                        {claim.failureReason}
                      </td>
                      <td className="py-3 px-5 text-slate-400">{new Date(claim.submittedAt).toLocaleDateString()}</td>
                      <td className="py-3 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {claim.status === "Submitted" ? (
                            <>
                              <button
                                onClick={() => handleUpdateClaimStatus(claim.id, "Approved")}
                                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] uppercase tracking-wider rounded"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleUpdateClaimStatus(claim.id, "Rejected")}
                                className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[9px] uppercase tracking-wider rounded"
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <span className={`text-[9px] font-mono font-bold px-2.5 py-1 rounded border uppercase tracking-wider ${
                              claim.status === "Approved" 
                                ? "bg-emerald-100 text-emerald-800 border-emerald-200" 
                                : "bg-rose-100 text-rose-800 border-rose-200"
                            }`}>
                              {claim.status}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "circulars" && (
        <div className="space-y-6">
          {/* Service Circulars Reference Directory */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upload Circular Form */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Publish Service Circular</h3>
                  <p className="text-[10px] text-slate-400">Upload and catalog official OEM repair and warranty guidance documents</p>
                </div>
              </div>

              <form onSubmit={handleUploadCircular} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Circular reference number / ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SC/2026/82"
                    value={newCirId}
                    onChange={(e) => setNewCirId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-orange-500 focus:outline-none uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Circular title / Subject *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Revised Parts wise warranty for BS6 Phase-2"
                    value={newCirTitle}
                    onChange={(e) => setNewCirTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Release date
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. June 2026"
                      value={newCirDate}
                      onChange={(e) => setNewCirDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Applicable Models
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. All HCV Models"
                      value={newCirModels}
                      onChange={(e) => setNewCirModels(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Document summary & PPL segment *
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Briefly state what changes or rules this circular introduces..."
                    value={newCirSummary}
                    onChange={(e) => setNewCirSummary(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Detailed Warranty Rules & Parts Lists (Raw Content) *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Copy-paste the specific parts list, limits, miles, and terms from the PDF content..."
                    value={newCirRules}
                    onChange={(e) => setNewCirRules(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-orange-500 focus:outline-none font-mono text-[10px]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={uploadingCir}
                  className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-300 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 shadow cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>{uploadingCir ? "Indexing..." : "Upload & Index Circular"}</span>
                </button>
              </form>
            </div>

            {/* Circular List */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
              <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    Service Circulars Library <span className="text-[9px] bg-orange-100 text-orange-700 font-extrabold px-1.5 py-0.5 rounded font-mono">{circulars.length} Documents</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">Standard technical literature database used for intelligent warranty checks</p>
                </div>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search circulars by ID/title..."
                    value={cirSearchQuery}
                    onChange={(e) => setCirSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="divide-y divide-slate-100 max-h-[580px] overflow-y-auto p-4 space-y-4">
                {cirLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                    <div className="h-6 w-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <span>Loading documents database...</span>
                  </div>
                ) : circulars.filter(c => 
                  c.id.toLowerCase().includes(cirSearchQuery.toLowerCase()) || 
                  c.title.toLowerCase().includes(cirSearchQuery.toLowerCase()) || 
                  c.models.toLowerCase().includes(cirSearchQuery.toLowerCase())
                ).length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    No matching circular documents found.
                  </div>
                ) : (
                  circulars.filter(c => 
                    c.id.toLowerCase().includes(cirSearchQuery.toLowerCase()) || 
                    c.title.toLowerCase().includes(cirSearchQuery.toLowerCase()) || 
                    c.models.toLowerCase().includes(cirSearchQuery.toLowerCase())
                  ).map((cir) => (
                    <div key={cir.id} className="p-4 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl transition-all space-y-3">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-xs text-orange-600 bg-orange-50 border border-orange-100 px-2.5 py-0.5 rounded">
                            {cir.id}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">Released: {cir.date}</span>
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500 bg-white border px-2 py-0.5 rounded">
                          Models: {cir.models}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-slate-800 leading-snug">{cir.title}</h4>
                        <p className="text-[11px] text-slate-500 font-normal leading-relaxed">{cir.summary}</p>
                      </div>

                      <div className="pt-2 border-t border-slate-200">
                        <details className="group">
                          <summary className="text-[10px] font-extrabold text-indigo-600 hover:text-indigo-800 cursor-pointer list-none flex items-center gap-1.5">
                            <span>▶ VIEW FULL PARTS WARRANTY SCHEMES</span>
                          </summary>
                          <div className="mt-2 p-3 bg-white border border-slate-200 rounded-lg text-[10px] font-mono text-slate-600 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                            {cir.warrantyRules}
                          </div>
                        </details>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* PARTS OCR SCAN MODAL */}
      {showPartOcrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl w-full max-w-md max-h-[90dvh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
                  <Camera className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-white">Parts Label OCR Scan</h3>
                  <p className="text-[9px] text-slate-400 font-medium">Extract Part Code from barcode or metal label</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPartOcrModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold font-mono p-1"
              >
                ✕
              </button>
            </div>

            {/* Viewfinder / Capture Feed */}
            <div className="p-5 space-y-4">
              <p className="text-[10px] text-slate-400">
                Upload a spare part label photo or simulate OCR extraction from existing parts catalog images.
              </p>

              {/* Upload field */}
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 hover:border-orange-500/50 rounded-2xl p-6 bg-slate-950 cursor-pointer relative group transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePartOcrFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <UploadCloud className="h-8 w-8 text-slate-500 group-hover:text-orange-400 transition-colors mb-2" />
                <span className="text-xs text-slate-400 font-bold">Upload spare part label image</span>
                <span className="text-[9px] text-slate-500 font-medium mt-1">Accepts PNG, JPG</span>
              </div>

              {/* OCR Scanning state */}
              {partOcrScanning && (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-3">
                  <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-[10px] font-bold text-orange-400 animate-pulse">Running Neural OCR engine...</span>
                </div>
              )}

              {/* OCR Results */}
              {partOcrResult && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[10px] leading-relaxed flex items-start gap-2.5 font-mono whitespace-pre">
                  <Check className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
                  <span>{partOcrResult}</span>
                </div>
              )}

              {/* Catalog Simulation List */}
              <div className="space-y-2">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Simulated Parts Label Library (Pre-fills):</p>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => handlePartOcrSimulation("AXV-55210", "Axle Lift Control Valve")}
                    className="p-3 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-xl text-left hover:border-orange-500 transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">TATA_Axle_Valve_Label.jpg</span>
                      <span className="text-[9px] text-slate-500">M&HCV Cargo range</span>
                    </div>
                    <span className="text-[10px] font-black text-orange-400 uppercase">Extract</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePartOcrSimulation("ALT-88412", "Alternator Assembly 12V")}
                    className="p-3 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-xl text-left hover:border-orange-500 transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">Bosch_12V_Alternator.jpg</span>
                      <span className="text-[9px] text-slate-500">Prima / Signa series</span>
                    </div>
                    <span className="text-[10px] font-black text-orange-400 uppercase">Extract</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePartOcrSimulation("TBC-99044", "Garrett Turbocharger Assembly")}
                    className="p-3 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-xl text-left hover:border-orange-500 transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">Cummins_ISBe_Turbo.jpg</span>
                      <span className="text-[9px] text-slate-500">Cummins 6.7L engine range</span>
                    </div>
                    <span className="text-[10px] font-black text-orange-400 uppercase">Extract</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPartOcrModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
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

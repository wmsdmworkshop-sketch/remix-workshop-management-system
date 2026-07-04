import { useEscapeKey } from "../hooks/useEscapeKey";
import React, { useState, useMemo, useEffect } from "react";
import { 
  Truck, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Phone, 
  Car, 
  Plus, 
  ArrowLeftRight, 
  CheckCircle, 
  Clock, 
  FileText,
  Gauge,
  Fuel,
  LogOut,
  MapPin,
  RefreshCw,
  Camera,
  Upload,
  AlertCircle,
  Eye,
  Check,
  Sparkles,
  Cpu,
  Image as ImageIcon
} from "lucide-react";
import FunnyLoader from "./FunnyLoader";
import { JobCard, Bay } from "../types";

interface GateEntryManagerProps {
  jobCards: JobCard[];
  bays: Bay[];
  onCreateJob: (jobData: any) => void;
  onUpdateJob: (id: number, updatedFields: Partial<JobCard>) => void;
  onRefresh: () => void;
}

export default function GateEntryManager({ 
  jobCards, 
  bays, 
  onCreateJob, 
  onUpdateJob,
  onRefresh 
}: GateEntryManagerProps) {
  // State variables
  const [vrn, setVrn] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [make, setMake] = useState("TATA"); // vehicle make is TATA only
  const [model, setModel] = useState("Nexon");
  const [odometer, setOdometer] = useState("");
  const [fuelLevel, setFuelLevel] = useState("50%");
  const [fuelPercentage, setFuelPercentage] = useState(50);
  const [complaints, setComplaints] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [mobileActiveView, setMobileActiveView] = useState<"form" | "ledger">("form");

  // Camera & Location States
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  // ANPR Fallback States
  const [anprFailed, setAnprFailed] = useState(false);
  const [chassisNumber, setChassisNumber] = useState("");
  const [showChassisModal, setShowChassisModal] = useState(false);
  useEscapeKey(() => {
    stopCamera();
    setShowChassisModal(false);
  }, showChassisModal);
  const [chassisScanning, setChassisScanning] = useState(false);

  // Modals & UI States
  const [showAnprModal, setShowAnprModal] = useState(false);
  useEscapeKey(() => {
    stopCamera();
    setShowAnprModal(false);
  }, showAnprModal);
  const [anprScanning, setAnprScanning] = useState(false);
  
  const [showOdoModal, setShowOdoModal] = useState(false);
  useEscapeKey(() => {
    stopCamera();
    setShowOdoModal(false);
  }, showOdoModal);
  const [odoScanning, setOdoScanning] = useState(false);
  const [odoCapturedText, setOdoCapturedText] = useState<string | null>(null);
  
  const [showFuelModal, setShowFuelModal] = useState(false);
  useEscapeKey(() => setShowFuelModal(false), showFuelModal);
  const [fuelScanning, setFuelScanning] = useState(false);
  const [fuelCapturedText, setFuelCapturedText] = useState<string | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera permission denied:", err);
      setShowPermissionModal(true);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  };

  // Escape key listener to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowAnprModal(false);
        setShowOdoModal(false);
        setShowFuelModal(false);
        setShowChassisModal(false);
        stopCamera();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cameraStream]);

  // Handle camera stream on modal transitions
  useEffect(() => {
    if (showAnprModal || showOdoModal || showChassisModal) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [showAnprModal, showOdoModal, showChassisModal]);

  // ANPR mock database entries
  const mockAnprQueue = [
    { vrn: "MH-12-TA-0777", model: "Nexon", owner: "Rajesh Kumar", mobile: "9823456781", color: "Slate Grey" },
    { vrn: "DL-3C-TA-8888", model: "Safari", owner: "Priya Singh", mobile: "9123456780", color: "Pearl White" },
    { vrn: "KA-03-TA-5555", model: "Punch", owner: "Arjun Hegde", mobile: "9345678912", color: "Atomic Orange" },
    { vrn: "MH-14-TA-1122", model: "Harrier", owner: "Aniket Shinde", mobile: "9561234578", color: "Calypso Red" }
  ];

  // Active WIP and gate passes filters
  const activeJobs = useMemo(() => {
    return jobCards.filter(j => j.status !== "Completed" && j.status !== "Invoiced");
  }, [jobCards]);

  const gatePasses = useMemo(() => {
    return jobCards.filter(j => {
      const matchSearch = j.vrn.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          j.customer_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === "all" || j.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [jobCards, searchQuery, statusFilter]);

  // Handler to register entries
  const handleRegisterEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const activeIdentifier = anprFailed ? chassisNumber : vrn;
    if (!activeIdentifier || !customerName || !customerMobile) return;

    const newJobNo = `JC-${Date.now().toString().slice(-5)}`;
    onCreateJob({
      job_card_no: newJobNo,
      vrn: anprFailed ? `CH-${chassisNumber.trim().toUpperCase().slice(-6)}` : vrn.trim().toUpperCase(),
      chassis_number: anprFailed ? chassisNumber.trim().toUpperCase() : undefined,
      customer_name: customerName.trim(),
      customer_mobile: customerMobile.trim(),
      vehicle_make: "TATA", // vehicle make is TATA only in all menus
      vehicle_model: model || "Nexon",
      status: "Waiting",
      bay_id: null,
      created_at: new Date().toISOString(),
      remarks: `Registered at Gate Security Gate In. Fuel: ${fuelLevel}${anprFailed ? ` | Chassis Scanned: ${chassisNumber}` : ''}`,
      km_reading: odometer ? parseInt(odometer) : 0
    });

    setSuccess(`Vehicle ${anprFailed ? chassisNumber.toUpperCase() : vrn.toUpperCase()} registered successfully! Job card ${newJobNo} issued.`);
    setVrn("");
    setChassisNumber("");
    setAnprFailed(false);
    setCustomerName("");
    setCustomerMobile("");
    setMake("TATA");
    setModel("Nexon");
    setOdometer("");
    setFuelLevel("50%");
    setFuelPercentage(50);

    setMobileActiveView("ledger");
    setTimeout(() => setSuccess(null), 5000);
  };

  const handleGateOut = (jobId: number) => {
    onUpdateJob(jobId, { status: "Invoiced", remarks: "Vehicle cleared Gate-Out" });
    setSuccess(`Vehicle status updated to Invoiced. Gate-Out cleared!`);
    setTimeout(() => setSuccess(null), 4000);
  };

  // Trigger simulated ANPR scan
  const selectAnprVehicle = (vehicle: typeof mockAnprQueue[0]) => {
    setAnprScanning(true);
    setTimeout(() => {
      setVrn(vehicle.vrn);
      setCustomerName(vehicle.owner);
      setCustomerMobile(vehicle.mobile);
      setModel(vehicle.model);
      setAnprScanning(false);
      setShowAnprModal(false);
      
      // Visual feedback toast
      setSuccess(`CCTV ANPR Scanned: Recognized vehicle plate "${vehicle.vrn}" (${vehicle.model})! Auto-populated customer details.`);
      setTimeout(() => setSuccess(null), 5000);
    }, 1200);
  };

  // Simulated Odometer Scan
  const triggerOdometerScan = (value: string) => {
    setOdoScanning(true);
    setOdoCapturedText(null);
    setTimeout(() => {
      setOdometer(value);
      setOdoScanning(false);
      setOdoCapturedText(`Successfully scanned dashboard! Detected Odometer: ${Number(value).toLocaleString()} KM. You can correct it below if required.`);
    }, 1500);
  };

  // Simulated Fuel cluster image scan
  const triggerFuelGaugeScan = (pct: number, description: string) => {
    setFuelScanning(true);
    setFuelCapturedText(null);
    setTimeout(() => {
      setFuelPercentage(pct);
      setFuelLevel(`${pct}%`);
      setFuelScanning(false);
      setFuelCapturedText(`Detected exact fuel level: ${pct}% (${description}) as per dashboard cluster image analysis.`);
    }, 1500);
  };

  // Memoized Truck SVG to avoid lag/slowness on text input changes
  const memoizedTruckSvg = useMemo(() => {
    const readyOutCount = jobCards.filter(j => j.status === "Completed" || j.status === "Invoiced").length;
    const freeBaysCount = bays.filter(b => b.status === "Idle" || b.status === "Available").length;

    return (
      <svg viewBox="0 0 740 280" className="w-full h-auto text-slate-800" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Chassis and components under the truck body */}
        <path d="M 210 200 L 710 200 L 710 215 L 210 215 Z" fill="#0f172a" />
        <rect x="360" y="200" width="80" height="25" rx="4" fill="#334155" />

        {/* Axles / Wheels */}
        <g transform="translate(180, 220)">
          <circle cx="0" cy="0" r="26" fill="#0f172a" stroke="#ffffff" strokeWidth="2" />
          <circle cx="0" cy="0" r="15" fill="#475569" stroke="#94a3b8" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="5" fill="#ffffff" />
        </g>
        <g transform="translate(320, 220)">
          <circle cx="0" cy="0" r="26" fill="#0f172a" stroke="#ffffff" strokeWidth="2" />
          <circle cx="0" cy="0" r="15" fill="#475569" stroke="#94a3b8" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="5" fill="#ffffff" />
        </g>
        <g transform="translate(378, 220)">
          <circle cx="0" cy="0" r="26" fill="#0f172a" stroke="#ffffff" strokeWidth="2" />
          <circle cx="0" cy="0" r="15" fill="#475569" stroke="#94a3b8" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="5" fill="#ffffff" />
        </g>
        <g transform="translate(520, 220)">
          <circle cx="0" cy="0" r="26" fill="#0f172a" stroke="#ffffff" strokeWidth="2" />
          <circle cx="0" cy="0" r="15" fill="#475569" stroke="#94a3b8" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="5" fill="#ffffff" />
        </g>
        <g transform="translate(578, 220)">
          <circle cx="0" cy="0" r="26" fill="#0f172a" stroke="#ffffff" strokeWidth="2" />
          <circle cx="0" cy="0" r="15" fill="#475569" stroke="#94a3b8" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="5" fill="#ffffff" />
        </g>

        {/* Cabin Body */}
        <path d="M 235 195 L 235 85 C 235 80, 225 70, 210 70 L 105 70 C 95 70, 90 78, 88 85 L 80 155 C 78 170, 82 180, 82 195 L 82 205 L 145 205 C 145 185, 160 170, 180 170 C 200 170, 215 185, 215 205 L 235 205 Z" fill="#0f172a" stroke="#1e293b" strokeWidth="2" />
              
        {/* Windshield */}
        <path d="M 98 85 L 155 85 L 150 130 L 92 130 Z" fill="#e2e8f0" stroke="#334155" strokeWidth="1.5" />
        {/* Window */}
        <path d="M 165 85 L 210 85 C 215 85, 217 88, 217 92 L 217 130 L 160 130 Z" fill="#e2e8f0" stroke="#334155" strokeWidth="1.5" />
        
        {/* Door line */}
        <path d="M 158 85 L 158 200" stroke="#334155" strokeWidth="1.5" />

        {/* Grille */}
        <path d="M 88 140 L 150 140 L 148 180 L 90 180 Z" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
        <line x1="96" y1="150" x2="142" y2="150" stroke="#ef4444" strokeWidth="1.5" />
        <line x1="96" y1="160" x2="142" y2="160" stroke="#f97316" strokeWidth="1.5" />
        <line x1="96" y1="170" x2="142" y2="170" stroke="#ffffff" strokeWidth="1.5" />
        
        {/* Headlights */}
        <rect x="80" y="185" width="12" height="8" rx="2" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" />
        <rect x="145" y="185" width="12" height="8" rx="2" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" />

        {/* TRUCK BODY */}
        <rect x="245" y="20" width="480" height="175" rx="12" fill="#0f172a" stroke="#f97316" strokeWidth="2.5" />
        
        <foreignObject x="255" y="30" width="460" height="155">
          <div xmlns="http://www.w3.org/1999/xhtml" className="text-white p-2 h-full flex flex-col justify-between text-left font-sans select-none">
            <div className="flex justify-between items-center border-b border-slate-800 pb-1">
              <span className="text-[9px] font-black uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-ping"></span>
                TATA Signa 4830.T
              </span>
              <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 uppercase tracking-widest">
                Gate Registry Live
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-1.5 py-1">
              <div className="bg-slate-950/80 border border-slate-850 rounded-lg p-1.5 text-center">
                <div className="text-[7px] font-bold text-slate-500 uppercase tracking-wider">Active WIP</div>
                <div className="text-xs font-black text-orange-400 mt-0.5">{activeJobs.length} Veh</div>
              </div>
              <div className="bg-slate-950/80 border border-slate-850 rounded-lg p-1.5 text-center">
                <div className="text-[7px] font-bold text-slate-500 uppercase tracking-wider">Ready Out</div>
                <div className="text-xs font-black text-emerald-400 mt-0.5">{readyOutCount} Veh</div>
              </div>
              <div className="bg-slate-950/80 border border-slate-850 rounded-lg p-1.5 text-center">
                <div className="text-[7px] font-bold text-slate-500 uppercase tracking-wider">Free Bays</div>
                <div className="text-xs font-black text-blue-400 mt-0.5">{freeBaysCount}/{bays.length}</div>
              </div>
            </div>
            
            <div className="bg-slate-950/60 rounded-md p-1 text-[7px] border border-slate-850 text-slate-400 leading-tight">
              <strong className="text-orange-400 uppercase tracking-wider font-extrabold mr-1">Security SOP:</strong>
              TATA only • Always scan digital Odometer • Verify interactive fuel needles • Validate customer mobile.
            </div>
          </div>
        </foreignObject>
      </svg>
    );
  }, [activeJobs.length, jobCards, bays]);

  // Fuel Vector Arc dynamic needle rotation (-90 to +90 degrees)
  const needleAngle = -90 + (fuelPercentage * 1.8);

  return (
    <div className="space-y-6">
      {/* Success banner */}
      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl flex items-center gap-3 text-xs animate-in slide-in-from-top-2 duration-200">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Mobile Toggle Switch */}
      <div className="lg:hidden flex bg-slate-200/60 p-1 rounded-xl shadow-inner border border-slate-300/40">
        <button
          type="button"
          onClick={() => setMobileActiveView("form")}
          className={`flex-1 py-1.5 text-center text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
            mobileActiveView === "form"
              ? "bg-orange-500 text-white shadow-md"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Register Gate In
        </button>
        <button
          type="button"
          onClick={() => setMobileActiveView("ledger")}
          className={`flex-1 py-1.5 text-center text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
            mobileActiveView === "ledger"
              ? "bg-slate-900 text-white shadow-md"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Clearance Ledger ({gatePasses.length})
        </button>
      </div>

      {/* Grid: Stats and Action form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form panel */}
        <div className={`lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 ${
          mobileActiveView === "form" ? "block" : "hidden lg:block"
        }`}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Gate Inward Registry</h2>
                <p className="text-[10px] text-slate-400 font-medium">Record incoming vehicles and generate Job Cards instantly</p>
              </div>
            </div>

            {/* Quick CCTV Feeder Trigger */}
            <button
              type="button"
              onClick={() => setShowAnprModal(true)}
              className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm border border-slate-800 cursor-pointer"
            >
              <Camera className="h-4 w-4 text-emerald-400" />
              <span>CCTV ANPR Fetch</span>
            </button>
          </div>

          <form onSubmit={handleRegisterEntry} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* VRN or Chassis Number input section */}
              {anprFailed ? (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Chassis Number (Plate Scan) *
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <FileText className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. MAT441234A567890"
                        value={chassisNumber}
                        onChange={(e) => setChassisNumber(e.target.value.toUpperCase())}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none uppercase font-semibold text-slate-800 font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowChassisModal(true)}
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all border border-slate-700"
                      title="Scan Chassis Plate"
                    >
                      <Camera className="h-4 w-4 text-orange-400" />
                      <span>Scan Plate</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAnprFailed(false)}
                    className="text-[9px] text-orange-500 font-bold hover:underline mt-1 block"
                  >
                    ← Back to VRN / ANPR Entry
                  </button>
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Registration Number (VRN) *
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Car className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. MH-12-PQ-4567"
                        value={vrn}
                        onChange={(e) => {
                          const val = e.target.value;
                          setVrn(val);
                          const cleanVrn = val.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
                          if (cleanVrn.length >= 4) {
                            const latestVisit = [...jobCards]
                              .reverse()
                              .filter(j => j.status !== "Cancelled")
                              .find(j => j.vrn.trim().toUpperCase().replace(/[^A-Z0-9]/g, "") === cleanVrn);
                            if (latestVisit) {
                              setCustomerName(latestVisit.customer_name);
                              setCustomerMobile(latestVisit.customer_mobile);
                              if (latestVisit.vehicle_model) setModel(latestVisit.vehicle_model);
                              if (latestVisit.vehicle_make) setMake(latestVisit.vehicle_make);
                              setSuccess(`✨ Found previous visit history for ${latestVisit.vrn}! Customer details and vehicle model (${latestVisit.vehicle_model}) auto-populated.`);
                              setTimeout(() => setSuccess(null), 4000);
                            }
                          }
                        }}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none uppercase font-semibold text-slate-800"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAnprModal(true)}
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all border border-slate-700"
                      title="Fetch Plate from CCTV ANPR"
                    >
                      <Camera className="h-4 w-4 text-emerald-400" />
                      <span>ANPR</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Customer Mobile */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Customer Mobile *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none text-slate-800"
                  />
                </div>
              </div>

              {/* Customer Name */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Customer Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Robert Downey"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none text-slate-800"
                  />
                </div>
              </div>

              {/* Odometer Input with camera capture option */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Odometer Reading (KM)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Gauge className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="number"
                      placeholder="e.g. 45200"
                      value={odometer}
                      onChange={(e) => setOdometer(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none text-slate-800 font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowOdoModal(true)}
                    className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all border border-slate-700"
                    title="Capture odometer by Camera"
                  >
                    <Camera className="h-4 w-4 text-orange-400" />
                    <span>Scan</span>
                  </button>
                </div>
                <p className="text-[9px] text-slate-400 mt-1 italic">
                  Odometer can be captured via cam scan and manually corrected above if required.
                </p>
              </div>

              {/* Vector Fuel Gauge interactive section (span 2 on grid to occupy elegant space) */}
              <div className="md:col-span-2 bg-slate-950 text-white rounded-2xl p-5 border border-slate-800 shadow-lg relative overflow-hidden flex flex-col md:flex-row items-center gap-6">
                
                {/* SVG Semicircle Vector Gauge */}
                <div className="w-full md:w-1/2 flex flex-col items-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Fuel className="h-3.5 w-3.5 text-orange-500" />
                    <span>Interactive Fuel Gauge (Click to Select)</span>
                  </div>
                  
                  <svg 
                    viewBox="0 0 200 115" 
                    className="w-full max-w-[200px] cursor-crosshair select-none relative z-10"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left - (rect.width / 2);
                      const y = e.clientY - rect.top - (rect.height * 0.85); // pivot near center bottom
                      const angleRad = Math.atan2(y, x);
                      let angleDeg = angleRad * (180 / Math.PI);
                      if (angleDeg < 0) {
                        let pct = Math.round(((angleDeg + 180) / 180) * 100);
                        pct = Math.max(0, Math.min(100, pct));
                        setFuelPercentage(pct);
                        setFuelLevel(`${pct}%`);
                      }
                    }}
                  >
                    {/* Dark empty gauge arc */}
                    <path 
                      d="M 25 95 A 75 75 0 0 1 175 95" 
                      fill="none" 
                      stroke="#1e293b" 
                      strokeWidth="10" 
                      strokeLinecap="round" 
                    />
                    
                    {/* Interactive overlay colors */}
                    <path 
                      d="M 25 95 A 75 75 0 0 1 65 42" 
                      fill="none" 
                      stroke="#ef4444" 
                      strokeWidth="10" 
                      strokeLinecap="round"
                      opacity="0.15"
                    />
                    <path 
                      d="M 65 42 A 75 75 0 0 1 135 42" 
                      fill="none" 
                      stroke="#f97316" 
                      strokeWidth="10"
                      opacity="0.15"
                    />
                    <path 
                      d="M 135 42 A 75 75 0 0 1 175 95" 
                      fill="none" 
                      stroke="#10b981" 
                      strokeWidth="10" 
                      strokeLinecap="round"
                      opacity="0.15"
                    />

                    {/* Active vector progress arc line */}
                    {fuelPercentage > 0 && (
                      <path 
                        d={`M 25 95 A 75 75 0 0 1 ${25 + (fuelPercentage * 1.5)} ${95 - (Math.sin(fuelPercentage * Math.PI / 100) * 75)}`} 
                        fill="none" 
                        stroke={fuelPercentage < 20 ? "#ef4444" : fuelPercentage < 55 ? "#f97316" : "#10b981"} 
                        strokeWidth="10" 
                        strokeLinecap="round"
                        className="transition-all duration-300"
                      />
                    )}

                    {/* Central anchor */}
                    <circle cx="100" cy="95" r="8" fill="#475569" />
                    <circle cx="100" cy="95" r="4" fill="#f97316" />

                    {/* Semicircle labels */}
                    <text x="18" y="110" fill="#ef4444" fontSize="9" fontWeight="bold" textAnchor="middle">E</text>
                    <text x="100" y="30" fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle">1/2</text>
                    <text x="182" y="110" fill="#10b981" fontSize="9" fontWeight="bold" textAnchor="middle">F</text>

                    {/* Animated needle */}
                    <g transform={`rotate(${needleAngle} 100 95)`} className="transition-transform duration-500 ease-out">
                      <line x1="100" y1="95" x2="100" y2="35" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
                      <polygon points="97,55 103,55 100,32" fill="#f97316" />
                    </g>
                  </svg>
                </div>

                {/* Dashboard Vector Adjuster and Image Upload simulation */}
                <div className="w-full md:w-1/2 space-y-3 flex flex-col justify-center">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-orange-400">Exact Fuel Calibration</p>
                    <p className="text-[10px] text-slate-400">
                      Click directly on the gauge vector arc to set exact levels, or upload a dashboard photo to analyze the fuel needle automatically.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase">Selected Level</p>
                      <p className="text-lg font-black text-white">{fuelPercentage}% Tank</p>
                    </div>
                    <div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                      fuelPercentage < 15 ? "bg-rose-500/20 text-rose-400" :
                      fuelPercentage < 45 ? "bg-amber-500/20 text-amber-400" :
                      "bg-emerald-500/20 text-emerald-400"
                    }`}>
                      {fuelPercentage < 15 ? "Reserve" :
                       fuelPercentage < 35 ? "1/4 Fuel" :
                       fuelPercentage < 65 ? "1/2 Fuel" :
                       fuelPercentage < 85 ? "3/4 Fuel" : "Full Tank"}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowFuelModal(true)}
                    className="py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-700 shadow-sm"
                  >
                    <Upload className="h-3.5 w-3.5 text-orange-400" />
                    <span>Analyze Fuel Gauge Photo</span>
                  </button>
                </div>
              </div>

            </div>



            <button
              type="submit"
              className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Register Gate Inward & Issue Job Card</span>
            </button>
          </form>
        </div>

        {/* Live status indicators - Truck Vector Info Box */}
        <div className={`bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 ${
          mobileActiveView === "form" ? "block" : "hidden lg:block"
        }`}>
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100 mb-3">
              Gate Overview
            </h3>
            
            {/* SVG B&W Vector Truck */}
            <div className="w-full flex items-center justify-center">
              {memoizedTruckSvg}
            </div>
          </div>
        </div>
      </div>

      {/* Grid: List of Gate Log and Out Passes */}
      <div className={`bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm ${
        mobileActiveView === "ledger" ? "block" : "hidden lg:block"
      }`}>
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-slate-50">
          <div>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Gate Clearance Ledger</h2>
            <p className="text-[10px] text-slate-400 font-medium">Verify vehicle state and grant Gate-Out Passports</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search VRN or Customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg text-xs px-2 py-1 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="Waiting">Waiting</option>
              <option value="WIP">WIP</option>
              <option value="Completed">Completed</option>
              <option value="Invoiced">Invoiced</option>
            </select>
            <button 
              onClick={onRefresh}
              className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-5">Job Card / VRN</th>
                <th className="py-3 px-5">Customer Profile</th>
                <th className="py-3 px-5">Vehicle Specifics</th>
                <th className="py-3 px-5 font-mono">Fuel & Odo</th>
                <th className="py-3 px-5">Arrival State</th>
                <th className="py-3 px-5 text-right">Gate Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {gatePasses.map((job) => (
                <tr key={job.job_id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="font-mono font-bold text-slate-800">{job.job_card_no}</div>
                    <div className="mt-0.5 text-[10px] font-black text-indigo-600 tracking-wider uppercase bg-indigo-50 border border-indigo-100 px-1.5 py-0.2 rounded inline-block">
                      {job.vrn}
                    </div>
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="font-bold text-slate-700">{job.customer_name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{job.customer_mobile}</div>
                  </td>
                  <td className="py-3.5 px-5">
                    {/* vehicle make is always TATA or Tata Motors in all logs */}
                    <div className="font-bold text-slate-700">TATA {job.vehicle_model}</div>
                    <div className="text-[10px] text-slate-400">Type: {job.sr_type || "General Service"}</div>
                  </td>
                  <td className="py-3.5 px-5 font-mono">
                    <div className="text-slate-700 flex items-center gap-1">
                      <Gauge className="h-3 w-3 text-slate-400" />
                      <span>{job.km_reading || "0"} KM</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <Fuel className="h-3 w-3 text-slate-400" />
                      <span>{(() => {
                        if (!job.remarks) return "50% Tank";
                        const match = job.remarks.match(/Fuel:\s*([^\n\r]+)/i);
                        return match ? match[1] : "50% Tank";
                      })()}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="flex flex-col gap-1">
                      <div className="text-[10px] text-slate-400">
                        In: {job.created_at ? new Date(job.created_at).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "N/A"}
                      </div>
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider w-fit ${
                        job.status === "Invoiced" 
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200" 
                          : job.status === "Completed"
                          ? "bg-blue-100 text-blue-800 border-blue-200 animate-pulse"
                          : "bg-amber-100 text-amber-800 border-amber-200"
                      }`}>
                        {job.status}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    {job.status === "Invoiced" ? (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded">
                        Cleared Outward
                      </span>
                    ) : job.status === "Completed" ? (
                      <button
                        onClick={() => handleGateOut(job.job_id)}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <LogOut className="h-3 w-3" />
                        <span>Issue Gate-Out Pass</span>
                      </button>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-400 italic">
                        Servicing In-Progress
                      </span>
                    )}
                  </td>
                </tr>
              ))}

              {gatePasses.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 font-medium">
                    No vehicles found in Gate Registry ledger.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================= */}
      {/* 1. CCTV ANPR SCAN MODAL */}
      {/* ======================================= */}
      {showAnprModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl w-full max-w-lg max-h-[90dvh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Camera className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-white">Live Gate CCTV ANPR</h3>
                  <p className="text-[9px] text-slate-400 font-medium">Automatic Number Plate Recognition Stream</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAnprModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold font-mono p-1"
              >
                ✕
              </button>
            </div>

            {/* Simulated Live Camera Feed with Scanlines */}
            <div className="relative aspect-video bg-slate-950 flex items-center justify-center border-b border-slate-800 overflow-hidden">
              {/* Camera indicators */}
              <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
                <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping"></span>
                <span className="text-[10px] font-bold text-slate-100 uppercase tracking-wider bg-slate-900/60 px-2 py-0.5 rounded">
                  • LIVE GATE_IN_01 CAM
                </span>
              </div>
              <div className="absolute top-4 right-4 text-[10px] font-mono text-slate-400 bg-slate-900/60 px-2 py-0.5 rounded z-10">
                1080P // TATA INTELLISENSE
              </div>

              {/* HTML Video stream if permission granted, else placeholder */}
              {cameraStream ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : null}

              {/* Scanning visual sweep line */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/15 to-transparent h-1/2 w-full animate-bounce pointer-events-none"></div>

              {anprScanning ? (
                <div className="relative z-10 text-emerald-400">
                  <FunnyLoader message="Running Neural OCR Scan on Camera Feed..." />
                </div>
              ) : !cameraStream ? (
                <div className="text-center p-6 space-y-2 relative z-10">
                  <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-emerald-400 animate-pulse">
                    <Camera className="h-8 w-8" />
                  </div>
                  <p className="text-xs font-black text-slate-200">READY TO RECOGNIZE VRN</p>
                  <p className="text-[10px] text-slate-400">Select a vehicle from the queue feed list below to pull data</p>
                </div>
              ) : null}

              {/* Scope corners */}
              <div className="absolute top-6 left-6 w-4 h-4 border-t-2 border-l-2 border-emerald-500 pointer-events-none"></div>
              <div className="absolute top-6 right-6 w-4 h-4 border-t-2 border-r-2 border-emerald-500 pointer-events-none"></div>
              <div className="absolute bottom-6 left-6 w-4 h-4 border-b-2 border-l-2 border-emerald-500 pointer-events-none"></div>
              <div className="absolute bottom-6 right-6 w-4 h-4 border-b-2 border-r-2 border-emerald-500 pointer-events-none"></div>
            </div>

            {/* Feed ledger queue */}
            <div className="p-5 flex-1 space-y-3 max-h-[220px] overflow-y-auto bg-slate-900/50">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Incoming vehicle queue detected:</p>
              
              <div className="grid grid-cols-1 gap-2.5">
                {mockAnprQueue.map((item) => (
                  <div 
                    key={item.vrn}
                    onClick={() => selectAnprVehicle(item)}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-xl hover:border-emerald-500 hover:bg-slate-900/60 transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs font-bold rounded-lg group-hover:scale-105 transition-transform">
                        {item.vrn}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <span>TATA {item.model}</span>
                          <span className="text-[9px] text-slate-500 font-medium font-sans">({item.color})</span>
                        </div>
                        <div className="text-[9px] text-slate-400 font-medium">Owner: {item.owner} • Mobile: {item.mobile}</div>
                      </div>
                    </div>
                    <button className="p-1.5 bg-slate-900 border border-slate-800 text-slate-400 group-hover:text-emerald-400 group-hover:border-emerald-500 rounded-lg transition-all text-[10px] font-bold uppercase">
                      Select
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setAnprFailed(true);
                  setShowAnprModal(false);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-350 border border-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Bypass & Enter Manually
              </button>
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setShowAnprModal(false);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. ODOMETER CAM SCAN MODAL */}
      {/* ======================================= */}
      {showOdoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl w-full max-w-md max-h-[90dvh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
                  <Gauge className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-white">Dashboard Odometer Cam Scan</h3>
                  <p className="text-[9px] text-slate-400 font-medium">Extract odometer numbers with smart OCR</p>
                </div>
              </div>
              <button 
                onClick={() => setShowOdoModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold font-mono p-1"
              >
                ✕
              </button>
            </div>

            {/* Photo Selection Area */}
            <div className="p-5 space-y-4">
              <p className="text-[10px] text-slate-400">
                Choose a dashboard image from the camera roll to scan the Odometer automatically.
              </p>

              {/* Simulated Odometer Image Display */}
              <div className="aspect-video bg-slate-950 border border-slate-800 rounded-2xl relative flex flex-col items-center justify-center overflow-hidden">
                {cameraStream ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : null}

                <div className="absolute top-3 left-3 px-2 py-0.5 bg-slate-900/80 border border-slate-700/50 rounded text-[9px] text-orange-400 font-bold uppercase tracking-wider z-10">
                  Reference Cam Viewfinder
                </div>

                {/* Dashboard graphic scan overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/10 via-slate-950/80 to-slate-950 pointer-events-none"></div>
                
                {odoScanning ? (
                  <div className="relative z-10 text-orange-400">
                    <FunnyLoader message="Analyzing dashboard LCD cluster..." />
                  </div>
                ) : (
                  <div className="text-center space-y-2 relative z-10">
                    <div className="font-mono text-3xl font-black text-slate-100 tracking-wider bg-slate-900/80 border border-slate-800 px-6 py-2.5 rounded-xl inline-block shadow-inner text-orange-400">
                      51,240 <span className="text-xs text-slate-400 font-sans">KM</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">Ready to extract values from instrument cluster</p>
                  </div>
                )}

                {/* Scanning line indicator */}
                {odoScanning && (
                  <div className="absolute left-0 right-0 h-0.5 bg-orange-500 shadow-[0_0_10px_#f97316] animate-bounce"></div>
                )}
              </div>

              {odoCapturedText && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[10px] leading-relaxed flex items-start gap-2.5">
                  <Check className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{odoCapturedText}</span>
                </div>
              )}

              {/* Mock camera snapshots */}
              <div className="space-y-2">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Select Dashboard photo snapshot:</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => triggerOdometerScan("51240")}
                    className="p-3 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-xl text-left hover:border-orange-500 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2">
                      <Camera className="h-4 w-4 text-slate-400 group-hover:text-orange-400" />
                      <span className="text-xs font-bold text-slate-200">Nexon Cluster</span>
                    </div>
                    <p className="text-[9px] text-slate-500 mt-1">Simulate 51,240 KM</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerOdometerScan("124500")}
                    className="p-3 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-xl text-left hover:border-orange-500 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2">
                      <Camera className="h-4 w-4 text-slate-400 group-hover:text-orange-400" />
                      <span className="text-xs font-bold text-slate-200">Safari Cluster</span>
                    </div>
                    <p className="text-[9px] text-slate-500 mt-1">Simulate 124,500 KM</p>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowOdoModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
              {odoCapturedText && (
                <button
                  type="button"
                  onClick={() => setShowOdoModal(false)}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Verify & Confirm
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================= */}
      {/* 3. FUEL GAUGE CLUSTER SCAN MODAL */}
      {/* ======================================= */}
      {showFuelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl w-full max-w-md max-h-[90dvh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
                  <Fuel className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-white">Dashboard Fuel Gauge Scan</h3>
                  <p className="text-[9px] text-slate-400 font-medium">Extract exact needle level from original dashboard image</p>
                </div>
              </div>
              <button 
                onClick={() => setShowFuelModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold font-mono p-1"
              >
                ✕
              </button>
            </div>

            {/* Selector Area */}
            <div className="p-5 space-y-4">
              <p className="text-[10px] text-slate-400">
                Simulate uploading a dashboard gauge photo to set the animated vector needle exactly as per original image.
              </p>

              {/* Vector needle live monitor */}
              <div className="aspect-video bg-slate-950 border border-slate-800 rounded-2xl relative flex flex-col items-center justify-center p-4">
                {fuelScanning ? (
                  <div className="relative z-10 text-orange-400">
                    <FunnyLoader message="Running Neural Dial Extraction..." />
                  </div>
                ) : (
                  <div className="text-center space-y-2">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Extracted Vector Level</p>
                    <div className="text-4xl font-black text-orange-400 font-mono tracking-tighter">
                      {fuelPercentage}%
                    </div>
                    <p className="text-[9px] text-slate-400">Needle angle successfully locked onto dial</p>
                  </div>
                )}

                {/* Scan line indicator */}
                {fuelScanning && (
                  <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-amber-400 animate-bounce"></div>
                )}
              </div>

              {fuelCapturedText && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[10px] leading-relaxed flex items-start gap-2.5">
                  <Check className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{fuelCapturedText}</span>
                </div>
              )}

              {/* Grid of reference dashboard images for upload simulation */}
              <div className="space-y-2">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Select Dashboard Image reference (OG upload):</p>
                
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => triggerFuelGaugeScan(82, "About 4/5 full - Green Range")}
                    className="p-3 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-xl text-left hover:border-orange-500 transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2.5">
                      <ImageIcon className="h-4 w-4 text-slate-400 group-hover:text-emerald-400" />
                      <div>
                        <span className="text-xs font-bold text-slate-200 block">Tata_Nexon_Full_Dashboard.jpg</span>
                        <span className="text-[9px] text-slate-500">Odometer: 51k • Dial shows almost Full</span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-emerald-400">82%</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerFuelGaugeScan(48, "Almost Half - Orange Range")}
                    className="p-3 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-xl text-left hover:border-orange-500 transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2.5">
                      <ImageIcon className="h-4 w-4 text-slate-400 group-hover:text-orange-400" />
                      <div>
                        <span className="text-xs font-bold text-slate-200 block">Harrier_Mid_Range_Fuel.jpg</span>
                        <span className="text-[9px] text-slate-500">Odometer: 14k • Dial shows near Half</span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-orange-400">48%</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerFuelGaugeScan(12, "Low Fuel Warning - Red Range")}
                    className="p-3 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-xl text-left hover:border-orange-500 transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2.5">
                      <ImageIcon className="h-4 w-4 text-slate-400 group-hover:text-rose-400" />
                      <div>
                        <span className="text-xs font-bold text-slate-200 block">Safari_Low_Fuel_Indicator.jpg</span>
                        <span className="text-[9px] text-slate-500">Odometer: 124k • Low fuel amber warning light on</span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-rose-500">12%</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowFuelModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
              {fuelCapturedText && (
                <button
                  type="button"
                  onClick={() => setShowFuelModal(false)}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Confirm & Sync Needle
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. CHASSIS PLATE SCAN MODAL */}
      {showChassisModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl w-full max-w-md max-h-[90dvh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-white">Chassis Plate Cam Scan</h3>
                  <p className="text-[9px] text-slate-400 font-medium">Extract chassis number from steel plate</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  stopCamera();
                  setShowChassisModal(false);
                }}
                className="text-slate-400 hover:text-white text-xs font-bold font-mono p-1"
              >
                ✕
              </button>
            </div>

            {/* Viewfinder / Capture Feed */}
            <div className="p-5 space-y-4">
              <p className="text-[10px] text-slate-400">
                Align the metal chassis plate within the viewfinder frame to scan using browser camera OCR.
              </p>

              <div className="aspect-video bg-slate-950 border border-slate-800 rounded-2xl relative flex flex-col items-center justify-center overflow-hidden">
                {/* HTML Video stream if permission granted, else placeholder */}
                {cameraStream ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-4 space-y-2 z-10">
                    <Camera className="h-8 w-8 text-slate-500 mx-auto" />
                    <p className="text-[10px] text-slate-400">Webcam viewfinder stream inactive</p>
                  </div>
                )}
                
                {/* Overlay box for plate alignment */}
                <div className="absolute inset-0 border-[24px] border-slate-950/70 pointer-events-none z-10">
                  <div className="w-full h-full border border-dashed border-orange-500/80 rounded-md"></div>
                </div>

                {chassisScanning && (
                  <div className="absolute left-0 right-0 h-0.5 bg-orange-500 shadow-[0_0_8px_#f97316] animate-bounce z-25"></div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    setChassisScanning(true);
                    setTimeout(() => {
                      setChassisNumber("MAT441234A567890");
                      setChassisScanning(false);
                      stopCamera();
                      setShowChassisModal(false);
                    }, 1200);
                  }}
                  className="p-2.5 bg-slate-950 hover:bg-slate-855 border border-slate-800 rounded-xl text-left hover:border-orange-500 transition-all cursor-pointer"
                >
                  <span className="text-xs font-bold text-slate-200 block">Scan Sample 1</span>
                  <span className="text-[9px] text-slate-500">Nexon Steel Plate</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setChassisScanning(true);
                    setTimeout(() => {
                      setChassisNumber("MAT441882Z123456");
                      setChassisScanning(false);
                      stopCamera();
                      setShowChassisModal(false);
                    }, 1200);
                  }}
                  className="p-2.5 bg-slate-950 hover:bg-slate-855 border border-slate-800 rounded-xl text-left hover:border-orange-500 transition-all cursor-pointer"
                >
                  <span className="text-xs font-bold text-slate-200 block">Scan Sample 2</span>
                  <span className="text-[9px] text-slate-500">Safari Steel Plate</span>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setShowChassisModal(false);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-350 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setChassisScanning(true);
                  setTimeout(() => {
                    setChassisNumber("MAT441234A567890");
                    setChassisScanning(false);
                    stopCamera();
                    setShowChassisModal(false);
                  }, 1000);
                }}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Simulate Frame Capture</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CAMERA & LOCATION PERMISSION INSTRUCTIONS MODAL */}
      {showPermissionModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="p-2.5 bg-rose-500/10 text-rose-450 rounded-xl">
                <AlertCircle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-100">Camera & Location Required</h3>
                <p className="text-[10px] text-slate-400">Permissions are currently blocked or denied</p>
              </div>
            </div>
            
            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p className="font-semibold text-slate-100">Please follow these instructions to enable camera access:</p>
              <ol className="list-decimal pl-5 space-y-2 text-slate-400">
                <li>Click the <strong>lock icon</strong> (🔒) in your browser's address bar.</li>
                <li>Ensure <strong>Camera</strong> and <strong>Location</strong> permissions are set to <strong>Allow</strong>.</li>
                <li>If they are already allowed, toggle them off and back on again.</li>
                <li>OS-level restriction: check that camera permissions are granted for your browser in system preferences/settings.</li>
              </ol>
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowPermissionModal(false)}
                className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-slate-350 border border-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    setCameraStream(stream);
                    if (videoRef.current) {
                      videoRef.current.srcObject = stream;
                    }
                    setShowPermissionModal(false);
                  } catch (e) {
                    console.error("Camera connection retry failed:", e);
                  }
                }}
                className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
              >
                Retry Connection
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

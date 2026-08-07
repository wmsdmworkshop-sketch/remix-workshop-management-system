import React, { useState, useMemo } from "react";
import { 
  Camera, Play, CheckCircle2, RefreshCw, Smartphone, 
  Sparkles, FileText, AlertTriangle 
} from "lucide-react";

export interface MobilePlatformWorkspaceProps {
  jobCards: any[];
  onRefresh: () => void;
}

export const MobilePlatformWorkspace: React.FC<MobilePlatformWorkspaceProps> = React.memo(({
  jobCards = [],
  onRefresh
}) => {
  const [offlineStatus, setOfflineStatus] = useState<boolean>(false);

  return (
    <div className="space-y-6 bg-[#0B1220] text-slate-100 min-h-screen p-4 md:p-6" lang="en">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
              Mobile PWA Workspace
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white mt-1 uppercase tracking-tight">
            DWIP Mobile Platform
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* APP 1: Staff App */}
        <div className="bg-gradient-to-b from-blue-950/40 to-slate-900 border border-blue-800/50 p-5 rounded-2xl space-y-3 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-400 rounded-md border border-blue-500/30">APP 1</span>
              <span className="text-[10px] text-blue-400 font-mono font-bold">v2.4.0-RC3</span>
            </div>
            <h3 className="text-sm font-extrabold text-white mt-2 uppercase tracking-wide">DWIP Staff App</h3>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Single Role-Driven APK for Gate, Reception, Service Advisors, Technicians, Parts, Cashier & HR.
            </p>
            <div className="mt-3 p-2 bg-slate-950/60 rounded-lg border border-slate-800 text-[10px] space-y-1 font-mono text-slate-400">
              <div className="flex justify-between"><span>Release Build:</span><span className="text-slate-200 font-bold">2026.07.26-b104</span></div>
              <div className="flex justify-between"><span>Target API:</span><span className="text-slate-200">Android 14 (API 34)</span></div>
              <div className="flex justify-between"><span>Play Protect:</span><span className="text-emerald-400 font-bold">Passed (V2/V3)</span></div>
            </div>
          </div>
          <a 
            href="/downloads/dwip-staff-v2.4.0.apk"
            download="dwip-staff-v2.4.0.apk"
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow-lg flex items-center justify-center gap-2 text-center"
          >
            <Smartphone className="h-4 w-4" />
            <span>Download Staff APK v2.4.0</span>
          </a>
        </div>

        {/* APP 2: Management App */}
        <div className="bg-gradient-to-b from-purple-950/40 to-slate-900 border border-purple-800/50 p-5 rounded-2xl space-y-3 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-400 rounded-md border border-purple-500/30">APP 2</span>
              <span className="text-[10px] text-purple-400 font-mono font-bold">v2.4.0-EXEC</span>
            </div>
            <h3 className="text-sm font-extrabold text-white mt-2 uppercase tracking-wide">Management Suite</h3>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Live KPIs, Revenue Analytics, Bay Utilization, SLA Alerts & Executive Approvals for Directors & DP.
            </p>
            <div className="mt-3 p-2 bg-slate-950/60 rounded-lg border border-slate-800 text-[10px] space-y-1 font-mono text-slate-400">
              <div className="flex justify-between"><span>Release Build:</span><span className="text-slate-200 font-bold">2026.07.26-b105</span></div>
              <div className="flex justify-between"><span>Target API:</span><span className="text-slate-200">Android 14 (API 34)</span></div>
              <div className="flex justify-between"><span>Play Protect:</span><span className="text-emerald-400 font-bold">Passed (V2/V3)</span></div>
            </div>
          </div>
          <a 
            href="/downloads/dwip-executive-v2.4.0.apk"
            download="dwip-executive-v2.4.0.apk"
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow-lg flex items-center justify-center gap-2 text-center"
          >
            <Smartphone className="h-4 w-4" />
            <span>Download Executive APK</span>
          </a>
        </div>

        {/* APP 3: Customer App */}
        <div className="bg-gradient-to-b from-emerald-950/40 to-slate-900 border border-emerald-800/50 p-5 rounded-2xl space-y-3 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 rounded-md border border-emerald-500/30">APP 3</span>
              <span className="text-[10px] text-emerald-400 font-mono font-bold">v2.0.0-PROD</span>
            </div>
            <h3 className="text-sm font-extrabold text-white mt-2 uppercase tracking-wide">Customer & Fleet App</h3>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Vehicle Passport, Digital Vault, Estimate Approval, Payments, Warranty, AMC & Fleet Mode.
            </p>
            <div className="mt-3 p-2 bg-slate-950/60 rounded-lg border border-slate-800 text-[10px] space-y-1 font-mono text-slate-400">
              <div className="flex justify-between"><span>Release Build:</span><span className="text-slate-200 font-bold">2026.07.26-p201</span></div>
              <div className="flex justify-between"><span>Platform:</span><span className="text-slate-200">Web / PWA / Native</span></div>
              <div className="flex justify-between"><span>Status:</span><span className="text-emerald-400 font-bold">Live Production</span></div>
            </div>
          </div>
          <div className="space-y-2">
            <a 
              href="/downloads/dwip-customer-v2.0.0.apk" 
              download="dwip-customer-v2.0.0.apk"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow-lg flex items-center justify-center gap-2 text-center cursor-pointer"
            >
              <Smartphone className="h-4 w-4" />
              <span>Download Customer APK v2.0.0</span>
            </a>
            <a 
              href="/customer" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-emerald-500/40 text-emerald-400 font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 text-center"
            >
              <Play className="h-3.5 w-3.5" />
              <span>Launch Customer Web PWA</span>
            </a>
          </div>
        </div>

        {/* APP 4: Driver App */}
        <div className="bg-gradient-to-b from-amber-950/40 to-slate-900 border border-amber-800/50 p-5 rounded-2xl space-y-3 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 rounded-md border border-amber-500/30">APP 4</span>
              <span className="text-[10px] text-amber-400 font-mono font-bold">v1.2.0-DRV</span>
            </div>
            <h3 className="text-sm font-extrabold text-white mt-2 uppercase tracking-wide">Commercial Driver App</h3>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Daily Vehicle Inspection, Defect Reporting, Fuel & DEF Entry, Emergency SOS Breakdown.
            </p>
            <div className="mt-3 p-2 bg-slate-950/60 rounded-lg border border-slate-800 text-[10px] space-y-1 font-mono text-slate-400">
              <div className="flex justify-between"><span>Release Build:</span><span className="text-slate-200 font-bold">2026.07.26-d302</span></div>
              <div className="flex justify-between"><span>Target API:</span><span className="text-slate-200">Android 14 (API 34)</span></div>
              <div className="flex justify-between"><span>Play Protect:</span><span className="text-emerald-400 font-bold">Passed (V2/V3)</span></div>
            </div>
          </div>
          <a 
            href="/downloads/dwip-driver-v1.2.0.apk"
            download="dwip-driver-v1.2.0.apk"
            className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow-lg flex items-center justify-center gap-2 text-center"
          >
            <Smartphone className="h-4 w-4" />
            <span>Download Driver APK</span>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        {/* Offline sync configurations */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 shadow-lg">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Smartphone className="h-4 w-4 text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Offline & Sync Status</h3>
          </div>
          <div className="flex justify-between items-center">
            <span>Offline Sync Mode</span>
            <button 
              onClick={() => setOfflineStatus(!offlineStatus)}
              className={`px-3 py-1.5 rounded-lg font-bold uppercase ${
                offlineStatus ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"
              }`}
            >
              {offlineStatus ? "Offline" : "Online Connected"}
            </button>
          </div>
          <div className="p-3 bg-slate-950/40 border border-slate-850 rounded-xl">
            {offlineStatus 
              ? "Inspection data and checklists will be queued locally. Sync will run automatically on connection restore."
              : "All inputs pushing directly to MySQL cloud database."
            }
          </div>
        </div>

        {/* Scan utilities */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 shadow-lg">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Camera className="h-4 w-4 text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">QR / Barcode Scanners</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => alert("Simulating QR Code camera scanner entry.")}
              className="p-4 bg-slate-950/40 hover:bg-slate-950 border border-slate-850 hover:border-slate-800 text-center rounded-xl space-y-1.5 transition-all text-slate-300"
            >
              <Camera className="h-5 w-5 mx-auto" />
              <span className="font-bold block uppercase tracking-wider text-[10px]">Scan Gate QR</span>
            </button>
            <button 
              onClick={() => alert("Simulating Barcode scanner for parts selection.")}
              className="p-4 bg-slate-950/40 hover:bg-slate-950 border border-slate-850 hover:border-slate-800 text-center rounded-xl space-y-1.5 transition-all text-slate-300"
            >
              <Camera className="h-5 w-5 mx-auto" />
              <span className="font-bold block uppercase tracking-wider text-[10px]">Scan Parts Barcode</span>
            </button>
          </div>
        </div>
      </div>

      {/* Security & Play Protect Clearance Certification Panel */}
      <div className="bg-slate-900 border border-emerald-800/60 p-5 rounded-2xl space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-400" />
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wide">
              Android Play Protect Clearance & Biometric Security Suite
            </h3>
          </div>
          <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg">
            VERIFIED SECURE • NO WARNINGS
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1.5">
            <span className="text-[10px] font-bold uppercase text-emerald-400 block">1. APK Signature & Integrity</span>
            <p className="text-slate-300 font-medium leading-relaxed">
              Signed with <strong>APK Signature Scheme V2/V3</strong> using Devanand Motors Enterprise Key. Clears Google Play Protect scanning with zero malware flags or unverified app prompts.
            </p>
          </div>

          <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1.5">
            <span className="text-[10px] font-bold uppercase text-blue-400 block">2. Attendance Module Permissions</span>
            <p className="text-slate-300 font-medium leading-relaxed">
              Declares <code>CAMERA</code>, <code>ACCESS_FINE_LOCATION</code>, and <code>ACCESS_COARSE_LOCATION</code>. Uses live camera feed snapshots & hardware GPS coordinates with geofence validation.
            </p>
          </div>

          <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1.5">
            <span className="text-[10px] font-bold uppercase text-amber-400 block">3. Network Time & Anti-Spoofing</span>
            <p className="text-slate-300 font-medium leading-relaxed">
              Punches verify against <strong>NTP Network Clock (time.google.com)</strong> to prevent manual device clock tampering. Geofence verifies $\le 100$m distance from workshop location.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

MobilePlatformWorkspace.displayName = "MobilePlatformWorkspace";
export default MobilePlatformWorkspace;


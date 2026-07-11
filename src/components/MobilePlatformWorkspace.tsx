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
    </div>
  );
});

MobilePlatformWorkspace.displayName = "MobilePlatformWorkspace";
export default MobilePlatformWorkspace;

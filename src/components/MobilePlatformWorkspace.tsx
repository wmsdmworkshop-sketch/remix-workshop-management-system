import React from "react";
import { Smartphone, ExternalLink, ScanLine, Clock } from "lucide-react";
import { PlayQr, PLAY_URL } from "./PlayStoreQr";

export interface MobilePlatformWorkspaceProps {
  jobCards?: any[];
  onRefresh?: () => void;
}

/**
 * "Get the App" — the platform is distributed via the Google Play Store (one
 * employee app for all roles). We link to the Play listing and show a scan-to-
 * install QR instead of hosting raw APKs.
 */
export const MobilePlatformWorkspace: React.FC<MobilePlatformWorkspaceProps> = React.memo(() => {
  return (
    <div className="space-y-6 bg-[#0B1220] text-slate-100 min-h-screen p-4 md:p-6" lang="en">
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Mobile App</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mt-1 uppercase tracking-tight">Get the AiVaahan DWIP App</h1>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl">One app for every employee — install from the Google Play Store. Roles (gate, reception, advisor, technician, parts, cashier, manager, HR) are resolved automatically on login.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Employee app — Play link + QR */}
        <div className="bg-gradient-to-b from-blue-950/40 to-slate-900 border border-blue-800/50 p-6 rounded-2xl shadow-xl">
          <div className="flex items-start gap-5 flex-col sm:flex-row">
            <div className="bg-white p-2 rounded-xl shrink-0">
              <PlayQr className="w-36 h-36" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-400 rounded-md border border-blue-500/30">Employee App</span>
                <h3 className="text-lg font-extrabold text-white mt-2">AiVaahan DWIP</h3>
                <p className="text-[11px] text-slate-400 mt-1">Scan the QR with your phone, or tap below to open the Play Store.</p>
              </div>
              <a
                href={PLAY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow-lg"
              >
                <Smartphone className="h-4 w-4" /> Get it on Google Play <ExternalLink className="h-3.5 w-3.5 opacity-80" />
              </a>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono break-all">
                <ScanLine className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="select-all">{PLAY_URL}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer app — on hold */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col justify-center">
          <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-slate-700/40 text-slate-400 rounded-md border border-slate-700 w-fit">Customer App</span>
          <h3 className="text-lg font-extrabold text-slate-300 mt-2">Customer &amp; Fleet App</h3>
          <p className="text-[11px] text-slate-500 mt-1 max-w-md">Vehicle passport, estimate approvals, payments, warranty &amp; AMC for customers and fleets.</p>
          <div className="mt-3 inline-flex items-center gap-2 text-[11px] font-bold text-amber-400">
            <Clock className="h-4 w-4" /> Coming soon — a separate Play Store listing is planned.
          </div>
          <a href="/customer" target="_blank" rel="noopener noreferrer"
            className="mt-4 w-fit inline-flex items-center gap-2 px-4 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-[11px] uppercase tracking-wider rounded-xl transition">
            Preview customer web portal <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      <p className="text-[10px] text-slate-500 max-w-3xl">
        The app auto-updates from the Play Store. It loads the live platform, so day-to-day changes appear automatically once you're on the latest Play version.
      </p>
    </div>
  );
});

MobilePlatformWorkspace.displayName = "MobilePlatformWorkspace";
export default MobilePlatformWorkspace;

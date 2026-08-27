import React from "react";
import { 
  Car, ShieldCheck, Clock, FileText, Activity, AlertTriangle, 
  CheckCircle2, Sparkles, AlertCircle, Wrench, X, Tag, Loader2
} from "lucide-react";

export interface VehiclePassportModalProps {
  passportData: any;
  onClose: () => void;
  isLoading?: boolean;
}

export const VehiclePassportModal: React.FC<VehiclePassportModalProps> = ({
  passportData,
  onClose,
  isLoading = false
}) => {
  if (!passportData && !isLoading) return null;

  const renderSourceTag = (source: string) => {
    switch (source) {
      case "LIVE":
        return <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">LIVE DB</span>;
      case "CACHE":
        return <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">MASTER TSV</span>;
      default:
        return <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">UNAVAILABLE</span>;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-8 space-y-4 shadow-2xl text-slate-100 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto" />
          <p className="text-sm font-bold text-slate-300">Fetching Vehicle Passport...</p>
          <p className="text-[10px] text-slate-500">Querying service history, vehicle master, and invoices</p>
          <button onClick={onClose} className="text-[10px] text-slate-500 hover:text-slate-300 underline cursor-pointer">Cancel</button>
        </div>
      </div>
    );
  }

  const sourceTag = passportData.sourceTag || "UNAVAILABLE";

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl text-slate-100 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider">VEHICLE PASSPORT</span>
                {renderSourceTag(sourceTag)}
              </div>
              <h2 className="text-lg font-black text-white">{passportData.vrn || "VEHICLE"}</h2>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 font-bold text-sm">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Passport Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Identity Card */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 space-y-2">
            <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Identity & Registration</span>
              {renderSourceTag(sourceTag)}
            </h3>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">VRN:</span>
                <span className="font-mono font-bold text-white">{passportData.vrn || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Chassis No:</span>
                <span className="font-mono font-bold text-slate-200">{passportData.chassisNo || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Engine No:</span>
                <span className="font-mono font-bold text-slate-200">{passportData.engineNo || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Make / Model:</span>
                <span className="font-bold text-slate-200">{`${passportData.vehicleMake || ""} ${passportData.vehicleModel || ""}`.trim() || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Customer Name:</span>
                <span className="font-bold text-slate-200">{passportData.customerName || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Customer Mobile:</span>
                <span className="font-mono font-bold text-slate-200">{passportData.customerMobile || "—"}</span>
              </div>
            </div>
          </div>

          {/* Odometer & Service History */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 space-y-2">
            <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Odometer & Service Log</span>
              {renderSourceTag(sourceTag)}
            </h3>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Last Service Odometer:</span>
                <span className="font-mono font-bold text-slate-300">{passportData.lastOdometer != null ? `${Number(passportData.lastOdometer).toLocaleString()} km` : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Gate Odometer:</span>
                <span className="font-mono font-bold text-white">{passportData.currentOdometer != null ? `${Number(passportData.currentOdometer).toLocaleString()} km` : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Previous Visits:</span>
                <span className="font-bold text-blue-400">{passportData.previousVisitCount != null ? `${passportData.previousVisitCount} recorded visits` : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Lifetime Spend:</span>
                <span className="font-mono font-bold text-indigo-400">{passportData.lifetimeSpend != null ? `₹${Number(passportData.lifetimeSpend).toLocaleString()}` : "—"}</span>
              </div>
            </div>
          </div>

          {/* Warranty & FSV Context */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 space-y-2">
            <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Warranty & Free Service (FSV)</span>
              {renderSourceTag(sourceTag)}
            </h3>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Warranty Status:</span>
                <span className={`font-bold ${passportData.warrantyStatus === "ACTIVE" ? "text-emerald-400" : passportData.warrantyStatus === "EXPIRED" ? "text-red-400" : "text-slate-400"}`}>
                  {passportData.warrantyStatus || "—"}
                </span>
              </div>
              {passportData.warrantyExpiryDate && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Warranty Expiry:</span>
                  <span className="font-mono font-bold text-slate-300">{passportData.warrantyExpiryDate}</span>
                </div>
              )}
              {passportData.warrantyExpiryKm > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Warranty KM Limit:</span>
                  <span className="font-mono font-bold text-slate-300">{Number(passportData.warrantyExpiryKm).toLocaleString()} km</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">FSV Eligibility:</span>
                <span className="font-bold text-blue-400">{passportData.fsvEligibility || "—"}</span>
              </div>
            </div>
          </div>

          {/* OEM Dates & Sale Info */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 space-y-2">
            <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>OEM Sale & Registration</span>
              {renderSourceTag(passportData.originalSaleDate ? sourceTag : "UNAVAILABLE")}
            </h3>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Original Sale Date:</span>
                <span className="font-mono font-bold text-slate-300">{passportData.originalSaleDate || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">TM Invoice Date:</span>
                <span className="font-mono font-bold text-slate-300">{passportData.tmInvoiceDate || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date of Registration:</span>
                <span className="font-mono font-bold text-slate-300">{passportData.dateOfRegistration || "—"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-800 pt-3">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer"
          >
            Close Passport
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useMemo } from "react";
import { AlertCircle, Clock, Check, X, ShieldAlert } from "lucide-react";

export interface CarryForwardItem {
  id: string;
  vehicle: string;
  advisor: string;
  technician: string;
  reason: string;
  expectedCompletion: string;
  priority: "Express" | "Normal";
}

export interface CarryForwardPanelProps {
  items?: CarryForwardItem[];
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  isLoading?: boolean;
  hasError?: boolean;
}

export const CarryForwardPanel: React.FC<CarryForwardPanelProps> = React.memo(({
  items = [],
  onApprove,
  onReject,
  isLoading = false,
  hasError = false,
}) => {
  const defaultItems = useMemo<CarryForwardItem[]>(() => [
    { id: "cf-1", vehicle: "Tata Safari (MH12TM9090)", advisor: "Arnaud Kumar", technician: "Sanjay Patel", reason: "Engine block alignment calibration issue - requires specialized diagnostic machine tool setup tomorrow morning.", expectedCompletion: "Tomorrow 11:30 AM", priority: "Express" },
    { id: "cf-2", vehicle: "Tata Harrier (KA03MM1234)", advisor: "Vihan Sharma", technician: "Alex Carter", reason: "Waiting for specialized suspension component shipment from OEM hub.", expectedCompletion: "July 12, 14:00 PM", priority: "Normal" }
  ], []);

  const activeItems = items.length > 0 ? items : defaultItems;

  if (hasError) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
        Failed to load carry forward logs.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="h-4 w-40 bg-slate-800 rounded animate-pulse" />
        <div className="h-16 w-full bg-slate-800 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Carry Forward & Rework Authorization</h3>
        </div>
        <span className="text-[10px] bg-amber-500/20 text-amber-400 font-bold px-2 py-0.5 rounded">
          {activeItems.length} Pending
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
        {activeItems.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 italic">
            No pending carry forward authorizations.
          </div>
        ) : (
          activeItems.map((item) => (
            <div key={item.id} className="border border-slate-800 rounded-xl p-3 bg-slate-950/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-200">{item.vehicle}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider ${
                    item.priority === "Express" ? "bg-red-500/20 text-red-400" : "bg-slate-800 text-slate-400"
                  }`}>
                    {item.priority}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {onApprove && (
                    <button
                      onClick={() => onApprove(item.id)}
                      className="ds-button-success p-1 bg-emerald-500/10 hover: /20 border border-emerald-500/20 rounded text-emerald-400 transition-colors"
                      aria-label="Approve carry forward request"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                  )}
                  {onReject && (
                    <button
                      onClick={() => onReject(item.id)}
                      className="p-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded text-red-400 transition-colors"
                      aria-label="Reject carry forward request"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-400 font-medium leading-relaxed">{item.reason}</p>

              <div className="flex items-center justify-between text-[9px] text-slate-500 font-semibold uppercase border-t border-slate-800/40 pt-2">
                <span>Advisor: {item.advisor} • Tech: {item.technician}</span>
                <span className="flex items-center gap-1 text-amber-500 font-mono">
                  <Clock className="h-3 w-3" /> {item.expectedCompletion}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

CarryForwardPanel.displayName = "CarryForwardPanel";

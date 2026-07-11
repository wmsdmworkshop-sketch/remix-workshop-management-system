import React, { useMemo } from "react";
import { AlertCircle, Clock, ShieldAlert, ArrowUpRight } from "lucide-react";

export interface EscalationItem {
  id: string;
  level: "L1" | "L2" | "L3" | "L4";
  vehicle: string;
  complaint: string;
  ageMinutes: number;
  owner: string;
  priority: "High" | "Critical";
}

export interface EscalationPanelProps {
  escalations?: EscalationItem[];
  onResolve?: (id: string) => void;
  isLoading?: boolean;
  hasError?: boolean;
}

export const EscalationPanel: React.FC<EscalationPanelProps> = React.memo(({
  escalations = [],
  onResolve,
  isLoading = false,
  hasError = false,
}) => {
  const defaultEscalations = useMemo<EscalationItem[]>(() => [
    { id: "esc-1", level: "L3", vehicle: "Tata Nexon EV (MH12TM9090)", complaint: "Diagnostic phase breached SLA by 45 minutes - no diagnostic report filed.", ageMinutes: 45, owner: "Workshop Manager", priority: "Critical" },
    { id: "esc-2", level: "L1", vehicle: "Tata Altroz (KA03MM5678)", complaint: "Parts request delayed for filter replacement.", ageMinutes: 20, owner: "Spares Supervisor", priority: "High" }
  ], []);

  const activeEscalations = escalations.length > 0 ? escalations : defaultEscalations;

  if (hasError) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
        Failed to load escalation feed.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="h-4 w-32 bg-slate-800 rounded animate-pulse" />
        <div className="h-12 w-full bg-slate-800 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-red-500 animate-pulse" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Active SLA Escalations</h3>
        </div>
        <span className="text-[10px] bg-red-500/20 text-red-400 font-bold px-2 py-0.5 rounded">
          {activeEscalations.length} Active
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
        {activeEscalations.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 italic">
            No active SLA breaches.
          </div>
        ) : (
          activeEscalations.map((esc) => {
            let badgeColor = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
            if (esc.level === "L3" || esc.level === "L4") {
              badgeColor = "bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse";
            }

            return (
              <div key={esc.id} className="border border-slate-800 rounded-xl p-3 bg-slate-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${badgeColor}`}>
                      {esc.level}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-200">{esc.vehicle}</span>
                  </div>
                  {onResolve && (
                    <button
                      onClick={() => onResolve(esc.id)}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold uppercase tracking-wider flex items-center gap-0.5"
                    >
                      Acknowledge <ArrowUpRight className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-400 font-medium leading-relaxed">{esc.complaint}</p>

                <div className="flex items-center justify-between text-[9px] text-slate-500 font-semibold uppercase border-t border-slate-800/40 pt-2">
                  <span>Owner: {esc.owner}</span>
                  <span className="flex items-center gap-1 text-red-400 font-mono">
                    <Clock className="h-3 w-3" /> {esc.ageMinutes}m elapsed
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});

EscalationPanel.displayName = "EscalationPanel";

import React, { useMemo } from "react";
import { Wrench, ShieldAlert, AlertTriangle, Play, Sparkles } from "lucide-react";

export interface MockBayItem {
  id: string;
  name: string;
  type: string;
  vehicle: string | null;
  technician: string | null;
  status: "Empty Bay" | "Working" | "QC" | "Waiting Parts" | "Breakdown" | "Emergency" | "Carry Forward";
  elapsedMinutes: number;
  etd: string | null;
  priority: "Express" | "Normal";
}

export interface BayLayoutBoardProps {
  bays?: MockBayItem[];
  onSelectBay?: (id: string) => void;
  isLoading?: boolean;
  hasError?: boolean;
}

export const BayLayoutBoard: React.FC<BayLayoutBoardProps> = React.memo(({
  bays = [],
  onSelectBay,
  isLoading = false,
  hasError = false,
}) => {
  const activeBays = useMemo<MockBayItem[]>(() => {
    if (bays.length > 0) return bays;
    return [
      { id: "bay-1", name: "Bay 1 (Heavy Lift)", type: "Mechanical", vehicle: "Tata Safari (KA03MM1234)", technician: "Alex Carter", status: "Working", elapsedMinutes: 45, etd: "19:15", priority: "Normal" },
      { id: "bay-2", name: "Bay 2 (General Lift)", type: "Mechanical", vehicle: "Tata Altroz (KA03MM5678)", technician: "Ramesh Kumar", status: "Waiting Parts", elapsedMinutes: 120, etd: "20:00", priority: "Normal" },
      { id: "bay-3", name: "Bay 3 (EV Isolation)", type: "EV Specialized", vehicle: "Tata Nexon EV (MH12TM9090)", technician: "Sanjay Patel", status: "Working", elapsedMinutes: 55, etd: "18:30", priority: "Express" },
      { id: "bay-4", name: "Bay 4 (General Lift)", type: "Mechanical", vehicle: null, technician: null, status: "Empty Bay", elapsedMinutes: 0, etd: null, priority: "Normal" },
      { id: "bay-5", name: "Bay 5 (QC Inspect)", type: "Quality", vehicle: "Tata Punch EV (MH14AB5678)", technician: "QC Inspector", status: "QC", elapsedMinutes: 20, etd: "18:15", priority: "Express" },
      { id: "bay-6", name: "Bay 6 (Accident Repair)", type: "Accident", vehicle: "Tata Harrier (MH12XY4321)", technician: "Vikram Singh", status: "Carry Forward", elapsedMinutes: 180, etd: "July 11", priority: "Normal" }
    ];
  }, [bays]);

  if (hasError) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
        Failed to load Bay Operations Layout.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-pulse">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-44 bg-slate-900 border border-slate-800 rounded-[18px]" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white uppercase">Workshop Bays Cockpit</h2>
          <p className="text-xs text-slate-400">Digital Twin bay layout visualization.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {activeBays.map((bay) => {
          let cardStyle = "border-slate-800 bg-slate-900/60";
          let badgeStyle = "bg-slate-800 text-slate-300";
          let labelSla = "text-slate-400";

          // Compute colors based on status and SLA
          if (bay.status === "Working") {
            cardStyle = "border-emerald-800/50 bg-emerald-950/10 shadow-lg shadow-emerald-500/2";
            badgeStyle = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
          } else if (bay.status === "QC") {
            cardStyle = "border-indigo-800/50 bg-indigo-950/10 shadow-lg shadow-indigo-500/2";
            badgeStyle = "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20";
          } else if (bay.status === "Waiting Parts") {
            cardStyle = "border-amber-800/50 bg-amber-950/10";
            badgeStyle = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
          } else if (bay.status === "Carry Forward" || bay.status === "Breakdown") {
            cardStyle = "border-orange-800/50 bg-orange-950/10";
            badgeStyle = "bg-orange-500/10 text-orange-400 border border-orange-500/20";
          } else if (bay.status === "Emergency") {
            cardStyle = "border-red-800/50 bg-red-950/10 animate-pulse";
            badgeStyle = "bg-red-500/10 text-red-400 border border-red-500/20";
          }

          return (
            <div 
              key={bay.id} 
              onClick={() => onSelectBay && onSelectBay(bay.id)}
              className={`rounded-[18px] border p-5 flex flex-col justify-between h-48 transition-all hover:scale-[1.01] cursor-pointer ${cardStyle}`}
              role="button"
              aria-label={`Inspect Bay ${bay.name}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{bay.type}</span>
                  <h4 className="text-base font-extrabold text-white mt-0.5">{bay.name}</h4>
                </div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${badgeStyle}`}>
                  {bay.status}
                </span>
              </div>

              {bay.vehicle ? (
                <div className="bg-slate-950/60 border border-slate-850 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-slate-200">{bay.vehicle}</span>
                    <span className="text-[10px] text-slate-500 font-mono">ETD: {bay.etd}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold uppercase">
                    <span>Tech: {bay.technician}</span>
                    <span className="text-emerald-400 font-mono">{bay.elapsedMinutes}m elapsed</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic py-4 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-slate-700 animate-ping" />
                  Idle & Available
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

BayLayoutBoard.displayName = "BayLayoutBoard";

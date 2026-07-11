import React, { useMemo } from "react";
import { Users, ShieldCheck, Zap } from "lucide-react";

export interface MockTechnicianItem {
  id: string;
  name: string;
  skill: string;
  currentJob: string | null;
  status: "Idle" | "Working" | "Road Test" | "Waiting Parts" | "Training" | "Leave";
  productivityScore: number;
  jobsCompletedToday: number;
  efficiency: string;
}

export interface TechnicianHeatMapProps {
  technicians?: MockTechnicianItem[];
  isLoading?: boolean;
  hasError?: boolean;
}

export const TechnicianHeatMap: React.FC<TechnicianHeatMapProps> = React.memo(({
  technicians = [],
  isLoading = false,
  hasError = false,
}) => {
  const activeTechs = useMemo<MockTechnicianItem[]>(() => {
    if (technicians.length > 0) return technicians;
    return [
      { id: "tech-1", name: "Sanjay Patel", skill: "EV Specialist (Gold)", currentJob: "MH12TM9090", status: "Working", productivityScore: 94, jobsCompletedToday: 4, efficiency: "98%" },
      { id: "tech-2", name: "Alex Carter", skill: "Heavy Engine (Silver)", currentJob: "KA03MM1234", status: "Working", productivityScore: 88, jobsCompletedToday: 3, efficiency: "92%" },
      { id: "tech-3", name: "Ramesh Kumar", skill: "AC & Electrical (Bronze)", currentJob: null, status: "Idle", productivityScore: 82, jobsCompletedToday: 2, efficiency: "85%" },
      { id: "tech-4", name: "Vikram Singh", skill: "Diagnostic Lead (Gold)", currentJob: "MH14AB5678", status: "Road Test", productivityScore: 91, jobsCompletedToday: 3, efficiency: "94%" },
      { id: "tech-5", name: "Ankit Sharma", skill: "General Service (Bronze)", currentJob: null, status: "Leave", productivityScore: 0, jobsCompletedToday: 0, efficiency: "0%" }
    ];
  }, [technicians]);

  if (hasError) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
        Failed to load technician roster.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 animate-pulse">
        <div className="h-4 w-40 bg-slate-800 rounded" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 w-full bg-slate-850 rounded" />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col h-full">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-800 mb-4 shrink-0">
        <Users className="h-4 w-4 text-emerald-400" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Technician Roster Status</h3>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
        {activeTechs.map((tech) => {
          let statusColor = "bg-slate-800 text-slate-400 border border-slate-800";
          if (tech.status === "Working") {
            statusColor = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
          } else if (tech.status === "Road Test") {
            statusColor = "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20";
          } else if (tech.status === "Idle") {
            statusColor = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
          } else if (tech.status === "Leave") {
            statusColor = "bg-red-500/10 text-red-400 border border-red-500/20";
          }

          return (
            <div key={tech.id} className="bg-slate-950/20 border border-slate-800 rounded-xl p-3 flex items-center justify-between hover:border-slate-700/60 transition-all">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-extrabold text-slate-200">{tech.name}</h4>
                  <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider ${statusColor}`}>
                    {tech.status}
                  </span>
                </div>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{tech.skill}</p>
              </div>

              <div className="text-right space-y-0.5">
                <div className="flex items-center justify-end gap-1 text-slate-300 font-mono text-xs font-bold">
                  <Zap className="h-3 w-3 text-emerald-400" />
                  <span>{tech.productivityScore}%</span>
                </div>
                <p className="text-[9px] text-slate-500 font-semibold uppercase">
                  {tech.jobsCompletedToday} Jobs • {tech.currentJob ? `Active: ${tech.currentJob}` : "No Job"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

TechnicianHeatMap.displayName = "TechnicianHeatMap";

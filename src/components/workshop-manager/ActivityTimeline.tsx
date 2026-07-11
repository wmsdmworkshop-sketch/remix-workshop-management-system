import React, { useMemo } from "react";
import { Clock, CheckCircle2, AlertCircle, Wrench, User, FileText, ChevronRight } from "lucide-react";

export interface MockTimelineItem {
  id: string;
  time: string;
  vehicle: string;
  action: string;
  advisor: string;
  stage: string;
  iconType: "arrival" | "advisor" | "repair" | "qc" | "invoice";
}

export interface ActivityTimelineProps {
  items?: MockTimelineItem[];
  isLoading?: boolean;
  hasError?: boolean;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = React.memo(({
  items = [],
  isLoading = false,
  hasError = false,
}) => {
  const defaultItems = useMemo<MockTimelineItem[]>(() => [
    { id: "1", time: "17:40", vehicle: "Tata Nexon EV (MH12TM9090)", action: "Vehicle registered Gate-In", advisor: "Security Incharge", stage: "GATE_IN", iconType: "arrival" },
    { id: "2", time: "17:15", vehicle: "Tata Safari (KA03MM1234)", action: "Advisor matched & assigned", advisor: "Arnaud Kumar", stage: "INTAKE_PENDING", iconType: "advisor" },
    { id: "3", time: "16:45", vehicle: "Tata Punch EV (MH14AB5678)", action: "Primary Diagnostic inspection started", advisor: "Sanjay Patel", stage: "DIAGNOSTIC_WIP", iconType: "repair" },
    { id: "4", time: "16:00", vehicle: "Tata Tiago (KA04XY9876)", action: "Quality control check initiated", advisor: "QC Inspector", stage: "QC_PENDING", iconType: "qc" },
    { id: "5", time: "15:30", vehicle: "Tata Tigor EV (MH12XY4321)", action: "Invoice cleared and gate-out approved", advisor: "Cashier", stage: "GATE_OUT", iconType: "invoice" }
  ], []);

  const activeItems = items.length > 0 ? items : defaultItems;

  if (hasError) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
        Failed to load activity timeline.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="h-6 w-6 rounded-full bg-slate-800" />
            <div className="flex-1 space-y-1">
              <div className="h-3 w-24 bg-slate-800 rounded" />
              <div className="h-2 w-full bg-slate-800 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col h-full">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-800 mb-4 shrink-0">
        <Clock className="h-4 w-4 text-emerald-400" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Recent Activity Timeline</h3>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
        {activeItems.map((item) => {
          let icon = <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />;
          let bgIcon = "bg-slate-850";

          switch (item.iconType) {
            case "arrival":
              icon = <Clock className="h-3.5 w-3.5 text-emerald-400" />;
              bgIcon = "bg-emerald-500/10";
              break;
            case "advisor":
              icon = <User className="h-3.5 w-3.5 text-cyan-400" />;
              bgIcon = "bg-cyan-500/10";
              break;
            case "repair":
              icon = <Wrench className="h-3.5 w-3.5 text-amber-400" />;
              bgIcon = "bg-amber-500/10";
              break;
            case "qc":
              icon = <AlertCircle className="h-3.5 w-3.5 text-indigo-400" />;
              bgIcon = "bg-indigo-500/10";
              break;
            case "invoice":
              icon = <FileText className="h-3.5 w-3.5 text-emerald-400" />;
              bgIcon = "bg-emerald-500/10";
              break;
          }

          return (
            <div key={item.id} className="relative flex gap-3 pb-1">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${bgIcon}`}>
                {icon}
              </div>
              <div className="flex-1 border-b border-slate-800/40 pb-2">
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-slate-200 font-mono">{item.vehicle}</span>
                  <span className="text-slate-500 font-mono">{item.time}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">{item.action}</p>
                <div className="flex items-center gap-1.5 mt-1 text-[9px] text-slate-500 font-semibold uppercase">
                  <span>{item.advisor}</span>
                  <ChevronRight className="h-2.5 w-2.5" />
                  <span className="bg-slate-850 text-slate-300 px-1 py-0.2 rounded">{item.stage}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

ActivityTimeline.displayName = "ActivityTimeline";

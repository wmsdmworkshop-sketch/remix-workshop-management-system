import React, { useMemo } from "react";
import { ListOrdered, AlertCircle, Clock, ChevronRight } from "lucide-react";

export interface QueueColumn {
  id: string;
  name: string;
  count: number;
  avgWaitMinutes: number;
  criticalCount: number;
}

export interface LiveQueueBoardProps {
  columns?: QueueColumn[];
  isLoading?: boolean;
  hasError?: boolean;
}

export const LiveQueueBoard: React.FC<LiveQueueBoardProps> = React.memo(({
  columns = [],
  isLoading = false,
  hasError = false,
}) => {
  const activeCols = useMemo<QueueColumn[]>(() => {
    if (columns.length > 0) return columns;
    return [
      { id: "gate", name: "Gate Entry", count: 3, avgWaitMinutes: 5, criticalCount: 0 },
      { id: "reception", name: "Reception", count: 5, avgWaitMinutes: 12, criticalCount: 1 },
      { id: "advisor", name: "Advisor", count: 8, avgWaitMinutes: 20, criticalCount: 2 },
      { id: "workshop", name: "Workshop", count: 14, avgWaitMinutes: 45, criticalCount: 3 },
      { id: "qc", name: "Quality Check", count: 2, avgWaitMinutes: 15, criticalCount: 0 },
      { id: "parts", name: "Parts Pending", count: 6, avgWaitMinutes: 30, criticalCount: 1 },
      { id: "billing", name: "Billing / Cashier", count: 4, avgWaitMinutes: 10, criticalCount: 0 }
    ];
  }, [columns]);

  if (hasError) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
        Failed to load Live Operational Queue.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 w-40 bg-slate-800 rounded" />
        <div className="flex gap-4 overflow-x-auto py-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 w-44 bg-slate-900 border border-slate-800 rounded-[18px] shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white uppercase">Live Operational Queue</h2>
        <p className="text-xs text-slate-400">Track vehicle transit workflow phases.</p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
        {activeCols.map((col) => {
          let hasCritical = col.criticalCount > 0;
          let borderStyle = "border-slate-800 bg-slate-900/60";
          if (hasCritical) {
            borderStyle = "border-amber-900/40 bg-slate-900/80 shadow-md shadow-amber-500/2";
          }

          return (
            <div key={col.id} className={`w-48 rounded-[18px] border p-4 shrink-0 flex flex-col justify-between h-40 ${borderStyle}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xs font-extrabold text-slate-200">{col.name}</h4>
                  <p className="text-[9px] text-slate-500 font-semibold uppercase mt-0.5">Average wait time</p>
                </div>
                <ListOrdered className="h-4 w-4 text-slate-500" />
              </div>

              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl font-black text-white">{col.count}</span>
                <span className="text-[10px] text-slate-400 font-mono font-bold">{col.avgWaitMinutes} mins</span>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-850 flex items-center justify-between text-[9px] uppercase font-bold">
                <span className="text-slate-500 font-semibold">Critical Priority</span>
                <span className={`px-2 py-0.5 rounded ${hasCritical ? "bg-red-500/20 text-red-400 animate-pulse" : "bg-slate-800 text-slate-500"}`}>
                  {col.criticalCount} vehicles
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

LiveQueueBoard.displayName = "LiveQueueBoard";

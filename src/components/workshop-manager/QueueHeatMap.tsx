import React, { useMemo } from "react";
import { Activity, TrendingUp } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";

export interface QueueHeatMapItem {
  name: string;
  load: number;
  capacity: number;
  avgWaitMinutes: number;
}

export interface QueueHeatMapProps {
  data?: QueueHeatMapItem[];
  isLoading?: boolean;
  hasError?: boolean;
}

export const QueueHeatMap: React.FC<QueueHeatMapProps> = React.memo(({
  data = [],
  isLoading = false,
  hasError = false,
}) => {
  const chartData = useMemo<QueueHeatMapItem[]>(() => {
    if (data.length > 0) return data;
    return [
      { name: "Gate", load: 3, capacity: 10, avgWaitMinutes: 5 },
      { name: "Reception", load: 5, capacity: 8, avgWaitMinutes: 12 },
      { name: "Advisor", load: 8, capacity: 12, avgWaitMinutes: 20 },
      { name: "Workshop", load: 14, capacity: 12, avgWaitMinutes: 45 },
      { name: "QC", load: 2, capacity: 6, avgWaitMinutes: 15 },
      { name: "Parts", load: 6, capacity: 10, avgWaitMinutes: 30 },
      { name: "Billing", load: 4, capacity: 8, avgWaitMinutes: 10 }
    ];
  }, [data]);

  if (hasError) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
        Failed to load Queue Heatmap.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 h-64 animate-pulse">
        <div className="h-4 w-32 bg-slate-800 rounded mb-4" />
        <div className="h-full bg-slate-850 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col h-full">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-800 mb-4 shrink-0">
        <Activity className="h-4 w-4 text-emerald-400" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Stage Load & Bottlenecks</h3>
      </div>

      <div className="flex-1 w-full min-h-[160px] max-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <XAxis 
              dataKey="name" 
              stroke="#64748B" 
              fontSize={8} 
              tickLine={false} 
              axisLine={false}
            />
            <YAxis 
              stroke="#64748B" 
              fontSize={8} 
              tickLine={false} 
              axisLine={false}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "#0F172A", border: "1px solid #334155", borderRadius: "8px" }}
              labelStyle={{ color: "#F8FAFC", fontSize: "10px", fontWeight: "bold" }}
              itemStyle={{ color: "#38BDF8", fontSize: "10px" }}
            />
            <Bar dataKey="load" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => {
                const ratio = entry.load / entry.capacity;
                let color = "#10B981"; // Emerald
                if (ratio >= 1.0) {
                  color = "#EF4444"; // Red (Overloaded)
                } else if (ratio >= 0.7) {
                  color = "#F59E0B"; // Amber (Warning)
                }
                return <Cell key={`cell-${index}`} fill={color} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800 shrink-0 text-center text-[10px] font-bold text-slate-400">
        <div>
          <span className="ds-button-success inline-block w-2 h-2 rounded   mr-1" />
          <span>Optimal</span>
        </div>
        <div>
          <span className="inline-block w-2 h-2 rounded bg-amber-500 mr-1" />
          <span>Warning</span>
        </div>
        <div>
          <span className="inline-block w-2 h-2 rounded bg-red-500 mr-1" />
          <span>Congested</span>
        </div>
      </div>
    </div>
  );
});

QueueHeatMap.displayName = "QueueHeatMap";

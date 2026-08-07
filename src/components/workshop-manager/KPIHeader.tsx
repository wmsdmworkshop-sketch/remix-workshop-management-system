import React, { useMemo } from "react";
import { Car, CheckCircle2, AlertTriangle, TrendingUp, Sparkles, Clock } from "lucide-react";

export interface KPIMetrics {
  received: number;
  delivered: number;
  openJcs: number;
  utilization: number;
  productivity: number;
  ftr: number;
  csi: number;
  avgTatMinutes: number;
  slaBreaches: number;
}

export interface KPIHeaderProps {
  metrics?: KPIMetrics;
  isLoading?: boolean;
  hasError?: boolean;
}

export const KPIHeader: React.FC<KPIHeaderProps> = React.memo(({
  metrics,
  isLoading = false,
  hasError = false,
}) => {
  const activeMetrics = useMemo<KPIMetrics>(() => {
    if (metrics) return metrics;
    return {
      received: 0,
      delivered: 0,
      openJcs: 0,
      utilization: 0,
      productivity: 0,
      ftr: 100,
      csi: 5.0,
      avgTatMinutes: 0,
      slaBreaches: 0
    };
  }, [metrics]);

  if (hasError) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
        Failed to load KPI Ribbon.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 animate-pulse">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-20 bg-slate-900 border border-slate-800 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {/* Received */}
      <div className="ds-card   border   rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 text-[9px] uppercase font-bold tracking-wider">
          <span>Vehicles Received</span>
          <Car className="h-3.5 w-3.5 text-emerald-400" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-xl font-extrabold text-slate-100">{activeMetrics.received}</span>
          <span className="text-[10px] text-emerald-400 font-bold">Today</span>
        </div>
      </div>

      {/* Delivered */}
      <div className="ds-card   border   rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 text-[9px] uppercase font-bold tracking-wider">
          <span>Vehicles Delivered</span>
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-xl font-extrabold text-slate-100">{activeMetrics.delivered}</span>
          <span className="text-[10px] text-emerald-400 font-bold">Completed</span>
        </div>
      </div>

      {/* Active Workload */}
      <div className="ds-card   border   rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 text-[9px] uppercase font-bold tracking-wider">
          <span>Active Workload</span>
          <TrendingUp className="h-3.5 w-3.5 text-indigo-400" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-xl font-extrabold text-slate-100">{activeMetrics.openJcs}</span>
          <span className="text-[10px] text-indigo-400 font-bold">Open JCs</span>
        </div>
      </div>

      {/* Bay Utilization */}
      <div className="ds-card   border   rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 text-[9px] uppercase font-bold tracking-wider">
          <span>Bay Utilization</span>
          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-xl font-extrabold text-slate-100">{activeMetrics.utilization}%</span>
          <span className="text-[10px] text-cyan-400 font-bold">Average</span>
        </div>
      </div>

      {/* FTR Rate */}
      <div className="ds-card   border   rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 text-[9px] uppercase font-bold tracking-wider">
          <span>First Time Right</span>
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-xl font-extrabold text-slate-100">{activeMetrics.ftr}%</span>
          <span className="text-[10px] text-emerald-400 font-bold">Goal 95%</span>
        </div>
      </div>

      {/* SLA Breaches */}
      <div className="bg-red-500/5 border border-red-500/25 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 text-[9px] uppercase font-bold tracking-wider">
          <span>Active Breaches</span>
          <AlertTriangle className="h-3.5 w-3.5 text-red-500 animate-pulse" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-xl font-extrabold text-red-500">{activeMetrics.slaBreaches}</span>
          <span className="text-[10px] text-red-400 font-bold">Warning</span>
        </div>
      </div>
    </div>
  );
});

KPIHeader.displayName = "KPIHeader";

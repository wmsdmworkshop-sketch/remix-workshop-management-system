import React, { useMemo } from "react";
import { AlertCircle, ShieldAlert, Clock, RefreshCw } from "lucide-react";

export interface SLAMetrics {
  warnings: number;
  breaches: number;
  emergencyCount: number;
  waitingParts: number;
  waitingCustomer: number;
  waitingQc: number;
  waitingBilling: number;
}

export interface SLACommandCenterProps {
  metrics?: SLAMetrics;
  onRefresh?: () => void;
  isLoading?: boolean;
  hasError?: boolean;
}

export const SLACommandCenter: React.FC<SLACommandCenterProps> = React.memo(({
  metrics,
  onRefresh,
  isLoading = false,
  hasError = false,
}) => {
  const activeMetrics = useMemo<SLAMetrics>(() => {
    if (metrics) return metrics;
    return {
      warnings: 4,
      breaches: 2,
      emergencyCount: 1,
      waitingParts: 5,
      waitingCustomer: 3,
      waitingQc: 2,
      waitingBilling: 1
    };
  }, [metrics]);

  if (hasError) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
        Failed to load SLA parameters.
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
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-emerald-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">SLA Monitor & Alert Hub</h3>
        </div>
        {onRefresh && (
          <button 
            onClick={onRefresh}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Refresh SLA metrics"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex-1 grid grid-cols-2 gap-3">
        {/* SLA Breaches - Critical Red */}
        <div className="bg-red-500/5 border border-red-500/25 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider">Active Breaches</span>
          <span className="text-2xl font-black text-red-500 mt-1 animate-pulse">{activeMetrics.breaches}</span>
          <span className="text-[9px] text-slate-500 mt-1 uppercase font-semibold">Action Required</span>
        </div>

        {/* SLA Warnings - Amber Warning */}
        <div className="bg-amber-500/5 border border-amber-500/25 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">Breach Warnings</span>
          <span className="text-2xl font-black text-amber-500 mt-1">{activeMetrics.warnings}</span>
          <span className="text-[9px] text-slate-500 mt-1 uppercase font-semibold">T-minus 15 mins</span>
        </div>

        {/* Emergency Vehicle Queue */}
        <div className="bg-orange-500/5 border border-orange-500/25 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[9px] font-bold text-orange-400 uppercase tracking-wider">Breakdowns / SOS</span>
          <span className="text-2xl font-black text-orange-500 mt-1">{activeMetrics.emergencyCount}</span>
          <span className="text-[9px] text-slate-500 mt-1 uppercase font-semibold">Immediate Priority</span>
        </div>

        {/* Parts Waiting Blockers */}
        <div className="bg-indigo-500/5 border border-indigo-500/25 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider">Parts Pending</span>
          <span className="text-2xl font-black text-indigo-500 mt-1">{activeMetrics.waitingParts}</span>
          <span className="text-[9px] text-slate-500 mt-1 uppercase font-semibold">Procurement Delay</span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800 shrink-0 grid grid-cols-3 gap-2 text-center text-[9px] text-slate-400 uppercase font-bold">
        <div>
          <p className="text-slate-500">Wait QC</p>
          <span className="text-slate-200 text-xs font-black">{activeMetrics.waitingQc}</span>
        </div>
        <div>
          <p className="text-slate-500">Wait Cust</p>
          <span className="text-slate-200 text-xs font-black">{activeMetrics.waitingCustomer}</span>
        </div>
        <div>
          <p className="text-slate-500">Wait Bill</p>
          <span className="text-slate-200 text-xs font-black">{activeMetrics.waitingBilling}</span>
        </div>
      </div>
    </div>
  );
});

SLACommandCenter.displayName = "SLACommandCenter";

import React from "react";

/**
 * =============================================================================
 * DWIP Enterprise Platform — JobCardHeader Component (WP-03 UI Refactoring)
 * Bounded Context: Workshop UI / Job Card Details
 * =============================================================================
 */

export interface JobCardHeaderProps {
  jobCardNo: string;
  vrn: string;
  status: "Active" | "Waiting" | "Completed" | "Invoiced" | string;
  priority?: "Normal" | "Express" | "Emergency" | string;
  etd?: string | null;
  onRefresh?: () => void;
}

export const JobCardHeader: React.FC<JobCardHeaderProps> = ({
  jobCardNo,
  vrn,
  status,
  priority = "Normal",
  etd,
  onRefresh
}) => {
  const getStatusColor = (st: string) => {
    switch (st.toLowerCase()) {
      case "active":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "completed":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "waiting":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "invoiced":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  const getPriorityBadge = (pr: string) => {
    if (pr.toLowerCase() === "express" || pr.toLowerCase() === "emergency") {
      return (
        <span className="px-2 py-0.5 text-xs font-semibold rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
          ⚡ {pr.toUpperCase()}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-700/50 text-slate-300 border border-slate-600/40">
        {pr}
      </span>
    );
  };

  return (
    <header 
      className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-md shadow-lg flex flex-wrap items-center justify-between gap-4"
      aria-label="Job Card Header"
    >
      <div className="flex items-center gap-3">
        <div className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg font-mono font-bold text-amber-400 text-lg tracking-wider">
          {vrn}
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <span>{jobCardNo}</span>
            {getPriorityBadge(priority)}
          </h2>
          <p className="text-xs text-slate-400">Devanand Motors Commercial Workshop</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {etd && (
          <div className="text-right text-xs">
            <span className="text-slate-400 block">Target ETD</span>
            <span className="font-mono text-slate-200 font-medium">
              {new Date(etd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}

        <span 
          className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(status)}`}
          role="status"
        >
          ● {status}
        </span>

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
            aria-label="Refresh Job Card"
            title="Refresh"
          >
            🔄
          </button>
        )}
      </div>
    </header>
  );
};

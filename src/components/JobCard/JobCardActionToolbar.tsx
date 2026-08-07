import React from "react";

/**
 * =============================================================================
 * DWIP Enterprise Platform — JobCardActionToolbar Component (WP-03 UI Refactoring)
 * Bounded Context: Workshop UI / Action Controls
 * =============================================================================
 */

export interface JobCardActionToolbarProps {
  status: string;
  onStatusChange?: (newStatus: string) => void;
  onGenerateInvoice?: () => void;
  onPrint?: () => void;
  isLoading?: boolean;
}

export const JobCardActionToolbar: React.FC<JobCardActionToolbarProps> = ({
  status,
  onStatusChange,
  onGenerateInvoice,
  onPrint,
  isLoading = false
}) => {
  return (
    <div 
      className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3"
      aria-label="Job Card Action Controls"
    >
      <div className="flex items-center gap-2">
        {status.toLowerCase() === "waiting" && onStatusChange && (
          <button
            onClick={() => onStatusChange("Active")}
            disabled={isLoading}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md disabled:opacity-50"
          >
            ▶ Start Work (Active)
          </button>
        )}

        {status.toLowerCase() === "active" && onStatusChange && (
          <button
            onClick={() => onStatusChange("Completed")}
            disabled={isLoading}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md disabled:opacity-50"
          >
            ✓ Mark Completed
          </button>
        )}

        {status.toLowerCase() === "completed" && onGenerateInvoice && (
          <button
            onClick={onGenerateInvoice}
            disabled={isLoading}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-md disabled:opacity-50"
          >
            💳 Generate Invoice
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {onPrint && (
          <button
            onClick={onPrint}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            🖨️ Print JC
          </button>
        )}
      </div>
    </div>
  );
};

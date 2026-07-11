import React from "react";

export interface ReceptionDashboardProps {
  isLoading?: boolean;
  isEmpty?: boolean;
  error?: string | null;
}

export default function ReceptionDashboard({
  isLoading = false,
  isEmpty = false,
  error = null,
}: ReceptionDashboardProps) {
  // TODO: Integrate global stats telemetry values (Live Revenue, Today's JCs)
  
  if (isLoading) {
    return (
      <div className="p-6 bg-slate-900 text-slate-400 animate-pulse" aria-live="polite">
        Loading Reception telemetry dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-slate-900 text-red-500" role="alert">
        Error loading telemetry: {error}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="p-6 bg-slate-900 text-slate-500">
        No active metrics recorded today.
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-4" aria-label="Reception Overview Dashboard">
      <h2 className="text-xl font-bold">Reception Live Dashboard</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-800 rounded-xl">
          <p className="text-xs text-slate-400">TODAY'S VEHICLE ARRIVALS</p>
          <p className="text-2xl font-black mt-1">12</p>
        </div>
        <div className="p-4 bg-slate-800 rounded-xl">
          <p className="text-xs text-slate-400">ACTIVE WAITING TIME</p>
          <p className="text-2xl font-black mt-1">8 Mins</p>
        </div>
        <div className="p-4 bg-slate-800 rounded-xl">
          <p className="text-xs text-slate-400">RECEPTION QUEUE COUNT</p>
          <p className="text-2xl font-black mt-1">4</p>
        </div>
      </div>
    </div>
  );
}

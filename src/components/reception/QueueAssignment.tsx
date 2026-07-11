import React from "react";

export interface AdvisorRecord {
  id: string;
  name: string;
  load: number;
}

export interface QueueAssignmentProps {
  advisors?: AdvisorRecord[];
  isLoading?: boolean;
  error?: string | null;
  onAllocate?: (advisorId: string) => void;
}

export default function QueueAssignment({
  advisors = [],
  isLoading = false,
  error = null,
  onAllocate,
}: QueueAssignmentProps) {
  // TODO: Implement load-balanced advisor allocation algorithm
  
  if (isLoading) {
    return (
      <div className="p-4 bg-slate-900 text-slate-400 animate-pulse">
        Checking active advisor workload balances...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-slate-900 text-red-500" role="alert">
        Allocation error: {error}
      </div>
    );
  }

  if (advisors.length === 0) {
    return (
      <div className="p-4 bg-slate-900 text-slate-500 border border-dashed border-slate-800 rounded-xl text-center">
        No active service advisors checked in.
      </div>
    );
  }

  return (
    <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 space-y-3" aria-label="Advisor Allocation Control Deck">
      <h3 className="text-md font-bold">Allocate Service Advisor</h3>
      <ul className="space-y-2">
        {advisors.map((advisor) => (
          <li key={advisor.id} className="p-3 bg-slate-800 rounded-lg flex justify-between items-center">
            <div>
              <p className="font-bold">{advisor.name}</p>
              <p className="text-xs text-slate-400">Current Workload: {advisor.load} JCs</p>
            </div>
            <button
              type="button"
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg"
            >
              Allocate
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

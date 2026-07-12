import React from "react";

export interface QueueItem {
  id: string;
  customerName: string;
  vrn: string;
  waitMinutes: number;
}

export interface ReceptionQueueProps {
  items?: QueueItem[];
  isLoading?: boolean;
  error?: string | null;
}

export default function ReceptionQueue({
  items = [],
  isLoading = false,
  error = null,
}: ReceptionQueueProps) {
  // TODO: Implement active FIFO list rendering linked to the QueueEngine
  
  if (isLoading) {
    return (
      <div className="p-4 bg-slate-900 text-slate-400 animate-pulse">
        Fetching active queue items...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-slate-900 text-red-500" role="alert">
        Queue sync failure: {error}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-4 bg-slate-900 text-slate-500 border border-dashed border-slate-800 rounded-xl text-center">
        No customers waiting in reception lounge.
      </div>
    );
  }

  return (
    <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 space-y-3" aria-label="Reception Active Waiting Queue">
      <h3 className="text-lg font-bold">Active Waiting Queue ({items.length})</h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="p-3 bg-slate-800 rounded-lg flex justify-between items-center">
            <div>
              <p className="font-bold">{item.customerName}</p>
              <p className="text-xs text-slate-400">{item.vrn}</p>
            </div>
            <span className="ds-button-primary text-xs px-2.5 py-1 rounded  /10 text-orange-400 border border-orange-500/20">
              {item.waitMinutes}m wait
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

import React from "react";

export interface AccessoriesChecklistProps {
  isLoading?: boolean;
  error?: string | null;
}

export default function AccessoriesChecklist({
  isLoading = false,
  error = null,
}: AccessoriesChecklistProps) {
  // TODO: Add visual checklist representing internal accessories (toolkits, spare tyres)
  
  if (error) {
    return (
      <div className="p-4 bg-slate-900 text-red-500" role="alert">
        Accessories check failure: {error}
      </div>
    );
  }

  return (
    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3" aria-label="Vehicle Accessories Checklist">
      <h3 className="text-md font-bold text-white">Vehicle Accessories</h3>
      <ul className="space-y-2 text-slate-350 text-sm">
        <li className="flex items-center gap-2">
          <input type="checkbox" id="toolkitCheck" className="rounded border-slate-700 bg-slate-800" />
          <label htmlFor="toolkitCheck">Tool Kit / Jack Present</label>
        </li>
        <li className="flex items-center gap-2">
          <input type="checkbox" id="spareTyreCheck" className="rounded border-slate-700 bg-slate-800" />
          <label htmlFor="spareTyreCheck">Spare Tyre / Stepney Present</label>
        </li>
        <li className="flex items-center gap-2">
          <input type="checkbox" id="docCheck" className="rounded border-slate-700 bg-slate-800" />
          <label htmlFor="docCheck">RC Book / Insurance Copy Checked</label>
        </li>
      </ul>
    </div>
  );
}

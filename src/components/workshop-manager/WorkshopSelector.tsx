import React, { useMemo } from "react";
import { MapPin, ChevronDown } from "lucide-react";

export interface WorkshopSelectorProps {
  selectedWorkshop: string;
  onWorkshopChange: (workshop: string) => void;
  isLoading?: boolean;
  hasError?: boolean;
}

export const WorkshopSelector: React.FC<WorkshopSelectorProps> = React.memo(({
  selectedWorkshop,
  onWorkshopChange,
  isLoading = false,
  hasError = false,
}) => {
  const workshops = useMemo(() => [
    { id: "Kalaburagi", name: "Kalaburagi Hub" },
    { id: "Gulbarga", name: "Gulbarga Branch" },
    { id: "Basavakalyan", name: "Basavakalyan EV Center" },
    { id: "Shahapur", name: "Shahapur Support" },
    { id: "Enterprise", name: "All Locations (Enterprise)" }
  ], []);

  if (hasError) {
    return (
      <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">
        <span>Failed to load workshops</span>
      </div>
    );
  }

  return (
    <div className="relative inline-block w-full sm:w-64">
      <label htmlFor="workshop-select" className="sr-only">Select Active Workshop</label>
      <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200">
        <MapPin className="h-4 w-4 text-emerald-400 mr-2 shrink-0" />
        {isLoading ? (
          <span className="text-xs text-slate-400 animate-pulse">Loading workshops...</span>
        ) : (
          <select
            id="workshop-select"
            value={selectedWorkshop}
            onChange={(e) => onWorkshopChange(e.target.value)}
            className="w-full bg-transparent text-xs font-bold text-slate-200 outline-none cursor-pointer appearance-none pr-8"
            aria-label="Select active workshop location"
          >
            {workshops.map((w) => (
              <option key={w.id} value={w.id} className="bg-slate-900 text-slate-200">
                {w.name}
              </option>
            ))}
          </select>
        )}
        <ChevronDown className="absolute right-3 h-4 w-4 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
});

WorkshopSelector.displayName = "WorkshopSelector";

import React from "react";

/**
 * =============================================================================
 * DWIP Enterprise Platform — JobCardTimeline Component (WP-03 UI Refactoring)
 * Bounded Context: Workshop UI / Historical Audit Events
 * =============================================================================
 */

export interface TimelineEvent {
  id: string | number;
  label: string;
  timestamp: string;
  actor?: string;
}

export interface JobCardTimelineProps {
  events?: TimelineEvent[];
  createdAt?: string;
  startedAt?: string | null;
  completedAt?: string | null;
}

export const JobCardTimeline: React.FC<JobCardTimelineProps> = ({
  events = [],
  createdAt,
  startedAt,
  completedAt
}) => {
  const defaultEvents: TimelineEvent[] = [
    { id: "created", label: "Job Card Created", timestamp: createdAt || new Date().toISOString(), actor: "Reception" },
    ...(startedAt ? [{ id: "started", label: "Work Commenced", timestamp: startedAt, actor: "Service Advisor" }] : []),
    ...(completedAt ? [{ id: "completed", label: "Work Completed", timestamp: completedAt, actor: "Technician" }] : [])
  ];

  const displayEvents = events.length > 0 ? events : defaultEvents;

  return (
    <section 
      className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm"
      aria-label="Job Card Event History"
    >
      <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-3">
        📜 Milestone Event Audit Trail
      </h3>

      <div className="space-y-3 relative before:absolute before:inset-0 before:left-2 before:w-0.5 before:bg-slate-800">
        {displayEvents.map((evt) => (
          <div key={evt.id} className="flex items-start gap-3 relative pl-6">
            <span className="absolute left-0 top-1 w-4 h-4 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-[10px] text-amber-300">
              ●
            </span>
            <div className="text-xs">
              <span className="font-medium text-slate-200">{evt.label}</span>
              {evt.actor && <span className="text-slate-400 font-normal"> by {evt.actor}</span>}
              <time className="block text-[10px] font-mono text-slate-500 mt-0.5">
                {new Date(evt.timestamp).toLocaleString()}
              </time>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

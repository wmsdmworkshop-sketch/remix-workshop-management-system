import React from "react";
import { CheckCircle2, Clock, Wrench, ShieldCheck, DollarSign, FileText, Truck, AlertTriangle, UserCheck } from "lucide-react";

export interface TimelineEvent {
  id: string;
  stage: string;
  title: string;
  description: string;
  timestamp: string;
  actor?: string;
  status: "completed" | "current" | "pending";
  icon?: string;
}

interface EventServiceTimelineProps {
  events?: TimelineEvent[];
  currentStage?: string;
}

export const EventServiceTimeline: React.FC<EventServiceTimelineProps> = ({
  events,
  currentStage = "WIP_START"
}) => {
  // Only show events when the parent passes them from real job card data.
  // Previously this array contained 9 fabricated events with invented actor
  // names ("Sunil Kumar", "Khaja Moinuddin"), fake amounts ("₹14,850"),
  // fake odometer/fuel readings, and hardcoded timestamps — all presented
  // as a real chronological audit trail to the customer.
  const defaultEvents: TimelineEvent[] = [];

  const timelineList = events && events.length > 0 ? events : defaultEvents;

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            Event-Driven Service Lifecycle Timeline
          </h3>
          <p className="text-[10px] text-slate-500 font-medium">Real-time chronological activity log of your vehicle's workshop journey</p>
        </div>

        <span className="px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-extrabold uppercase">
          Live Tracking Active
        </span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2.5 before:bottom-2.5 before:w-0.5 before:bg-slate-200">
        {timelineList.length === 0 && (
          <p className="text-xs text-slate-500 italic py-2">
            No service events have been recorded for this vehicle yet.
          </p>
        )}
        {timelineList.map((evt, idx) => {
          const isCompleted = evt.status === "completed";
          const isCurrent = evt.status === "current";

          return (
            <div key={evt.id || idx} className="relative group">
              {/* Timeline Marker Circle */}
              <div 
                className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                  isCompleted 
                    ? "bg-emerald-600 text-white shadow-md ring-4 ring-emerald-100" 
                    : isCurrent 
                    ? "bg-indigo-600 text-white shadow-lg ring-4 ring-indigo-100 animate-pulse" 
                    : "bg-slate-200 text-slate-500 border border-slate-300"
                }`}
              >
                {isCompleted ? "✓" : idx + 1}
              </div>

              {/* Event Card Content */}
              <div 
                className={`p-3.5 rounded-xl border transition-all ${
                  isCurrent 
                    ? "bg-indigo-50/70 border-indigo-200 shadow-sm" 
                    : isCompleted 
                    ? "bg-slate-50/80 border-slate-200" 
                    : "bg-white border-slate-150 opacity-60"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                  <h4 className={`text-xs font-bold ${isCurrent ? "text-indigo-950" : "text-slate-900"}`}>
                    {evt.title}
                  </h4>
                  <span className="text-[10px] font-mono font-semibold text-slate-500">
                    {evt.timestamp}
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed font-normal">
                  {evt.description}
                </p>

                {evt.actor && (
                  <div className="mt-2 pt-2 border-t border-slate-200/50 flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
                    <UserCheck className="w-3 h-3 text-slate-400" />
                    <span>Actor: <strong className="text-slate-700">{evt.actor}</strong></span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

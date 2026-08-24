import React from "react";
import { Truck } from "lucide-react";
import { getJobProgress, PROGRESS_TONE_CLASSES } from "../lib/jobProgress";

interface GateProgressBarProps {
  job: {
    status?: string | null;
    current_workflow_state?: string | null;
    workshop_stage?: string | null;
    gate_out_time?: string | null;
  };
  /** `compact` fits inside a list row; `full` adds the stage label + endpoints. */
  variant?: "compact" | "full";
  className?: string;
}

/**
 * Live gate-in → gate-out progress for one vehicle: a truck that advances along
 * the bar as the job moves through the real workflow states, colour-coded by
 * whether the job is moving, held, or in trouble. Percentages come from
 * `getJobProgress` (see `src/lib/jobProgress.ts`) which is driven by the actual
 * workflow-registry state machine.
 */
export default function GateProgressBar({ job, variant = "compact", className = "" }: GateProgressBarProps) {
  const progress = getJobProgress(job);
  const tone = PROGRESS_TONE_CLASSES[progress.tone];

  return (
    <div className={`w-full ${className}`}>
      {variant === "full" && (
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-[10px] font-black uppercase tracking-wider ${tone.text}`}>
            {progress.label}
          </span>
          <span className={`text-[10px] font-mono font-bold ${tone.text}`}>{progress.percent}%</span>
        </div>
      )}

      <div className="relative h-2 w-full rounded-full bg-slate-800/80 overflow-visible">
        {/* Filled portion */}
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out ${tone.bar} ${tone.glow}`}
          style={{ width: `${progress.percent}%` }}
        >
          {/* Moving stripes only while work is genuinely progressing. */}
          {progress.animated && (
            <div
              className="absolute inset-0 rounded-full opacity-40 animate-pulse"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, rgba(255,255,255,0.35) 0 6px, transparent 6px 12px)",
              }}
            />
          )}
        </div>

        {/* The truck itself, riding the leading edge of the fill. */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-700 ease-out"
          style={{ left: `${progress.percent}%` }}
          title={`${progress.label} — ${progress.percent}%`}
        >
          <div
            className={`flex h-5 w-5 items-center justify-center rounded-full border border-slate-900 bg-slate-950 ${tone.text} ${
              progress.animated ? "animate-bounce" : ""
            }`}
          >
            <Truck className="h-3 w-3" />
          </div>
        </div>
      </div>

      {variant === "full" && (
        <div className="mt-1.5 flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-slate-500">
          <span>Gate-In</span>
          <span>Gate-Out</span>
        </div>
      )}
    </div>
  );
}

/**
 * Gate-In → Gate-Out progress model.
 *
 * Every vehicle that comes through the gate stays the Manager's liability until
 * it leaves, so the whole journey needs to read at a glance. The stage order and
 * names below are taken from the REAL retail state machine in
 * `src/core/workflow-registry.ts` (`states` + `transitions`) — not invented — so
 * a card's position on this bar always corresponds to a state the workflow
 * engine can actually be in.
 *
 * `job_cards` carries two overlapping fields: the coarse `status`
 * ('Waiting' | 'Active' | 'Completed' | 'Invoiced' | 'Carry Forward' | 'Rework'
 * | 'Cancelled') and the finer `current_workflow_state` (the full state list).
 * `current_workflow_state` wins when present because it is more specific;
 * `status` is the fallback for older rows that never got one.
 */

export interface JobProgress {
  /** 0-100. The share of the gate-in → gate-out journey completed. */
  percent: number;
  /** Human label for the current stage. */
  label: string;
  /** Semantic state driving colour/animation. */
  tone: "pending" | "active" | "held" | "problem" | "done" | "cancelled";
  /** True while work is genuinely moving (drives the animated stripes). */
  animated: boolean;
}

/**
 * Ordered happy path through the retail workflow. Percentages are spaced to
 * reflect roughly how much of a vehicle's on-site time each phase represents —
 * intake and estimate are quick, the actual work is the long middle, and the
 * closing steps are fast again.
 */
const STAGE_PROGRESS: Record<string, { percent: number; label: string; tone: JobProgress["tone"] }> = {
  // --- Intake ---
  Waiting: { percent: 3, label: "Awaiting Gate-In", tone: "pending" },
  GATE_IN: { percent: 8, label: "Gate-In Complete", tone: "pending" },
  INTAKE_PENDING: { percent: 16, label: "Reception Intake", tone: "pending" },
  WAITING_ADVISOR: { percent: 22, label: "Awaiting Advisor", tone: "pending" },

  // --- Estimate ---
  ESTIMATE_PENDING: { percent: 28, label: "Estimate Pending", tone: "pending" },
  ESTIMATE_APPROVED: { percent: 36, label: "Estimate Approved", tone: "active" },
  ESTIMATE_REJECTED: { percent: 28, label: "Estimate Rejected", tone: "problem" },

  // --- Work in progress ---
  WIP_START: { percent: 45, label: "Work Started", tone: "active" },
  "In Progress": { percent: 58, label: "Work In Progress", tone: "active" },
  Active: { percent: 58, label: "Work In Progress", tone: "active" },
  "Carry Forward": { percent: 58, label: "Carried Forward", tone: "held" },
  Rework: { percent: 52, label: "Rework", tone: "problem" },

  // --- Quality ---
  Completed: { percent: 72, label: "Work Completed", tone: "active" },
  "QC Passed": { percent: 84, label: "QC Passed", tone: "active" },
  "QC Failed": { percent: 66, label: "QC Failed", tone: "problem" },

  // --- Closing ---
  FINAL_REVIEW: { percent: 88, label: "Final Review", tone: "active" },
  SA_PRE_INVOICE_REVIEW: { percent: 90, label: "Pre-Invoice Review", tone: "active" },
  BILLING_PENDING: { percent: 92, label: "Billing Pending", tone: "active" },
  BILLING_IN_PROGRESS: { percent: 93, label: "Billing In Progress", tone: "active" },
  BILLING_COMPLETED: { percent: 95, label: "Billing Complete", tone: "active" },
  "Awaiting Gate Out": { percent: 96, label: "Awaiting Gate-Out", tone: "active" },
  Invoiced: { percent: 98, label: "Invoiced", tone: "done" },
  Closed: { percent: 100, label: "Gate-Out Complete", tone: "done" },

  // --- Terminal ---
  Cancelled: { percent: 0, label: "Cancelled", tone: "cancelled" },
};

/**
 * Resolves a job card to its position on the gate-in → gate-out journey.
 * Never throws on an unrecognised state — an unknown state falls back to the
 * coarse `status`, and only then to a neutral "In Workshop" reading, so a new
 * workflow state added elsewhere degrades gracefully instead of blanking the bar.
 */
export function getJobProgress(job: {
  status?: string | null;
  current_workflow_state?: string | null;
  workshop_stage?: string | null;
  gate_out_time?: string | null;
}): JobProgress {
  // A recorded gate-out is the ground truth that the vehicle has left, whatever
  // the workflow state says.
  if (job?.gate_out_time) {
    return { percent: 100, label: "Gate-Out Complete", tone: "done", animated: false };
  }

  const toProgress = (s: { percent: number; label: string; tone: JobProgress["tone"] }): JobProgress => ({
    percent: s.percent,
    label: s.label,
    tone: s.tone,
    // Only a genuinely moving job pulses; held/failed/finished ones sit still
    // so a stalled vehicle is visually distinct from one being worked on.
    animated: s.tone === "active",
  });
  const resolve = (v?: string | null) => (v && STAGE_PROGRESS[v]) || null;

  // Non-linear states carry real meaning even when they sit "behind" on the bar
  // (Rework, QC Failed, Estimate Rejected, Carry Forward, Cancelled). They are
  // respected in preference order — specific fields first, then the coarse status.
  const NON_LINEAR: ReadonlySet<JobProgress["tone"]> = new Set(["problem", "held", "cancelled"]);
  for (const candidate of [job?.current_workflow_state, job?.workshop_stage, job?.status]) {
    const stage = resolve(candidate);
    if (stage && NON_LINEAR.has(stage.tone)) return toProgress(stage);
  }

  // Otherwise the bar reflects the FURTHEST-ALONG linear signal across all
  // fields, so a stale early value (e.g. a lingering live_status="Waiting"
  // mapped into workshop_stage) can never drag an in-progress, SA-assigned card
  // back to "Awaiting Gate-In".
  const linear = [job?.current_workflow_state, job?.workshop_stage, job?.status]
    .map(resolve)
    .filter((s): s is NonNullable<typeof s> => !!s && !NON_LINEAR.has(s.tone));
  if (linear.length) {
    return toProgress(linear.reduce((best, s) => (s.percent > best.percent ? s : best)));
  }

  return { percent: 30, label: "In Workshop", tone: "pending", animated: false };
}

/** Tailwind classes for each tone — kept as complete literal strings so the
 *  Tailwind JIT compiler can see them (it cannot resolve interpolated names). */
export const PROGRESS_TONE_CLASSES: Record<JobProgress["tone"], { bar: string; text: string; glow: string }> = {
  pending: { bar: "bg-slate-400", text: "text-slate-400", glow: "" },
  active: { bar: "bg-emerald-500", text: "text-emerald-400", glow: "shadow-[0_0_10px_rgba(16,185,129,0.5)]" },
  held: { bar: "bg-amber-500", text: "text-amber-400", glow: "shadow-[0_0_10px_rgba(245,158,11,0.5)]" },
  problem: { bar: "bg-red-500", text: "text-red-400", glow: "shadow-[0_0_10px_rgba(239,68,68,0.5)]" },
  done: { bar: "bg-blue-500", text: "text-blue-400", glow: "shadow-[0_0_10px_rgba(59,130,246,0.5)]" },
  cancelled: { bar: "bg-slate-600", text: "text-slate-500", glow: "" },
};

/**
 * =============================================================================
 * "MY RESPONSIBILITY" — Job-card relevance rules
 * See docs/Operations/AIVAAHAN_MY_RESPONSIBILITY_RULES.md
 * -----------------------------------------------------------------------------
 * Relevance = OWNERSHIP (persistent: creator / advisor / technician) ∪ STAGE
 * (transient: the JC is currently in a workflow stage this role handles).
 *
 * Supervision tiers:
 *   GROUP 1 (full control)   — VIEW all + EDIT all
 *   GROUP 2 (supervisor)     — VIEW all, EDIT only own/relevant
 *   GROUP 3 (observer, dkam) — VIEW all, EDIT nothing
 *   Everyone else (scoped)   — VIEW + EDIT only own/relevant
 * =============================================================================
 */

export interface RelevanceUser {
  role?: string;
  user_id?: number;
  employee_id?: number | null;
  full_name?: string | null;
}

export const GROUP1_FULL_CONTROL = ["admin", "developer", "workshop_manager"];
export const GROUP2_VIEW_ALL_EDIT_OWN = ["floor_supervisor", "service_manager", "floor_incharge"];

// GM (service) is NOT a blanket superuser. GM sees everything and MAY override any
// job-card edit, but every override outside GM's own ownership/stage is AUDITED
// (see gm_override_log). Enforcement lives in canEditJobCard (returns true) paired
// with isGmOverride() so the caller can record the override.
export const GM_OVERRIDE_ROLES = ["gm_service"];
// Group 3 — sees & analyses everything, edits/actions NOTHING.
// dealer_principal sits above everyone but is a pure observer (revenue, performance,
// live job cards / occupancy / workflow / manpower & resource utilisation, CCTV,
// vehicle in/out, and all historical reports) — no editing privileges at all.
export const GROUP3_VIEW_ONLY = ["dkam", "dealer_principal"];

// Roles whose relevance is the workflow STAGE the JC currently sits in.
// Values are matched against jc.current_workflow_state (and a status fallback).
const STAGE_RULES: Record<string, { states: string[]; statuses?: string[]; flag?: string }> = {
  parts:          { states: ["PARTS_PENDING"], flag: "parts_required" },
  parts_incharge: { states: ["PARTS_PENDING"], flag: "parts_required" },
  spares_manager: { states: ["PARTS_PENDING"], flag: "parts_required" },
  tools_incharge: { states: ["PARTS_PENDING"], flag: "parts_required" },
  billing:        { states: ["BILLING_PENDING"], statuses: ["Completed"] },
  accounts:       { states: ["BILLING_PENDING"], statuses: ["Completed"] },
  warranty_clerk: { states: ["BILLING_PENDING"], statuses: ["Completed"] },
  cashier:        { states: ["CASHIER_PENDING"], statuses: ["Invoiced"] },
  qc:             { states: ["QC_PENDING", "QC_FAILED"] },
  security_agent: { states: ["FINAL_REVIEW", "COMPLETED"], statuses: ["Completed", "Invoiced"] },
  gate_personnel: { states: ["FINAL_REVIEW", "COMPLETED"], statuses: ["Completed", "Invoiced"] },
};

const norm = (v: any): string => String(v ?? "").trim().toLowerCase();

/** True when the JC carries a persistent ownership link to this user. */
export function isOwnedBy(jc: any, user: RelevanceUser): boolean {
  if (!jc || !user) return false;

  // Creator (reception / advisor who logged it)
  if (user.user_id != null && Number(jc.created_by) === Number(user.user_id)) return true;

  const fullName = norm(user.full_name);
  if (fullName) {
    // Service advisor (name string)
    if (jc.service_advisor && norm(jc.service_advisor).includes(fullName)) return true;
    // Technician (name string)
    if (jc.technician_name && norm(jc.technician_name).includes(fullName)) return true;
  }

  // Technician assignments (by employee_id or name)
  if (Array.isArray(jc.technician_assignments)) {
    for (const t of jc.technician_assignments) {
      if (user.employee_id != null && Number(t?.technician_id) === Number(user.employee_id)) return true;
      if (fullName && t?.technician_name && norm(t.technician_name).includes(fullName)) return true;
    }
  }
  return false;
}

/** True when the JC currently sits in a workflow stage this role handles. */
export function isInMyStage(jc: any, role?: string): boolean {
  if (!role) return false;
  const rule = STAGE_RULES[role];
  if (!rule) return false;
  const state = String(jc?.current_workflow_state ?? "").toUpperCase();
  if (rule.states.some(s => s.toUpperCase() === state)) return true;
  if (rule.flag && (jc?.[rule.flag] === true || jc?.[rule.flag] === 1)) return true;
  if (rule.statuses && rule.statuses.some(s => norm(s) === norm(jc?.status))) return true;
  return false;
}

/** Can this user SEE this job card? Group 1/2/3 all view everything. */
export function canViewJobCard(jc: any, user: RelevanceUser): boolean {
  const role = user?.role;
  if (!role) return true; // unauthenticated / unknown → no scoping (legacy behaviour)
  if (GROUP1_FULL_CONTROL.includes(role) || GROUP2_VIEW_ALL_EDIT_OWN.includes(role) || GROUP3_VIEW_ONLY.includes(role)) {
    return true;
  }
  return isOwnedBy(jc, user) || isInMyStage(jc, role);
}

/** Can this user EDIT / take action on this job card? (Phase 2 enforcement.) */
export function canEditJobCard(jc: any, user: RelevanceUser): boolean {
  const role = user?.role;
  if (!role) return true; // legacy — Phase 2 will require auth on actions
  if (GROUP1_FULL_CONTROL.includes(role)) return true;
  if (GROUP3_VIEW_ONLY.includes(role)) return false; // observer: never edits
  // GM: allowed to edit anything (override), but the caller audits it.
  if (GM_OVERRIDE_ROLES.includes(role)) return true;
  // Group 2 (supervisor) and everyone scoped: only own/relevant.
  return isOwnedBy(jc, user) || isInMyStage(jc, role);
}

/**
 * True when this action is a GM OVERRIDE — GM acting on a job card it does not
 * own and is not the current stage-handler for. These must be written to the
 * gm_override_log audit trail by the caller. Returns false for GM's in-lane work.
 */
export function isGmOverride(jc: any, user: RelevanceUser): boolean {
  const role = user?.role;
  if (!role || !GM_OVERRIDE_ROLES.includes(role)) return false;
  return !(isOwnedBy(jc, user) || isInMyStage(jc, role));
}

/** True when the role sees the entire workshop (no read filtering needed). */
export function isFullViewRole(role?: string): boolean {
  return !!role && (
    GROUP1_FULL_CONTROL.includes(role) ||
    GROUP2_VIEW_ALL_EDIT_OWN.includes(role) ||
    GROUP3_VIEW_ONLY.includes(role)
  );
}

/** Filter a job-card array to those the user may view. */
export function filterViewableJobCards<T = any>(jobCards: T[], user: RelevanceUser): T[] {
  if (!user?.role || isFullViewRole(user.role)) return jobCards;
  return (jobCards || []).filter(jc => canViewJobCard(jc, user));
}

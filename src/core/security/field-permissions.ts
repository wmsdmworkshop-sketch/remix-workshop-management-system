/**
 * =============================================================================
 * Field-level security — SERVER-SIDE enforcement.
 * -----------------------------------------------------------------------------
 * `field_permissions` holds real rules (odometer LOCKED for a technician once
 * work is in progress, goodwill REQUIRES_APPROVAL for an advisor,
 * system_job_card_no LOCKED for everyone). Until now the table was only ever
 * read to render the admin screen and written when that screen saved — no write
 * path consulted it, so every one of those locks was decorative. A locked field
 * could be changed by anyone who could reach the update route.
 *
 * Levels:
 *   EDIT              — allowed.
 *   LOCKED            — rejected outright.
 *   REQUIRES_APPROVAL — rejected on the direct path; must go through
 *                       POST /api/job-cards/:id/update-request.
 *   OVERRIDE          — allowed, and the caller records it (admin/gm/developer).
 *
 * Resolution is most-specific-first: role+stage, then role+ANY, then ANY+stage,
 * then ANY+ANY. A field with no rule at all is NOT restricted here — ownership
 * and workflow rules upstream still apply.
 * =============================================================================
 */

export type FieldPermissionLevel = "EDIT" | "LOCKED" | "REQUIRES_APPROVAL" | "OVERRIDE";

export interface FieldPermissionRule {
  role: string;
  workflow_stage: string;
  field_name: string;
  permission_level: string;
}

const norm = (v: any): string =>
  String(v ?? "").trim().toLowerCase().replace(/[\s_]+/g, "_");

/** "gm" in field_permissions is the same principal as the gm_service role. */
const roleAliases = (role: any): string[] => {
  const r = norm(role);
  const out = [r];
  if (r === "gm_service") out.push("gm");
  if (r === "gm") out.push("gm_service");
  return out;
};

export function resolveFieldPermission(
  rules: FieldPermissionRule[],
  role: any,
  stage: any,
  field: string,
): FieldPermissionLevel | undefined {
  const roles = roleAliases(role);
  const stageKey = norm(stage);
  const fieldKey = norm(field);

  const candidates = rules.filter(r => norm(r.field_name) === fieldKey);
  if (candidates.length === 0) return undefined;

  const pick = (roleMatch: (r: string) => boolean, stageMatch: (s: string) => boolean) =>
    candidates.find(r => roleMatch(norm(r.role)) && stageMatch(norm(r.workflow_stage)));

  const isMyRole = (r: string) => roles.includes(r);
  const isAnyRole = (r: string) => r === "any";
  const isMyStage = (s: string) => s === stageKey;
  const isAnyStage = (s: string) => s === "any";

  const hit =
    pick(isMyRole, isMyStage) ||
    pick(isMyRole, isAnyStage) ||
    pick(isAnyRole, isMyStage) ||
    pick(isAnyRole, isAnyStage);

  if (!hit) return undefined;
  const level = String(hit.permission_level || "").trim().toUpperCase();
  return (["EDIT", "LOCKED", "REQUIRES_APPROVAL", "OVERRIDE"] as const)
    .includes(level as FieldPermissionLevel)
    ? (level as FieldPermissionLevel)
    : undefined;
}

export interface FieldEnforcementResult {
  /** The patch with disallowed fields removed. */
  allowed: Record<string, any>;
  /** Fields refused because they are LOCKED for this role/stage. */
  locked: string[];
  /** Fields that must go through an update request instead. */
  needsApproval: string[];
  /** Fields changed under an OVERRIDE grant — the caller must audit these. */
  overridden: string[];
}

/**
 * Filters a patch against the field rules. Only keys whose value actually
 * differs from the stored card are judged, so a client echoing unchanged
 * fields back is not refused for touching a locked one.
 */
export function enforceFieldPermissions(
  rules: FieldPermissionRule[],
  role: any,
  stage: any,
  patch: Record<string, any>,
  current: Record<string, any> = {},
): FieldEnforcementResult {
  const result: FieldEnforcementResult = {
    allowed: {}, locked: [], needsApproval: [], overridden: [],
  };

  for (const [field, value] of Object.entries(patch || {})) {
    const unchanged =
      field in current &&
      String(current[field] ?? "") === String(value ?? "");
    if (unchanged) { result.allowed[field] = value; continue; }

    switch (resolveFieldPermission(rules, role, stage, field)) {
      case "LOCKED":
        result.locked.push(field);
        break;
      case "REQUIRES_APPROVAL":
        result.needsApproval.push(field);
        break;
      case "OVERRIDE":
        result.overridden.push(field);
        result.allowed[field] = value;
        break;
      default: // EDIT, or no rule for this field
        result.allowed[field] = value;
    }
  }
  return result;
}

/** Human-readable refusal, listing exactly which fields were refused and why. */
export function describeRefusal(result: FieldEnforcementResult): string | null {
  const parts: string[] = [];
  if (result.locked.length) {
    parts.push(`${result.locked.join(", ")} ${result.locked.length === 1 ? "is" : "are"} locked for your role at this stage`);
  }
  if (result.needsApproval.length) {
    parts.push(`${result.needsApproval.join(", ")} require approval — raise an update request`);
  }
  return parts.length ? parts.join("; ") + "." : null;
}

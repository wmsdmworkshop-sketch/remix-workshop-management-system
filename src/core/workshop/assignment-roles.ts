/**
 * Single source of truth for "who may assign a Service Advisor".
 *
 * This list previously existed as three separate literals — in
 * pipeline.routes.ts twice (the manager queue and the assign endpoint) and
 * again inside RealtimeOwnershipPipeline.assignServiceAdvisor. Three copies of
 * an authorisation rule is three chances to drift, and it had already drifted
 * once: a fourth near-identical list in vos.routes.ts carries "cashier".
 *
 * Roles are compared AFTER normalisation, so callers must pass the value
 * through `normaliseRole` rather than matching raw. The stored role
 * `gm_service` normalises to "gm service", which is why it was absent from the
 * old literals and why the General Manager account silently lost the ability to
 * assign advisors the moment it stopped being a `developer`.
 */

/** Lowercase, trim, and treat underscores as spaces — `gm_service` -> "gm service". */
export function normaliseRole(role: any): string {
  return String(role || "").toLowerCase().trim().replace(/_/g, " ");
}

/**
 * Roles permitted to assign a Service Advisor to an intake.
 *
 * Kept in normalised form. `gm service` is the canonical GM role (`gm_service`)
 * and `developer` bypasses requirePermission everywhere else in the app, so
 * both belong here; their absence was an oversight, not a policy.
 */
export const SA_ASSIGNMENT_ROLES: readonly string[] = [
  "service manager",
  "works manager",
  "workshop manager",
  "general manager",
  "gm service",
  "admin",
  "developer",
];

/** True when the given role (raw or normalised) may assign a Service Advisor. */
export function canAssignServiceAdvisor(role: any): boolean {
  return SA_ASSIGNMENT_ROLES.includes(normaliseRole(role));
}

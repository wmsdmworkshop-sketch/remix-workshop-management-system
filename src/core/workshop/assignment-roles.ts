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

/**
 * Roles permitted to open a gate entry through the pipeline router.
 *
 * AUDIT P0: `POST /api/pipeline/gate-in` previously ran on authentication
 * alone, so any logged-in user — a technician, a cashier, a driver — could
 * create a gate entry. The equivalent legacy route (`POST /api/job-cards`,
 * server.ts) has always been restricted to JOB_CARD_CREATE_ROLES, so the
 * pipeline router was a way around a rule the rest of the app enforced.
 *
 * This list is the normalised mirror of server.ts JOB_CARD_CREATE_ROLES. The
 * two must stay in step; keeping this one here rather than inline in the
 * router is the same anti-drift reasoning as SA_ASSIGNMENT_ROLES above.
 */
export const GATE_IN_ROLES: readonly string[] = [
  "security agent",
  "gate personnel",
  "reception",
  "receptionist",
  "bay reporter",
  "service advisor",
  "supervisor",
  "floor supervisor",
  "floor incharge",
  "workshop manager",
  "service manager",
  "gm service",
  "admin",
  "developer",
];

/** True when the given role (raw or normalised) may open a gate entry. */
export function canPerformGateIn(role: any): boolean {
  return GATE_IN_ROLES.includes(normaliseRole(role));
}

/**
 * Roles permitted to accept a reception intake (verify VRN/odometer, pick the
 * job type and release the vehicle to the Workshop Manager).
 *
 * AUDIT P0: `POST /api/pipeline/reception/accept` was likewise authenticated
 * but not authorised. Reception verification is the control that makes the
 * gate capture trustworthy, so anyone being able to perform it defeats the
 * purpose of having a verification step at all.
 */
export const RECEPTION_INTAKE_ROLES: readonly string[] = [
  "reception",
  "receptionist",
  "bay reporter",
  "workshop manager",
  "service manager",
  "gm service",
  "admin",
  "developer",
];

/** True when the given role (raw or normalised) may accept a reception intake. */
export function canAcceptReceptionIntake(role: any): boolean {
  return RECEPTION_INTAKE_ROLES.includes(normaliseRole(role));
}

/**
 * Roles permitted to perform Service Advisor technical intake — recording
 * complaints, creating the job card and releasing the vehicle to the floor.
 *
 * AUDIT P0: every route in sa-intake.routes.ts ran authenticateJwt but NO role
 * check, so any logged-in user could create a job card or send a vehicle to the
 * floor in an advisor's name. Unlike floor-execution.routes.ts (which pairs
 * authenticateJwt with requireFloorRoles on every route), this router had no
 * second layer at all.
 */
export const SA_INTAKE_ROLES: readonly string[] = [
  "service advisor",
  "service manager",
  "works manager",
  "workshop manager",
  "gm service",
  "admin",
  "developer",
];

/** True when the given role (raw or normalised) may perform SA technical intake. */
export function canPerformSaIntake(role: any): boolean {
  return SA_INTAKE_ROLES.includes(normaliseRole(role));
}

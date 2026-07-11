/**
 * =============================================================================
 * WOS Core Architecture: Escalation Engine Rules
 * Bounded Context: Core System / SLA Escalations
 * Description: Defines WOS escalation types, severity levels, and rules.
 * =============================================================================
 */

export type EscalationType =
  | "MISSING_ETD"
  | "ETD_EXPIRED"
  | "ESTIMATE_PENDING"
  | "CUSTOMER_APPROVAL_DELAY"
  | "PARTS_DELAY"
  | "TECHNICIAN_IDLE"
  | "BAY_IDLE"
  | "QC_DELAY"
  | "INVOICE_DELAY"
  | "PAYMENT_DELAY"
  | "VEHICLE_NOT_DELIVERED"
  | "REPEAT_COMPLAINT"
  | "WARRANTY_DELAY"
  | "BREAKDOWN_DELAY"
  | "FLEET_PRIORITY"
  | "EMERGENCY_VEHICLE";

export type EscalationLevel = "INFO" | "WARNING" | "CRITICAL" | "EMERGENCY";

export type EscalationRole =
  | "L0_ADVISOR"
  | "L1_SUPERVISOR"
  | "L2_WORKSHOP_MANAGER"
  | "L3_GM_SERVICE"
  | "L4_DEALER_PRINCIPAL";

export interface EscalationConfig {
  type: EscalationType;
  baseMinutesLimit: number;
  assignedRole: EscalationRole;
  severity: EscalationLevel;
  nextEscalationRole?: EscalationRole;
}

export const ESCALATION_RULES: Record<EscalationType, EscalationConfig> = {
  MISSING_ETD: { type: "MISSING_ETD", baseMinutesLimit: 15, assignedRole: "L0_ADVISOR", severity: "INFO", nextEscalationRole: "L1_SUPERVISOR" },
  ETD_EXPIRED: { type: "ETD_EXPIRED", baseMinutesLimit: 30, assignedRole: "L1_SUPERVISOR", severity: "CRITICAL", nextEscalationRole: "L2_WORKSHOP_MANAGER" },
  ESTIMATE_PENDING: { type: "ESTIMATE_PENDING", baseMinutesLimit: 60, assignedRole: "L0_ADVISOR", severity: "WARNING", nextEscalationRole: "L1_SUPERVISOR" },
  CUSTOMER_APPROVAL_DELAY: { type: "CUSTOMER_APPROVAL_DELAY", baseMinutesLimit: 120, assignedRole: "L1_SUPERVISOR", severity: "CRITICAL", nextEscalationRole: "L3_GM_SERVICE" },
  PARTS_DELAY: { type: "PARTS_DELAY", baseMinutesLimit: 180, assignedRole: "L1_SUPERVISOR", severity: "WARNING", nextEscalationRole: "L2_WORKSHOP_MANAGER" },
  TECHNICIAN_IDLE: { type: "TECHNICIAN_IDLE", baseMinutesLimit: 30, assignedRole: "L1_SUPERVISOR", severity: "WARNING", nextEscalationRole: "L2_WORKSHOP_MANAGER" },
  BAY_IDLE: { type: "BAY_IDLE", baseMinutesLimit: 45, assignedRole: "L1_SUPERVISOR", severity: "WARNING", nextEscalationRole: "L2_WORKSHOP_MANAGER" },
  QC_DELAY: { type: "QC_DELAY", baseMinutesLimit: 45, assignedRole: "L1_SUPERVISOR", severity: "WARNING", nextEscalationRole: "L2_WORKSHOP_MANAGER" },
  INVOICE_DELAY: { type: "INVOICE_DELAY", baseMinutesLimit: 30, assignedRole: "L0_ADVISOR", severity: "INFO", nextEscalationRole: "L1_SUPERVISOR" },
  PAYMENT_DELAY: { type: "PAYMENT_DELAY", baseMinutesLimit: 60, assignedRole: "L1_SUPERVISOR", severity: "WARNING", nextEscalationRole: "L2_WORKSHOP_MANAGER" },
  VEHICLE_NOT_DELIVERED: { type: "VEHICLE_NOT_DELIVERED", baseMinutesLimit: 120, assignedRole: "L1_SUPERVISOR", severity: "WARNING", nextEscalationRole: "L2_WORKSHOP_MANAGER" },
  REPEAT_COMPLAINT: { type: "REPEAT_COMPLAINT", baseMinutesLimit: 15, assignedRole: "L1_SUPERVISOR", severity: "CRITICAL", nextEscalationRole: "L3_GM_SERVICE" },
  WARRANTY_DELAY: { type: "WARRANTY_DELAY", baseMinutesLimit: 240, assignedRole: "L2_WORKSHOP_MANAGER", severity: "CRITICAL", nextEscalationRole: "L3_GM_SERVICE" },
  BREAKDOWN_DELAY: { type: "BREAKDOWN_DELAY", baseMinutesLimit: 60, assignedRole: "L2_WORKSHOP_MANAGER", severity: "CRITICAL", nextEscalationRole: "L4_DEALER_PRINCIPAL" },
  FLEET_PRIORITY: { type: "FLEET_PRIORITY", baseMinutesLimit: 30, assignedRole: "L2_WORKSHOP_MANAGER", severity: "CRITICAL", nextEscalationRole: "L3_GM_SERVICE" },
  EMERGENCY_VEHICLE: { type: "EMERGENCY_VEHICLE", baseMinutesLimit: 10, assignedRole: "L3_GM_SERVICE", severity: "EMERGENCY", nextEscalationRole: "L4_DEALER_PRINCIPAL" },
};

/**
 * =============================================================================
 * DWIP Enterprise V1.1.0 — Centralized Field-Level RBAC Engine
 * Evaluates field permissions based on Role, Workflow Stage, and Approval Rules.
 * =============================================================================
 */

export type FieldPermissionLevel = 'EDIT' | 'READ_ONLY' | 'HIDDEN' | 'REQUIRES_APPROVAL' | 'OVERRIDE' | 'LOCKED';

export interface FieldPermissionEvaluation {
  fieldName: string;
  role: string;
  workflowStage: string;
  permission: FieldPermissionLevel;
  canEdit: boolean;
  canOverride: boolean;
  requiresApproval: boolean;
  isLocked: boolean;
  isHidden: boolean;
  reason?: string;
}

const PRIVILEGED_ROLES = new Set([
  'developer',
  'admin',
  'dealer_principal',
  'gm',
  'workshop_manager'
]);

const LOCKED_WORKFLOW_STAGES = new Set([
  'Submitted',
  'Advisor Review',
  'Workshop Allocation',
  'Diagnosis',
  'Estimate Approval',
  'Work In Progress',
  'Quality Check',
  'Ready for Delivery',
  'Invoiced',
  'Completed',
  'Closed'
]);

const APPROVAL_SENSITIVE_FIELDS = new Set([
  'warranty_type',
  'goodwill',
  'invoice_discount',
  'labour_discount',
  'parts_discount',
  'expected_delivery',
  'customer_complaint'
]);

export function evaluateFieldPermission(
  role: string = 'service_advisor',
  workflowStage: string = 'Draft',
  fieldName: string
): FieldPermissionEvaluation {
  const cleanRole = (role || 'service_advisor').toLowerCase().trim();
  const cleanStage = (workflowStage || 'Draft').trim();
  const isPrivileged = PRIVILEGED_ROLES.has(cleanRole);
  const isLockedStage = LOCKED_WORKFLOW_STAGES.has(cleanStage);

  let permission = 'EDIT' as FieldPermissionLevel;
  let reason = 'Standard editable field';

  // Rule 1: System Job Card Number is strictly IMMUTABLE for ALL roles
  if (fieldName === 'system_job_card_no' || fieldName === 'job_card_no') {
    permission = 'LOCKED';
    reason = 'System Job Card Number is permanent and immutable';
  }
  // Rule 2: Odometer & Timestamps locked post-submission for operational users
  else if (fieldName === 'odometer' || fieldName.includes('time_') || fieldName.includes('_at')) {
    if (isLockedStage) {
      if (isPrivileged) {
        permission = 'OVERRIDE';
        reason = 'Workflow locked post-submission. Privileged role override allowed with mandatory reason.';
      } else {
        permission = 'LOCKED';
        reason = 'Workflow locked post-submission. Operational edits strictly forbidden.';
      }
    } else {
      permission = 'EDIT';
    }
  }
  // Rule 3: Approval-sensitive fields post-submission
  else if (APPROVAL_SENSITIVE_FIELDS.has(fieldName) && isLockedStage) {
    if (cleanRole === 'service_manager' || cleanRole === 'warranty_manager' || isPrivileged) {
      permission = 'EDIT';
      reason = 'Authorized manager role may directly edit';
    } else {
      permission = 'REQUIRES_APPROVAL';
      reason = 'Modification post-submission requires formal manager approval request';
    }
  }
  // Rule 4: General post-submission locking for operational roles
  else if (isLockedStage && !isPrivileged && ['crm_job_card_no', 'vehicle_no', 'vin', 'engine_no'].includes(fieldName)) {
    permission = 'LOCKED';
    reason = 'Vehicle identification data locked post-submission';
  }

  return {
    fieldName,
    role: cleanRole,
    workflowStage: cleanStage,
    permission,
    canEdit: permission === 'EDIT' || permission === 'OVERRIDE',
    canOverride: permission === 'OVERRIDE',
    requiresApproval: permission === 'REQUIRES_APPROVAL',
    isLocked: permission === 'LOCKED',
    isHidden: permission === 'HIDDEN',
    reason
  };
}

export function evaluateAllFieldPermissions(
  role: string,
  workflowStage: string,
  fieldList: string[]
): Record<string, FieldPermissionEvaluation> {
  const result: Record<string, FieldPermissionEvaluation> = {};
  for (const field of fieldList) {
    result[field] = evaluateFieldPermission(role, workflowStage, field);
  }
  return result;
}

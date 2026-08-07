import { RoleService } from "./identity.ts";

export class PermissionEngine {
  private static permissionMapping: Record<string, { module: string; action: 'view' | 'edit' | 'comment' }> = {
    'JOB_CARD_CREATE': { module: 'Job Cards', action: 'edit' },
    'WORKFLOW_TRANSITION_GATE_IN': { module: 'Job Cards', action: 'edit' },
    'WORKFLOW_TRANSITION_INTAKE_PENDING': { module: 'Job Cards', action: 'edit' },
    'WORKFLOW_TRANSITION_DIAGNOSTIC_WIP': { module: 'Job Cards', action: 'edit' },
    'WORKFLOW_TRANSITION_ESTIMATE_PENDING': { module: 'Job Cards', action: 'edit' },
    'WORKFLOW_TRANSITION_ESTIMATE_APPROVED': { module: 'Job Cards', action: 'edit' },
    'WORKFLOW_TRANSITION_PARTS_PENDING': { module: 'Job Cards', action: 'edit' },
    'WORKFLOW_TRANSITION_WIP_START': { module: 'Job Cards', action: 'edit' },
    'WORKFLOW_TRANSITION_QC_PENDING': { module: 'Job Cards', action: 'edit' },
    'WORKFLOW_TRANSITION_QC_FAILED': { module: 'Job Cards', action: 'edit' },
    'WORKFLOW_TRANSITION_FINAL_REVIEW': { module: 'Job Cards', action: 'edit' },
    'WORKFLOW_TRANSITION_INVOICED': { module: 'Billing', action: 'edit' },
    'WORKFLOW_TRANSITION_GATE_OUT': { module: 'Job Cards', action: 'edit' },
    'WORKFLOW_TRANSITION_OVERRIDE': { module: 'User Management', action: 'edit' },
  };

  /**
   * Evaluates if a role is authorized to perform an action based on permission key.
   */
  public static async can(roleName: string, permissionKey: string): Promise<boolean> {
    const mapping = this.permissionMapping[permissionKey];
    if (!mapping) {
      console.warn(`[PermissionEngine] Warning: Permission key "${permissionKey}" has no mapped module/action.`);
      return false;
    }
    return await RoleService.hasPermission(roleName, mapping.module, mapping.action);
  }
}

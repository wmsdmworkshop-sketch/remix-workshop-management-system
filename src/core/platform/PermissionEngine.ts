/**
 * DWIP Enterprise - Core Platform Permission Engine
 * Sprint IL-001 Architecture
 * 
 * Features:
 * - Enterprise permission mapping for external system roles
 * - Dynamic mapping structure between CRM Role, DWIP Role, Dealer Role, Branch, and Workshop scopes.
 * - Architectural stub ready for future live connector mapping.
 */

export interface ExternalPermissionMapping {
  id: string;
  crmRole: string;
  dwipRole: string;
  dealerRole?: string;
  branchScope?: string;
  workshopScope?: string;
  allowedActions: string[];
  description: string;
  isActive: boolean;
}

export class PermissionEngine {
  private static instance: PermissionEngine;
  private mappings: ExternalPermissionMapping[] = [];

  private constructor() {
    this.seedBaselinePermissionMappings();
  }

  public static getInstance(): PermissionEngine {
    if (!PermissionEngine.instance) {
      PermissionEngine.instance = new PermissionEngine();
    }
    return PermissionEngine.instance;
  }

  private seedBaselinePermissionMappings(): void {
    this.mappings = [
      {
        id: 'perm_map_001',
        crmRole: 'CRM_SERVICE_ADVISOR',
        dwipRole: 'service_advisor',
        dealerRole: 'DEALER_FRONT_OFFICE',
        branchScope: 'BRANCH_PUNE_MAIN',
        workshopScope: 'WORKSHOP_01',
        allowedActions: ['READ_VEHICLE', 'CREATE_JOBCARD', 'VIEW_HISTORY', 'INITIATE_WARRANTY'],
        description: 'Maps OEM CRM Service Advisor to DWIP Service Advisor role',
        isActive: true
      },
      {
        id: 'perm_map_002',
        crmRole: 'CRM_WORKSHOP_MANAGER',
        dwipRole: 'workshop_manager',
        dealerRole: 'DEALER_OPERATIONS_LEAD',
        branchScope: 'ALL_BRANCHES',
        workshopScope: 'ALL_WORKSHOPS',
        allowedActions: ['READ_ALL', 'OVERRIDE_ESTIMATE', 'APPROVE_WARRANTY', 'VIEW_ANALYTICS'],
        description: 'Maps OEM CRM Manager to DWIP Workshop Manager role',
        isActive: true
      },
      {
        id: 'perm_map_003',
        crmRole: 'CRM_TECHNICIAN_LEAD',
        dwipRole: 'floor_supervisor',
        dealerRole: 'DEALER_SHOP_FLOOR',
        branchScope: 'BRANCH_PUNE_MAIN',
        workshopScope: 'WORKSHOP_01',
        allowedActions: ['ASSIGN_TECH', 'UPDATE_BAY_STATUS', 'QC_SIGN_OFF'],
        description: 'Maps OEM CRM Lead to DWIP Floor Supervisor role',
        isActive: true
      }
    ];
  }

  public evaluatePermission(
    crmRole: string,
    action: string,
    context?: { branchId?: string; workshopId?: string }
  ): boolean {
    const matching = this.mappings.filter(
      m => m.crmRole.toUpperCase() === crmRole.toUpperCase() && m.isActive
    );
    
    if (matching.length === 0) return false;

    return matching.some(m => m.allowedActions.includes(action) || m.allowedActions.includes('READ_ALL'));
  }

  public getMappedDwipRole(crmRole: string): string {
    const mapping = this.mappings.find(
      m => m.crmRole.toUpperCase() === crmRole.toUpperCase() && m.isActive
    );
    return mapping ? mapping.dwipRole : 'receptionist';
  }

  public getAllMappings(): ExternalPermissionMapping[] {
    return [...this.mappings];
  }

  public addMapping(mapping: Omit<ExternalPermissionMapping, 'id'>): ExternalPermissionMapping {
    const newMapping: ExternalPermissionMapping = {
      ...mapping,
      id: `perm_map_${Date.now()}`
    };
    this.mappings.push(newMapping);
    return newMapping;
  }
}

export const permissionEngine = PermissionEngine.getInstance();

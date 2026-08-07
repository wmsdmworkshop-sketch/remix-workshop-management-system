/**
 * =============================================================================
 * WOS Core Architecture: Identity, Role and Security Audit Services
 * Bounded Context: Core System / Security & Identity
 * Description: Services encapsulating identity validation, permission rules
 *              and auditing. No direct SQL queries are executed here; they
 *              delegate persistence to injected repositories.
 * =============================================================================
 */

import { pool as db } from "../db/index.ts";
import {
  IEmployeeRepository,
  IPermissionRepository,
  IAuditRepository,
  EmployeeRepository,
  PermissionRepository,
  AuditRepository
} from "./repositories.ts";

export interface EmployeeProfile {
  employee_id: number;
  full_name: string;
  employee_code: string;
  role: string;
  employee_grade: string;
  basic_salary: number;
  mobile: string;
  is_active: boolean | number;
  email?: string | null;
  record_status?: 'CANONICAL' | 'LEGACY' | string;
  legacy_role?: string | null;
  [key: string]: any;
}

export interface UserAccessProfile {
  user_id: number;
  username: string;
  full_name: string;
  user_role: string;
  employee_id: number;
  is_active: boolean | number;
  email?: string | null;
  mobile_no?: string | null;
}

export interface PermissionRow {
  permission_id?: number;
  role_name: string;
  module_name: string;
  can_view: number | boolean;
  can_edit: number | boolean;
  can_comment: number | boolean;
}

// =============================================================================
// 1. AuditService Implementation
// =============================================================================
export class AuditService {
  private static defaultInstance: AuditService;

  constructor(private auditRepo: IAuditRepository) {}

  public static init(auditRepo: IAuditRepository) {
    this.defaultInstance = new AuditService(auditRepo);
  }

  public static get instance(): AuditService {
    if (!this.defaultInstance) {
      // Fallback fallback for uninitialized calls/tests
      this.defaultInstance = new AuditService(new AuditRepository(db));
    }
    return this.defaultInstance;
  }

  public async logAction(
    userId: number,
    username: string,
    action: string,
    details: string,
    correlationId?: string
  ): Promise<void> {
    try {
      await this.auditRepo.insert({
        user_id: userId,
        username,
        action,
        details,
        correlation_id: correlationId
      });
      console.log(`[AUDIT] User ${username} (ID: ${userId}) performed ${action}: ${details}`);
    } catch (err: any) {
      console.error("AuditService: Failed to write audit log:", err.message);
    }
  }

  public async getLogs(limit: number = 100): Promise<any[]> {
    try {
      return await this.auditRepo.findLogs(limit);
    } catch (err: any) {
      console.error("AuditService: Failed to retrieve audit logs:", err.message);
      return [];
    }
  }

  // --- Static Delegation Methods for Backward Compatibility ---
  public static async logAction(
    userId: number,
    username: string,
    action: string,
    details: string,
    correlationId?: string
  ): Promise<void> {
    await this.instance.logAction(userId, username, action, details, correlationId);
  }

  public static async getLogs(limit: number = 100): Promise<any[]> {
    return await this.instance.getLogs(limit);
  }
}

// =============================================================================
// 2. EmployeeIdentityService Implementation
// =============================================================================
export class EmployeeIdentityService {
  private static defaultInstance: EmployeeIdentityService;

  constructor(
    private employeeRepo: IEmployeeRepository,
    private auditRepo: IAuditRepository
  ) {}

  public static init(employeeRepo: IEmployeeRepository, auditRepo: IAuditRepository) {
    this.defaultInstance = new EmployeeIdentityService(employeeRepo, auditRepo);
  }

  public static get instance(): EmployeeIdentityService {
    if (!this.defaultInstance) {
      this.defaultInstance = new EmployeeIdentityService(new EmployeeRepository(db), new AuditRepository(db));
    }
    return this.defaultInstance;
  }

  public async getEmployees(includeLegacy = false): Promise<EmployeeProfile[]> {
    try {
      return await this.employeeRepo.findAll(includeLegacy);
    } catch (err: any) {
      console.error("EmployeeIdentityService: Failed to fetch employees:", err.message);
      return [];
    }
  }

  public async getEmployeeById(employeeId: number): Promise<EmployeeProfile | null> {
    try {
      return await this.employeeRepo.findById(employeeId);
    } catch (err: any) {
      console.error(`EmployeeIdentityService: Failed to fetch employee by ID ${employeeId}:`, err.message);
      return null;
    }
  }

  public async getEmployeeByCode(employeeCode: string): Promise<EmployeeProfile | null> {
    try {
      return await this.employeeRepo.findByCode(employeeCode);
    } catch (err: any) {
      console.error(`EmployeeIdentityService: Failed to fetch employee by code ${employeeCode}:`, err.message);
      return null;
    }
  }

  public async mapUserToEmployee(
    userId: number,
    employeeId: number,
    adminUserId: number,
    adminUsername: string,
    correlationId?: string
  ): Promise<boolean> {
    try {
      // Direct SQL mapping of user-employee remains in service, but updates MySQL through DB connection
      // Single source of truth update on users table exclusively
      await db.execute("UPDATE users SET employee_id = ? WHERE user_id = ?", [employeeId, userId]);

      const emp = await this.employeeRepo.findById(employeeId);
      const empName = emp ? emp.full_name : `ID ${employeeId}`;

      await this.auditRepo.insert({
        user_id: adminUserId,
        username: adminUsername,
        action: "USER_EMPLOYEE_RECONCILIATION",
        details: `Mapped user account ID ${userId} to employee ${empName} (ID: ${employeeId})`,
        correlation_id: correlationId
      });

      return true;
    } catch (err: any) {
      console.error("EmployeeIdentityService: Failed to map user to employee:", err.message);
      return false;
    }
  }

  // --- Static Delegation Methods for Backward Compatibility ---
  public static async getEmployees(includeLegacy = false): Promise<EmployeeProfile[]> {
    return await this.instance.getEmployees(includeLegacy);
  }

  public static async getEmployeeById(employeeId: number): Promise<EmployeeProfile | null> {
    return await this.instance.getEmployeeById(employeeId);
  }

  public static async getEmployeeByCode(employeeCode: string): Promise<EmployeeProfile | null> {
    return await this.instance.getEmployeeByCode(employeeCode);
  }

  public static async mapUserToEmployee(
    userId: number,
    employeeId: number,
    adminUserId: number,
    adminUsername: string,
    correlationId?: string
  ): Promise<boolean> {
    return await this.instance.mapUserToEmployee(userId, employeeId, adminUserId, adminUsername, correlationId);
  }
}

// =============================================================================
// 3. RoleService Implementation
// =============================================================================
export class RoleService {
  private static defaultInstance: RoleService;

  constructor(
    private permissionRepo: IPermissionRepository,
    private auditRepo: IAuditRepository
  ) {}

  public static init(permissionRepo: IPermissionRepository, auditRepo: IAuditRepository) {
    this.defaultInstance = new RoleService(permissionRepo, auditRepo);
  }

  public static get instance(): RoleService {
    if (!this.defaultInstance) {
      this.defaultInstance = new RoleService(new PermissionRepository(db), new AuditRepository(db));
    }
    return this.defaultInstance;
  }

  public async getRolePermissions(roleName: string): Promise<PermissionRow[]> {
    try {
      return await this.permissionRepo.findByRole(roleName);
    } catch (err: any) {
      console.error(`RoleService: Failed to fetch permissions for role ${roleName}:`, err.message);
      return [];
    }
  }

  public async hasPermission(
    roleName: string,
    moduleName: string,
    action: 'view' | 'edit' | 'comment'
  ): Promise<boolean> {
    try {
      const row = await this.permissionRepo.findByRoleAndModule(roleName, moduleName);
      if (row) {
        if (action === 'view') return Number(row.can_view) === 1;
        if (action === 'edit') return Number(row.can_edit) === 1;
        if (action === 'comment') return Number(row.can_comment) === 1;
      }
      return false;
    } catch (err: any) {
      console.error(`RoleService: Error checking permission for ${roleName}/${moduleName}:`, err.message);
      return false;
    }
  }

  public async getPermittedModules(roleName: string): Promise<string[]> {
    try {
      const rows = await this.permissionRepo.findByRole(roleName);
      return rows.filter((r: any) => Number(r.can_view) === 1).map((r: any) => r.module_name);
    } catch (err: any) {
      console.error(`RoleService: Failed to get permitted modules for ${roleName}:`, err.message);
      return [];
    }
  }

  public async setPermission(
    roleName: string,
    moduleName: string,
    permissions: Partial<Omit<PermissionRow, 'role_name' | 'module_name'>>,
    adminUserId: number,
    adminUsername: string,
    correlationId?: string
  ): Promise<boolean> {
    try {
      const existing = await this.permissionRepo.findByRoleAndModule(roleName, moduleName);
      let oldPerms = "None";

      if (existing) {
        oldPerms = `view=${existing.can_view},edit=${existing.can_edit},comment=${existing.can_comment}`;
        
        await this.permissionRepo.update(existing.permission_id!, {
          can_view: permissions.can_view !== undefined ? (permissions.can_view ? 1 : 0) : existing.can_view,
          can_edit: permissions.can_edit !== undefined ? (permissions.can_edit ? 1 : 0) : existing.can_edit,
          can_comment: permissions.can_comment !== undefined ? (permissions.can_comment ? 1 : 0) : existing.can_comment
        });
      } else {
        await this.permissionRepo.create({
          role_name: roleName,
          module_name: moduleName,
          can_view: permissions.can_view ? 1 : 0,
          can_edit: permissions.can_edit ? 1 : 0,
          can_comment: permissions.can_comment ? 1 : 0
        });
      }

      const newPerms = `view=${permissions.can_view ? 1 : 0},edit=${permissions.can_edit ? 1 : 0},comment=${permissions.can_comment ? 1 : 0}`;

      await this.auditRepo.insert({
        user_id: adminUserId,
        username: adminUsername,
        action: "ROLE_PERMISSION_UPDATE",
        details: `Updated permissions for role '${roleName}' on module '${moduleName}' from [${oldPerms}] to [${newPerms}]`,
        correlation_id: correlationId
      });

      return true;
    } catch (err: any) {
      console.error(`RoleService: Failed to set permission for ${roleName}/${moduleName}:`, err.message);
      return false;
    }
  }

  // --- Static Delegation Methods for Backward Compatibility ---
  public static async getRolePermissions(roleName: string): Promise<PermissionRow[]> {
    return await this.instance.getRolePermissions(roleName);
  }

  public static async hasPermission(
    roleName: string,
    moduleName: string,
    action: 'view' | 'edit' | 'comment'
  ): Promise<boolean> {
    return await this.instance.hasPermission(roleName, moduleName, action);
  }

  public static async getPermittedModules(roleName: string): Promise<string[]> {
    return await this.instance.getPermittedModules(roleName);
  }

  public static async setPermission(
    roleName: string,
    moduleName: string,
    permissions: Partial<Omit<PermissionRow, 'role_name' | 'module_name'>>,
    adminUserId: number,
    adminUsername: string,
    correlationId?: string
  ): Promise<boolean> {
    return await this.instance.setPermission(roleName, moduleName, permissions, adminUserId, adminUsername, correlationId);
  }
}

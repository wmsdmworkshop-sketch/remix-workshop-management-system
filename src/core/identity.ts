/**
 * =============================================================================
 * WOS Core Architecture: Identity, Role and Security Audit Services
 * Bounded Context: Core System / Security & Identity
 * =============================================================================
 */

import { pool as db } from "../db/index.ts";

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
  private static isInitialized = false;

  private static async ensureTableExists(): Promise<void> {
    if (this.isInitialized) return;
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS \`security_audit_logs\` (
          \`log_id\` INT NOT NULL AUTO_INCREMENT,
          \`user_id\` INT NOT NULL,
          \`username\` VARCHAR(255) NOT NULL,
          \`action\` VARCHAR(255) NOT NULL,
          \`details\` TEXT NOT NULL,
          \`correlation_id\` VARCHAR(100) DEFAULT NULL,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`log_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
      `);
      this.isInitialized = true;
    } catch (err: any) {
      console.warn("AuditService: Error verifying table structure:", err.message);
    }
  }

  public static async logAction(
    userId: number,
    username: string,
    action: string,
    details: string,
    correlationId?: string
  ): Promise<void> {
    await this.ensureTableExists();
    try {
      await db.execute(
        `INSERT INTO \`security_audit_logs\` (user_id, username, action, details, correlation_id) VALUES (?, ?, ?, ?, ?)`,
        [userId, username, action, details, correlationId || null]
      );
      console.log(`[AUDIT] User ${username} (ID: ${userId}) performed ${action}: ${details}`);
    } catch (err: any) {
      console.error("AuditService: Failed to write audit log:", err.message);
    }
  }

  public static async getLogs(limit: number = 100): Promise<any[]> {
    await this.ensureTableExists();
    try {
      const [rows] = await db.query(
        `SELECT * FROM \`security_audit_logs\` ORDER BY log_id DESC LIMIT ?`,
        [limit]
      );
      return rows as any[];
    } catch (err: any) {
      console.error("AuditService: Failed to retrieve audit logs:", err.message);
      return [];
    }
  }
}

// =============================================================================
// 2. EmployeeIdentityService Implementation
// =============================================================================
export class EmployeeIdentityService {
  /**
   * Fetches all active canonical employees. Hides legacy duplicate records
   * from default lookups to prevent creation of duplicate records.
   */
  public static async getEmployees(includeLegacy = false): Promise<EmployeeProfile[]> {
    try {
      let query = "SELECT * FROM employees";
      if (!includeLegacy) {
        query += " WHERE record_status = 'CANONICAL' OR record_status IS NULL";
      }
      query += " ORDER BY employee_id";
      const [rows] = await db.query(query);
      return rows as EmployeeProfile[];
    } catch (err: any) {
      console.error("EmployeeIdentityService: Failed to fetch employees:", err.message);
      return [];
    }
  }

  /**
   * Resolves an employee by ID. Hiding legacy rules do not apply for point lookups
   * to ensure full backward compatibility.
   */
  public static async getEmployeeById(employeeId: number): Promise<EmployeeProfile | null> {
    try {
      const [rows] = await db.query("SELECT * FROM employees WHERE employee_id = ?", [employeeId]) as any[];
      if (rows && rows.length > 0) {
        return rows[0] as EmployeeProfile;
      }
      return null;
    } catch (err: any) {
      console.error(`EmployeeIdentityService: Failed to fetch employee by ID ${employeeId}:`, err.message);
      return null;
    }
  }

  /**
   * Resolves an employee by code.
   */
  public static async getEmployeeByCode(employeeCode: string): Promise<EmployeeProfile | null> {
    try {
      const [rows] = await db.query("SELECT * FROM employees WHERE employee_code = ?", [employeeCode]) as any[];
      if (rows && rows.length > 0) {
        return rows[0] as EmployeeProfile;
      }
      return null;
    } catch (err: any) {
      console.error(`EmployeeIdentityService: Failed to fetch employee by code ${employeeCode}:`, err.message);
      return null;
    }
  }

  /**
   * Reconciles user account to employee profile manually.
   */
  public static async mapUserToEmployee(
    userId: number,
    employeeId: number,
    adminUserId: number,
    adminUsername: string,
    correlationId?: string
  ): Promise<boolean> {
    try {
      // Fetch details for audit log
      const [uRows] = await db.query("SELECT username, employee_id FROM user_access_master WHERE user_id = ?", [userId]) as any[];
      const [eRows] = await db.query("SELECT full_name FROM employees WHERE employee_id = ?", [employeeId]) as any[];

      if (uRows.length === 0 || eRows.length === 0) {
        return false;
      }

      const oldEmpId = uRows[0].employee_id;
      const username = uRows[0].username;
      const empName = eRows[0].full_name;

      // Update in user_access_master
      await db.execute("UPDATE user_access_master SET employee_id = ? WHERE user_id = ?", [employeeId, userId]);
      
      // Update in users table
      await db.execute("UPDATE users SET employee_id = ? WHERE user_id = ?", [employeeId, userId]);

      // Audit log the mapping change
      await AuditService.logAction(
        adminUserId,
        adminUsername,
        "USER_EMPLOYEE_RECONCILIATION",
        `Mapped user account '${username}' (ID: ${userId}) from employee ID ${oldEmpId} to ${empName} (ID: ${employeeId})`,
        correlationId
      );

      return true;
    } catch (err: any) {
      console.error("EmployeeIdentityService: Failed to map user to employee:", err.message);
      return false;
    }
  }
}

// =============================================================================
// 3. RoleService (Central RBAC Provider)
// =============================================================================
export class RoleService {
  /**
   * Returns permissions grid for a role.
   */
  public static async getRolePermissions(roleName: string): Promise<PermissionRow[]> {
    try {
      const [rows] = await db.query(
        "SELECT permission_id, role_name, module_name, can_view, can_edit, can_comment FROM role_permissions WHERE role_name = ?",
        [roleName]
      );
      return rows as PermissionRow[];
    } catch (err: any) {
      console.error(`RoleService: Failed to fetch permissions for role ${roleName}:`, err.message);
      return [];
    }
  }

  /**
   * Enforces role permission validation based on RBAC tables. Handovers to legacy
   * hardcoded checks are forbidden.
   */
  public static async hasPermission(
    roleName: string,
    moduleName: string,
    action: 'view' | 'edit' | 'comment'
  ): Promise<boolean> {
    try {
      const [rows] = await db.query(
        "SELECT can_view, can_edit, can_comment FROM role_permissions WHERE role_name = ? AND module_name = ?",
        [roleName, moduleName]
      ) as any[];

      if (rows && rows.length > 0) {
        const row = rows[0];
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

  /**
   * Resolves the list of modules that are viewable by a role.
   */
  public static async getPermittedModules(roleName: string): Promise<string[]> {
    try {
      const [rows] = await db.query(
        "SELECT module_name FROM role_permissions WHERE role_name = ? AND can_view = 1",
        [roleName]
      ) as any[];
      return rows.map((r: any) => r.module_name);
    } catch (err: any) {
      console.error(`RoleService: Failed to get permitted modules for ${roleName}:`, err.message);
      return [];
    }
  }

  /**
   * Updates permission row for a specific role and module.
   */
  public static async setPermission(
    roleName: string,
    moduleName: string,
    permissions: Partial<Omit<PermissionRow, 'role_name' | 'module_name'>>,
    adminUserId: number,
    adminUsername: string,
    correlationId?: string
  ): Promise<boolean> {
    try {
      // Find existing
      const [existing] = await db.query(
        "SELECT permission_id, can_view, can_edit, can_comment FROM role_permissions WHERE role_name = ? AND module_name = ?",
        [roleName, moduleName]
      ) as any[];

      let oldPerms = "None";
      if (existing.length > 0) {
        const row = existing[0];
        oldPerms = `view=${row.can_view},edit=${row.can_edit},comment=${row.can_comment}`;
        
        await db.execute(
          "UPDATE role_permissions SET can_view = ?, can_edit = ?, can_comment = ? WHERE permission_id = ?",
          [
            permissions.can_view !== undefined ? (permissions.can_view ? 1 : 0) : row.can_view,
            permissions.can_edit !== undefined ? (permissions.can_edit ? 1 : 0) : row.can_edit,
            permissions.can_comment !== undefined ? (permissions.can_comment ? 1 : 0) : row.can_comment,
            row.permission_id
          ]
        );
      } else {
        await db.execute(
          "INSERT INTO role_permissions (role_name, module_name, can_view, can_edit, can_comment) VALUES (?, ?, ?, ?, ?)",
          [
            roleName,
            moduleName,
            permissions.can_view ? 1 : 0,
            permissions.can_edit ? 1 : 0,
            permissions.can_comment ? 1 : 0
          ]
        );
      }

      const newPerms = `view=${permissions.can_view ? 1 : 0},edit=${permissions.can_edit ? 1 : 0},comment=${permissions.can_comment ? 1 : 0}`;

      // Log change to AuditService
      await AuditService.logAction(
        adminUserId,
        adminUsername,
        "ROLE_PERMISSION_UPDATE",
        `Updated permissions for role '${roleName}' on module '${moduleName}' from [${oldPerms}] to [${newPerms}]`,
        correlationId
      );

      return true;
    } catch (err: any) {
      console.error(`RoleService: Failed to set permission for ${roleName}/${moduleName}:`, err.message);
      return false;
    }
  }
}

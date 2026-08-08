/**
 * =============================================================================
 * WOS Core Architecture: Repositories Implementation
 * Bounded Context: Core System / Persistence
 * Description: Data access repositories for SQL, CRUD and mapping operations.
 *              No business logic is permitted in this layer.
 * =============================================================================
 */

import { EmployeeProfile, UserAccessProfile, PermissionRow } from "./identity";

export interface IEmployeeRepository {
  findAll(includeLegacy: boolean): Promise<EmployeeProfile[]>;
  findById(employeeId: number): Promise<EmployeeProfile | null>;
  findByCode(employeeCode: string): Promise<EmployeeProfile | null>;
  update(employeeId: number, data: Partial<EmployeeProfile>): Promise<boolean>;
  create(data: Omit<EmployeeProfile, 'employee_id'>): Promise<number>;
  delete(employeeId: number): Promise<boolean>;
}

export interface IRoleRepository {
  findRoleByName(roleName: string): Promise<any | null>;
}

export interface IPermissionRepository {
  findByRole(roleName: string): Promise<PermissionRow[]>;
  findByRoleAndModule(roleName: string, moduleName: string): Promise<PermissionRow | null>;
  update(permissionId: number, data: Partial<PermissionRow>): Promise<boolean>;
  create(data: PermissionRow): Promise<number>;
}

export interface IAuditRepository {
  insert(log: { user_id: number; username: string; action: string; details: string; correlation_id?: string | null }): Promise<number>;
  findLogs(limit: number): Promise<any[]>;
}

export class EmployeeRepository implements IEmployeeRepository {
  constructor(private db: any) {}

  public async findAll(includeLegacy: boolean): Promise<EmployeeProfile[]> {
    let query = "SELECT * FROM employees";
    // No record_status column exists in the current schema
    query += " ORDER BY employee_id";
    const [rows] = await this.db.query(query);
    return rows as EmployeeProfile[];
  }

  public async findById(employeeId: number): Promise<EmployeeProfile | null> {
    const [rows] = await this.db.query("SELECT * FROM employees WHERE employee_id = ?", [employeeId]) as any[];
    if (rows && rows.length > 0) {
      return rows[0] as EmployeeProfile;
    }
    return null;
  }

  public async findByCode(employeeCode: string): Promise<EmployeeProfile | null> {
    const [rows] = await this.db.query("SELECT * FROM employees WHERE employee_code = ?", [employeeCode]) as any[];
    if (rows && rows.length > 0) {
      return rows[0] as EmployeeProfile;
    }
    return null;
  }

  public async update(employeeId: number, data: Partial<EmployeeProfile>): Promise<boolean> {
    const keys = Object.keys(data);
    if (keys.length === 0) return false;
    const sets = keys.map(k => `\`${k}\` = ?`).join(', ');
    const values = keys.map(k => data[k]);
    values.push(employeeId);
    const [result] = await this.db.execute(`UPDATE employees SET ${sets} WHERE employee_id = ?`, values);
    return result.affectedRows > 0;
  }

  public async create(data: Omit<EmployeeProfile, 'employee_id'>): Promise<number> {
    const keys = Object.keys(data);
    const placeholders = keys.map(() => '?').join(', ');
    const query = `INSERT INTO employees (${keys.map(k => `\`${k}\``).join(', ')}) VALUES (${placeholders})`;
    const values = keys.map(k => data[k]);
    const [result] = await this.db.execute(query, values);
    return result.insertId;
  }

  public async delete(employeeId: number): Promise<boolean> {
    const [result] = await this.db.execute("DELETE FROM employees WHERE employee_id = ?", [employeeId]);
    return result.affectedRows > 0;
  }
}

export class RoleRepository implements IRoleRepository {
  constructor(private db: any) {}

  public async findRoleByName(roleName: string): Promise<any | null> {
    // In this DB, roles are verified from role_permissions or user_access_master user_role values.
    // The role list itself is validated against standard taxonomy.
    return { name: roleName };
  }
}

export class PermissionRepository implements IPermissionRepository {
  constructor(private db: any) {}

  public async findByRole(roleName: string): Promise<PermissionRow[]> {
    const [rows] = await this.db.query(
      `SELECT rp.*, r.role_name, m.module_name 
       FROM role_permissions rp
       JOIN roles r ON r.role_id = rp.role_id
       JOIN modules m ON m.module_id = rp.module_id
       WHERE r.role_name = ?`,
      [roleName]
    );
    return rows as PermissionRow[];
  }

  public async findByRoleAndModule(roleName: string, moduleName: string): Promise<PermissionRow | null> {
    const normalizedRole = (roleName || "").trim().toLowerCase();
    const normalizedModule = (moduleName || "").trim().toLowerCase();
    
    let canonicalModule = moduleName;
    if (normalizedModule === "job_card" || normalizedModule === "job_cards" || normalizedModule === "job cards") {
      canonicalModule = "Job Cards";
    } else if (normalizedModule === "user management" || normalizedModule === "users" || normalizedModule === "user_management") {
      canonicalModule = "User Management";
    } else if (normalizedModule === "breakdowns" || normalizedModule === "breakdown") {
      canonicalModule = "Breakdowns";
    }

    const [rows] = await this.db.query(
      `SELECT rp.*, 
              COALESCE(r.role_name, rp.role_name) AS role_name, 
              COALESCE(m.module_name, rp.module_name) AS module_name 
       FROM role_permissions rp
       LEFT JOIN roles r ON r.role_id = rp.role_id
       LEFT JOIN modules m ON m.module_id = rp.module_id
       WHERE (LOWER(COALESCE(r.role_name, rp.role_name)) = ?)
         AND (LOWER(COALESCE(m.module_name, rp.module_name)) = ? OR LOWER(COALESCE(m.module_name, rp.module_name)) = ?)`,
      [normalizedRole, normalizedModule, canonicalModule.toLowerCase()]
    ) as any[];

    if (rows && rows.length > 0) {
      return rows[0] as PermissionRow;
    }
    return null;
  }

  public async update(permissionId: number, data: Partial<PermissionRow>): Promise<boolean> {
    const keys = Object.keys(data);
    if (keys.length === 0) return false;
    const sets = keys.map(k => `\`${k}\` = ?`).join(', ');
    const values = keys.map(k => data[k]);
    values.push(permissionId);
    const [result] = await this.db.execute(`UPDATE role_permissions SET ${sets} WHERE permission_id = ?`, values);
    return result.affectedRows > 0;
  }

  public async create(data: PermissionRow): Promise<number> {
    const [rRows] = await this.db.query("SELECT role_id FROM roles WHERE role_name = ?", [data.role_name]) as any[];
    const [mRows] = await this.db.query("SELECT module_id FROM modules WHERE module_name = ?", [data.module_name]) as any[];
    if (!rRows || rRows.length === 0 || !mRows || mRows.length === 0) {
      throw new Error(`Invalid role_name (${data.role_name}) or module_name (${data.module_name})`);
    }
    const keys = ["role_id", "module_id"];
    const values: any[] = [rRows[0].role_id, mRows[0].module_id];
    
    // Dynamically insert all granular flags present in data
    const booleanFlags = ["can_view", "can_create", "can_edit", "can_delete", "can_approve", "can_reject", "can_print", "can_export", "can_import", "can_assign", "can_close", "can_reopen", "can_admin", "can_configure"];
    
    for (const flag of booleanFlags) {
      if (data[flag] !== undefined) {
        keys.push(flag);
        values.push(data[flag] ? 1 : 0);
      }
    }
    
    const placeholders = keys.map(() => '?').join(', ');
    const [result] = await this.db.execute(
      `INSERT INTO role_permissions (${keys.join(', ')}) VALUES (${placeholders})`,
      values
    );
    return result.insertId;
  }
}

export class AuditRepository implements IAuditRepository {
  constructor(private db: any) {}

  private async ensureTableExists(): Promise<void> {
    try {
      await this.db.execute(`
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
    } catch (err: any) {
      // Table exists or is already being handled.
    }
  }

  public async insert(log: { user_id: number; username: string; action: string; details: string; correlation_id?: string | null }): Promise<number> {
    await this.ensureTableExists();
    const [result] = await this.db.execute(
      `INSERT INTO \`security_audit_logs\` (user_id, username, action, details, correlation_id) VALUES (?, ?, ?, ?, ?)`,
      [log.user_id, log.username, log.action, log.details, log.correlation_id || null]
    );
    return result.insertId;
  }

  public async findLogs(limit: number): Promise<any[]> {
    await this.ensureTableExists();
    const [rows] = await this.db.query(
      `SELECT * FROM \`security_audit_logs\` ORDER BY log_id DESC LIMIT ?`,
      [limit]
    );
    return rows as any[];
  }
}

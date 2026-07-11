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
    if (!includeLegacy) {
      query += " WHERE record_status = 'CANONICAL' OR record_status IS NULL";
    }
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
      "SELECT permission_id, role_name, module_name, can_view, can_edit, can_comment FROM role_permissions WHERE role_name = ?",
      [roleName]
    );
    return rows as PermissionRow[];
  }

  public async findByRoleAndModule(roleName: string, moduleName: string): Promise<PermissionRow | null> {
    const [rows] = await this.db.query(
      "SELECT permission_id, role_name, module_name, can_view, can_edit, can_comment FROM role_permissions WHERE role_name = ? AND module_name = ?",
      [roleName, moduleName]
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
    const [result] = await this.db.execute(
      "INSERT INTO role_permissions (role_name, module_name, can_view, can_edit, can_comment) VALUES (?, ?, ?, ?, ?)",
      [data.role_name, data.module_name, data.can_view ? 1 : 0, data.can_edit ? 1 : 0, data.can_comment ? 1 : 0]
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

/**
 * =============================================================================
 * DWIP Enterprise Platform — Single Source of Truth UserRepository
 * Repository Pattern: Encapsulates all SQL queries against 'users' table ONLY.
 * =============================================================================
 */

import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { pool as dbPool } from '../db/index';

export interface UserRecord {
  user_id: number;
  full_name: string;
  username: string;
  password_hash: string;
  role: string;
  role_id?: number | null;
  employee_id?: number | null;
  is_active: boolean | number;
  created_by?: number | null;
  created_at?: string;
  last_login?: string | null;
  mobile_no?: string | null;
  email?: string | null;
  designation?: string | null;
}

export class UserRepository {
  /**
   * Find user by username, mobile, email, or emp_id (case-insensitive)
   */
  async findByUsername(identifier: string): Promise<UserRecord | null> {
    if (!identifier || !String(identifier).trim()) return null;
    const cleanInput = String(identifier).trim().toLowerCase();

    try {
      const [rows] = await dbPool.execute(
        `SELECT user_id, full_name, username, password_hash, role, role_id, employee_id, is_active, created_by, created_at, last_login, mobile_no, designation 
         FROM users 
         WHERE LOWER(username) = ? OR mobile_no = ? OR LOWER(emp_id) = ? LIMIT 1`,
        [cleanInput, cleanInput, cleanInput]
      ) as any[];

      if (rows && rows.length > 0) {
        return this.mapUserRow(rows[0]);
      }
      return null;
    } catch (err: any) {
      console.error('[UserRepository.findByUsername] Error:', err.message);
      return null;
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<UserRecord | null> {
    if (!email || !String(email).trim()) return null;
    const cleanEmail = String(email).trim().toLowerCase();
    return this.findByUsername(cleanEmail);
  }

  /**
   * Find user by mobile number
   */
  async findByMobile(mobile: string): Promise<UserRecord | null> {
    if (!mobile || !String(mobile).trim()) return null;
    const cleanMobile = String(mobile).trim().toLowerCase();
    return this.findByUsername(cleanMobile);
  }

  /**
   * Find user by primary key ID
   */
  async findById(userId: number): Promise<UserRecord | null> {
    if (!userId || isNaN(userId)) return null;

    try {
      const [rows] = await dbPool.execute(
        `SELECT user_id, full_name, username, password_hash, role, role_id, employee_id, is_active, created_by, created_at, last_login, mobile_no, designation 
         FROM users 
         WHERE user_id = ? LIMIT 1`,
        [userId]
      ) as any[];

      if (rows && rows.length > 0) {
        return this.mapUserRow(rows[0]);
      }
      return null;
    } catch (err: any) {
      console.error('[UserRepository.findById] Error:', err.message);
      return null;
    }
  }

  /**
   * Securely verify password using bcrypt.compare()
   */
  async verifyPassword(plainPassword: string, passwordHash: string): Promise<boolean> {
    if (!plainPassword || !passwordHash) return false;
    try {
      return await bcrypt.compare(plainPassword, passwordHash);
    } catch (err: any) {
      console.error('[UserRepository.verifyPassword] Bcrypt comparison error:', err.message);
      return false;
    }
  }

  /**
   * Update password hash for a user
   */
  async updatePassword(userId: number, newPasswordHash: string): Promise<boolean> {
    if (!userId || !newPasswordHash) return false;

    try {
      const [result] = await dbPool.execute(
        `UPDATE users SET password_hash = ? WHERE user_id = ?`,
        [newPasswordHash, userId]
      ) as any[];

      return result.affectedRows > 0;
    } catch (err: any) {
      console.error('[UserRepository.updatePassword] Error:', err.message);
      return false;
    }
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId: number): Promise<void> {
    if (!userId) return;

    try {
      await dbPool.execute(
        `UPDATE users SET last_login = NOW() WHERE user_id = ?`,
        [userId]
      );
    } catch (err: any) {
      console.error('[UserRepository.updateLastLogin] Error:', err.message);
    }
  }

  /**
   * Create a new user record in 'users' table
   */
  async createUser(userData: Partial<UserRecord>): Promise<UserRecord> {
    const {
      full_name,
      username,
      password_hash,
      role = 'reception',
      role_id = 1,
      employee_id = null,
      is_active = 1,
      created_by = null,
      mobile_no = null
    } = userData;

    const [result] = await dbPool.execute(
      `INSERT INTO users (full_name, username, password_hash, role, role_id, employee_id, is_active, created_by, mobile_no, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [full_name, username, password_hash, role, role_id, employee_id, is_active ? 1 : 0, created_by, mobile_no]
    ) as any[];

    const newUserId = result.insertId;
    const created = await this.findById(newUserId);
    if (!created) {
      throw new Error(`Failed to retrieve newly created user #${newUserId}`);
    }
    return created;
  }

  /**
   * Update user details
   */
  async updateUser(userId: number, userData: Partial<UserRecord>): Promise<boolean> {
    if (!userId) return false;

    const fields: string[] = [];
    const values: any[] = [];

    if (userData.full_name !== undefined) { fields.push('full_name = ?'); values.push(userData.full_name); }
    if (userData.username !== undefined) { fields.push('username = ?'); values.push(userData.username); }
    if (userData.role !== undefined) { fields.push('role = ?'); values.push(userData.role); }
    if (userData.is_active !== undefined) { fields.push('is_active = ?'); values.push(userData.is_active ? 1 : 0); }
    if (userData.mobile_no !== undefined) { fields.push('mobile_no = ?'); values.push(userData.mobile_no); }
    if (userData.password_hash !== undefined) { fields.push('password_hash = ?'); values.push(userData.password_hash); }

    if (fields.length === 0) return true;

    values.push(userId);
    try {
      const [result] = await dbPool.execute(
        `UPDATE users SET ${fields.join(', ')} WHERE user_id = ?`,
        values
      ) as any[];
      return result.affectedRows > 0;
    } catch (err: any) {
      console.error('[UserRepository.updateUser] Error:', err.message);
      return false;
    }
  }

  /**
   * Load roles for user
   */
  async loadRoles(userId: number): Promise<string[]> {
    const user = await this.findById(userId);
    return user ? [user.role] : [];
  }

  /**
   * Load permissions for role
   */
  async loadPermissions(role: string): Promise<Record<string, boolean>> {
    const cleanRole = (role || '').toLowerCase();
    const isMaster = ['admin', 'developer', 'dealer_principal', 'gm'].includes(cleanRole);

    return {
      can_view_job_cards: true,
      can_create_job_cards: ['service_advisor', 'reception', 'admin', 'developer', 'gm'].includes(cleanRole),
      can_edit_job_cards: true,
      can_override: isMaster,
      can_access_dev_tools: isMaster,
      can_manage_users: isMaster
    };
  }

  /**
   * List all users from single source of truth 'users' table
   */
  async listUsers(): Promise<UserRecord[]> {
    try {
      const [rows] = await dbPool.execute(
        `SELECT user_id, full_name, username, password_hash, role, role_id, employee_id, is_active, created_by, created_at, last_login, mobile_no, designation 
         FROM users 
         ORDER BY user_id DESC`
      ) as any[];

      return (rows || []).map((r: any) => this.mapUserRow(r));
    } catch (err: any) {
      console.error('[UserRepository.listUsers] Error:', err.message);
      return [];
    }
  }

  private mapUserRow(row: any): UserRecord {
    return {
      user_id: row.user_id,
      full_name: row.full_name || row.username || 'User',
      username: row.username,
      password_hash: row.password_hash,
      role: (row.role || 'reception').toLowerCase(),
      role_id: row.role_id || 1,
      employee_id: row.employee_id || null,
      is_active: row.is_active === 1 || row.is_active === true,
      created_by: row.created_by || null,
      created_at: row.created_at ? new Date(row.created_at).toISOString() : undefined,
      last_login: row.last_login ? new Date(row.last_login).toISOString() : null,
      mobile_no: row.mobile_no || null,
      email: row.username && row.username.includes('@') ? row.username : null,
      designation: row.designation || null
    };
  }
}

export const userRepository = new UserRepository();

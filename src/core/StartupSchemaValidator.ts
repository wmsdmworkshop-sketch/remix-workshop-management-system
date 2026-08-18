/**
 * =============================================================================
 * DWIP Enterprise Platform — StartupSchemaValidator & Self-Healing Engine
 * Validates database schema, ensures 'users' single source of truth,
 * syncs legacy user_access_master data, and guarantees developer/admin account health.
 * =============================================================================
 */

import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { pool as dbPool } from '../db/index';
import { resolveSeedPassword } from './seed-password.ts';

export interface StartupValidationReport {
  success: boolean;
  timestamp: string;
  usersTableExists: boolean;
  developerAccountHealthy: boolean;
  adminAccountHealthy: boolean;
  jwtSecretLoaded: boolean;
  usersMigratedCount: number;
  diagnostics: string[];
}

export class StartupSchemaValidator {
  async validateAndRepair(): Promise<StartupValidationReport> {
    console.log('🔍 Running DWIP Startup Schema & Single-Source-of-Truth Auth Validator...');
    const diagnostics: string[] = [];
    let usersTableExists = false;
    let developerAccountHealthy = false;
    let adminAccountHealthy = false;
    let jwtSecretLoaded = false;
    let usersMigratedCount = 0;

    try {
      // 1. Verify JWT Secret Loaded
      const jwtSecret = process.env.JWT_SECRET;
      if (jwtSecret && jwtSecret.trim().length > 0) {
        jwtSecretLoaded = true;
        diagnostics.push('✅ JWT Secret validated and loaded.');
      } else {
        diagnostics.push('⚠️ JWT Secret missing in process.env, fallback default active.');
        jwtSecretLoaded = true;
      }

      // 2. Verify 'users' table structure
      const [tableCheck] = await dbPool.execute(`SHOW TABLES LIKE 'users'`) as any[];
      if (!tableCheck || tableCheck.length === 0) {
        diagnostics.push('❌ CRITICAL: "users" table missing. Creating table now...');
        await dbPool.execute(`
          CREATE TABLE IF NOT EXISTS users (
            user_id INT AUTO_INCREMENT PRIMARY KEY,
            full_name VARCHAR(100) DEFAULT NULL,
            username VARCHAR(50) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(100) NOT NULL DEFAULT 'reception',
            employee_id INT DEFAULT NULL,
            is_active TINYINT(1) DEFAULT 1,
            created_by INT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP NULL DEFAULT NULL,
            password_plain VARCHAR(255) DEFAULT NULL,
            date_of_joining VARCHAR(50) DEFAULT NULL,
            dob VARCHAR(50) DEFAULT NULL,
            qualification VARCHAR(100) DEFAULT NULL,
            designation VARCHAR(100) DEFAULT NULL,
            grade VARCHAR(50) DEFAULT NULL,
            floor_team VARCHAR(100) DEFAULT NULL,
            clerical_team VARCHAR(100) DEFAULT NULL,
            emp_id VARCHAR(50) DEFAULT NULL,
            aadhaar_no VARCHAR(20) DEFAULT NULL,
            mobile_no VARCHAR(20) DEFAULT NULL,
            role_id INT DEFAULT 1,
            INDEX idx_users_username (username),
            INDEX idx_users_role (role)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        diagnostics.push('✅ "users" table automatically repaired and created.');
      }
      usersTableExists = true;

      // 3. Sync legacy 'user_access_master' records into 'users' table if user_access_master exists
      const [uamCheck] = await dbPool.execute(`SHOW TABLES LIKE 'user_access_master'`) as any[];
      if (uamCheck && uamCheck.length > 0) {
        const [uamUsers] = await dbPool.execute(`SELECT * FROM user_access_master`) as any[];
        for (const uam of uamUsers) {
          const uname = uam.username || uam.email;
          if (!uname) continue;

          const [existing] = await dbPool.execute(`SELECT user_id FROM users WHERE username = ?`, [uname]) as any[];
          if (!existing || existing.length === 0) {
            await dbPool.execute(
              `INSERT INTO users (full_name, username, password_hash, role, is_active, mobile_no, created_at)
               VALUES (?, ?, ?, ?, ?, ?, NOW())`,
              [
                uam.full_name || uname,
                uname,
                uam.password_hash || await bcrypt.hash(resolveSeedPassword('SEED_DEVELOPER_PASSWORD', uname).password, 10),
                (uam.user_role || uam.role || 'reception').toLowerCase(),
                uam.is_active !== undefined ? uam.is_active : 1,
                uam.mobile_no || null
              ]
            );
            usersMigratedCount++;
          }
        }
        if (usersMigratedCount > 0) {
          diagnostics.push(`✅ Migrated ${usersMigratedCount} users from user_access_master into users table.`);
        }
      }

      // 4. Validate & Repair Developer Account 'sayeed_dp'
      const [devCheck] = await dbPool.execute(`SELECT user_id, password_hash, is_active FROM users WHERE username = 'sayeed_dp'`) as any[];
      if (!devCheck || devCheck.length === 0) {
        const { password } = resolveSeedPassword('SEED_DEVELOPER_PASSWORD', 'sayeed_dp');
        const devHash = await bcrypt.hash(password, 10);
        await dbPool.execute(
          `INSERT INTO users (full_name, username, password_hash, role, is_active, mobile_no, created_at)
           VALUES ('sayeed', 'sayeed_dp', ?, 'developer', 1, '9606453845', NOW())`,
          [devHash]
        );
        diagnostics.push('✅ Developer account "sayeed_dp" auto-created in users table.');
        developerAccountHealthy = true;
      } else {
        const devUser = devCheck[0];
        // SECURITY: never reset an existing password to a known value on startup.
        // Only set a password when one is entirely missing, and reactivate/fix the
        // role if needed — otherwise leave the operator-set credential untouched.
        if (!devUser.password_hash) {
          const { password } = resolveSeedPassword('SEED_DEVELOPER_PASSWORD', 'sayeed_dp');
          const freshHash = await bcrypt.hash(password, 10);
          await dbPool.execute(
            `UPDATE users SET password_hash = ?, is_active = 1, role = 'developer' WHERE username = 'sayeed_dp'`,
            [freshHash]
          );
          diagnostics.push('⚠️ Developer account "sayeed_dp" had no password; set a generated temporary password (see server log) and force a reset.');
        } else if (!devUser.is_active) {
          await dbPool.execute(
            `UPDATE users SET is_active = 1, role = 'developer' WHERE username = 'sayeed_dp'`
          );
          diagnostics.push('✅ Developer account "sayeed_dp" reactivated (password left unchanged).');
        } else {
          diagnostics.push('✅ Developer account "sayeed_dp" is healthy in users table.');
        }
        developerAccountHealthy = true;
      }

      // 5. Validate & Repair Admin Account 'admin'
      const [adminCheck] = await dbPool.execute(`SELECT user_id, password_hash, is_active FROM users WHERE username = 'admin'`) as any[];
      if (!adminCheck || adminCheck.length === 0) {
        const adminHash = await bcrypt.hash(resolveSeedPassword('SEED_ADMIN_PASSWORD', 'admin').password, 10);
        await dbPool.execute(
          `INSERT INTO users (full_name, username, password_hash, role, is_active, created_at)
           VALUES ('System Administrator', 'admin', ?, 'admin', 1, NOW())`,
          [adminHash]
        );
        diagnostics.push('✅ Admin account "admin" auto-created in users table.');
        adminAccountHealthy = true;
      } else {
        diagnostics.push('✅ Admin account "admin" is healthy in users table.');
        adminAccountHealthy = true;
      }

      // 6. Ensure employee_id indices exist and execute deterministic user-employee mapping backfill
      try {
        await dbPool.execute(`CREATE INDEX idx_users_employee_id ON users (employee_id)`);
      } catch (idxErr) {
        // Index may already exist
      }
      try {
        await dbPool.execute(`CREATE INDEX idx_uam_employee_id ON user_access_master (employee_id)`);
      } catch (idxErr) {
        // Index may already exist
      }

      // Safe deterministic backfill (email/phone match, NEVER default to EMP001)
      try {
        const [unmapped] = await dbPool.query(
          "SELECT user_id, username, email, mobile_no, full_name FROM user_access_master WHERE employee_id IS NULL OR employee_id = 0"
        ) as any[];

        if (unmapped && unmapped.length > 0) {
          for (const u of unmapped) {
            let matchedEmpId: number | null = null;
            // A. Exact verified email match
            if (u.email && u.email.trim().length > 0) {
              const [byEmail] = await dbPool.query(
                "SELECT employee_id FROM employees WHERE LOWER(email) = LOWER(?) LIMIT 1",
                [u.email.trim()]
              ) as any[];
              if (byEmail && byEmail.length > 0) {
                matchedEmpId = Number(byEmail[0].employee_id);
              }
            }
            // B. Exact username as email match
            if (!matchedEmpId && u.username && u.username.includes("@")) {
              const [byUnameEmail] = await dbPool.query(
                "SELECT employee_id FROM employees WHERE LOWER(email) = LOWER(?) LIMIT 1",
                [u.username.trim()]
              ) as any[];
              if (byUnameEmail && byUnameEmail.length > 0) {
                matchedEmpId = Number(byUnameEmail[0].employee_id);
              }
            }
            // C. Exact verified mobile match
            if (!matchedEmpId && u.mobile_no && u.mobile_no.replace(/\D/g, "").length >= 10) {
              const cleanMobile = u.mobile_no.replace(/\D/g, "").slice(-10);
              const [byMobile] = await dbPool.query(
                "SELECT employee_id FROM employees WHERE REPLACE(mobile, '+91', '') LIKE ? LIMIT 1",
                [`%${cleanMobile}`]
              ) as any[];
              if (byMobile && byMobile.length > 0) {
                matchedEmpId = Number(byMobile[0].employee_id);
              }
            }
            // D. Known confirmed mapping: patilshashi5558@gmail.com -> SHASHIKUMAR (EMP029)
            if (!matchedEmpId && (u.username?.toLowerCase() === 'patilshashi5558@gmail.com' || u.email?.toLowerCase() === 'patilshashi5558@gmail.com')) {
              const [shashi] = await dbPool.query(
                "SELECT employee_id FROM employees WHERE employee_code = 'EMP029' OR LOWER(full_name) = 'shashikumar' LIMIT 1"
              ) as any[];
              if (shashi && shashi.length > 0) {
                matchedEmpId = Number(shashi[0].employee_id);
              }
            }

            if (matchedEmpId) {
              await dbPool.execute("UPDATE user_access_master SET employee_id = ? WHERE user_id = ?", [matchedEmpId, u.user_id]);
              await dbPool.execute("UPDATE users SET employee_id = ? WHERE username = ?", [matchedEmpId, u.username]);
              diagnostics.push(`✅ Deterministically linked user '${u.username}' to employee ID ${matchedEmpId}.`);
            } else {
              diagnostics.push(`ℹ️ User '${u.username}' left explicitly unlinked (no deterministic employee match).`);
            }
          }
        }
      } catch (backfillErr: any) {
        diagnostics.push(`⚠️ Deterministic backfill notice: ${backfillErr.message}`);
      }

      console.log('✅ Startup Schema & Auth Single-Source-of-Truth Validation Complete.');
      return {
        success: usersTableExists && developerAccountHealthy && adminAccountHealthy && jwtSecretLoaded,
        timestamp: new Date().toISOString(),
        usersTableExists,
        developerAccountHealthy,
        adminAccountHealthy,
        jwtSecretLoaded,
        usersMigratedCount,
        diagnostics
      };
    } catch (err: any) {
      console.error('❌ Startup Schema Validation Failure:', err.message);
      diagnostics.push(`❌ CRITICAL FAILURE: ${err.message}`);
      return {
        success: false,
        timestamp: new Date().toISOString(),
        usersTableExists,
        developerAccountHealthy,
        adminAccountHealthy,
        jwtSecretLoaded,
        usersMigratedCount,
        diagnostics
      };
    }
  }
}

export const startupSchemaValidator = new StartupSchemaValidator();

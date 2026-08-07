/**
 * =============================================================================
 * DWIP Enterprise V1.1.0 — DDL Migration Script for Feature P1-003
 * Enterprise Field-Level Role-Based Access Control (Field RBAC)
 * =============================================================================
 */

import mysql from 'mysql2/promise';

import dotenv from 'dotenv';
dotenv.config();

async function migrateP1003() {
  console.log('🚀 Connecting to Cloud SQL MySQL for P1-003 DDL Migration...');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '35.200.150.167',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'WmsSecureMySQL2026!',
    database: process.env.DB_DATABASE || 'railway'
  });

  try {
    // 1. Create field_permissions table
    console.log('📦 Creating field_permissions table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS \`field_permissions\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`role\` VARCHAR(50) NOT NULL,
        \`workflow_stage\` VARCHAR(50) NOT NULL DEFAULT 'ANY',
        \`field_name\` VARCHAR(100) NOT NULL,
        \`permission_level\` ENUM('EDIT', 'READ_ONLY', 'HIDDEN', 'REQUIRES_APPROVAL', 'OVERRIDE', 'LOCKED') NOT NULL DEFAULT 'READ_ONLY',
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY \`uniq_role_stage_field\` (\`role\`, \`workflow_stage\`, \`field_name\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 2. Create field_override_requests table
    console.log('📦 Creating field_override_requests table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS \`field_override_requests\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`job_card_id\` INT NOT NULL,
        \`field_name\` VARCHAR(100) NOT NULL,
        \`requested_value\` TEXT NOT NULL,
        \`requested_by_user_id\` INT DEFAULT NULL,
        \`requested_by_name\` VARCHAR(100) NOT NULL,
        \`requested_role\` VARCHAR(50) NOT NULL,
        \`status\` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
        \`request_reason\` TEXT NOT NULL,
        \`approved_by_name\` VARCHAR(100) DEFAULT NULL,
        \`approved_role\` VARCHAR(50) DEFAULT NULL,
        \`approval_notes\` TEXT DEFAULT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_override_jc\` (\`job_card_id\`),
        INDEX \`idx_override_status\` (\`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 3. Create field_audit_history table
    console.log('📦 Creating field_audit_history table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS \`field_audit_history\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`job_card_id\` INT NOT NULL,
        \`field_name\` VARCHAR(100) NOT NULL,
        \`old_value\` TEXT DEFAULT NULL,
        \`new_value\` TEXT DEFAULT NULL,
        \`user_id\` INT DEFAULT NULL,
        \`user_name\` VARCHAR(100) NOT NULL,
        \`role\` VARCHAR(50) NOT NULL,
        \`branch_id\` INT DEFAULT 1,
        \`reason\` TEXT DEFAULT NULL,
        \`workflow_stage\` VARCHAR(50) NOT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_field_audit_jc\` (\`job_card_id\`),
        INDEX \`idx_field_audit_field\` (\`field_name\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Seed initial default field permissions
    console.log('🌱 Seeding initial field permission rules...');
    const seedRules = [
      // System JC Number is locked for ALL roles in ALL stages
      ['ANY', 'ANY', 'system_job_card_no', 'LOCKED'],
      // Odometer editable in Draft/Waiting, read-only/locked post-submission
      ['reception', 'Draft', 'odometer', 'EDIT'],
      ['service_advisor', 'Draft', 'odometer', 'EDIT'],
      ['service_advisor', 'Work In Progress', 'odometer', 'LOCKED'],
      ['technician', 'Work In Progress', 'odometer', 'LOCKED'],
      ['gm', 'ANY', 'odometer', 'OVERRIDE'],
      ['admin', 'ANY', 'odometer', 'OVERRIDE'],
      ['developer', 'ANY', 'odometer', 'OVERRIDE'],
      // Warranty Type & Goodwill require approval post-submission
      ['service_advisor', 'Draft', 'warranty_type', 'EDIT'],
      ['service_advisor', 'Work In Progress', 'warranty_type', 'REQUIRES_APPROVAL'],
      ['service_advisor', 'Work In Progress', 'goodwill', 'REQUIRES_APPROVAL'],
      ['service_manager', 'ANY', 'goodwill', 'EDIT'],
      ['warranty_manager', 'ANY', 'warranty_type', 'EDIT']
    ];

    for (const [role, stage, field, perm] of seedRules) {
      await connection.execute(`
        INSERT INTO field_permissions (role, workflow_stage, field_name, permission_level)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE permission_level = VALUES(permission_level);
      `, [role, stage, field, perm]);
    }

    console.log('✅ P1-003 DDL Migration Completed Successfully!');
  } catch (err: any) {
    console.error('❌ P1-003 DDL Migration Failed:', err.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrateP1003();

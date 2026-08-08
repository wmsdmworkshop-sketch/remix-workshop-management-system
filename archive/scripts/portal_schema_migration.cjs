#!/usr/bin/env node
// ============================================================
// DWIP Customer Portal V2 — Database Schema Migration
// ============================================================
// Adds 4 new portal-specific tables to the existing MySQL DB.
// ADDITIVE ONLY — No changes to any existing ERP tables.
// Safe to run multiple times (uses IF NOT EXISTS).
// ============================================================

const mysql = require("mysql2/promise");
require("dotenv").config();

const DB_CONFIG = {
  host: process.env.DB_HOST || "35.200.150.167",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "railway",
  port: parseInt(process.env.DB_PORT || "3306"),
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
};

const MIGRATIONS = [
  // ---- Table 1: Portal Users ----
  // Stores customer portal login accounts.
  // Deliberately separate from the internal 'employees' / 'customers' tables.
  // Cross-linked to job_cards by mobile number (the universal customer identifier).
  `CREATE TABLE IF NOT EXISTS portal_users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    mobile        VARCHAR(20)  NOT NULL UNIQUE COMMENT 'Normalized +91XXXXXXXXXX',
    name          VARCHAR(150) DEFAULT NULL,
    email         VARCHAR(150) DEFAULT NULL,
    company_name  VARCHAR(250) DEFAULT NULL COMMENT 'For fleet/transport company customers',
    gst_number    VARCHAR(20)  DEFAULT NULL,
    auth_provider ENUM('mobile','google','facebook','apple') NOT NULL DEFAULT 'mobile',
    emergency_contact_name   VARCHAR(150) DEFAULT NULL,
    emergency_contact_mobile VARCHAR(20)  DEFAULT NULL,
    preferred_workshop       VARCHAR(100) DEFAULT 'Devanand Automobiles Main Workshop',
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login    TIMESTAMP NULL DEFAULT NULL,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_portal_users_mobile (mobile)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Customer Portal V2 user accounts'`,

  // ---- Table 2: Portal User Vehicles ----
  // Verified vehicle linkages between a portal user and their vehicle(s).
  // A vehicle is only shown in the portal after verification.
  `CREATE TABLE IF NOT EXISTS portal_user_vehicles (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    portal_user_id      INT NOT NULL,
    vrn                 VARCHAR(20) NOT NULL COMMENT 'Normalized VRN (uppercase, no hyphens)',
    verified            TINYINT(1) NOT NULL DEFAULT 0,
    verification_method ENUM('otp','chassis_last6','invoice_no','job_card_no','manual_admin') DEFAULT NULL,
    verification_value  VARCHAR(100) DEFAULT NULL COMMENT 'Hashed/masked value used for verification',
    verified_at         TIMESTAMP NULL DEFAULT NULL,
    added_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_vrn (portal_user_id, vrn),
    FOREIGN KEY (portal_user_id) REFERENCES portal_users(id) ON DELETE CASCADE,
    INDEX idx_puv_vrn (vrn)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Verified vehicle-to-customer portal linkages'`,

  // ---- Table 3: Notification Preferences ----
  // Per-customer notification channel preferences.
  `CREATE TABLE IF NOT EXISTS portal_notification_prefs (
    portal_user_id          INT PRIMARY KEY,
    sms_enabled             TINYINT(1) NOT NULL DEFAULT 1,
    whatsapp_enabled        TINYINT(1) NOT NULL DEFAULT 1,
    email_enabled           TINYINT(1) NOT NULL DEFAULT 0,
    push_enabled            TINYINT(1) NOT NULL DEFAULT 1,
    estimate_alerts         TINYINT(1) NOT NULL DEFAULT 1,
    vehicle_ready_alerts    TINYINT(1) NOT NULL DEFAULT 1,
    payment_alerts          TINYINT(1) NOT NULL DEFAULT 1,
    amc_renewal_alerts      TINYINT(1) NOT NULL DEFAULT 1,
    service_reminder_alerts TINYINT(1) NOT NULL DEFAULT 1,
    offer_alerts            TINYINT(1) NOT NULL DEFAULT 0,
    updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (portal_user_id) REFERENCES portal_users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Customer portal notification channel preferences'`,

  // ---- Table 4: Portal Devices ----
  // Push notification device tokens (FCM for Android/Web, APNs future).
  `CREATE TABLE IF NOT EXISTS portal_devices (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    portal_user_id  INT NOT NULL,
    fcm_token       TEXT NOT NULL,
    platform        ENUM('web','android','ios') NOT NULL DEFAULT 'web',
    user_agent      VARCHAR(500) DEFAULT NULL,
    registered_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_active     TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (portal_user_id) REFERENCES portal_users(id) ON DELETE CASCADE,
    INDEX idx_pd_user (portal_user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Customer portal push notification device tokens'`,

  // ---- Table 5: Support Tickets ----
  // Customer-raised complaints and callback requests.
  `CREATE TABLE IF NOT EXISTS portal_support_tickets (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    ticket_no       VARCHAR(20) NOT NULL UNIQUE COMMENT 'Format: TKT-YYYYMMDD-NNN',
    portal_user_id  INT NOT NULL,
    mobile          VARCHAR(20) NOT NULL,
    ticket_type     ENUM('complaint','callback','inquiry','breakdown') NOT NULL,
    subject         VARCHAR(300) NOT NULL,
    detail          TEXT DEFAULT NULL,
    severity        ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
    vrn             VARCHAR(20)  DEFAULT NULL COMMENT 'Associated vehicle if applicable',
    job_card_no     VARCHAR(30)  DEFAULT NULL COMMENT 'Associated job card if applicable',
    preferred_callback_time VARCHAR(100) DEFAULT NULL,
    status          ENUM('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
    assigned_to     VARCHAR(100) DEFAULT NULL,
    resolution_note TEXT DEFAULT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (portal_user_id) REFERENCES portal_users(id) ON DELETE CASCADE,
    INDEX idx_pst_mobile (mobile),
    INDEX idx_pst_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Customer portal support tickets and callback requests'`,
];

async function runMigrations() {
  console.log("=".repeat(60));
  console.log("DWIP Customer Portal V2 — Schema Migration");
  console.log("=".repeat(60));
  console.log(`Target: ${DB_CONFIG.host}/${DB_CONFIG.database}`);
  console.log();

  let conn;
  try {
    conn = await mysql.createConnection(DB_CONFIG);
    console.log("✅ Connected to MySQL database.");

    for (let i = 0; i < MIGRATIONS.length; i++) {
      const sql = MIGRATIONS[i];
      const tableName = (sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/) || [])[1];
      process.stdout.write(`   [${i + 1}/${MIGRATIONS.length}] Creating table '${tableName}'... `);
      try {
        await conn.execute(sql);
        console.log("✅ OK");
      } catch (err) {
        console.log("❌ FAILED");
        throw err;
      }
    }

    console.log();
    console.log("✅ All migrations completed successfully.");
    console.log();

    // Verify tables were created
    const [rows] = await conn.execute(
      `SELECT TABLE_NAME, TABLE_ROWS, TABLE_COMMENT
       FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (
         'portal_users','portal_user_vehicles','portal_notification_prefs',
         'portal_devices','portal_support_tickets'
       )
       ORDER BY TABLE_NAME`,
      [DB_CONFIG.database]
    );
    console.log("Verified tables:");
    for (const row of rows) {
      console.log(`  ✅ ${row.TABLE_NAME} — ${row.TABLE_COMMENT}`);
    }

  } catch (err) {
    console.error("\n❌ Migration failed:", err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

runMigrations();

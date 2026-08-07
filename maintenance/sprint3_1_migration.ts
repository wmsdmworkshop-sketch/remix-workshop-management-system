import mysql from "mysql2/promise";
import { envConfig } from "../src/config/env.ts";

async function runMigration() {
  const connection = await mysql.createConnection({
    host: envConfig.DB_HOST,
    port: envConfig.DB_PORT,
    user: envConfig.DB_USER,
    password: envConfig.DB_PASSWORD,
    database: envConfig.DB_DATABASE,
    ssl: envConfig.DB_SSL ? { rejectUnauthorized: false } : undefined
  });

  console.log("Connected to Cloud SQL MySQL database. Running Sprint 3.1 Migration...");

  try {
    // 1. Create approval_requests table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS approval_requests (
        approval_request_id VARCHAR(36) PRIMARY KEY,
        entity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(50) NOT NULL,
        workflow_type VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL,
        strategy VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);
    console.log("- Created table 'approval_requests'");

    // 2. Create approval_decisions table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS approval_decisions (
        decision_id VARCHAR(36) PRIMARY KEY,
        approval_request_id VARCHAR(36) NOT NULL,
        actor_id VARCHAR(50) NOT NULL,
        actor_role VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL,
        comments TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (approval_request_id) REFERENCES approval_requests(approval_request_id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);
    console.log("- Created table 'approval_decisions'");

    // 3. Create approval_delegations table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS approval_delegations (
        delegation_id VARCHAR(36) PRIMARY KEY,
        approval_request_id VARCHAR(36) NOT NULL,
        from_actor_id VARCHAR(50) NOT NULL,
        to_actor_id VARCHAR(50) NOT NULL,
        to_actor_role VARCHAR(50) NOT NULL,
        reason TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (approval_request_id) REFERENCES approval_requests(approval_request_id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);
    console.log("- Created table 'approval_delegations'");

    // 4. Create approval_steps table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS approval_steps (
        step_id VARCHAR(50) NOT NULL,
        approval_request_id VARCHAR(36) NOT NULL,
        allowed_roles TEXT NOT NULL,
        is_mandatory TINYINT(1) NOT NULL DEFAULT 1,
        sla_minutes INT,
        PRIMARY KEY (step_id, approval_request_id),
        FOREIGN KEY (approval_request_id) REFERENCES approval_requests(approval_request_id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);
    console.log("- Created table 'approval_steps'");

    console.log("Migration executed successfully!");
  } catch (err: any) {
    console.error("Migration failed:", err.message);
  } finally {
    await connection.end();
  }
}

runMigration();

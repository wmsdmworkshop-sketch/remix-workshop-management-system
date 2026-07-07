import { pool as db } from "./index.ts";
import * as fs from "fs";
import * as path from "path";

const DATA_FILE = path.join(process.cwd(), "workshop_db.json");

// Helper to stringify JSON safely
function safeStringify(val: any): string | null {
  if (val === undefined || val === null) return null;
  return typeof val === "object" ? JSON.stringify(val) : String(val);
}

// Helper to parse JSON safely
function safeParse(val: string | null): any {
  if (!val) return null;
  try {
    return JSON.parse(val);
  } catch {
    return val;
  }
}

// Helper to safely format a date value as an ISO string
function safeIsoString(dateVal: any, defaultVal: string): string;
function safeIsoString(dateVal: any, defaultVal: string | null): string | null;
function safeIsoString(dateVal: any, defaultVal: string | null = null): string | null {
  if (!dateVal) return defaultVal;
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return defaultVal;
    return d.toISOString();
  } catch {
    return defaultVal;
  }
}

// Helper to safely format a date value for MySQL datetime format
function safeMysqlDatetime(dateVal: any, defaultVal: string | null = null): string | null {
  const iso = safeIsoString(dateVal, null);
  if (!iso) return defaultVal;
  return iso.slice(0, 19).replace('T', ' ');
}

// Helper to upsert rows into a table using ON DUPLICATE KEY UPDATE
async function upsertRows(tableName: string, rows: any[], primaryKey: string) {
  if (!rows || rows.length === 0) return;
  for (const row of rows) {
    // Clone and sanitize row properties (convert booleans to 1/0 or let mysql2 handle it)
    const sanitizedRow: any = {};
    for (const key of Object.keys(row)) {
      let val = row[key];
      // Convert boolean values explicitly to 1 or 0 for safety with some MySQL configurations
      if (typeof val === "boolean") {
        val = val ? 1 : 0;
      }
      sanitizedRow[key] = val;
    }

    const keys = Object.keys(sanitizedRow);
    const placeholders = keys.map(() => "?").join(", ");
    const updateClauses = keys
      .filter((k) => k !== primaryKey)
      .map((k) => `\`${k}\` = VALUES(\`${k}\`)`)
      .join(", ");

    const sql = `
      INSERT INTO \`${tableName}\` (${keys.map(k => `\`${k}\``).join(", ")})
      VALUES (${placeholders})
      ON DUPLICATE KEY UPDATE ${updateClauses || `\`${primaryKey}\` = \`${primaryKey}\``}
    `;

    const values = keys.map((k) => sanitizedRow[k]);
    await db.execute(sql, values);
  }
}

async function saveJobCardsToMaster(jobCards: any[]) {
  if (!jobCards || jobCards.length === 0) return;
  for (const row of jobCards) {
    // Map status back to job_status enum
    let jobStatus: 'Open' | 'In Progress' | 'Waiting Parts' | 'Ready' | 'Delivered' | 'Carry Forward' | 'Assigned' | 'Unassigned' | 'In Queue' = 'Unassigned';
    const statusLower = String(row.status || '').toLowerCase();
    if (statusLower === 'waiting') {
      jobStatus = 'Unassigned';
    } else if (statusLower === 'active') {
      jobStatus = 'In Progress';
    } else if (statusLower === 'completed') {
      jobStatus = 'Ready';
    } else if (statusLower === 'invoiced') {
      jobStatus = 'Delivered';
    } else if (statusLower === 'carry forward') {
      jobStatus = 'Carry Forward';
    } else if (statusLower === 'rework') {
      jobStatus = 'In Progress';
    } else if (statusLower === 'cancelled') {
      jobStatus = 'Unassigned';
    }

    // Map service_type enum
    let serviceType: string = 'General Repair';
    if (row.sr_type_id === 4) {
      serviceType = 'Oil Change';
    } else if (row.sr_type_id === 3) {
      serviceType = 'Electrical';
    } else if (row.sr_type_id === 2) {
      serviceType = '2 Service';
    } else {
      serviceType = 'General Repair';
    }

    // Prepare database insert/update values
    const masterRow: any = {
      job_card_id: row.job_id,
      job_card_no: row.job_card_no,
      bay_id: row.bay_id || 1, // Default to a valid bay_id
      vehicle_reg: (row.vrn || '').substring(0, 10),
      vin: row.vin ? row.vin.substring(0, 50) : null,
      customer_name: (row.customer_name || 'Walk-in Customer').substring(0, 100),
      driver_mobile: (row.customer_mobile || '0000000000').substring(0, 15),
      service_type: serviceType,
      job_status: jobStatus,
      assigned_to: row.created_by || 22, // Default valid user/employee
      etd: safeMysqlDatetime(row.etd, safeMysqlDatetime(new Date())!),
      actual_delivery: safeMysqlDatetime(row.completed_at, null),
      created_by: row.created_by || 22,
      live_status: row.workshop_stage || 'Waiting',
      billing_status: row.status === 'Invoiced' ? 'Paid' : 'Pending',
      estimated_amount: Number(row.labor_price || 0) + Number(row.parts_price || 0),
      last_service_date: row.last_service_date || row.completed_at || row.created_at || null,
      odometer_reading: row.odometer_reading || row.km_reading || null,
      chassis_no: row.chassis_number || row.vin || null,
      gate_out_time: safeMysqlDatetime(row.gate_out_time, null)
    };

    const keys = Object.keys(masterRow);
    const placeholders = keys.map(() => "?").join(", ");
    const updateClauses = keys
      .filter((k) => k !== "job_card_id")
      .map((k) => `\`${k}\` = VALUES(\`${k}\`)`)
      .join(", ");

    const sql = `
      INSERT INTO \`job_card_master\` (${keys.map(k => `\`${k}\``).join(", ")})
      VALUES (${placeholders})
      ON DUPLICATE KEY UPDATE ${updateClauses}
    `;

    const values = keys.map((k) => masterRow[k]);
    await db.execute(sql, values);
  }
}

export async function ensureTablesExist(): Promise<void> {
  console.log("Checking and verifying database tables...");

  try {
    await db.execute("ALTER TABLE `job_cards` MODIFY `km_reading` INT DEFAULT NULL");
  } catch (e) {
    // Table might not exist yet during initial boot, ignore
  }

  // 1. employees
  await db.execute(`
    CREATE TABLE IF NOT EXISTS \`employees\` (
      \`employee_id\` INT NOT NULL AUTO_INCREMENT,
      \`full_name\` VARCHAR(255) NOT NULL,
      \`employee_code\` VARCHAR(50) NOT NULL UNIQUE,
      \`role\` VARCHAR(100) NOT NULL,
      \`employee_grade\` VARCHAR(50) NOT NULL DEFAULT 'Junior',
      \`basic_salary\` INT NOT NULL DEFAULT 0,
      \`mobile\` VARCHAR(50) NOT NULL DEFAULT '',
      \`is_active\` TINYINT(1) DEFAULT 1,
      \`created_at\` VARCHAR(100) DEFAULT NULL,
      \`allocated_revenue\` INT DEFAULT 0,
      \`target_revenue\` INT DEFAULT NULL,
      \`paid_pct\` VARCHAR(50) DEFAULT NULL,
      \`tml_claim_pct\` VARCHAR(50) DEFAULT NULL,
      PRIMARY KEY (\`employee_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `);

  // 2. bays
  await db.execute(`
    CREATE TABLE IF NOT EXISTS \`bays\` (
      \`bay_id\` INT NOT NULL,
      \`bay_code\` VARCHAR(50) NOT NULL,
      \`bay_name\` VARCHAR(100) NOT NULL,
      \`bay_type\` VARCHAR(100) NOT NULL,
      \`status\` VARCHAR(50) NOT NULL DEFAULT 'Idle',
      \`is_active\` TINYINT(1) DEFAULT 1,
      PRIMARY KEY (\`bay_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `);

  // 3. bay_master
  await db.execute(`
    CREATE TABLE IF NOT EXISTS \`bay_master\` (
      \`bay_id\` INT NOT NULL,
      \`bay_code\` VARCHAR(50) NOT NULL,
      \`bay_name\` VARCHAR(100) NOT NULL,
      \`bay_type\` VARCHAR(100) NOT NULL,
      \`is_active\` TINYINT(1) DEFAULT 1,
      PRIMARY KEY (\`bay_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `);

  // 4. sr_types
  await db.execute(`
    CREATE TABLE IF NOT EXISTS \`sr_types\` (
      \`sr_type_id\` INT NOT NULL,
      \`sr_type_code\` VARCHAR(50) NOT NULL,
      \`sr_type_name\` VARCHAR(100) NOT NULL,
      \`default_duration_mins\` INT NOT NULL DEFAULT 60,
      \`is_active\` TINYINT(1) DEFAULT 1,
      PRIMARY KEY (\`sr_type_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `);

  // 5. revenue_splits
  await db.execute(`
    CREATE TABLE IF NOT EXISTS \`revenue_splits\` (
      \`split_id\` INT NOT NULL,
      \`combination_code\` VARCHAR(50) NOT NULL,
      \`combination_label\` VARCHAR(100) NOT NULL,
      \`person_count\` INT NOT NULL DEFAULT 1,
      \`tech_pct\` INT NOT NULL DEFAULT 0,
      \`co_tech_pct\` INT NOT NULL DEFAULT 0,
      \`electrician_pct\` INT NOT NULL DEFAULT 0,
      \`add_tech_pct\` INT NOT NULL DEFAULT 0,
      \`uses_salary_wt\` TINYINT(1) DEFAULT 0,
      \`senior_override\` TINYINT(1) DEFAULT 0,
      \`notes\` TEXT,
      \`is_active\` TINYINT(1) DEFAULT 1,
      PRIMARY KEY (\`split_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `);

  // 6. alert_configs
  await db.execute(`
    CREATE TABLE IF NOT EXISTS \`alert_configs\` (
      \`alert_config_id\` INT NOT NULL,
      \`alert_code\` VARCHAR(50) NOT NULL,
      \`alert_name\` VARCHAR(100) NOT NULL,
      \`alert_category\` VARCHAR(50) NOT NULL,
      \`trigger_condition\` VARCHAR(255) NOT NULL,
      \`threshold_value\` INT NOT NULL DEFAULT 0,
      \`threshold_unit\` VARCHAR(50) NOT NULL DEFAULT '',
      \`severity\` VARCHAR(50) NOT NULL DEFAULT 'Medium',
      \`is_active\` TINYINT(1) DEFAULT 1,
      PRIMARY KEY (\`alert_config_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `);

  // 7. job_cards
  await db.execute(`
    CREATE TABLE IF NOT EXISTS \`job_cards\` (
      \`job_id\` INT NOT NULL AUTO_INCREMENT,
      \`job_card_no\` VARCHAR(50) NOT NULL,
      \`vrn\` VARCHAR(50) NOT NULL,
      \`customer_name\` VARCHAR(255) NOT NULL,
      \`customer_mobile\` VARCHAR(50) NOT NULL,
      \`vehicle_make\` VARCHAR(50) NOT NULL DEFAULT 'Tata',
      \`vehicle_model\` VARCHAR(100) NOT NULL,
      \`vehicle_year\` INT NOT NULL DEFAULT 2024,
      \`km_reading\` INT DEFAULT NULL,
      \`sr_type_id\` INT NOT NULL DEFAULT 1,
      \`job_description\` TEXT,
      \`priority\` VARCHAR(50) NOT NULL DEFAULT 'Normal',
      \`bay_id\` INT DEFAULT NULL,
      \`status\` VARCHAR(50) NOT NULL DEFAULT 'Waiting',
      \`etd\` VARCHAR(100) DEFAULT NULL,
      \`started_at\` VARCHAR(100) DEFAULT NULL,
      \`completed_at\` VARCHAR(100) DEFAULT NULL,
      \`invoiced_at\` VARCHAR(100) DEFAULT NULL,
      \`created_by\` INT NOT NULL DEFAULT 1,
      \`created_at\` VARCHAR(100) NOT NULL,
      \`updated_at\` VARCHAR(100) DEFAULT NULL,
      \`workshop_stage\` VARCHAR(100) DEFAULT NULL,
      \`l1_delay\` VARCHAR(100) DEFAULT NULL,
      \`l2_delay\` VARCHAR(100) DEFAULT NULL,
      \`l3_delay\` VARCHAR(100) DEFAULT NULL,
      \`l5_delay\` VARCHAR(100) DEFAULT NULL,
      \`delay_notes\` TEXT,
      \`time_slot\` VARCHAR(50) DEFAULT NULL,
      \`tat_status\` VARCHAR(50) DEFAULT NULL,
      \`pending_reason\` TEXT,
      \`remarks\` TEXT,
      \`date_in\` VARCHAR(50) DEFAULT NULL,
      \`time_in\` VARCHAR(50) DEFAULT NULL,
      \`expected_date_out\` VARCHAR(50) DEFAULT NULL,
      \`expected_time_of_completion\` VARCHAR(50) DEFAULT NULL,
      \`time_out\` VARCHAR(50) DEFAULT NULL,
      \`date_completed\` VARCHAR(50) DEFAULT NULL,
      \`bay_no\` VARCHAR(50) DEFAULT NULL,
      \`service_advisor\` VARCHAR(255) DEFAULT NULL,
      \`technician_name\` VARCHAR(255) DEFAULT NULL,
      \`no_of_laborers\` INT DEFAULT 1,
      \`actual_time_taken\` VARCHAR(50) DEFAULT NULL,
      \`numberplate_photo\` TEXT DEFAULT NULL,
      \`odometer_photo\` TEXT DEFAULT NULL,
      \`labor_price\` DECIMAL(10,2) DEFAULT 0,
      \`parts_price\` DECIMAL(10,2) DEFAULT 0,
      PRIMARY KEY (\`job_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `);

  // 8. job_card_master
  await db.execute(`
    CREATE TABLE IF NOT EXISTS \`job_card_master\` (
      \`job_card_id\` INT NOT NULL,
      \`job_card_no\` VARCHAR(50) NOT NULL,
      \`bay_id\` INT NOT NULL DEFAULT 1,
      \`vehicle_reg\` VARCHAR(50) NOT NULL,
      \`customer_name\` VARCHAR(255) NOT NULL,
      \`driver_mobile\` VARCHAR(50) NOT NULL,
      \`service_type\` VARCHAR(255) NOT NULL,
      \`job_status\` VARCHAR(50) NOT NULL,
      \`assigned_to\` INT NOT NULL,
      \`etd\` DATETIME DEFAULT NULL,
      \`actual_delivery\` DATETIME DEFAULT NULL,
      \`created_by\` INT NOT NULL DEFAULT 1,
      \`live_status\` VARCHAR(100) DEFAULT NULL,
      \`billing_status\` VARCHAR(50) DEFAULT NULL,
      \`last_service_date\` VARCHAR(100) DEFAULT NULL,
      \`odometer_reading\` INT DEFAULT NULL,
      \`chassis_no\` VARCHAR(100) DEFAULT NULL,
      PRIMARY KEY (\`job_card_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `);

  // 9. job_technician_maps
  await db.execute(`
    CREATE TABLE IF NOT EXISTS \`job_technician_maps\` (
      \`map_id\` INT NOT NULL AUTO_INCREMENT,
      \`job_id\` INT NOT NULL,
      \`employee_id\` INT NOT NULL,
      \`tech_role\` VARCHAR(50) NOT NULL,
      \`assigned_at\` VARCHAR(100) DEFAULT NULL,
      PRIMARY KEY (\`map_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `);

  // 10. job_revenues
  await db.execute(`
    CREATE TABLE IF NOT EXISTS \`job_revenues\` (
      \`revenue_id\` INT NOT NULL AUTO_INCREMENT,
      \`job_id\` INT NOT NULL,
      \`labour_amount\` INT NOT NULL DEFAULT 0,
      \`parts_amount\` INT NOT NULL DEFAULT 0,
      \`total_amount\` INT NOT NULL DEFAULT 0,
      \`split_id\` INT NOT NULL DEFAULT 1,
      \`calculated_at\` VARCHAR(100) DEFAULT NULL,
      PRIMARY KEY (\`revenue_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `);

  // 11. job_revenue_split_details
  await db.execute(`
    CREATE TABLE IF NOT EXISTS \`job_revenue_split_details\` (
      \`detail_id\` INT NOT NULL AUTO_INCREMENT,
      \`revenue_id\` INT NOT NULL,
      \`employee_id\` INT NOT NULL,
      \`tech_role\` VARCHAR(50) NOT NULL,
      \`split_pct\` INT NOT NULL DEFAULT 0,
      \`split_amount\` INT NOT NULL DEFAULT 0,
      PRIMARY KEY (\`detail_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `);

  // 12. carry_forward_logs
  await db.execute(`
    CREATE TABLE IF NOT EXISTS \`carry_forward_logs\` (
      \`cf_id\` INT NOT NULL AUTO_INCREMENT,
      \`job_id\` INT NOT NULL,
      \`cf_reason\` TEXT,
      \`raised_by\` INT NOT NULL,
      \`approved_by\` INT DEFAULT NULL,
      \`cf_status\` VARCHAR(50) NOT NULL DEFAULT 'Pending',
      \`raised_at\` VARCHAR(100) NOT NULL,
      \`actioned_at\` VARCHAR(100) DEFAULT NULL,
      PRIMARY KEY (\`cf_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `);

  // 13. rework_logs
  await db.execute(`
    CREATE TABLE IF NOT EXISTS \`rework_logs\` (
      \`rework_id\` INT NOT NULL AUTO_INCREMENT,
      \`original_job_id\` INT NOT NULL,
      \`new_job_id\` INT DEFAULT NULL,
      \`rework_reason\` TEXT,
      \`original_tech_id\` INT NOT NULL,
      \`raised_by\` INT NOT NULL,
      \`approved_by\` INT DEFAULT NULL,
      \`rework_status\` VARCHAR(50) NOT NULL DEFAULT 'Pending',
      \`raised_at\` VARCHAR(100) NOT NULL,
      \`actioned_at\` VARCHAR(100) DEFAULT NULL,
      PRIMARY KEY (\`rework_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `);

  // 14. alert_logs
  await db.execute(`
    CREATE TABLE IF NOT EXISTS \`alert_logs\` (
      \`alert_id\` INT NOT NULL AUTO_INCREMENT,
      \`alert_config_id\` INT NOT NULL,
      \`entity_type\` VARCHAR(50) NOT NULL,
      \`entity_id\` INT NOT NULL,
      \`alert_message\` TEXT,
      \`severity\` VARCHAR(50) NOT NULL DEFAULT 'Medium',
      \`status\` VARCHAR(50) NOT NULL DEFAULT 'Active',
      \`acknowledged_by\` INT DEFAULT NULL,
      \`acknowledged_at\` VARCHAR(100) DEFAULT NULL,
      \`resolved_at\` VARCHAR(100) DEFAULT NULL,
      \`created_at\` VARCHAR(100) NOT NULL,
      PRIMARY KEY (\`alert_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `);

  // 15. dms_import_batches
  await db.execute(`
    CREATE TABLE IF NOT EXISTS \`dms_import_batches\` (
      \`batch_id\` INT NOT NULL AUTO_INCREMENT,
      \`imported_by\` INT NOT NULL,
      \`file_name\` VARCHAR(255) NOT NULL,
      \`total_rows\` INT NOT NULL DEFAULT 0,
      \`matched_rows\` INT NOT NULL DEFAULT 0,
      \`unmatched_rows\` INT NOT NULL DEFAULT 0,
      \`status\` VARCHAR(50) NOT NULL DEFAULT 'Processing',
      \`imported_at\` VARCHAR(100) NOT NULL,
      PRIMARY KEY (\`batch_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `);

  // 16. dms_import_rows
  await db.execute(`
    CREATE TABLE IF NOT EXISTS \`dms_import_rows\` (
      \`row_id\` INT NOT NULL AUTO_INCREMENT,
      \`batch_id\` INT NOT NULL,
      \`row_number\` INT NOT NULL,
      \`vrn\` VARCHAR(50) NOT NULL,
      \`job_date\` VARCHAR(100) NOT NULL,
      \`sr_type\` VARCHAR(100) NOT NULL,
      \`labour_amount\` INT NOT NULL DEFAULT 0,
      \`parts_amount\` INT NOT NULL DEFAULT 0,
      \`total_amount\` INT NOT NULL DEFAULT 0,
      \`matched_job_id\` INT DEFAULT NULL,
      \`match_status\` VARCHAR(50) NOT NULL DEFAULT 'Unmatched',
      \`conflict_reason\` TEXT,
      \`resolved_by\` INT DEFAULT NULL,
      \`resolved_at\` VARCHAR(100) DEFAULT NULL,
      \`raw_data\` TEXT,
      PRIMARY KEY (\`row_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `);

  // 17. rework_tracking
  await db.execute(`
    CREATE TABLE IF NOT EXISTS \`rework_tracking\` (
      \`original_job_id\` INT NOT NULL,
      \`rework_job_id\` INT NOT NULL,
      \`vehicle_reg\` VARCHAR(50) NOT NULL,
      \`assigned_technician_id\` INT NOT NULL,
      \`original_closure_date\` DATETIME DEFAULT NULL,
      \`rework_date\` DATETIME DEFAULT NULL,
      \`days_since_original\` INT DEFAULT NULL,
      \`original_issue\` TEXT,
      \`rework_reason\` TEXT,
      \`rework_completed\` TINYINT(1) DEFAULT 0,
      \`rework_revenue\` DECIMAL(10,2) DEFAULT 0,
      \`created_at\` DATETIME DEFAULT NULL,
      PRIMARY KEY (\`original_job_id\`, \`rework_job_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `);

  // 18. technician_kpi_daily
  await db.execute(`
    CREATE TABLE IF NOT EXISTS \`technician_kpi_daily\` (
      \`employee_id\` INT NOT NULL,
      \`kpi_date\` VARCHAR(50) NOT NULL,
      \`jobs_assigned\` INT NOT NULL DEFAULT 0,
      \`jobs_completed\` INT NOT NULL DEFAULT 0,
      \`jobs_open\` INT NOT NULL DEFAULT 0,
      \`revenue_earned\` DECIMAL(10,2) NOT NULL DEFAULT 0,
      \`avg_job_duration\` INT NOT NULL DEFAULT 0,
      \`completion_efficiency\` DECIMAL(5,2) NOT NULL DEFAULT 0,
      \`utilization_percent\` DECIMAL(5,2) NOT NULL DEFAULT 0,
      \`rework_count\` INT NOT NULL DEFAULT 0,
      \`rework_percent\` DECIMAL(5,2) NOT NULL DEFAULT 0,
      \`tml_claims\` INT NOT NULL DEFAULT 0,
      \`tml_claim_rate\` DECIMAL(5,2) NOT NULL DEFAULT 0,
      \`avg_revenue_per_job\` DECIMAL(10,2) NOT NULL DEFAULT 0,
      \`on_time_completion\` DECIMAL(5,2) NOT NULL DEFAULT 95.0,
      \`quality_score\` DECIMAL(5,2) NOT NULL DEFAULT 90.0,
      \`idle_time\` INT NOT NULL DEFAULT 0,
      \`break_time\` INT NOT NULL DEFAULT 0,
      \`overtime_hours\` DECIMAL(5,2) NOT NULL DEFAULT 0,
      \`health_status\` VARCHAR(50) NOT NULL DEFAULT 'GREEN',
      PRIMARY KEY (\`employee_id\`, \`kpi_date\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `);

  // 19. productivity_alerts
  await db.execute(`
    CREATE TABLE IF NOT EXISTS \`productivity_alerts\` (
      \`alert_id\` INT NOT NULL AUTO_INCREMENT,
      \`employee_id\` INT NOT NULL,
      \`alert_type\` VARCHAR(100) NOT NULL,
      \`severity\` VARCHAR(50) NOT NULL,
      \`trigger_value\` DECIMAL(10,2) DEFAULT NULL,
      \`threshold_value\` DECIMAL(10,2) DEFAULT NULL,
      \`alert_message\` TEXT,
      \`recommended_action\` TEXT,
      \`status\` VARCHAR(50) NOT NULL DEFAULT 'Active',
      \`created_at\` DATETIME DEFAULT NULL,
      PRIMARY KEY (\`alert_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `);

  // 20. Ensure column `vin` exists on `job_cards` and `job_card_master`
  try {
    await db.execute("ALTER TABLE `job_cards` ADD COLUMN `vin` VARCHAR(50) DEFAULT NULL");
  } catch (err) {
    // Ignore error if column already exists
  }
  try {
    await db.execute("ALTER TABLE `job_cards` ADD COLUMN `last_service_date` VARCHAR(100) DEFAULT NULL");
  } catch (err) {
    // Ignore error if column already exists
  }
  try {
    await db.execute("ALTER TABLE `job_cards` ADD COLUMN `odometer_reading` INT DEFAULT NULL");
  } catch (err) {
    // Ignore error if column already exists
  }
  try {
    await db.execute("ALTER TABLE `job_card_master` ADD COLUMN `vin` VARCHAR(50) DEFAULT NULL");
  } catch (err) {
    // Ignore error if column already exists
  }
  try {
    await db.execute("ALTER TABLE `job_card_master` ADD COLUMN `last_service_date` VARCHAR(100) DEFAULT NULL");
  } catch (err) {
    // Ignore error if column already exists
  }
  try {
    await db.execute("ALTER TABLE `job_card_master` ADD COLUMN `odometer_reading` INT DEFAULT NULL");
  } catch (err) {
    // Ignore error if column already exists
  }
  try {
    await db.execute("ALTER TABLE `job_card_master` ADD COLUMN `chassis_no` VARCHAR(100) DEFAULT NULL");
  } catch (err) {
    // Ignore error if column already exists
  }
  try {
    await db.execute("ALTER TABLE `job_card_master` ADD COLUMN `gate_out_time` VARCHAR(100) DEFAULT NULL");
  } catch (err) {
    // Ignore error if column already exists
  }

  // 21. models table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS \`models\` (
      \`model_id\` INT NOT NULL AUTO_INCREMENT,
      \`model_name\` VARCHAR(255) NOT NULL UNIQUE,
      PRIMARY KEY (\`model_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `);

  // Seed default models if empty
  try {
    const [rows] = await db.execute("SELECT COUNT(*) as count FROM `models`") as any[];
    if (rows && rows[0].count === 0) {
      const defaultModels = [
        "Prima 5530.S",
        "Signa 4825.TK",
        "Ultra T.7",
        "Nexon EV",
        "Harrier",
        "Safari",
        "Intra V30"
      ];
      for (const m of defaultModels) {
        await db.execute("INSERT INTO `models` (`model_name`) VALUES (?) ON DUPLICATE KEY UPDATE `model_name`=\`model_name\`", [m]);
      }
    }
  } catch (err) {
    console.error("Failed to seed models table:", err);
  }

  // 22. Ensure column `invoice_ocr_data` exists
  try {
    await db.execute("ALTER TABLE `job_cards` ADD COLUMN `invoice_ocr_data` TEXT DEFAULT NULL");
  } catch (err) {
    // Ignore error if column already exists
  }
  try {
    await db.execute("ALTER TABLE `job_card_master` ADD COLUMN `invoice_ocr_data` TEXT DEFAULT NULL");
  } catch (err) {
    // Ignore error if column already exists
  }

  // Ensure column `gate_out_time` exists on job_cards
  try {
    await db.execute("ALTER TABLE `job_cards` ADD COLUMN `gate_out_time` VARCHAR(100) DEFAULT NULL");
  } catch (err) {
    // Ignore error if column already exists
  }

  // 23. roles table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS \`roles\` (
      \`role_id\` INT NOT NULL AUTO_INCREMENT,
      \`role_name\` VARCHAR(255) NOT NULL UNIQUE,
      \`permission_level\` VARCHAR(50) NOT NULL,
      PRIMARY KEY (\`role_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `);

  try {
    const [rows] = await db.execute("SELECT COUNT(*) as count FROM `roles`") as any[];
    if (rows && rows[0].count === 0) {
      const defaultRoles = [
        { name: "admin", level: "full" },
        { name: "service_manager", level: "full" },
        { name: "supervisor", level: "limited" },
        { name: "reception", level: "read" },
        { name: "service_advisor", level: "limited" },
        { name: "developer", level: "full" },
        { name: "gate_personnel", level: "limited" },
        { name: "technician", level: "limited" },
        { name: "accounts", level: "read" }
      ];
      for (const r of defaultRoles) {
        await db.execute("INSERT INTO `roles` (`role_name`, `permission_level`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `permission_level`=?", [r.name, r.level, r.level]);
      }
    }
  } catch (err) {
    console.error("Failed to seed roles table:", err);
  }

  console.log("Database table verification completed.");
}

export async function syncLoad(): Promise<any> {
  try {
    console.log("=== STARTING CLOUD SQL/MYSQL DB LOAD / SEED ===");

    // First ensure that all tables exist so we never get 'Table does not exist' errors
    await ensureTablesExist();

    // Fetch lists from database to check if empty
    const [dbEmployees] = await db.query("SELECT * FROM employees") as any[];
    const [dbBays] = await db.query("SELECT * FROM bays") as any[];

    // If tables are empty, perform first-time seeding from workshop_db.json
    if (dbEmployees.length === 0 && dbBays.length === 0) {
      console.log("Cloud SQL/MySQL tables are empty. Seeding from local workshop_db.json...");
      if (fs.existsSync(DATA_FILE)) {
        const fileContent = fs.readFileSync(DATA_FILE, "utf-8");
        const localData = JSON.parse(fileContent);

        // Seed tables
        await upsertRows("employees", localData.employees, "employee_id");
        await upsertRows("bays", localData.bays, "bay_id");
        
        // Also seed bay_master from localData.bays
        if (localData.bays && localData.bays.length > 0) {
          const bayMasterRows = localData.bays.map((b: any) => ({
            bay_id: b.bay_id,
            bay_code: b.bay_code,
            bay_name: b.bay_name,
            bay_type: b.bay_type,
            is_active: b.is_active ? 1 : 0
          }));
          await upsertRows("bay_master", bayMasterRows, "bay_id");
        }

        await upsertRows("sr_types", localData.srTypes, "sr_type_id");
        await upsertRows("revenue_splits", localData.revenueSplits, "split_id");
        await upsertRows("alert_configs", localData.alertConfigs, "alert_config_id");
        await upsertRows("job_cards", localData.jobCards, "job_id");
        await upsertRows("job_technician_maps", localData.jobTechnicianMaps, "map_id");
        await upsertRows("job_revenues", localData.jobRevenues, "revenue_id");
        await upsertRows("job_revenue_split_details", localData.jobRevenueSplitDetails, "detail_id");
        await upsertRows("carry_forward_logs", localData.carryForwardLogs, "cf_id");
        await upsertRows("rework_logs", localData.reworkLogs, "rework_id");
        await upsertRows("alert_logs", localData.alertLogs, "alert_id");
        await upsertRows("dms_import_batches", localData.dmsImportBatches, "batch_id");
        
        if (localData.dmsImportRows && localData.dmsImportRows.length > 0) {
          const formattedRows = localData.dmsImportRows.map((r: any) => ({
            ...r,
            labour_amount: Math.round(Number(r.labour_amount || 0)),
            parts_amount: Math.round(Number(r.parts_amount || 0)),
            total_amount: Math.round(Number(r.total_amount || 0)),
            raw_data: safeStringify(r.raw_data)
          }));
          await upsertRows("dms_import_rows", formattedRows, "row_id");
        }

        console.log("Seeding complete!");
        return localData;
      }
    }

    // Tables have data or no local file. Fetch complete structure from Railway MySQL!
    console.log("Fetching state from Railway MySQL...");
    const [employees] = await db.query("SELECT * FROM employees") as any[];
    
    // Fetch bays 1-9 dynamically from bay_master
    const [baysMaster] = await db.query("SELECT * FROM bay_master WHERE bay_id BETWEEN 1 AND 9") as any[];
    // Fetch statuses from bays table
    const [baysStatus] = await db.query("SELECT bay_id, status FROM bays") as any[];
    
    // Construct dynamic bays array
    const bays = baysMaster.map((bm: any) => {
      const match = baysStatus.find((b: any) => b.bay_id === bm.bay_id);
      return {
        bay_id: bm.bay_id,
        bay_code: bm.bay_code,
        bay_name: bm.bay_name,
        bay_type: bm.bay_type,
        status: match ? match.status : "Idle",
        is_active: bm.is_active !== undefined ? bm.is_active : 1
      };
    });

    const [srTypes] = await db.query("SELECT * FROM sr_types") as any[];
    const [revenueSplits] = await db.query("SELECT * FROM revenue_splits") as any[];
    const [alertConfigs] = await db.query("SELECT * FROM alert_configs") as any[];
    
    // Fetch from job_card_master as requested
    const [jobCardMasterRows] = await db.query("SELECT * FROM job_card_master") as any[];

    // Fetch job_cards to link fields like km_reading
    let jobCardsRows: any[] = [];
    try {
      const [jcRows] = await db.query("SELECT job_id, km_reading, vehicle_make, vehicle_model, vehicle_year, chassis_number, last_service_date, odometer_reading FROM job_cards") as any[];
      jobCardsRows = jcRows;
    } catch (e) {
      console.error("Could not load job_cards rows for mapping:", e);
    }

    let bayQueueRows: any[] = [];
    try {
      const [bqRows] = await db.query("SELECT * FROM bay_queue") as any[];
      bayQueueRows = bqRows;
    } catch (e) {
      console.error("Could not load bay_queue rows for mapping:", e);
    }

    let jobCardTechRows: any[] = [];
    try {
      const [jctRows] = await db.query("SELECT * FROM job_card_technician") as any[];
      jobCardTechRows = jctRows;
    } catch (e) {
      console.error("Could not load job_card_technician rows for mapping:", e);
    }

    let revenueSplitLogRows: any[] = [];
    try {
      const [rslRows] = await db.query("SELECT * FROM revenue_split_log") as any[];
      revenueSplitLogRows = rslRows;
    } catch (e) {
      console.error("Could not load revenue_split_log rows for mapping:", e);
    }
    
    const [jobTechnicianMaps] = await db.query("SELECT * FROM job_technician_maps") as any[];
    const [jobRevenues] = await db.query("SELECT * FROM job_revenues") as any[];
    const [jobRevenueSplitDetails] = await db.query("SELECT * FROM job_revenue_split_details") as any[];
    const [carryForwardLogs] = await db.query("SELECT * FROM carry_forward_logs") as any[];
    const [reworkLogs] = await db.query("SELECT * FROM rework_logs") as any[];
    const [alertLogs] = await db.query("SELECT * FROM alert_logs") as any[];
    const [dmsImportBatches] = await db.query("SELECT * FROM dms_import_batches") as any[];
    const [dmsImportRows] = await db.query("SELECT * FROM dms_import_rows") as any[];

    // Convert MySQL TINYINT (which comes back as 0 or 1) to actual boolean true/false for JS.
    const mapBooleans = (rows: any[], booleanKeys: string[]) => {
      return rows.map((r) => {
        const mapped = { ...r };
        for (const k of booleanKeys) {
          if (mapped[k] !== undefined && mapped[k] !== null) {
            mapped[k] = Boolean(mapped[k]);
          }
        }
        return mapped;
      });
    };

    const parsedDmsImportRows = dmsImportRows.map((r: any) => ({
      ...r,
      raw_data: safeParse(r.raw_data)
    }));

    // Map job_card_master rows to frontend-expected JobCard interface
    const mappedJobCards = jobCardMasterRows.map((row: any) => {
      // Map job_status to App status
      let mappedStatus: 'Waiting' | 'Active' | 'Completed' | 'Invoiced' | 'Carry Forward' | 'Rework' | 'Cancelled' = 'Waiting';
      const statusLower = String(row.job_status || '').toLowerCase();
      if (statusLower === 'in progress' || statusLower === 'assigned') {
        mappedStatus = 'Active';
      } else if (statusLower === 'ready') {
        mappedStatus = 'Completed';
      } else if (statusLower === 'delivered') {
        mappedStatus = 'Invoiced';
      } else if (statusLower === 'carry forward') {
        mappedStatus = 'Carry Forward';
      } else if (statusLower === 'rework') {
        mappedStatus = 'Rework';
      } else if (statusLower === 'cancelled') {
        mappedStatus = 'Cancelled';
      } else {
        mappedStatus = 'Waiting';
      }

      // Find bay name
      const bay = bays.find((b: any) => Number(b.bay_id) === Number(row.bay_id));
      const bayNo = bay ? bay.bay_name : null;

      // Find technician name
      const emp = employees.find((e: any) => Number(e.employee_id) === Number(row.assigned_to));
      const techName = emp ? emp.full_name : null;

      // Map service_type to sr_type_id
      let srTypeId = 1; // Default to General Repair
      const serviceTypeLower = String(row.service_type || '').toLowerCase();
      if (serviceTypeLower.includes('oil') || serviceTypeLower.includes('quick')) {
        srTypeId = 4; // Quick Service
      } else if (serviceTypeLower.includes('elec') || serviceTypeLower.includes('ac')) {
        srTypeId = 3; // Electrical Repairs
      } else if (serviceTypeLower.includes('service')) {
        srTypeId = 2; // Periodic Maintenance
      }

      // Match with job_cards table
      const jcMatch = jobCardsRows.find((jc: any) => Number(jc.job_id) === Number(row.job_card_id));

      return {
        job_id: Number(row.job_card_id),
        job_card_no: row.job_card_no,
        vrn: row.vehicle_reg || '',
        vin: row.vin || undefined,
        chassis_number: row.chassis_no || (jcMatch ? jcMatch.chassis_number : undefined) || row.vin || undefined,
        customer_name: row.customer_name || 'Walk-in Customer',
        customer_mobile: row.mobile || row.driver_mobile || '0000000000',
        vehicle_make: jcMatch ? jcMatch.vehicle_make : 'Tata',
        vehicle_model: jcMatch && jcMatch.vehicle_model ? jcMatch.vehicle_model : (row.service_type || 'Commercial Vehicle'),
        vehicle_year: jcMatch ? jcMatch.vehicle_year : 2024,
        km_reading: row.odometer_reading !== undefined && row.odometer_reading !== null ? row.odometer_reading : (jcMatch && jcMatch.km_reading !== undefined ? jcMatch.km_reading : null),
        last_service_date: row.last_service_date || (jcMatch ? jcMatch.last_service_date : undefined) || row.actual_delivery || row.created_at || null,
        odometer_reading: row.odometer_reading || (jcMatch ? jcMatch.odometer_reading : undefined) || (jcMatch ? jcMatch.km_reading : null) || null,
        sr_type_id: srTypeId,
        job_description: row.service_type || 'General Repair and Service',
        priority: 'Normal',
        bay_id: row.bay_id ? Number(row.bay_id) : null,
        status: mappedStatus,
        etd: safeIsoString(row.etd, safeIsoString(new Date(), "")),
        started_at: safeIsoString(row.created_at, null),
        completed_at: safeIsoString(row.actual_delivery, null),
        invoiced_at: null,
        created_by: row.created_by ? Number(row.created_by) : 1,
        created_at: safeIsoString(row.created_at, safeIsoString(new Date(), "")),
        updated_at: safeIsoString(row.updated_at, undefined),
        workshop_stage: row.live_status || row.job_status || 'Waiting',
        bay_no: bayNo,
        technician_name: techName,
        no_of_laborers: 1,
        actual_time_taken: null,
        numberplate_photo: null,
        odometer_photo: null,
        invoice_no: row.invoice_no || null,
        gate_out_time: row.gate_out_time ? safeIsoString(row.gate_out_time, null) : null,
        billing_status: row.billing_status || null,
        job_status_master: row.job_status || null,
        live_status_master: row.live_status || null,
        in_job_card_technician: jobCardTechRows.some((t: any) => Number(t.job_card_id) === Number(row.job_card_id)),
        in_bay_queue: bayQueueRows.some((q: any) => Number(q.job_card_id) === Number(row.job_card_id)),
        bay_queue_status: bayQueueRows.find((q: any) => Number(q.job_card_id) === Number(row.job_card_id))?.queue_status || null,
        service_type_master: row.service_type || null,
        technician_assignments: jobCardTechRows.filter((t: any) => Number(t.job_card_id) === Number(row.job_card_id)).map((t: any) => {
          const emp = employees.find((e: any) => Number(e.employee_id) === Number(t.technician_id));
          return {
            technician_id: Number(t.technician_id),
            technician_name: emp ? emp.full_name : 'Unknown',
            role_type: t.role_type || 'Technician',
            assigned_at: t.time_in || t.created_at || t.assigned_at || null
          };
        }),
        completed_today: (() => {
          const matchingSplitLog = revenueSplitLogRows.find((s: any) => s.job_card_no === row.job_card_no);
          const invoiceDateVal = matchingSplitLog ? matchingSplitLog.created_at : null;
          const closedDateVal = row.actual_delivery || row.updated_at || null;

          if (row.job_status === "Closed" && row.billing_status === "Invoiced" && closedDateVal) {
            const closedDateOnly = new Date(closedDateVal).toISOString().split('T')[0];
            const todayOnly = new Date().toISOString().split('T')[0];
            if (closedDateOnly === todayOnly) {
              if (invoiceDateVal) {
                return new Date(invoiceDateVal).getTime() >= new Date(closedDateVal).getTime();
              }
              return true;
            }
          }
          return false;
        })()
      };
    });

    return {
      employees: mapBooleans(employees, ["is_active"]),
      bays: mapBooleans(bays, ["is_active"]),
      srTypes: mapBooleans(srTypes, ["is_active"]),
      revenueSplits: mapBooleans(revenueSplits, ["uses_salary_wt", "senior_override", "is_active"]),
      alertConfigs: mapBooleans(alertConfigs, ["is_active"]),
      jobCards: mappedJobCards,
      jobTechnicianMaps,
      jobRevenues,
      jobRevenueSplitDetails,
      carryForwardLogs,
      reworkLogs,
      alertLogs,
      dmsImportBatches,
      dmsImportRows: parsedDmsImportRows
    };
  } catch (error) {
    console.error("Database sync load failed, falling back to local file:", error);
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    }
    throw error;
  }
}

export async function syncSave(data: any): Promise<void> {
  try {
    console.log("=== RUNNING ASYNC CLOUD SQL/MYSQL DB SYNC / SAVE ===");

    // Sequential batch updates to maintain consistency
    await upsertRows("employees", data.employees, "employee_id");
    await upsertRows("bays", data.bays, "bay_id");
    
    // Also save to bay_master
    if (data.bays && data.bays.length > 0) {
      const bayMasterRows = data.bays.map((b: any) => ({
        bay_id: b.bay_id,
        bay_code: b.bay_code,
        bay_name: b.bay_name,
        bay_type: b.bay_type,
        is_active: b.is_active ? 1 : 0
      }));
      await upsertRows("bay_master", bayMasterRows, "bay_id");
    }

    await upsertRows("sr_types", data.srTypes, "sr_type_id");
    await upsertRows("revenue_splits", data.revenueSplits, "split_id");
    await upsertRows("alert_configs", data.alertConfigs, "alert_config_id");
    
    // Save to job_card_master
    await saveJobCardsToMaster(data.jobCards);
    
    await upsertRows("job_technician_maps", data.jobTechnicianMaps, "map_id");
    await upsertRows("job_revenues", data.jobRevenues, "revenue_id");
    await upsertRows("job_revenue_split_details", data.jobRevenueSplitDetails, "detail_id");
    await upsertRows("carry_forward_logs", data.carryForwardLogs, "cf_id");
    await upsertRows("rework_logs", data.reworkLogs, "rework_id");
    await upsertRows("alert_logs", data.alertLogs, "alert_id");
    await upsertRows("dms_import_batches", data.dmsImportBatches, "batch_id");

    if (data.dmsImportRows && data.dmsImportRows.length > 0) {
      const formattedRows = data.dmsImportRows.map((r: any) => ({
        ...r,
        labour_amount: Math.round(Number(r.labour_amount || 0)),
        parts_amount: Math.round(Number(r.parts_amount || 0)),
        total_amount: Math.round(Number(r.total_amount || 0)),
        raw_data: safeStringify(r.raw_data)
      }));
      await upsertRows("dms_import_rows", formattedRows, "row_id");
    }

    console.log("MySQL DB sync save completed successfully!");
  } catch (error) {
    console.error("Database sync save failed:", error);
  }
}

export async function clearJobCardsInDB(): Promise<void> {
  try {
    console.log("=== CLEARING JOB CARDS FROM CLOUD SQL / MYSQL ===");
    
    // Reverse dependency order deletion
    await db.execute("DELETE FROM job_revenue_split_details");
    await db.execute("DELETE FROM job_revenues");
    await db.execute("DELETE FROM job_technician_maps");
    await db.execute("DELETE FROM carry_forward_logs");
    await db.execute("DELETE FROM rework_logs");
    await db.execute("DELETE FROM alert_logs");
    await db.execute("DELETE FROM job_card_master"); // Delete from job_card_master instead

    // Update all bays back to Idle
    await db.execute("UPDATE bays SET status = 'Idle'");

    console.log("=== SUCCESSFULLY CLEARED ALL JOB CARDS FROM DATABASE ===");
  } catch (error) {
    console.error("Error clearing job cards from database:", error);
    throw error;
  }
}

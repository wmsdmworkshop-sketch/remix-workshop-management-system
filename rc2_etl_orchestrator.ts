import { pool } from "./src/db/index.ts";
import * as fs from "fs";
import * as path from "path";

const BATCH_ID = "BATCH-RC2-ETL-001";
const MASTER_DIR = path.join(process.cwd(), "docs", "master");

// ── Smart File Reader (UTF-16LE / UTF-8 with BOM removal) ──
function readFileSyncSmart(filePath: string): string {
  if (!fs.existsSync(filePath)) return "";
  let content = fs.readFileSync(filePath, "utf16le");
  if (!content.includes("\t") && !content.includes(",")) {
    content = fs.readFileSync(filePath, "utf8");
  }
  return content.replace(/^\uFEFF/, "");
}

// ── Currency Parser ──
function parseCurrency(val: any): string {
  if (val === null || val === undefined || String(val).trim() === "") return "0.00";
  const clean = String(val).replace(/Rs\.?/gi, "").replace(/[^\d.-]/g, "").trim();
  const num = parseFloat(clean);
  return isNaN(num) ? "0.00" : num.toFixed(2);
}

// ── Date Normalizer ──
function parseISO(dateStr: any, defaultTime = "00:00:00"): string | null {
  if (!dateStr || String(dateStr).trim() === "") return null;
  const s = String(dateStr).trim();
  
  // DD/MM/YYYY or DD-MM-YYYY
  if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}/.test(s)) {
    const parts = s.split(/[\s/\-]/);
    const d = parts[0].padStart(2, "0");
    const m = parts[1].padStart(2, "0");
    const y = parts[2];
    return `${y}-${m}-${d} ${defaultTime}`;
  }
  
  // ISO standard
  const parsed = Date.parse(s);
  if (!isNaN(parsed)) {
    return new Date(parsed).toISOString().slice(0, 19).replace("T", " ");
  }
  return null;
}

// ── TSV Parser ──
function parseTSV(filePath: string): any[] {
  const content = readFileSyncSmart(filePath);
  if (!content) return [];
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  
  const headers = lines[0].split("\t").map(h => h.trim().replace(/^["\s]+|["\s]+$/g, ""));
  const rows: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("\t").map(c => c.trim().replace(/^["\s]+|["\s]+$/g, ""));
    const row: any = { _lineNo: i + 1 };
    headers.forEach((h, idx) => {
      row[h] = cols[idx] || "";
    });
    rows.push(row);
  }
  return rows;
}

async function createStagingTables() {
  const queries = [
    `CREATE TABLE IF NOT EXISTS import_batch (
      batch_id VARCHAR(100) PRIMARY KEY,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      status VARCHAR(50),
      total_rows INT DEFAULT 0,
      success_rows INT DEFAULT 0,
      failed_rows INT DEFAULT 0,
      user_id VARCHAR(100) DEFAULT 'system'
    )`,
    `CREATE TABLE IF NOT EXISTS import_exception (
      id INT AUTO_INCREMENT PRIMARY KEY,
      batch_id VARCHAR(100),
      source_file VARCHAR(255),
      row_number INT,
      error_type VARCHAR(100),
      reason TEXT,
      raw_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS stg_vehicle_master (
      stg_id INT AUTO_INCREMENT PRIMARY KEY,
      batch_id VARCHAR(100),
      row_number INT,
      raw_chassis_no TEXT,
      raw_registration_no TEXT,
      raw_engine_no TEXT,
      raw_product_line TEXT,
      raw_owner_account_name TEXT,
      raw_tm_invoice_date TEXT,
      raw_original_sale_date TEXT,
      raw_warranty_expiry_date TEXT,
      raw_warranty_expiry_hours TEXT,
      raw_warranty_expiry_km TEXT,
      raw_date_of_registration TEXT,
      status VARCHAR(50) DEFAULT 'PENDING'
    )`,
    `CREATE TABLE IF NOT EXISTS stg_invoice_history (
      stg_id INT AUTO_INCREMENT PRIMARY KEY,
      batch_id VARCHAR(100),
      row_number INT,
      raw_invoice_no TEXT,
      raw_invoice_date TEXT,
      raw_account TEXT,
      raw_invoice_type TEXT,
      raw_invoice_format TEXT,
      raw_invoice_status TEXT,
      raw_final_labour_amount TEXT,
      raw_final_spares_amount TEXT,
      raw_final_consolidated_amount TEXT,
      raw_order_no TEXT,
      raw_sr_no TEXT,
      raw_chassis_no TEXT,
      raw_vrn TEXT,
      status VARCHAR(50) DEFAULT 'PENDING'
    )`,
    `CREATE TABLE IF NOT EXISTS stg_service_history (
      stg_id INT AUTO_INCREMENT PRIMARY KEY,
      batch_id VARCHAR(100),
      row_number INT,
      raw_service_request TEXT,
      raw_chassis_no TEXT,
      raw_registration_no TEXT,
      raw_account TEXT,
      raw_service_datetime TEXT,
      raw_other_service_center TEXT,
      raw_job_card_open_date TEXT,
      raw_odometer_reading TEXT,
      raw_sr_type TEXT,
      raw_summary TEXT,
      status VARCHAR(50) DEFAULT 'PENDING'
    )`
  ];

  console.log("Creating staging tables...");
  for (const q of queries) {
    try {
      await pool.execute(q);
    } catch (e: any) {
      console.warn("Table creation warning:", e.message);
    }
  }
  console.log("Staging tables ready.");
}

async function logException(sourceFile: string, rowNumber: number, errorType: string, reason: string, rawData: any) {
  try {
    await pool.execute(
      `INSERT INTO import_exception (batch_id, source_file, row_number, error_type, reason, raw_data) VALUES (?, ?, ?, ?, ?, ?)`,
      [BATCH_ID, sourceFile, rowNumber, errorType, reason, JSON.stringify(rawData)]
    );
  } catch (e) {
    // Suppress if DB offline during dry run
  }
}

export async function processVehicleMaster() {
  const file = path.join(MASTER_DIR, "vehicle_master.tsv");
  const rows = parseTSV(file);
  console.log(`Found ${rows.length} rows in ${file}`);

  let success = 0;
  let failed = 0;

  for (const r of rows) {
    const chassis = (r["Chassis No."] || r["Chassis No"] || "").trim();
    const vrnRaw = (r["Registration Number"] || r["Registration No."] || "").trim();
    const vrn = vrnRaw ? vrnRaw : null;
    const saleDateNorm = parseISO(r["Original Sale Date"]);
    const tmInvoiceDateNorm = parseISO(r["TM Invoice Date"]);

    if (!chassis && !vrn) {
      await logException(file, r._lineNo, "Missing ID", "Both chassis and registration number missing", r);
      failed++;
      continue;
    }

    try {
      await pool.execute(
        `INSERT INTO vehicle_master (
          chassis_no, chassis_number, registration_no, engine_no, product_line, owner_account_name, 
          tm_invoice_date, original_sale_date, warranty_expiry_date, warranty_expiry_hours, 
          warranty_expiry_km, date_of_registration
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          registration_no = COALESCE(VALUES(registration_no), registration_no),
          engine_no = VALUES(engine_no),
          product_line = VALUES(product_line),
          owner_account_name = VALUES(owner_account_name)
        `,
        [
          chassis, chassis, vrn, r["Engine No"] || "", r["Product Line"] || "", 
          r["Owner Account Name"] || "", tmInvoiceDateNorm || r["TM Invoice Date"] || "", saleDateNorm || r["Original Sale Date"] || "", 
          r["Warranty Expiry Date"] || "", r["Warranty Expiry Hours"] || "0", r["Warranty Expiry Km"] || "300000", 
          r["Date of Registration"] || ""
        ]
      );
      success++;
    } catch (e: any) {
      await logException(file, r._lineNo, "DB Error", e.message, r);
      failed++;
    }
  }
  return { success, failed };
}

export async function processServiceHistory() {
  const file = path.join(MASTER_DIR, "service_history.tsv");
  const rows = parseTSV(file);
  console.log(`Found ${rows.length} rows in ${file}`);

  let success = 0;
  let failed = 0;

  for (const r of rows) {
    const chassis = (r["Chassis No."] || r["Chassis No"] || "").trim();
    const vrn = (r["Registration No."] || r["Registration Number"] || "").trim();
    if (!chassis && !vrn) {
      await logException(file, r._lineNo, "Missing ID", "Both chassis and registration missing", r);
      failed++;
      continue;
    }

    const odoStr = parseCurrency(r["Odometer Reading"] || r["Odometer"]);
    const dt = (r["Job Card Open Date"] || r["Service Date/Time"] || "").replace(/[^0-9]/g, "");
    const shNo = r["Service Request"] || (chassis ? `SH-${chassis}-${dt}` : `SH-${vrn}-${dt}`);
    const jcOpenDateNorm = parseISO(r["Job Card Open Date"]);
    const serviceDateNorm = parseISO(r["Service Date/Time"]);

    try {
      await pool.execute(
        `INSERT INTO service_history (
          sh_no, chassis_no, registration_no, account, account_name, service_datetime, 
          other_service_center, job_card_open_date, odometer_reading, sr_type, summary, service_request
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          odometer_reading = VALUES(odometer_reading),
          summary = VALUES(summary)
        `,
        [
          shNo, chassis, vrn, r["Account"] || "", r["Account"] || "", serviceDateNorm || r["Service Date/Time"] || "",
          r["Other Service Center"] || "", jcOpenDateNorm || r["Job Card Open Date"] || "", odoStr,
          r["SR Type"] || "", r["Summary"] || "", r["Service Request"] || ""
        ]
      );
      success++;
    } catch (e: any) {
      await logException(file, r._lineNo, "DB Error", e.message, r);
      failed++;
    }
  }
  return { success, failed };
}

export async function processInvoices() {
  const file = path.join(MASTER_DIR, "invoice.tsv");
  const rows = parseTSV(file);
  console.log(`Found ${rows.length} rows in ${file}`);

  let success = 0;
  let failed = 0;

  for (const r of rows) {
    const invNo = (r["Invoice #"] || r["Invoice Number"] || "").trim();
    if (!invNo) {
      await logException(file, r._lineNo, "Missing Invoice Number", "Invoice number is blank", r);
      failed++;
      continue;
    }

    const chassis = (r["Chassis #"] || r["Chassis No."] || "").trim();
    const amt = parseCurrency(r["Final Consolidated Invoice Amount"] || r["Total Amount"]);
    const labour = parseCurrency(r["Final Labour Invoice Amount"]);
    const spares = parseCurrency(r["Final Spares Invoice Amount"]);
    const custName = (r["Account"] || "").trim();
    const invDateNorm = parseISO(r["Invoice Date"]);

    try {
      await pool.execute(
        `INSERT INTO invoices (
          invoice_no, invoice_date, customer_name, account, invoice_type, invoice_format, 
          invoice_status, final_labour_amount, final_spares_amount, final_consolidated_amount, final_consolidated_amt,
          order_no, sr_no, chassis_no, vrn
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          final_consolidated_amount = VALUES(final_consolidated_amount),
          final_consolidated_amt = VALUES(final_consolidated_amt),
          invoice_status = VALUES(invoice_status)
        `,
        [
          invNo, invDateNorm || r["Invoice Date"] || "", custName, custName, r["Invoice Type"] || "",
          r["Invoice Format"] || "", r["Invoice Status"] || "", labour, spares, amt, amt,
          r["Order #"] || "", r["SR #"] || "", chassis, r["VRN"] || ""
        ]
      );
      success++;
    } catch (e: any) {
      await logException(file, r._lineNo, "DB Error", e.message, r);
      failed++;
    }
  }
  return { success, failed };
}

async function runETL() {
  console.log(`=======================================================`);
  console.log(`🚀 STARTING RC2 CERTIFIED HISTORICAL MIGRATION ETL [${BATCH_ID}]`);
  console.log(`=======================================================\n`);

  await createStagingTables();

  let vM = { success: 0, failed: 0 };
  let iH = { success: 0, failed: 0 };
  let sH = { success: 0, failed: 0 };

  try {
    vM = await processVehicleMaster();
    console.log(`Vehicle Master: ${vM.success} imported, ${vM.failed} failed/skipped.`);

    iH = await processInvoices();
    console.log(`Invoices: ${iH.success} imported, ${iH.failed} failed/skipped.`);

    sH = await processServiceHistory();
    console.log(`Service History: ${sH.success} imported, ${sH.failed} failed/skipped.`);

    console.log(`\n=======================================================`);
    console.log(`🎉 CERTIFIED ETL MIGRATION COMPLETED!`);
    console.log(`- Vehicle Sale Records: ${vM.success} success, ${vM.failed} failed`);
    console.log(`- Invoice Records: ${iH.success} success, ${iH.failed} failed`);
    console.log(`- Service History Records: ${sH.success} success, ${sH.failed} failed`);
    console.log(`=======================================================`);

  } catch (err) {
    console.error("ETL Process Failed:", err);
  } finally {
    process.exit(0);
  }
}

if (process.argv[1] && process.argv[1].endsWith("rc2_etl_orchestrator.ts")) {
  runETL();
}

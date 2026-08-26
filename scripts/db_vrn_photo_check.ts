import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

(async () => {
  const p = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    ssl: { rejectUnauthorized: false },
  });

  // Check job_card_master for the 3 truncated VRNs
  const [jcmRows]: any = await p.query(
    "SELECT job_card_id, job_card_no, vehicle_reg, chassis_no, vin, customer_name, driver_name, driver_mobile, mobile FROM job_card_master WHERE vehicle_reg IN ('KA-14-B-99', 'KA-32-AA-9', 'KA-32-AB-1')"
  );
  console.log("=== TRUNCATED VRN JOB CARDS (job_card_master) ===");
  for (const r of jcmRows) {
    console.log(`  JCM ID:${r.job_card_id} | JC:${r.job_card_no} | VRN:"${r.vehicle_reg}" | Chassis:"${r.chassis_no || 'NULL'}" | VIN:"${r.vin || 'NULL'}" | Customer:${r.customer_name} | Driver:${r.driver_name} | Mobile:${r.mobile || r.driver_mobile}`);
  }

  // Check job_cards for any matching records with photos
  const [jcRows]: any = await p.query(
    "SELECT job_id, job_card_no, vrn, numberplate_photo, odometer_photo, vin FROM job_cards WHERE vrn IN ('KA-14-B-99', 'KA-32-AA-9', 'KA-32-AB-1')"
  );
  console.log("\n=== MATCHING job_cards RECORDS ===");
  if (jcRows.length === 0) console.log("  No matches in job_cards table.");
  for (const r of jcRows) {
    const hasPhoto = r.numberplate_photo ? `YES (${r.numberplate_photo.substring(0, 80)}...)` : "NO";
    console.log(`  JC ID:${r.job_id} | JC:${r.job_card_no} | VRN:${r.vrn} | Photo:${hasPhoto} | VIN:${r.vin || 'NULL'}`);
  }

  // Check tbl_gate_entry for these VRNs (they use VIN- prefix)
  const [geRows]: any = await p.query(
    "SELECT gate_entry_id, vin, status, odometer, source, driver_details, initial_remarks FROM tbl_gate_entry WHERE vin IN ('VIN-KA-14-B-99', 'VIN-KA-32-AA-9', 'VIN-KA-32-AB-1', 'KA-14-B-99', 'KA-32-AA-9', 'KA-32-AB-1')"
  );
  console.log("\n=== MATCHING tbl_gate_entry RECORDS ===");
  if (geRows.length === 0) console.log("  No matches in tbl_gate_entry.");
  for (const r of geRows) {
    console.log(`  GE:${r.gate_entry_id} | VIN:${r.vin} | Status:${r.status} | Source:${r.source} | Driver:${r.driver_details} | Remarks:${r.initial_remarks}`);
  }

  // Check tbl_reception_intake for any photo references
  console.log("\n=== CHECKING RECEPTION INTAKE PHOTOS ===");
  try {
    const [intCols]: any = await p.query("DESCRIBE tbl_reception_intake");
    console.log("  tbl_reception_intake columns:", intCols.map((c: any) => c.Field).join(", "));
    
    // Look for any photo/image columns
    const photoColumns = intCols.filter((c: any) => 
      c.Field.toLowerCase().includes("photo") || 
      c.Field.toLowerCase().includes("image") || 
      c.Field.toLowerCase().includes("capture") ||
      c.Field.toLowerCase().includes("attachment")
    );
    if (photoColumns.length > 0) {
      console.log("  Photo columns found:", photoColumns.map((c: any) => c.Field).join(", "));
    } else {
      console.log("  No photo columns in tbl_reception_intake.");
    }
  } catch (e: any) {
    console.log("  tbl_reception_intake error:", e.message);
  }

  // Also check if these VRNs are similar to any known full VRNs
  console.log("\n=== SIMILAR FULL VRNs IN DATABASE ===");
  const [similar]: any = await p.query(
    "SELECT DISTINCT vehicle_reg FROM job_card_master WHERE vehicle_reg LIKE 'KA14B%' OR vehicle_reg LIKE 'KA32AA%' OR vehicle_reg LIKE 'KA32AB%' ORDER BY vehicle_reg"
  );
  console.log("  KA14B..:", similar.filter((r: any) => r.vehicle_reg.startsWith("KA14B")).map((r: any) => r.vehicle_reg).join(", "));
  console.log("  KA32AA.:", similar.filter((r: any) => r.vehicle_reg.startsWith("KA32AA")).map((r: any) => r.vehicle_reg).join(", "));
  console.log("  KA32AB.:", similar.filter((r: any) => r.vehicle_reg.startsWith("KA32AB")).map((r: any) => r.vehicle_reg).join(", "));

  await p.end();
  process.exit(0);
})();

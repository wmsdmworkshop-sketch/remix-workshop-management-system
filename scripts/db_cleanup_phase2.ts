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

  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║  DWIP LIVE DB CLEANUP — PHASE 2                 ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  // ── FIX 1: Add service_advisor column to job_card_master ──
  console.log("=== FIX 1: Adding service_advisor column to job_card_master ===");
  try {
    await p.query("ALTER TABLE job_card_master ADD COLUMN service_advisor VARCHAR(255) DEFAULT NULL");
    console.log("  ✅ Column added.");
  } catch (e: any) {
    if (e.message.includes("Duplicate column")) {
      console.log("  ℹ️  Column already exists.");
    } else {
      console.error("  ❌ Error:", e.message);
    }
  }

  // ── FIX 2: Bridge all 16 manager SA assignments into job_card_master ──
  console.log("\n=== FIX 2: Bridging manager SA assignments to job_card_master ===");
  const [assignments]: any = await p.query(
    "SELECT ma.assigned_sa_name, ge.vin, ma.status FROM tbl_manager_assignment ma JOIN tbl_gate_entry ge ON ge.gate_entry_id = ma.gate_entry_id WHERE ma.status = 'ASSIGNED'"
  );
  
  let bridged = 0;
  for (const a of assignments) {
    const vrn = (a.vin || "").replace("VIN-", "");
    if (!vrn) continue;
    
    const [result]: any = await p.query(
      "UPDATE job_card_master SET service_advisor = ?, job_status = 'Assigned' WHERE vehicle_reg = ? AND (service_advisor IS NULL OR service_advisor = '') ORDER BY job_card_id DESC LIMIT 1",
      [a.assigned_sa_name, vrn]
    );
    if (result.affectedRows > 0) {
      console.log(`  ✅ ${vrn} → SA: ${a.assigned_sa_name}`);
      bridged++;
    }
  }
  console.log(`  Bridged ${bridged}/${assignments.length} assignments.`);

  // ── FIX 3: Remove duplicate VRN job cards (keep oldest, delete newer) ──
  console.log("\n=== FIX 3: Removing duplicate VRN job cards ===");
  
  // MH12UR7788 — keep 6655, delete 6656, 6657
  const [r1]: any = await p.query("DELETE FROM job_card_master WHERE job_card_id IN (6656, 6657)");
  console.log(`  MH12UR7788: Deleted ${r1.affectedRows} duplicate(s) (kept ID 6655)`);
  
  // MH12YQ9265 — keep 6664, delete 6679
  const [r2]: any = await p.query("DELETE FROM job_card_master WHERE job_card_id = 6679");
  console.log(`  MH12YQ9265: Deleted ${r2.affectedRows} duplicate(s) (kept ID 6664)`);

  // ── FIX 4: Also mirror to job_cards table ──
  console.log("\n=== FIX 4: Mirroring SA to job_cards table ===");
  const [jcmWithSA]: any = await p.query(
    "SELECT job_card_id, vehicle_reg, service_advisor FROM job_card_master WHERE service_advisor IS NOT NULL AND service_advisor != ''"
  );
  let mirrored = 0;
  for (const row of jcmWithSA) {
    try {
      const [r]: any = await p.query(
        "UPDATE job_cards SET service_advisor = ? WHERE vrn = ? AND (service_advisor IS NULL OR service_advisor = '' OR service_advisor = 'Unassigned')",
        [row.service_advisor, row.vehicle_reg]
      );
      if (r.affectedRows > 0) mirrored++;
    } catch (e) {}
  }
  console.log(`  Mirrored ${mirrored} SA assignments to job_cards.`);

  // ── VERIFY ──
  console.log("\n=== VERIFY ===");
  const [verify]: any = await p.query(
    "SELECT job_card_id, job_card_no, vehicle_reg, job_status, service_advisor FROM job_card_master WHERE job_status NOT IN ('Ready','Delivered') ORDER BY job_card_id DESC LIMIT 20"
  );
  for (const v of verify) {
    const saFlag = v.service_advisor ? "✅" : "❌";
    console.log(`  ${v.job_card_no} | ${v.vehicle_reg} | ${v.job_status} | SA: ${v.service_advisor || "NULL"} ${saFlag}`);
  }

  // Check remaining duplicates
  const [remainDupes]: any = await p.query(
    "SELECT vehicle_reg, COUNT(*) as c FROM job_card_master WHERE job_status NOT IN ('Ready','Delivered') AND vehicle_reg IS NOT NULL AND vehicle_reg != '' GROUP BY vehicle_reg HAVING COUNT(*) > 1"
  );
  console.log(`\n  Remaining duplicate VRNs: ${remainDupes.length}`);
  for (const d of remainDupes) {
    console.log(`    ${d.vehicle_reg} x${d.c}`);
  }

  // Check incomplete VRNs
  const [shortVrns]: any = await p.query(
    "SELECT job_card_id, job_card_no, vehicle_reg FROM job_card_master WHERE job_status NOT IN ('Ready','Delivered') AND (vehicle_reg LIKE 'KA-__-%-_' OR LENGTH(vehicle_reg) < 8)"
  );
  console.log(`\n  Incomplete/truncated VRNs: ${shortVrns.length}`);
  for (const s of shortVrns) {
    console.log(`    ${s.job_card_no} | VRN: "${s.vehicle_reg}" (len:${(s.vehicle_reg||"").length})`);
  }

  await p.end();
  process.exit(0);
})();

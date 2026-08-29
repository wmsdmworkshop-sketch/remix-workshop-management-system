/**
 * Delete the job cards whose vehicle registration was truncated beyond recovery.
 *
 * These were created while `vehicle_reg` was varchar(10) and the app truncated
 * to fit, so the stored plate is a fragment ("KA-32-AB-1") with the tail lost.
 * All three are Unassigned with no service advisor, no gate entry, no reception
 * intake and no manager assignment — nothing but the job card row itself.
 *
 * DELIBERATELY EXCLUDED: JC-76917 (6692). Its plate is NOT lost — the
 * ocr_evidence row for it still holds the full registration KA32AB4212, so that
 * card can be repaired instead of destroyed. Deleting it would throw away a
 * recoverable job card.
 *
 * Run with DRY=1 to preview.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const DRY = process.env.DRY === '1';

// job_card_id -> the truncated value, asserted before deletion.
const TARGETS = [
  { id: 6674, no: "JC-91679", vrn: "KA-32-AB-1" },
  { id: 6675, no: "JC-94378", vrn: "KA-32-AA-9" },
  { id: 6676, no: "JC-42618", vrn: "KA-14-B-99" },
];

(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  // Guard: refuse unless each row is exactly the card we mean AND carries no
  // assigned work. A card that has since been assigned must not be deleted.
  for (const t of TARGETS) {
    const [[row]] = await db.query(
      "SELECT job_card_no, vehicle_reg, job_status, service_advisor FROM job_card_master WHERE job_card_id = ?",
      [t.id]);
    if (!row) throw new Error(`${t.id} (${t.no}) not found — refusing to run.`);
    if (row.job_card_no !== t.no || row.vehicle_reg !== t.vrn) {
      throw new Error(`${t.id} is ${row.job_card_no}/${row.vehicle_reg}, expected ${t.no}/${t.vrn} — refusing to run.`);
    }
    if (row.service_advisor) {
      throw new Error(`${t.no} now has advisor ${row.service_advisor} — refusing to delete assigned work.`);
    }
    if (String(row.job_status) !== "Unassigned") {
      throw new Error(`${t.no} is ${row.job_status}, not Unassigned — refusing to run.`);
    }
    // Guard: never delete a card whose plate could still be recovered.
    const [[ev]] = await db.query(
      "SELECT COUNT(*) n FROM ocr_evidence WHERE job_card_no = ? AND is_deleted = 0", [t.no]);
    if (ev.n > 0) {
      throw new Error(`${t.no} has OCR evidence — its plate may be recoverable. Refusing to delete.`);
    }
  }
  console.log(`Verified ${TARGETS.length} cards: unassigned, and no recoverable evidence.`);
  console.log(DRY ? "\n*** DRY RUN ***\n" : "\n*** LIVE RUN ***\n");

  await db.beginTransaction();
  const ids = TARGETS.map(t => t.id);
  const [r] = await db.execute(
    `DELETE FROM job_card_master WHERE job_card_id IN (${ids.map(() => "?").join(",")})`, ids);
  console.log(`Deleted ${r.affectedRows} job_card_master rows.`);

  // job_cards holds only seed rows, but delete defensively so no orphan remains.
  const [r2] = await db.execute(
    `DELETE FROM job_cards WHERE job_id IN (${ids.map(() => "?").join(",")})`, ids);
  if (r2.affectedRows) console.log(`Deleted ${r2.affectedRows} job_cards rows.`);

  await db.execute(
    "INSERT INTO security_audit_logs (user_id, username, action, details) VALUES (?, ?, ?, ?)",
    [29, "hr_dapl", "JOB_CARD_DELETE_TRUNCATED_VRN",
     `Deleted ${r.affectedRows} job cards whose registration was truncated beyond recovery: ` +
     TARGETS.map(t => `${t.no} (${t.vrn})`).join(", ") +
     ". JC-76917 deliberately retained — ocr_evidence holds its full plate KA32AB4212."]);

  if (DRY) { await db.rollback(); console.log("Rolled back (dry run)."); }
  else { await db.commit(); console.log("Committed."); }

  console.log("\n=== VERIFY: remaining hyphenated / truncated plates ===");
  console.table((await db.query(
    "SELECT job_card_id, job_card_no, vehicle_reg, job_status FROM job_card_master WHERE vehicle_reg LIKE '%-%'"))[0]);
  console.log("total job cards:", (await db.query("SELECT COUNT(*) n FROM job_card_master"))[0][0].n);
  await db.end();
})().catch(e => { console.error("FAILED:", e.message); process.exit(1); });

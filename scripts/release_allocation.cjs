/**
 * Release one named allocation, chosen by a human.
 *
 * Used when the SAME vehicle holds two ACTIVE allocations under different id
 * strings (e.g. KA32AB0307 as "KA32AB0307" in B-02 and as
 * "JC-DevAus-AA1-2627-002178" in B-01). The system cannot know which technician
 * physically has the vehicle, so the supervisor decides and names the
 * allocation to release. Nothing is guessed and nothing is deleted: the row is
 * marked RELEASED with a reason, so the history stays auditable.
 *
 *   $env:ALLOC="ALLOC-6F3EB0F3"; node scripts/release_allocation.cjs
 *   $env:ALLOC="ALLOC-6F3EB0F3"; $env:DELETE="1"; node scripts/release_allocation.cjs; $env:DELETE=""
 */
require("dotenv").config();
const mysql = require("mysql2/promise");
const ALLOC = (process.env.ALLOC || "").trim();
const REASON = process.env.REASON || "supervisor confirmed the vehicle is not in this bay";
const DO = process.env.DELETE === "1";

if (!ALLOC) { console.error("REFUSED: set ALLOC to the allocation_id to release."); process.exit(1); }

(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });
  console.log("");
  console.log(DO ? "*** EXECUTING ***" : "DRY RUN (nothing will change)");

  const [rows] = await db.execute(
    "SELECT allocation_id, job_card_id, bay_id, technician_name, status, created_at FROM tbl_job_allocations WHERE allocation_id = ?",
    [ALLOC]);
  if (!rows.length) { console.error("No allocation " + ALLOC); await db.end(); process.exit(1); }
  console.table(rows);
  if (rows[0].status !== "ACTIVE") {
    console.log("Already " + rows[0].status + " - nothing to do.");
    await db.end(); return;
  }

  if (!DO) { console.log(""); console.log("Dry run complete. Re-run with DELETE=1 to apply."); await db.end(); return; }

  await db.beginTransaction();
  try {
    await db.execute(
      "UPDATE tbl_job_allocations SET status='RELEASED', override_reason=CONCAT(COALESCE(override_reason,''),' [released: ',?,']') WHERE allocation_id=?",
      [REASON, ALLOC]);

    // Recompute the freed bay from whatever ACTIVE allocations remain in it.
    const bay = rows[0].bay_id;
    const [left] = await db.execute(
      "SELECT job_card_id FROM tbl_job_allocations WHERE bay_id=? AND status='ACTIVE' ORDER BY created_at DESC LIMIT 1", [bay]);
    if (left.length) {
      await db.execute("UPDATE tbl_bays SET status='OCCUPIED', current_job_card_id=? WHERE bay_id=? AND status NOT IN ('BLOCKED','OUT_OF_SERVICE')",
        [left[0].job_card_id, bay]);
    } else {
      await db.execute("UPDATE tbl_bays SET status='AVAILABLE', current_job_card_id=NULL, occupied_since=NULL WHERE bay_id=? AND status NOT IN ('BLOCKED','OUT_OF_SERVICE')", [bay]);
    }
    await db.commit();
    console.log("");
    console.log("Released " + ALLOC + "; bay " + bay + " recomputed.");
  } catch (e) { await db.rollback(); console.error("ROLLED BACK: " + e.message); process.exitCode = 1; }
  await db.end();
})().catch(e => { console.error(e.message); process.exit(1); });

/**
 * Repair floor allocation data corruption + orphaned SA intakes.
 *
 * WHAT IT FIXES (all verified against production before writing this):
 *   A. 2 orphaned tbl_sa_intake rows (INT-6658, INT-6659) whose tbl_gate_entry
 *      row no longer exists. They rendered on the floor queue as blank rows
 *      ("— • SA: sayeed") and could be ALLOCATED, committing a bay + technician
 *      to a vehicle that is not in the workshop.
 *   B. Allocations belonging to those orphans.
 *   C. Duplicate ACTIVE allocations: one vehicle recorded in several bays at
 *      once (KA32AA5577 was in B-01/B-03/B-04/B-05), and bays holding more than
 *      the physical maximum of 2 vehicles. Keeps the MOST RECENT allocation per
 *      vehicle and releases the older ones.
 *   D. tbl_bays.current_job_card_id pointing at a released/orphan job card.
 *
 * It does NOT invent data: released rows are marked 'RELEASED', not deleted, so
 * the history stays auditable. Only the orphan intakes are deleted, because
 * they reference a vehicle record that no longer exists at all.
 *
 * Dry run by default:
 *   node scripts/repair_floor_allocations.cjs           # preview, changes nothing
 *   DELETE=1 node scripts/repair_floor_allocations.cjs  # execute
 */
require("dotenv").config();
const mysql = require("mysql2/promise");
const DO = process.env.DELETE === "1";
const BAY_MAX = 2;

(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });
  console.log(`\n${DO ? "*** EXECUTING ***" : "DRY RUN (nothing will change)"}  db=${process.env.DB_DATABASE}\n`);

  // ---- A/B: orphaned intakes -------------------------------------------
  const [orphans] = await db.execute(
    `SELECT s.intake_id, s.gate_entry_id, s.job_card_id, s.sa_name, s.status
       FROM tbl_sa_intake s
       LEFT JOIN tbl_gate_entry g ON s.gate_entry_id = g.gate_entry_id
      WHERE g.gate_entry_id IS NULL`);
  console.log(`A. Orphaned SA intakes (gate entry missing): ${orphans.length}`);
  console.table(orphans);

  const orphanJcs = orphans.map(o => o.job_card_id).filter(Boolean);
  let orphanAllocs = [];
  if (orphanJcs.length) {
    const ph = orphanJcs.map(() => "?").join(",");
    [orphanAllocs] = await db.execute(
      `SELECT allocation_id, job_card_id, bay_id, technician_name, status
         FROM tbl_job_allocations WHERE job_card_id IN (${ph}) AND status='ACTIVE'`, orphanJcs);
  }
  console.log(`\nB. ACTIVE allocations on orphan job cards: ${orphanAllocs.length}`);
  console.table(orphanAllocs);

  // ---- C: duplicate / over-capacity allocations -------------------------
  const [dupVeh] = await db.execute(
    `SELECT job_card_id, COUNT(*) n, GROUP_CONCAT(CONCAT(allocation_id,'@',bay_id) ORDER BY created_at DESC) detail
       FROM tbl_job_allocations WHERE status='ACTIVE'
      GROUP BY job_card_id HAVING n > 1`);
  console.log(`\nC1. Vehicles ACTIVE in more than one bay: ${dupVeh.length}`);
  console.table(dupVeh);

  // keep newest allocation per vehicle, release the rest
  const [allActive] = await db.execute(
    `SELECT allocation_id, job_card_id, bay_id, created_at FROM tbl_job_allocations
      WHERE status='ACTIVE' ORDER BY job_card_id, created_at DESC`);
  const seen = new Set(); const toRelease = [];
  for (const a of allActive) {
    if (orphanJcs.includes(a.job_card_id)) { toRelease.push({ ...a, why: "orphan job card" }); continue; }
    if (seen.has(a.job_card_id)) toRelease.push({ ...a, why: "duplicate — newer allocation kept" });
    else seen.add(a.job_card_id);
  }

  // bay over-capacity, computed AFTER the releases above
  const keep = allActive.filter(a => !toRelease.find(r => r.allocation_id === a.allocation_id));
  const byBay = {};
  for (const a of keep) (byBay[a.bay_id] ||= []).push(a);
  for (const [bay, list] of Object.entries(byBay)) {
    if (list.length > BAY_MAX) {
      // keep the newest BAY_MAX, release the oldest overflow
      list.sort((x, y) => new Date(y.created_at) - new Date(x.created_at));
      for (const a of list.slice(BAY_MAX)) toRelease.push({ ...a, why: `bay ${bay} over capacity (${list.length} > ${BAY_MAX})` });
    }
  }
  console.log(`\nC2. Allocations to RELEASE (status ACTIVE -> RELEASED): ${toRelease.length}`);
  console.table(toRelease);

  // ---- D: bay pointers --------------------------------------------------
  const [badBays] = await db.execute(
    `SELECT b.bay_id, b.status, b.current_job_card_id FROM tbl_bays b
      WHERE b.current_job_card_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM tbl_job_allocations a
                         WHERE a.bay_id=b.bay_id AND a.status='ACTIVE'
                           AND a.job_card_id=b.current_job_card_id)`);
  console.log(`\nD. Bays pointing at a job card with no ACTIVE allocation there: ${badBays.length}`);
  console.table(badBays);

  if (!DO) { console.log("\nDry run complete. Re-run with DELETE=1 to apply.\n"); await db.end(); return; }

  await db.beginTransaction();
  try {
    for (const a of toRelease) {
      await db.execute(
        `UPDATE tbl_job_allocations SET status='RELEASED', override_reason=CONCAT(COALESCE(override_reason,''),' [auto-released: ',?,']')
          WHERE allocation_id=?`, [a.why, a.allocation_id]);
    }
    for (const o of orphans) {
      await db.execute(`DELETE FROM tbl_sa_intake WHERE intake_id=?`, [o.intake_id]);
    }
    // Recompute every bay from the surviving ACTIVE allocations.
    const [live] = await db.execute(
      `SELECT bay_id, job_card_id FROM tbl_job_allocations WHERE status='ACTIVE' ORDER BY created_at DESC`);
    const first = {};
    for (const l of live) if (!first[l.bay_id]) first[l.bay_id] = l.job_card_id;
    const [bays] = await db.execute(`SELECT bay_id, status FROM tbl_bays`);
    for (const b of bays) {
      if (b.status === "BLOCKED" || b.status === "OUT_OF_SERVICE") continue;
      if (first[b.bay_id]) {
        await db.execute(`UPDATE tbl_bays SET status='OCCUPIED', current_job_card_id=? WHERE bay_id=?`, [first[b.bay_id], b.bay_id]);
      } else {
        await db.execute(`UPDATE tbl_bays SET status='AVAILABLE', current_job_card_id=NULL, occupied_since=NULL WHERE bay_id=?`, [b.bay_id]);
      }
    }
    await db.commit();
    console.log("\nCommitted.\n");
  } catch (e) { await db.rollback(); console.error("ROLLED BACK:", e.message); process.exitCode = 1; }
  await db.end();
})().catch(e => { console.error(e.message); process.exit(1); });

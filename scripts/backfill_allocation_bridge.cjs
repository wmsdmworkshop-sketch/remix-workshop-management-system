/**
 * Backfill job_card_master + tbl_repair_executions for allocations that were
 * made BEFORE the allocation-bridge fix.
 *
 * WHY: allocateJobAndBay bridged into job_card_master by string-matching
 * `job_card_no = ? OR vehicle_reg = ?` against the allocation's job_card_id.
 * For a vehicle that came through SA intake that id is `DWIP-TEMP-SEDAM-...`,
 * which matches NEITHER column — job_card_master holds the same vehicle under
 * `JC-76413`. The update touched zero rows inside a logging try/catch, so the
 * supervisor saw "allocated" while the technician's workspace showed nothing
 * (live_status stayed 'Unassigned', assigned_to stayed NULL).
 *
 * Nothing ever INSERTed into tbl_repair_executions either, so those
 * allocations have no work item for the technician to accept.
 *
 * This resolves each ACTIVE allocation to its real job_card_master row the same
 * way the fixed engine does (intake -> gate entry -> VRN -> job_card_master;
 * vehicle_reg is unique across job_card_master, verified) and writes what the
 * allocation should have written. It never invents a link: an allocation that
 * does not resolve is reported and skipped.
 *
 * Work items are created NOT_STARTED — the technician must still accept/start
 * them, which is what starts the SLA clock.
 *
 *   node scripts/backfill_allocation_bridge.cjs           # preview
 *   $env:DELETE="1"; node scripts/backfill_allocation_bridge.cjs; $env:DELETE=""
 */
require("dotenv").config();
const mysql = require("mysql2/promise");
const crypto = require("crypto");
const DO = process.env.DELETE === "1";

(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });
  console.log(`\n${DO ? "*** EXECUTING ***" : "DRY RUN (nothing will change)"}  db=${process.env.DB_DATABASE}\n`);

  const [allocs] = await db.execute(
    `SELECT allocation_id, job_card_id, bay_id, technician_id, technician_name, branch_id
       FROM tbl_job_allocations WHERE status='ACTIVE' ORDER BY created_at`);

  const plan = [];
  for (const a of allocs) {
    // same two-step resolution as resolveMasterJobCardId()
    let [m] = await db.execute(
      `SELECT job_card_id, job_card_no, vehicle_reg, live_status, assigned_to
         FROM job_card_master WHERE job_card_no=? OR vehicle_reg=? ORDER BY job_card_id DESC LIMIT 1`,
      [a.job_card_id, a.job_card_id]);
    if (!m.length) {
      [m] = await db.execute(
        `SELECT m.job_card_id, m.job_card_no, m.vehicle_reg, m.live_status, m.assigned_to
           FROM tbl_sa_intake s
           INNER JOIN tbl_gate_entry g ON s.gate_entry_id=g.gate_entry_id
           INNER JOIN job_card_master m ON m.vehicle_reg = TRIM(LEADING 'VIN-' FROM g.vin)
          WHERE s.job_card_id=? ORDER BY m.job_card_id DESC LIMIT 1`, [a.job_card_id]);
    }
    const tech = Number(String(a.technician_id || "").replace(/^TECH-/i, ""));
    const [ex] = await db.execute(
      `SELECT execution_id FROM tbl_repair_executions WHERE job_card_id=? AND technician_id=?`,
      [a.job_card_id, a.technician_id]);
    plan.push({
      allocation: a.allocation_id, alloc_jc: a.job_card_id, bay: a.bay_id,
      tech: a.technician_name || a.technician_id,
      resolved_jcm: m.length ? `${m[0].job_card_id} (${m[0].job_card_no} / ${m[0].vehicle_reg})` : "*** UNRESOLVED — SKIPPED ***",
      live_status_now: m.length ? m[0].live_status : "-",
      assigned_to_now: m.length ? m[0].assigned_to : "-",
      will_set_assigned_to: m.length && !Number.isNaN(tech) ? tech : "-",
      work_item: ex.length ? "already exists" : "CREATE (NOT_STARTED)",
      _m: m.length ? m[0] : null, _tech: tech, _a: a, _hasExec: ex.length > 0,
    });
  }
  console.table(plan.map(({ _m, _tech, _a, _hasExec, ...v }) => v));

  // SAFETY 1 - duplicate allocations that only become visible AFTER resolution.
  // Two allocations can carry different job_card_id strings ("KA32AB0307" and
  // "JC-DevAus-AA1-2627-002178") yet resolve to the SAME vehicle. Writing both
  // would silently pick a winner for assigned_to. Refuse instead: the
  // supervisor must decide which technician actually has the vehicle.
  const byVehicle = {};
  for (const p of plan) if (p._m) (byVehicle[p._m.job_card_id] ||= []).push(p);
  const collisions = Object.entries(byVehicle).filter(([, v]) => v.length > 1);
  if (collisions.length) {
    console.log("");
    console.log("*** REFUSING TO WRITE - the same vehicle has multiple ACTIVE allocations ***");
    for (const [jcm, list] of collisions) {
      const v = list[0]._m;
      console.log("");
      console.log("  " + v.job_card_no + " / " + v.vehicle_reg + " (job_card_id " + jcm + ") is allocated " + list.length + " times:");
      for (const p of list) {
        console.log("    - " + p.allocation + "  bay " + p.bay + "  tech " + p.tech + "  (recorded as " + p.alloc_jc + ")");
      }
    }
    console.log("");
    console.log("Release the allocation(s) that are not real, then re-run.");
    await db.end();
    return;
  }

  // SAFETY 2 - assigned_to values that reference no employee at all. These are
  // the corrupted created_by-conflated values from the old repository bug.
  // Overwriting them is correct (the allocation is newer and real), but it must
  // be stated rather than done silently.
  const [emps] = await db.execute("SELECT employee_id FROM employees");
  const validEmp = new Set(emps.map((e) => Number(e.employee_id)));
  for (const p of plan) {
    if (p._m && p._m.assigned_to != null && !validEmp.has(Number(p._m.assigned_to))) {
      console.log("  NOTE: " + p._m.job_card_no + " currently has assigned_to=" + p._m.assigned_to +
        ", which is NOT an employee. It will be replaced by " + p._tech + " (" + p.tech + ") from the allocation.");
    }
  }

  if (!DO) { console.log("\nDry run complete. Re-run with DELETE=1 to apply.\n"); await db.end(); return; }

  await db.beginTransaction();
  try {
    let updated = 0, created = 0;
    for (const p of plan) {
      if (!p._m) continue;
      if (!Number.isNaN(p._tech)) {
        await db.execute(
          `UPDATE job_card_master SET live_status='FLOOR_ALLOCATED', assigned_to=? WHERE job_card_id=?`,
          [p._tech, p._m.job_card_id]);
      } else {
        await db.execute(
          `UPDATE job_card_master SET live_status='FLOOR_ALLOCATED' WHERE job_card_id=?`, [p._m.job_card_id]);
      }
      updated++;
      if (!p._hasExec) {
        await db.execute(
          `INSERT INTO tbl_repair_executions
             (execution_id, job_card_id, technician_id, technician_name, bay_id, status, branch_id)
           VALUES (?, ?, ?, ?, ?, 'NOT_STARTED', ?)`,
          [`EXEC-${crypto.randomUUID().substring(0, 8).toUpperCase()}`, p._a.job_card_id,
           p._a.technician_id, p._a.technician_name || null, p._a.bay_id, p._a.branch_id || "BR-SEDAM"]);
        created++;
      }
    }
    await db.commit();
    console.log(`\nCommitted. job_card_master updated: ${updated}; work items created: ${created}\n`);
  } catch (e) { await db.rollback(); console.error("ROLLED BACK:", e.message); process.exitCode = 1; }
  await db.end();
})().catch(e => { console.error(e.message); process.exit(1); });

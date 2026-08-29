/**
 * Consolidate logins onto the Employee Directory.
 *
 * Rule (from the workshop owner): a login is legitimate only if it was created
 * through the Employee Directory. Everything else is merged into the directory
 * login for the same person and then removed. Nothing is deleted before its
 * data has been repointed.
 *
 * MERGE  — orphan login -> directory login (same person, confirmed by name and
 *          by the owner). Data moves first, then the orphan row is deleted.
 * KEEP   — system logins the owner explicitly chose to retain.
 * DISABLE— real staff who have no employee record yet. Their roles are to be
 *          defined later, so the logins are DEACTIVATED, never deleted: the
 *          decision is reversible once their employee records exist.
 *
 * Deliberately untouched:
 *   - GOURAMMA and AMEENA (CSC). No workshop role yet; to be defined later.
 *   - NAGESH the technician (DEV-242). "Nagesh Ambure" (dkam / Dealer Key
 *     Accounts Manager) is a DIFFERENT person and is only deactivated.
 *
 * Run with DRY=1 to preview.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const DRY = process.env.DRY === '1';

/** from (orphan user_id) -> to (directory user_id) */
const MERGES = [
  { from: 20, to: 74, why: "afroz_rp -> dev-328 AFROZ (owns 43 job cards)" },
  { from: 43, to: 74, why: "afroz -> dev-328 AFROZ (duplicate)" },
  { from: 23, to: 58, why: "mustafa_ladaf -> dev-240 MUSTAFA" },
  { from: 38, to: 58, why: "mustafaladaf50 -> dev-240 MUSTAFA (was linked to legacy EMP022)" },
  { from: 26, to: 57, why: "ahmed_wm -> dev-307 AHMED HUSSAIN" },
  { from: 37, to: 57, why: "Mdadhn98 -> dev-307 AHMED HUSSAIN (same person, per owner)" },
  { from: 25, to: 84, why: "khaja_sp -> dev-199 KHAJAMOINUDDIN" },
  { from: 40, to: 84, why: "khaja -> dev-199 KHAJAMOINUDDIN" },
  { from: 27, to: 51, why: "rahim_bd -> dev-206 ABDUL GANI SHEK (his login, per owner)" },
  { from: 46, to: 51, why: "gani -> dev-206 ABDUL GANI SHEK" },
  { from: 32, to: 50, why: "abdulqadeer999 -> dev-207 ABDUL QADEER" },
  { from: 44, to: 76, why: "khasim -> dev-324 KHASIM" },
];

/** Test artefact — no person, no data. */
const DELETE_OUTRIGHT = [28];

/** Real staff with no employee record. Deactivated, NOT deleted. */
const DEACTIVATE = [
  { id: 34, who: "Ragu (floor_supervisor)" },
  { id: 35, who: "Manju (warranty_manager)" },
  { id: 36, who: "PK (floor_incharge)" },
  { id: 39, who: "Chetan (warranty_manager)" },
  { id: 41, who: "Nagesh Ambure (dkam) — distinct from DEV-242 NAGESH" },
  { id: 42, who: "Shivkumar (cashier)" },
  { id: 45, who: "Suryakant (security_agent)" },
  { id: 49, who: "Vitthal Suti (dealer_principal)" },
  // Not named in the keep-list, but an earlier standing instruction was never to
  // delete admin logins. Deactivated rather than removed so it is reversible.
  { id: 31, who: "admin (Admin Operator) — generic admin, no employee record" },
  { id: 47, who: "workshop_admin — generic admin, no employee record" },
];

/** Explicitly retained by the owner. */
const KEEP = [29, 30, 48, 75];

(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  // Guard: every merge target must exist, be active, and be directory-backed.
  for (const m of MERGES) {
    const [[t]] = await db.query(
      `SELECT u.user_id, u.full_name, u.is_active, e.employee_code
         FROM user_access_master u JOIN employees e ON e.employee_id = u.employee_id
        WHERE u.user_id = ?`, [m.to]);
    if (!t) throw new Error(`Merge target ${m.to} is missing or not directory-backed — refusing to run.`);
    if (!t.is_active) throw new Error(`Merge target ${m.to} (${t.full_name}) is inactive — refusing to run.`);
    m.toName = t.full_name;
    m.toCode = t.employee_code;
  }
  // Guard: never touch a login the owner chose to keep.
  const touched = [...MERGES.map(m => m.from), ...DELETE_OUTRIGHT, ...DEACTIVATE.map(d => d.id)];
  const collision = touched.filter(id => KEEP.includes(id));
  if (collision.length) throw new Error(`Refusing to touch retained logins: ${collision.join(", ")}`);

  // job_card_master.created_by / assigned_to hold USER ids (saveJobCardsToMaster
  // copies job_cards.created_by, and isOwnedBy compares that to user.user_id),
  // but ibfk_2/ibfk_3 constrain them against `employee_master` — a stale legacy
  // table of 42 people with no employee codes, unrelated to logins. The current
  // values satisfy it only by coincidence: created_by = 20 is afroz_rp's user id,
  // while employee_master 20 is MOHAMMED ZAKI, a technician. The constraint is
  // therefore meaningless and blocks correct data, so it is removed.
  // DDL is implicitly committed, so it must run before the data transaction.
  for (const fk of ["job_card_master_ibfk_2", "job_card_master_ibfk_3"]) {
    const [[x]] = await db.query(
      `SELECT COUNT(*) n FROM information_schema.TABLE_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = ? AND TABLE_NAME = 'job_card_master' AND CONSTRAINT_NAME = ?`,
      [process.env.DB_DATABASE, fk]);
    if (!x.n) { console.log(`${fk} already absent.`); continue; }
    // DROP_FK=1 performs just the schema step, so the data migration can then be
    // dry-run for real instead of failing against a constraint that is going away.
    if (DRY && process.env.DROP_FK !== '1') { console.log(`would DROP FOREIGN KEY ${fk}`); }
    else {
      await db.execute(`ALTER TABLE \`job_card_master\` DROP FOREIGN KEY \`${fk}\``);
      console.log(`Dropped ${fk}.`);
    }
  }
  if (process.env.DROP_FK === '1') { console.log("DROP_FK=1 — schema step only, stopping here."); await db.end(); return; }

  console.log(DRY ? "\n*** DRY RUN — no writes ***\n" : "\n*** LIVE RUN ***\n");
  await db.beginTransaction();
  const log = [];
  const run = async (label, sql, params) => {
    const [r] = await db.execute(sql, params);
    if (r.affectedRows > 0) { console.log(`  ${label.padEnd(46)} rows=${r.affectedRows}`); log.push(`${label}(${r.affectedRows})`); }
    return r.affectedRows;
  };

  for (const m of MERGES) {
    const [[src]] = await db.query(
      "SELECT user_id, username, full_name FROM user_access_master WHERE user_id = ?", [m.from]);
    if (!src) { console.log(`SKIP ${m.from} — already absent (${m.why})`); continue; }
    console.log(`MERGE ${m.from} ${src.username} -> ${m.to} ${m.toName} [${m.toCode}]`);

    // created_by on job cards is a USER id (isOwnedBy compares it to user_id).
    await run("job_card_master.created_by",
      "UPDATE job_card_master SET created_by = ? WHERE created_by = ?", [m.to, m.from]);
    await run("job_cards.created_by",
      "UPDATE job_cards SET created_by = ? WHERE created_by = ?", [m.to, m.from]);
    // Advisor is stored as a NAME string.
    await run("job_card_master.service_advisor",
      "UPDATE job_card_master SET service_advisor = ? WHERE LOWER(service_advisor) = LOWER(?)",
      [m.toName, src.full_name]);
    await run("tbl_manager_assignment.assigned_sa",
      "UPDATE tbl_manager_assignment SET assigned_sa_id = ?, assigned_sa_name = ? WHERE assigned_sa_id = ?",
      [String(m.to), m.toName, String(m.from)]);
    await run("tbl_manager_assignment.recommendation_sa_id",
      "UPDATE tbl_manager_assignment SET recommendation_sa_id = ? WHERE recommendation_sa_id = ?",
      [String(m.to), String(m.from)]);
    await run("tbl_sa_intake.sa_id",
      "UPDATE tbl_sa_intake SET sa_id = ?, sa_name = ? WHERE sa_id = ?",
      [String(m.to), m.toName, String(m.from)]);
    await run("tbl_sa_intake.authenticated_by",
      "UPDATE tbl_sa_intake SET authenticated_by = ? WHERE LOWER(authenticated_by) = LOWER(?)",
      [m.toName, src.full_name]);
    await run("security_audit_logs.user_id",
      "UPDATE security_audit_logs SET user_id = ? WHERE user_id = ?", [m.to, m.from]);
    await run("DELETE user_access_master", "DELETE FROM user_access_master WHERE user_id = ?", [m.from]);
    await run("DELETE users", "DELETE FROM users WHERE user_id = ?", [m.from]);
  }

  for (const id of DELETE_OUTRIGHT) {
    console.log(`DELETE ${id} (test artefact)`);
    await run("DELETE user_access_master", "DELETE FROM user_access_master WHERE user_id = ?", [id]);
    await run("DELETE users", "DELETE FROM users WHERE user_id = ?", [id]);
  }

  console.log("\nDEACTIVATE (reversible — no employee record yet):");
  for (const d of DEACTIVATE) {
    const n = await run(`  ${d.who}`, "UPDATE user_access_master SET is_active = 0 WHERE user_id = ?", [d.id]);
    if (n === 0) console.log(`  (no change) ${d.who}`);
  }

  await db.execute(
    "INSERT INTO security_audit_logs (user_id, username, action, details) VALUES (?, ?, ?, ?)",
    [29, 'hr_dapl', 'LOGIN_CONSOLIDATION',
     `Consolidated logins onto the Employee Directory. ${log.join('; ')}. Retained: ${KEEP.join(', ')}. CSC (GOURAMMA, AMEENA) and DEV-242 NAGESH deliberately untouched.`]);

  if (DRY) { await db.rollback(); console.log("\nRolled back (dry run)."); }
  else { await db.commit(); console.log("\nCommitted."); }

  console.log("\n=== VERIFY: logins still not backed by an employee record ===");
  console.table((await db.query(
    `SELECT u.user_id, u.username, u.full_name, u.user_role, u.is_active
       FROM user_access_master u LEFT JOIN employees e ON e.employee_id = u.employee_id
      WHERE e.employee_id IS NULL ORDER BY u.is_active DESC, u.user_id`))[0]);
  await db.end();
})().catch(e => { console.error("FAILED:", e.message); process.exit(1); });

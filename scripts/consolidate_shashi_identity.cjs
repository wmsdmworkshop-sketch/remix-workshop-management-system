/**
 * Consolidate the three "Shashi" logins onto the single real employee.
 *
 * KEEP    : user_id 55  dev-252  'SHASHI KUMAR'  employee_id 7 (DEV-252)  — the only
 *           SHASHI in the employees table.
 * MIGRATE : user_id 22  shashi_sa                (inactive, employee_id NULL)
 *           user_id 33  patilshashi5558@gmail.com 'Shashi_Patil' (employee_id 29 — no
 *                                                  such employee row exists; orphan)
 * UNTOUCHED: user_id 23 'mustafa ladaf' and user_id 38 'Mustafa' are MUSTAFA's logins,
 *           not Shashi's, even though some tbl_manager_assignment rows store a Shashi
 *           name against them. That id/name mismatch is a separate defect and is
 *           reported, never guessed at here.
 *
 * Run with DRY=1 to preview. Without DRY it commits in a single transaction.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const DRY = process.env.DRY === '1';
const KEEP_USER_ID = 55;
const KEEP_NAME = 'SHASHI KUMAR';
const DEAD_USER_IDS = ['22', '33'];
const DEAD_NAMES = ['shashikumar', 'Shashi_Patil'];

(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  // Guard: never run if the surviving account is not exactly what we expect.
  const [[keep]] = await db.query(
    "SELECT user_id, username, full_name, employee_id FROM user_access_master WHERE user_id = ?", [KEEP_USER_ID]);
  if (!keep || keep.username !== 'dev-252' || keep.full_name !== KEEP_NAME || Number(keep.employee_id) !== 7) {
    throw new Error("Surviving account is not dev-252/SHASHI KUMAR/employee 7 — refusing to run.");
  }
  console.log(`Surviving account verified: ${keep.user_id} ${keep.username} ${keep.full_name} emp=${keep.employee_id}`);
  console.log(DRY ? "\n*** DRY RUN — no writes ***\n" : "\n*** LIVE RUN ***\n");

  await db.beginTransaction();
  const applied = [];
  const run = async (label, sql, params) => {
    const [r] = await db.execute(sql, params);
    console.log(`${label.padEnd(52)} rows=${r.affectedRows}`);
    applied.push(`${label} (${r.affectedRows})`);
    return r.affectedRows;
  };

  // 1. Job cards — the real backing store. 16 'shashikumar' + 4 'Shashi_Patil'.
  await run("job_card_master.service_advisor -> SHASHI KUMAR",
    `UPDATE job_card_master SET service_advisor = ? WHERE service_advisor IN (?, ?)`,
    [KEEP_NAME, ...DEAD_NAMES]);

  // 2. Manager assignments — migrate by LOGIN ID only (never by the corrupted name).
  await run("tbl_manager_assignment.assigned_sa_id -> 55",
    `UPDATE tbl_manager_assignment SET assigned_sa_id = ?, assigned_sa_name = ?
       WHERE assigned_sa_id IN (?, ?)`,
    [String(KEEP_USER_ID), KEEP_NAME, ...DEAD_USER_IDS]);

  await run("tbl_manager_assignment.recommendation_sa_id -> 55",
    `UPDATE tbl_manager_assignment SET recommendation_sa_id = ?
       WHERE recommendation_sa_id IN (?, ?)`,
    [String(KEEP_USER_ID), ...DEAD_USER_IDS]);

  // 3. SA intake.
  await run("tbl_sa_intake.sa_id/sa_name -> 55 / SHASHI KUMAR",
    `UPDATE tbl_sa_intake SET sa_id = ?, sa_name = ? WHERE sa_id IN (?, ?)`,
    [String(KEEP_USER_ID), KEEP_NAME, ...DEAD_USER_IDS]);

  await run("tbl_sa_intake.authenticated_by -> SHASHI KUMAR",
    `UPDATE tbl_sa_intake SET authenticated_by = ? WHERE authenticated_by IN (?, ?)`,
    [KEEP_NAME, ...DEAD_NAMES]);

  // 4. Canonicalise the role. Every lookup table in the app is keyed snake_case;
  //    'Service Advisor' misses them all and silently falls back to reception tabs.
  await run("user_access_master.user_role -> service_advisor",
    `UPDATE user_access_master SET user_role = 'service_advisor' WHERE user_id = ?`,
    [KEEP_USER_ID]);

  // 5. Retire the duplicate logins.
  await run("DELETE user_access_master 22, 33",
    `DELETE FROM user_access_master WHERE user_id IN (?, ?)`, DEAD_USER_IDS);

  await run("DELETE users 22, 33",
    `DELETE FROM users WHERE user_id IN (?, ?)`, DEAD_USER_IDS);

  // 6. Audit. No .catch() — a failed audit must roll the whole batch back.
  await db.execute(
    `INSERT INTO security_audit_logs (user_id, username, action, details) VALUES (?, ?, ?, ?)`,
    [KEEP_USER_ID, 'dev-252', 'IDENTITY_CONSOLIDATION',
     `Merged duplicate Shashi logins 22 (shashi_sa) and 33 (patilshashi5558@gmail.com) into 55 (dev-252 / SHASHI KUMAR, employee 7). ${applied.join('; ')}. Mustafa's logins 23 and 38 deliberately untouched.`]);

  if (DRY) { await db.rollback(); console.log("\nRolled back (dry run)."); }
  else { await db.commit(); console.log("\nCommitted."); }

  // Verification — read back outside the transaction.
  console.log("\n=== VERIFY: advisor distribution ===");
  console.table((await db.query("SELECT service_advisor, COUNT(*) n FROM job_card_master GROUP BY 1 ORDER BY n DESC"))[0]);
  console.log("=== VERIFY: remaining Shashi logins ===");
  console.table((await db.query("SELECT user_id,username,full_name,user_role,employee_id,is_active FROM user_access_master WHERE full_name LIKE '%shashi%'"))[0]);
  await db.end();
})().catch(e => { console.error("FAILED:", e.message); process.exit(1); });

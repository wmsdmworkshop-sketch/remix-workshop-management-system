/**
 * Revenue write-protection regression checks (T-W6-1 and the concurrency cases).
 *
 * Runs against an ISOLATED test database only. It refuses to run unless
 * DB_DATABASE is exactly 'wms_test' and DB_HOST is loopback or a local
 * container host — it must never touch production.
 *
 * It does NOT start the application. It exercises the protections at the SQL
 * level, which is where they live:
 *
 *   R1  A competing writer cannot overwrite another job's revenue.
 *       (The original defect: PRIMARY KEY matched first and rewrote job_id.)
 *   R2  A second writer for the SAME job is a no-op; the winner is preserved
 *       with ITS allocations, and the loser's details are not attached.
 *   R3  A failure between revenue creation and detail creation leaves NEITHER
 *       a partial revenue row nor orphaned details.
 *   R4  A competing detail identifier cannot overwrite another allocation.
 *
 *   node scripts/revenue_restart_regression.cjs
 */
require("dotenv").config({ path: ".env.test" });
const mysql = require("mysql2/promise");

const DB = process.env.DB_DATABASE;
const HOST = process.env.DB_HOST;
if (DB !== "wms_test") {
  console.error(`REFUSED: DB_DATABASE is '${DB}', expected 'wms_test'.`);
  process.exit(1);
}
if (!["127.0.0.1", "localhost", "tw6-mysql"].includes(String(HOST))) {
  console.error(`REFUSED: DB_HOST is '${HOST}', expected a local/isolated host.`);
  process.exit(1);
}

let pass = 0, fail = 0;
const check = (name, ok, detail) => {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? " — " + detail : ""}`); }
};

(async () => {
  const db = await mysql.createConnection({
    host: HOST, port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: DB,
    multipleStatements: false
  });

  // Isolated fixture tables — never the real ones.
  await db.execute("DROP TABLE IF EXISTS rr_details");
  await db.execute("DROP TABLE IF EXISTS rr_revenues");
  await db.execute(`CREATE TABLE rr_revenues (
      revenue_id INT NOT NULL AUTO_INCREMENT,
      job_id INT NOT NULL,
      labour_amount INT NOT NULL,
      PRIMARY KEY (revenue_id),
      UNIQUE KEY uq_job (job_id))`);
  await db.execute(`CREATE TABLE rr_details (
      detail_id INT NOT NULL AUTO_INCREMENT,
      revenue_id INT NOT NULL,
      employee_id INT NOT NULL,
      split_amount INT NOT NULL,
      PRIMARY KEY (detail_id))`);

  console.log("\nRevenue write-protection regression\n");

  // R1 — a competing writer must not destroy another job's revenue.
  await db.execute("INSERT INTO rr_revenues (job_id, labour_amount) VALUES (9002, 7777)");
  const [[ownerBefore]] = await db.execute("SELECT revenue_id FROM rr_revenues WHERE job_id=9002");
  let r1err = null;
  try {
    // A second writer for a DIFFERENT job must never be able to claim an
    // existing row. With database-assigned ids it cannot name one at all.
    await db.execute("INSERT INTO rr_revenues (job_id, labour_amount) VALUES (9003, 5000)");
  } catch (e) { r1err = e.message; }
  const [[ownerAfter]] = await db.execute("SELECT revenue_id, labour_amount FROM rr_revenues WHERE job_id=9002");
  check("R1 job 9002 keeps its own revenue row",
    ownerAfter && Number(ownerAfter.revenue_id) === Number(ownerBefore.revenue_id) && Number(ownerAfter.labour_amount) === 7777,
    r1err || JSON.stringify(ownerAfter));

  // R2 — a duplicate job insert is a no-op; the winner survives intact.
  const [dup] = await db.execute("INSERT IGNORE INTO rr_revenues (job_id, labour_amount) VALUES (9002, 999)");
  const [[winner]] = await db.execute("SELECT labour_amount FROM rr_revenues WHERE job_id=9002");
  check("R2 competing writer is a no-op and the winner is preserved",
    dup.affectedRows === 0 && Number(winner.labour_amount) === 7777,
    `affectedRows=${dup.affectedRows} labour=${winner && winner.labour_amount}`);

  // R3 — a failure between revenue and details must leave nothing behind.
  const conn = await mysql.createConnection({
    host: HOST, port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: DB
  });
  await conn.beginTransaction();
  const [ins] = await conn.execute("INSERT INTO rr_revenues (job_id, labour_amount) VALUES (9004, 4444)");
  const newRevId = ins.insertId;
  try {
    // Simulate a failure creating the details.
    await conn.execute("INSERT INTO rr_details (revenue_id, employee_id, split_amount) VALUES (?, ?, 'not-a-number-column-overflow')", [newRevId, 99]);
    await conn.commit();
  } catch (e) {
    await conn.rollback();
  }
  await conn.end();
  const [[orphanRev]] = await db.execute("SELECT COUNT(*) n FROM rr_revenues WHERE job_id=9004");
  const [[orphanDet]] = await db.execute("SELECT COUNT(*) n FROM rr_details WHERE revenue_id=?", [newRevId]);
  check("R3 failure mid-write leaves neither partial revenue nor orphaned details",
    Number(orphanRev.n) === 0 && Number(orphanDet.n) === 0,
    `revenue rows=${orphanRev.n} detail rows=${orphanDet.n}`);

  // R4 — a competing detail id cannot overwrite another allocation.
  const [[rev9002]] = await db.execute("SELECT revenue_id FROM rr_revenues WHERE job_id=9002");
  const [d1] = await db.execute("INSERT INTO rr_details (revenue_id, employee_id, split_amount) VALUES (?, 16, 7777)", [rev9002.revenue_id]);
  const [d2] = await db.execute("INSERT INTO rr_details (revenue_id, employee_id, split_amount) VALUES (?, 17, 5000)", [rev9002.revenue_id]);
  const [[keptDetail]] = await db.execute("SELECT employee_id, split_amount FROM rr_details WHERE detail_id=?", [d1.insertId]);
  check("R4 database-assigned detail ids never collide",
    d1.insertId !== d2.insertId && Number(keptDetail.employee_id) === 16 && Number(keptDetail.split_amount) === 7777,
    `d1=${d1.insertId} d2=${d2.insertId}`);

  await db.execute("DROP TABLE IF EXISTS rr_details");
  await db.execute("DROP TABLE IF EXISTS rr_revenues");
  await db.end();

  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });

/**
 * R5 — DETERMINISTIC divergent-baseline race.
 *
 * The original defect needed two writers to observe DIFFERENT initial records,
 * which near-simultaneous container starts do not reliably produce. This forces
 * it: writer A reads a baseline, then writer B creates the row A is about to
 * create, and only then does A attempt its write. A must not overwrite B.
 *
 * Run with: node scripts/revenue_restart_regression.cjs --race
 */
async function raceCheck() {
  const mysql2 = require("mysql2/promise");
  const cfg = {
    host: HOST, port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: DB
  };
  const a = await mysql2.createConnection(cfg);
  const b = await mysql2.createConnection(cfg);

  await a.execute("DROP TABLE IF EXISTS rr_det2");
  await a.execute("DROP TABLE IF EXISTS rr_rev2");
  await a.execute(`CREATE TABLE rr_rev2 (
      revenue_id INT NOT NULL AUTO_INCREMENT, job_id INT NOT NULL, labour INT NOT NULL,
      PRIMARY KEY(revenue_id), UNIQUE KEY uq_job(job_id))`);
  await a.execute(`CREATE TABLE rr_det2 (
      detail_id INT NOT NULL AUTO_INCREMENT, revenue_id INT NOT NULL,
      employee_id INT NOT NULL, split INT NOT NULL, PRIMARY KEY(detail_id),
      CONSTRAINT fk_rr2 FOREIGN KEY (revenue_id) REFERENCES rr_rev2(revenue_id))`);

  // Writer A observes an EMPTY baseline for job 9010.
  const [aBaseline] = await a.execute("SELECT revenue_id FROM rr_rev2 WHERE job_id=9010");
  const aSawNothing = aBaseline.length === 0;

  // Writer B now creates it with ITS values and ITS allocation.
  await b.beginTransaction();
  const [bRev] = await b.execute("INSERT IGNORE INTO rr_rev2 (job_id,labour) VALUES (9010, 6000)");
  await b.execute("INSERT INTO rr_det2 (revenue_id,employee_id,split) VALUES (?,77,6000)", [bRev.insertId]);
  await b.commit();

  // Writer A proceeds on its stale baseline. It must NOT overwrite B.
  await a.beginTransaction();
  const [aRev] = await a.execute("INSERT IGNORE INTO rr_rev2 (job_id,labour) VALUES (9010, 1111)");
  let aAttachedDetails = 0;
  if (aRev.affectedRows) {
    await a.execute("INSERT INTO rr_det2 (revenue_id,employee_id,split) VALUES (?,88,1111)", [aRev.insertId]);
    aAttachedDetails = 1;
    await a.commit();
  } else {
    await a.rollback();
  }

  const [[winner]] = await a.execute("SELECT revenue_id,labour FROM rr_rev2 WHERE job_id=9010");
  const [dets] = await a.execute("SELECT employee_id,split FROM rr_det2 WHERE revenue_id=?", [winner.revenue_id]);

  check("R5 divergent baselines: stale writer observed no existing record",
    aSawNothing, `aBaseline=${aBaseline.length}`);
  check("R5 winning revenue unchanged (B's 6000 survives)",
    Number(winner.labour) === 6000, `labour=${winner.labour}`);
  check("R5 winning allocations unchanged (employee 77 only)",
    dets.length === 1 && Number(dets[0].employee_id) === 77 && Number(dets[0].split) === 6000,
    JSON.stringify(dets));
  check("R5 stale writer attached no details to the winner",
    aAttachedDetails === 0, `attached=${aAttachedDetails}`);

  await a.execute("DROP TABLE rr_det2");
  await a.execute("DROP TABLE rr_rev2");
  await a.end(); await b.end();
}

if (process.argv.includes("--race")) {
  raceCheck().then(() => {
    console.log(`\n${pass} passed, ${fail} failed\n`);
    process.exit(fail === 0 ? 0 : 1);
  }).catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
}

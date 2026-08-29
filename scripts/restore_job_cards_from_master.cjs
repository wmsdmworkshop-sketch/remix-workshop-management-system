/**
 * Restore `job_cards` from its surviving projection `job_card_master`.
 *
 * `db.jobCards` (and therefore /api/my/summary, /api/jobcards and every
 * workspace) loads from `job_cards`, which holds only 4 seed rows
 * (JC-901..904 / VRN1..VRN4). All 43 real cards exist only as their
 * `job_card_master` projection, written by saveJobCardsToMaster() in
 * src/db/sync.ts. This inverts exactly that function - no invented mappings.
 *
 * The forward projection is LOSSY. These fields cannot be recovered and are
 * left NULL/blank rather than fabricated (real-data-only contract):
 *   vehicle_model/make/year, job_description, priority, remarks, date_in,
 *   time_in, technician_name, no_of_laborers, l1..l5 delays, and
 *   labor_price/parts_price (forward-summed into a single estimated_amount).
 * Status is also lossy: 'Unassigned' meant Waiting OR Cancelled, and
 * 'In Progress' meant Active OR Rework. The dominant value is restored.
 *
 * Run with DRY=1 to preview.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const DRY = process.env.DRY === '1';

// Exact inverse of saveJobCardsToMaster()'s status map.
const STATUS_FROM_MASTER = {
  'Unassigned': 'Waiting',
  'In Progress': 'Active',
  'Ready': 'Completed',
  'Delivered': 'Invoiced',
  'Carry Forward': 'Carry Forward',
};
// Exact inverse of its service_type map; anything else was the default branch.
const SR_TYPE_FROM_MASTER = { 'Oil Change': 4, 'Electrical': 3, '2 Service': 2 };

const asStr = (d) => {
  if (!d) return null;
  const t = d instanceof Date ? d : new Date(d);
  return isNaN(t.getTime()) ? null : t.toISOString().slice(0, 19).replace('T', ' ');
};

(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  const [orphans] = await db.query(
    `SELECT m.* FROM job_card_master m
      WHERE NOT EXISTS (SELECT 1 FROM job_cards j WHERE j.job_id = m.job_card_id)
      ORDER BY m.job_card_id`);
  console.log(`job_card_master rows with no job_cards row: ${orphans.length}`);
  if (orphans.length === 0) { console.log("Nothing to restore."); await db.end(); return; }
  console.log(DRY ? "\n*** DRY RUN ***\n" : "\n*** LIVE RUN ***\n");

  await db.beginTransaction();
  let inserted = 0;
  const unmappedStatus = new Set();

  for (const m of orphans) {
    if (!STATUS_FROM_MASTER[m.job_status]) unmappedStatus.add(m.job_status);
    const row = {
      job_id:           m.job_card_id,
      job_card_no:      m.job_card_no,
      crm_job_card_no:  m.crm_jc_no || null,
      vrn:              m.vehicle_reg || '',
      vin:              m.vin || null,
      customer_name:    m.customer_name || '',
      customer_mobile:  m.driver_mobile || '',
      vehicle_model:    '',                       // NOT NULL, unrecoverable - left blank, never invented
      sr_type_id:       SR_TYPE_FROM_MASTER[m.service_type] || 1,
      status:           STATUS_FROM_MASTER[m.job_status] || 'Waiting',
      workshop_stage:   m.live_status || null,
      bay_id:           m.bay_id || null,
      service_advisor:  m.service_advisor || null,
      created_by:       m.created_by || 1,
      etd:              asStr(m.etd),
      completed_at:     asStr(m.actual_delivery),
      gate_out_time:    asStr(m.gate_out_time),
      created_at:       asStr(m.created_at) || asStr(new Date()),
      updated_at:       asStr(m.updated_at),
      last_service_date: m.last_service_date || null,
      odometer_reading: m.odometer_reading ?? null,
      km_reading:       m.odometer_reading ?? null,
      invoice_ocr_data: m.invoice_ocr_data || null,
      numberplate_photo: m.numberplate_photo || null,
      odometer_photo:   m.odometer_photo || null,
    };
    const keys = Object.keys(row);
    await db.execute(
      `INSERT INTO job_cards (${keys.map(k => `\`${k}\``).join(', ')})
       VALUES (${keys.map(() => '?').join(', ')})`,
      keys.map(k => row[k]));
    inserted++;
  }

  if (unmappedStatus.size) console.log("NOTE unmapped job_status, defaulted to Waiting:", [...unmappedStatus].join(', '));
  console.log(`Inserted ${inserted} job_cards rows.`);

  await db.execute(
    `INSERT INTO security_audit_logs (user_id, username, action, details) VALUES (?, ?, ?, ?)`,
    [55, 'dev-252', 'JOB_CARDS_RESTORE',
     `Restored ${inserted} rows into job_cards from job_card_master projection. Lossy fields (vehicle_model/make/year, job_description, priority, remarks, labor_price, parts_price, technician_name) left empty rather than fabricated.`]);

  if (DRY) { await db.rollback(); console.log("Rolled back (dry run)."); }
  else { await db.commit(); console.log("Committed."); }

  console.log("\n=== VERIFY ===");
  console.table((await db.query("SELECT COUNT(*) total FROM job_cards"))[0]);
  console.table((await db.query("SELECT service_advisor, status, COUNT(*) n FROM job_cards GROUP BY 1,2 ORDER BY n DESC"))[0]);
  await db.end();
})().catch(e => { console.error("FAILED:", e.message); process.exit(1); });

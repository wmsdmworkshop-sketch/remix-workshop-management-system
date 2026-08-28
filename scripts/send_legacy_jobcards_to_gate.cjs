/**
 * Route legacy job cards back through the gate-entry workflow.
 *
 * WHY THESE EXIST
 * ---------------
 * job_card_master holds two populations. 24 cards arrived through
 * gate entry -> reception intake -> manager assignment and carry a service
 * advisor. 19 came from a DMS import with no gate entry and no intake. The
 * assign endpoint requires intakeId AND gateEntryId and resolves the vehicle
 * from tbl_gate_entry.vin, and the Manager Assignment Workspace lists intakes —
 * so those 19 can never be assigned an advisor and never appear in the queue.
 * JC-07370 has sat WAITING for 8 days for exactly this reason.
 *
 * WHAT THIS DOES
 * --------------
 * For each eligible card it creates the two records the workflow needs:
 *   tbl_gate_entry       arrival, backdated to the card's created_at
 *   tbl_reception_intake status PENDING, so it lands in the manager queue
 *
 * The vehicle genuinely did arrive — it is physically in the workshop. What was
 * missing is the record. created_at is the closest known approximation of the
 * arrival and is used rather than invented; the audit row states plainly that
 * the time is reconstructed, so it is never mistaken for an observed gate-in.
 *
 * WHAT IT REFUSES TO TOUCH
 * ------------------------
 *  - Cards whose vehicle_reg is TRUNCATED. vehicle_reg is varchar(10), so a
 *    hyphenated plate like KA-32-AB-1234 was stored as 'KA-32-AB-1'. The lost
 *    digits are unrecoverable. Creating a gate entry would enshrine a plate
 *    belonging to no vehicle, or worse, to a different one. These need the real
 *    registration entered by a human first.
 *  - Cards already Delivered. The vehicle has left; sending it back to the gate
 *    would fabricate a second arrival.
 *  - Cards that already have a gate entry.
 *
 * AUTHORISATION
 * -------------
 * Mirrors backdate-policy.ts rather than bypassing it, because a script writing
 * straight to the tables would otherwise dodge the very control just built:
 *   - system_settings.allow_backdated_entries must be 'true'
 *   - --actor must name a user whose role is admin, developer or gm_service
 *   - --reason is mandatory
 * Every created entry writes a LEGACY_JOBCARD_GATED audit row.
 *
 * RUN
 * ---
 *   node scripts/send_legacy_jobcards_to_gate.cjs --actor=sayeed_dp --reason="UAT backfill"
 *   node scripts/send_legacy_jobcards_to_gate.cjs --actor=sayeed_dp --reason="UAT backfill" --apply
 */

require("dotenv").config();
const mysql = require("mysql2/promise");
const { randomUUID } = require("crypto");

const APPLY = process.argv.includes("--apply");
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").split("=").slice(1).join("=");
const ACTOR = arg("actor");
const REASON = arg("reason");

const BACKDATE_ROLES = ["admin", "developer", "gm service"];
const norm = (r) => String(r || "").toLowerCase().trim().replace(/_/g, " ");

/** A plate stored at exactly the column limit and containing a hyphen is truncated. */
function isTruncatedVrn(vrn) {
  const v = String(vrn || "");
  return v.length >= 10 && v.includes("-");
}

(async () => {
  if (!ACTOR || !REASON) {
    console.error("Both --actor=<username> and --reason=<text> are required.");
    process.exit(1);
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: Number(process.env.DB_PORT || 3306),
  });

  // --- authorisation, same rules as backdate-policy.ts ---
  const [users] = await conn.query(
    "SELECT user_id, username, user_role FROM user_access_master WHERE username = ? AND is_active = 1",
    [ACTOR]
  );
  if (!users.length) {
    console.error(`Actor '${ACTOR}' not found or inactive.`);
    await conn.end();
    process.exit(1);
  }
  const actor = users[0];
  if (!BACKDATE_ROLES.includes(norm(actor.user_role))) {
    console.error(
      `Actor @${actor.username} has role '${actor.user_role}'. Only admin, developer or gm_service may backdate.`
    );
    await conn.end();
    process.exit(1);
  }

  const [setting] = await conn.query(
    "SELECT setting_value FROM system_settings WHERE setting_key = 'allow_backdated_entries'"
  );
  const enabled = setting.length && String(setting[0].setting_value).trim().toLowerCase() === "true";
  if (!enabled) {
    console.error(
      "Backdating is disabled. This creates backdated arrivals, so it is refused.\n" +
        "  Enable for the testing period:\n" +
        "    INSERT INTO system_settings (setting_key, setting_value)\n" +
        "    VALUES ('allow_backdated_entries','true')\n" +
        "    ON DUPLICATE KEY UPDATE setting_value='true';"
    );
    await conn.end();
    process.exit(1);
  }
  console.log(`Actor: @${actor.username} (${actor.user_role})  |  backdating: ENABLED\n`);

  // --- classify ---
  const [cards] = await conn.query(
    `SELECT job_card_id, job_card_no, vehicle_reg, customer_name, odometer_reading, created_at, job_status
       FROM job_card_master
      WHERE (service_advisor IS NULL OR service_advisor = '')
      ORDER BY created_at`
  );

  const eligible = [], skipped = [];
  for (const c of cards) {
    const [ge] = await conn.query("SELECT gate_entry_id FROM tbl_gate_entry WHERE vin = ?", [
      "VIN-" + c.vehicle_reg,
    ]);
    if (ge.length) { skipped.push({ ...c, why: "already has a gate entry" }); continue; }
    if (String(c.job_status).toLowerCase() === "delivered") {
      skipped.push({ ...c, why: "already Delivered — vehicle has left" }); continue;
    }
    if (isTruncatedVrn(c.vehicle_reg)) {
      skipped.push({ ...c, why: `VRN '${c.vehicle_reg}' is TRUNCATED (varchar(10)) — real plate unknown` });
      continue;
    }
    if (!c.created_at) { skipped.push({ ...c, why: "no created_at to use as arrival" }); continue; }
    eligible.push(c);
  }

  console.log(`ELIGIBLE (${eligible.length}):`);
  for (const c of eligible)
    console.log(`  ${String(c.job_card_no).padEnd(10)} ${String(c.vehicle_reg).padEnd(12)} ${String(c.job_status).padEnd(12)} arrival<-${String(c.created_at).slice(0, 16)}  odo=${c.odometer_reading}`);
  console.log(`\nSKIPPED (${skipped.length}):`);
  for (const c of skipped)
    console.log(`  ${String(c.job_card_no).padEnd(10)} ${String(c.vehicle_reg).padEnd(12)} ${c.why}`);

  if (!APPLY) {
    console.log("\nDry run. Re-run with --apply to create the gate entries and intakes.");
    await conn.end();
    return;
  }
  if (eligible.length === 0) {
    console.log("\nNothing eligible — no changes made.");
    await conn.end();
    return;
  }

  await conn.beginTransaction();
  try {
    let n = 0;
    for (const c of eligible) {
      const gateEntryId = `GE-${randomUUID().substring(0, 8).toUpperCase()}`;
      const intakeId = `INT-${randomUUID().substring(0, 8).toUpperCase()}`;
      const arrival = new Date(c.created_at);

      await conn.execute(
        `INSERT INTO tbl_gate_entry
           (gate_entry_id, vin, source, odometer, driver_details, initial_remarks, status, arrival_time)
         VALUES (?, ?, 'LEGACY_IMPORT', ?, ?, ?, 'GATE_IN', ?)`,
        [
          gateEntryId,
          "VIN-" + c.vehicle_reg,
          c.odometer_reading ?? 0,
          JSON.stringify({ driverName: "", driverMobile: "", gateNumber: "LEGACY", reconstructed: true }),
          `Reconstructed from DMS job card ${c.job_card_no}. Arrival time approximated from created_at; not an observed gate-in.`,
          arrival,
        ]
      );

      await conn.execute(
        `INSERT INTO tbl_reception_intake
           (intake_id, gate_entry_id, status, original_odometer, confirmed_odometer,
            visit_category, preliminary_complaints, branch_id)
         VALUES (?, ?, 'PENDING', ?, ?, 'Other', ?, 'BR-SEDAM')`,
        [
          intakeId,
          gateEntryId,
          c.odometer_reading ?? 0,
          c.odometer_reading ?? 0,
          `Legacy job card ${c.job_card_no} routed back through the workflow for advisor assignment.`,
        ]
      );

      // security_audit_logs is the real table (there is no `audit_logs`).
      // This is NOT wrapped in a catch: a backdated arrival that failed to
      // record an audit row is indistinguishable from an observed one, so a
      // failed audit must roll the whole batch back rather than be logged and
      // shrugged off.
      await conn.execute(
        `INSERT INTO security_audit_logs (user_id, username, action, details, created_at)
         VALUES (?, ?, 'LEGACY_JOBCARD_GATED', ?, NOW())`,
        [
          actor.user_id,
          actor.username,
          `Job card ${c.job_card_no} (${c.vehicle_reg}) routed to gate entry ${gateEntryId} / intake ${intakeId}. ` +
            `Arrival BACKDATED to ${arrival.toISOString()} reconstructed from created_at — not observed. Reason: ${REASON}`,
        ]
      );

      n++;
      console.log(`  ${c.job_card_no} -> ${gateEntryId} / ${intakeId}`);
    }
    await conn.commit();
    console.log(`\nCOMMITTED. ${n} job card(s) routed back to the gate workflow.`);
  } catch (err) {
    await conn.rollback();
    console.error("ROLLED BACK:", err.message);
    await conn.end();
    process.exit(1);
  }

  const [pending] = await conn.query("SELECT COUNT(*) n FROM tbl_reception_intake WHERE status='PENDING'");
  console.log(`Intakes now PENDING in the manager queue: ${pending[0].n}`);
  await conn.end();
})().catch((err) => {
  console.error("ERROR:", err.message);
  process.exit(1);
});

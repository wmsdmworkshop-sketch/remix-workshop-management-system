import type { Migration } from "../migrate.ts";
import { pool as db } from "../index.ts";

/**
 * Clear the advisor queues of vehicles whose intake is already finished.
 *
 * WHY THIS EXISTS
 *
 * getSaAssignedQueue() lists tbl_manager_assignment rows WHERE status =
 * 'ASSIGNED'. Nothing ever moved a row off that value — there was no UPDATE of
 * this table anywhere in the codebase — so a vehicle stayed in its advisor's
 * queue forever, even after the technical intake completed and the job card
 * went to the floor. Every one of the 197 production rows read 'ASSIGNED'.
 *
 * The symptom: an advisor completes the intake, gets a truthful "sent to floor"
 * confirmation (tbl_sa_intake really does reach SENT_TO_FLOOR), and then finds
 * the same vehicle still sitting in the list.
 *
 * The code fix is in sa-technical-intake.ts, which now closes the assignment as
 * part of createJobCard. This migration cleans up the rows that were stranded
 * before that existed.
 *
 * WHAT IT TOUCHES
 *
 * ONLY assignments whose gate entry already has a tbl_sa_intake row — i.e. the
 * intake demonstrably happened. Measured before writing this: 5 such rows. The
 * other 192 ASSIGNED rows have no intake and are a GENUINE queue of vehicles
 * still waiting for their advisor; they are deliberately left untouched, since
 * closing them would empty real work out of the advisors' screens.
 *
 * SAFETY
 *
 * Idempotent — a second run finds nothing still ASSIGNED with a completed
 * intake. Updates a status only; no row is deleted and no other column changes.
 * The assignment history (who was assigned, when) is preserved.
 */
const migration: Migration = {
  version: 23,
  name: "close_completed_manager_assignments",
  up: async (pool: typeof db) => {
    const connection = await pool.getConnection();
    try {
      const [before]: any = await connection.query(
        `SELECT COUNT(*) AS n FROM tbl_manager_assignment WHERE status = 'ASSIGNED'`
      );

      const [res]: any = await connection.execute(
        `UPDATE tbl_manager_assignment ma
           INNER JOIN tbl_sa_intake i ON i.gate_entry_id = ma.gate_entry_id
            SET ma.status = 'INTAKE_COMPLETED'
          WHERE ma.status = 'ASSIGNED'`
      );

      const [after]: any = await connection.query(
        `SELECT COUNT(*) AS n FROM tbl_manager_assignment WHERE status = 'ASSIGNED'`
      );

      console.log(
        `[Migration v23] closed ${res?.affectedRows || 0} completed assignment(s). ` +
          `ASSIGNED: ${before?.[0]?.n ?? "?"} -> ${after?.[0]?.n ?? "?"} ` +
          `(the remainder are vehicles genuinely still awaiting intake).`
      );
    } finally {
      connection.release();
    }
  }
};

export default migration;

import type { Migration } from "../migrate.ts";
import { pool as db } from "../index.ts";

/**
 * Retire the last two invented bays, B-01 and B-04.
 *
 * WHY THIS IS A SEPARATE MIGRATION
 *
 * Migration 020 established the real 16-bay roster and removed four of the six
 * invented bays, but deliberately KEPT B-01 and B-04 because they still held
 * ACTIVE allocations:
 *
 *   ALLOC-6AD936A1  DWIP-TEMP-SEDAM-20260908-001  B-01  (MD GOUSE)
 *   ALLOC-AA6E1956  DWIP-TEMP-SEDAM-20260912-001  B-04
 *
 * Deleting a bay that still holds live floor work would orphan the job, so 020
 * refused and reported them. The owner has since confirmed both vehicles have
 * left the workshop.
 *
 * 020 is already recorded in schema_migrations and will never run again, so its
 * file is left exactly as it executed. Editing an applied migration would make
 * the source disagree with what actually ran against the database.
 *
 * WHAT THIS DOES
 *
 *   1. Releases the two allocations (status RELEASED — the row is kept, so
 *      which technician worked on what survives).
 *   2. Frees any bay still pointing at them.
 *   3. Deletes B-01 and B-04, applying the SAME guard as 020: a bay is removed
 *      only if no ACTIVE allocation references it at that moment.
 *
 * After this, tbl_bays holds exactly the real roster: B01-B09 and I1-I7.
 *
 * SAFETY
 *
 * Idempotent — re-running finds nothing to release and the bays already gone.
 * It names the two allocations' job cards explicitly rather than releasing
 * whatever happens to be ACTIVE, so a job allocated after this was written is
 * never silently released. If either bay has picked up a NEW active allocation
 * in the meantime, it is kept and reported rather than deleted.
 */

/** The last two invented bays from migration 011's seed. */
const LAST_INVENTED_BAYS = ["B-01", "B-04"];

/** Confirmed by the owner as having left the workshop. */
const DEPARTED_JOB_CARDS = [
  "DWIP-TEMP-SEDAM-20260908-001",
  "DWIP-TEMP-SEDAM-20260912-001",
];

const migration: Migration = {
  version: 21,
  name: "retire_last_invented_bays",
  up: async (pool: typeof db) => {
    const connection = await pool.getConnection();
    try {
      const jcPlaceholders = DEPARTED_JOB_CARDS.map(() => "?").join(",");

      // 1. Release the departed vehicles' allocations. History is preserved.
      const [released]: any = await connection.execute(
        `UPDATE tbl_job_allocations
            SET status = 'RELEASED'
          WHERE status = 'ACTIVE' AND job_card_id IN (${jcPlaceholders})`,
        DEPARTED_JOB_CARDS
      );

      // 2. Free any bay still showing them as present.
      const [freed]: any = await connection.execute(
        `UPDATE tbl_bays
            SET status = 'AVAILABLE', current_job_card_id = NULL,
                current_vrn = NULL, occupied_since = NULL
          WHERE current_job_card_id IN (${jcPlaceholders})`,
        DEPARTED_JOB_CARDS
      );
      console.log(
        `[Migration v21] departed: ${released?.affectedRows || 0} allocation(s) released, ` +
          `${freed?.affectedRows || 0} bay(s) freed.`
      );

      // 3. Same guard as v20 — never delete a bay that currently holds work.
      const bayPlaceholders = LAST_INVENTED_BAYS.map(() => "?").join(",");
      const [stillUsed]: any = await connection.query(
        `SELECT DISTINCT bay_id FROM tbl_job_allocations
          WHERE status = 'ACTIVE' AND bay_id IN (${bayPlaceholders})`,
        LAST_INVENTED_BAYS
      );
      const keep = new Set((stillUsed || []).map((r: any) => String(r.bay_id)));
      const removable = LAST_INVENTED_BAYS.filter((b) => !keep.has(b));

      if (removable.length) {
        const rPlaceholders = removable.map(() => "?").join(",");
        const [gone]: any = await connection.execute(
          `DELETE FROM tbl_bays WHERE bay_id IN (${rPlaceholders})`,
          removable
        );
        console.log(`[Migration v21] removed ${gone?.affectedRows || 0} invented bay(s): ${removable.join(", ")}.`);
      }
      if (keep.size) {
        console.log(
          `[Migration v21] KEPT ${[...keep].join(", ")} — a NEW active allocation appeared after this ` +
            `migration was written. Reallocate that job to a real bay before removing the bay.`
        );
      }

      // Report the resulting roster so the boot log states what the workshop
      // actually has, rather than leaving it to be inferred.
      const [remaining]: any = await connection.query(
        `SELECT COUNT(*) AS n FROM tbl_bays`
      );
      console.log(`[Migration v21] tbl_bays now holds ${remaining?.[0]?.n ?? "?"} bay(s).`);
    } finally {
      connection.release();
    }
  }
};

export default migration;

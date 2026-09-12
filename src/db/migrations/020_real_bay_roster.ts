import type { Migration } from "../migrate.ts";
import { pool as db } from "../index.ts";

/**
 * The real bay roster: 9 working bays + 7 new ICE bays.
 *
 * WHY THIS EXISTS
 *
 * tbl_bays is the live bay-control table — the floor engine writes occupancy to
 * it (floor-execution-engine.ts allocateJobAndBay and the free-bay UPDATE on QC
 * handoff) and getBaysStatus reads it to build the advisor's bay dropdown. But
 * migration 011 SEEDED it with six invented bays when it found the table empty:
 *
 *   B-01 Heavy Commercial (HCV) · B-02 General Repair · B-03 EV & Electrical
 *   B-04 Express Bay · B-05 Washing & Detail · B-99 Maintenance Blocked
 *
 * None of those exist at Sedam. The real roster lives in bay_master: B01-B09
 * (Express x2, General x4, Wheel Alignment, Aggregate Jobs, Major Failure) plus
 * B10 Parking, B11 Behind Bay and B12 Waterwash. Advisors were therefore
 * allocating vehicles to bays that are not in the workshop, and the four
 * vehicles shown as occupying HCV/General/EV/Wash bays were sitting in bay
 * identities that do not physically exist.
 *
 * The owner has confirmed the roster: the 9 working bays, plus 7 NEW bays for
 * ICE vehicles — physically smaller in height and length — coded I1-I7.
 *
 * WHAT THIS DOES
 *
 *   1. Inserts the 9 real working bays and the 7 new ICE bays into tbl_bays.
 *   2. Releases the allocations whose vehicles the owner has confirmed LEFT the
 *      workshop, and frees their bays.
 *   3. Removes the six invented bays — but ONLY once nothing is allocated to
 *      them. A bay still holding a vehicle is left in place and reported.
 *
 * WHAT THIS DOES NOT DO
 *
 * It does not touch bay_master, bays, or backup_legacy_bays; those are read by
 * other screens and reconciling them is a separate change. It does not invent
 * dimensions for the ICE bays: "small in height and length" is recorded in the
 * bay name and type, and a dimensional allocation check needs vehicle
 * height/length to compare against, which is not yet recorded anywhere.
 *
 * SAFETY
 *
 * Idempotent. Bays are inserted with INSERT IGNORE so a re-run adds nothing.
 * The only rows deleted are the six invented bays, and only when no ACTIVE
 * allocation references them — otherwise the migration keeps them and logs why.
 * No job card, technician or allocation history is destroyed: departed vehicles
 * have their allocations marked RELEASED, never deleted.
 */

/** The 9 working bays, from bay_master — the roster the workshop actually has. */
const WORKING_BAYS: Array<[string, string, string, string]> = [
  // bay_id, bay_name, bay_type, lob_suitability
  ["B01", "Bay 1 - Express", "EXPRESS", "ALL"],
  ["B02", "Bay 2 - Express", "EXPRESS", "ALL"],
  ["B03", "Bay 3 - General", "GENERAL", "ALL"],
  ["B04", "Bay 4 - General", "GENERAL", "ALL"],
  ["B05", "Bay 5 - General", "GENERAL", "ALL"],
  ["B06", "Bay 6 - General", "GENERAL", "ALL"],
  ["B07", "Bay 7 - Wheel Alignment", "WHEEL_ALIGNMENT", "ALL"],
  ["B08", "Bay 8 - Aggregate Jobs", "AGGREGATE", "ALL"],
  ["B09", "Bay 9 - Major Failure", "MAJOR_FAILURE", "ALL"],
];

/**
 * The 7 new ICE bays. Smaller in height and length, so they take ICE vehicles
 * only — lob_suitability ICE_SMALL rather than ALL, which is what stops the
 * roster implying an HCV can be parked in one.
 */
const ICE_BAYS: Array<[string, string, string, string]> = [
  ["I1", "ICE Bay 1 - Small", "ICE_SMALL", "ICE_SMALL"],
  ["I2", "ICE Bay 2 - Small", "ICE_SMALL", "ICE_SMALL"],
  ["I3", "ICE Bay 3 - Small", "ICE_SMALL", "ICE_SMALL"],
  ["I4", "ICE Bay 4 - Small", "ICE_SMALL", "ICE_SMALL"],
  ["I5", "ICE Bay 5 - Small", "ICE_SMALL", "ICE_SMALL"],
  ["I6", "ICE Bay 6 - Small", "ICE_SMALL", "ICE_SMALL"],
  ["I7", "ICE Bay 7 - Small", "ICE_SMALL", "ICE_SMALL"],
];

/** The invented bays seeded by migration 011. */
const INVENTED_BAYS = ["B-01", "B-02", "B-03", "B-04", "B-05", "B-99"];

/**
 * Vehicles the owner has confirmed left the workshop. Their allocations are
 * released rather than deleted, so who worked on what remains on the record.
 * Named explicitly — this migration must never release an allocation the owner
 * has not accounted for.
 */
const DEPARTED_VEHICLES = ["KA32AB9690", "KA32AB0307", "KA32AA4288", "KA32AA5577"];

const migration: Migration = {
  version: 20,
  name: "real_bay_roster",
  up: async (pool: typeof db) => {
    const connection = await pool.getConnection();
    try {
      // 1. The real roster. INSERT IGNORE keeps this idempotent and never
      //    overwrites a bay that already carries live occupancy.
      for (const [id, name, type, lob] of [...WORKING_BAYS, ...ICE_BAYS]) {
        await connection.execute(
          `INSERT IGNORE INTO tbl_bays
             (bay_id, bay_name, bay_type, lob_suitability, status, branch_id)
           VALUES (?, ?, ?, ?, 'AVAILABLE', 'BR-SEDAM')`,
          [id, name, type, lob]
        );
      }
      console.log(`[Migration v20] roster ensured: ${WORKING_BAYS.length} working + ${ICE_BAYS.length} ICE bays.`);

      // 2. Release the departed vehicles' allocations and free their bays.
      //    The allocation row is kept (status RELEASED) so the technician's work
      //    history survives; only the live occupancy is cleared.
      const vPlaceholders = DEPARTED_VEHICLES.map(() => "?").join(",");
      const [released]: any = await connection.execute(
        `UPDATE tbl_job_allocations
            SET status = 'RELEASED'
          WHERE status = 'ACTIVE' AND job_card_id IN (${vPlaceholders})`,
        DEPARTED_VEHICLES
      );
      const [freed]: any = await connection.execute(
        `UPDATE tbl_bays
            SET status = 'AVAILABLE', current_job_card_id = NULL,
                current_vrn = NULL, occupied_since = NULL
          WHERE current_job_card_id IN (${vPlaceholders})`,
        DEPARTED_VEHICLES
      );
      console.log(
        `[Migration v20] departed vehicles: ${released?.affectedRows || 0} allocation(s) released, ` +
          `${freed?.affectedRows || 0} bay(s) freed.`
      );

      // 3. Remove the invented bays — but only those nothing is allocated to.
      //    Allocations created against them that the owner has NOT accounted for
      //    are left alone; deleting their bay would orphan live floor work.
      //
      //    This check MUST run after step 2 and read the CURRENT state. A dry
      //    run caught the alternative being wrong: B-01 holds two active
      //    allocations — KA32AB9690 (departed, released above) and
      //    DWIP-TEMP-SEDAM-20260908-001, which is still live floor work. Testing
      //    against the pre-release snapshot, or assuming a released vehicle
      //    frees its bay, would have deleted B-01 while a job was still in it.
      const bPlaceholders = INVENTED_BAYS.map(() => "?").join(",");
      const [stillUsed]: any = await connection.query(
        `SELECT DISTINCT bay_id FROM tbl_job_allocations
          WHERE status = 'ACTIVE' AND bay_id IN (${bPlaceholders})`,
        INVENTED_BAYS
      );
      const keep = new Set((stillUsed || []).map((r: any) => String(r.bay_id)));
      const removable = INVENTED_BAYS.filter((b) => !keep.has(b));

      if (removable.length) {
        const rPlaceholders = removable.map(() => "?").join(",");
        const [gone]: any = await connection.execute(
          `DELETE FROM tbl_bays WHERE bay_id IN (${rPlaceholders})`,
          removable
        );
        console.log(`[Migration v20] removed ${gone?.affectedRows || 0} invented bay(s): ${removable.join(", ")}.`);
      }
      if (keep.size) {
        console.log(
          `[Migration v20] KEPT invented bay(s) ${[...keep].join(", ")} — they still hold ACTIVE ` +
            `allocations that were not listed as departed. Reallocate those jobs to a real bay, ` +
            `then re-run this migration to remove them.`
        );
      }
    } finally {
      connection.release();
    }
  }
};

export default migration;

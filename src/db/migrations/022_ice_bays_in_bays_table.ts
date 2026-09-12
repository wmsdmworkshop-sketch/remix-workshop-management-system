import type { Migration } from "../migrate.ts";
import { pool as db } from "../index.ts";

/**
 * Make the 7 ICE bays visible to the application.
 *
 * WHY THIS EXISTS
 *
 * The workshop's bays live in TWO tables that were never reconciled:
 *
 *   bays      9 rows, bay_id INT (1..9)        — served by GET /api/bays, and
 *                                                the table job_card_master.bay_id
 *                                                (int unsigned) references
 *   tbl_bays  16 rows, bay_id VARCHAR ("B01")  — written by the floor engine for
 *                                                live occupancy and allocation
 *
 * Migration 020/021 established the real 16-bay roster in tbl_bays, including
 * the 7 new ICE bays. But every screen typed against the `Bay` interface reads
 * /api/bays, which serves `bays` — so the ICE bays were invisible to the
 * dropdowns, and only the floor engine could see them.
 *
 * WHY NOT JUST POINT /api/bays AT tbl_bays
 *
 * Because the ids are different shapes. job_card_master.bay_id is int unsigned,
 * and three screens join with `j.bay_id === bay.bay_id` (Dashboard bay
 * occupancy, ActiveBayTatMonitor, WorkshopDashboard). A number never equals
 * "B01", so switching the endpoint would have made all three silently report
 * every bay empty — the same class of defect as the job_status mismatch.
 *
 * This adds the 7 ICE bays to `bays` with numeric ids continuing from 9, so
 * they appear everywhere immediately and every existing join keeps working.
 * Unifying the two tables behind one key is a larger change that touches live
 * allocation code, and is deliberately NOT attempted here.
 *
 * SAFETY
 *
 * Idempotent: INSERT IGNORE keyed on the primary key, and it re-checks by
 * bay_code so a re-run adds nothing even if ids were assigned differently. It
 * inserts only; no existing bay is modified or removed. `bays` has no
 * AUTO_INCREMENT, so ids are assigned explicitly from MAX(bay_id).
 *
 * The one foreign key pointing at bays (job_cards.fk_job_cards_bay) is
 * unaffected — this adds rows, so no reference can be orphaned.
 */

/** The 7 ICE bays, matching the roster established in tbl_bays by migration 020. */
const ICE_BAYS: Array<{ code: string; name: string; type: string }> = [
  { code: "I1", name: "ICE Bay 1 - Small", type: "ICE_SMALL" },
  { code: "I2", name: "ICE Bay 2 - Small", type: "ICE_SMALL" },
  { code: "I3", name: "ICE Bay 3 - Small", type: "ICE_SMALL" },
  { code: "I4", name: "ICE Bay 4 - Small", type: "ICE_SMALL" },
  { code: "I5", name: "ICE Bay 5 - Small", type: "ICE_SMALL" },
  { code: "I6", name: "ICE Bay 6 - Small", type: "ICE_SMALL" },
  { code: "I7", name: "ICE Bay 7 - Small", type: "ICE_SMALL" },
];

const migration: Migration = {
  version: 22,
  name: "ice_bays_in_bays_table",
  up: async (pool: typeof db) => {
    const connection = await pool.getConnection();
    try {
      // Which ICE bays are already present? Keyed on bay_code, which is the
      // stable identity here — bay_id is assigned by this migration.
      const codes = ICE_BAYS.map((b) => b.code);
      const placeholders = codes.map(() => "?").join(",");
      const [existing]: any = await connection.query(
        `SELECT bay_code FROM bays WHERE bay_code IN (${placeholders})`,
        codes
      );
      const have = new Set((existing || []).map((r: any) => String(r.bay_code)));
      const missing = ICE_BAYS.filter((b) => !have.has(b.code));

      if (missing.length === 0) {
        console.log("[Migration v22] all 7 ICE bays already present in `bays` — nothing to do.");
        return;
      }

      // `bays` has no AUTO_INCREMENT, so ids continue explicitly from the max.
      const [maxRow]: any = await connection.query(`SELECT COALESCE(MAX(bay_id), 0) AS mx FROM bays`);
      let nextId = Number(maxRow?.[0]?.mx || 0);

      for (const b of missing) {
        nextId += 1;
        await connection.execute(
          `INSERT IGNORE INTO bays (bay_id, bay_code, bay_name, bay_type, status, is_active)
           VALUES (?, ?, ?, ?, 'Idle', 1)`,
          [nextId, b.code, b.name, b.type]
        );
      }

      const [after]: any = await connection.query(`SELECT COUNT(*) AS n FROM bays`);
      console.log(
        `[Migration v22] added ${missing.length} ICE bay(s) to \`bays\`; ` +
          `the table now holds ${after?.[0]?.n ?? "?"} bay(s).`
      );
    } finally {
      connection.release();
    }
  }
};

export default migration;

import type { Migration } from "../migrate.ts";
import { pool as db } from "../index.ts";

/**
 * One revenue row per job — enforced at the database.
 *
 * WHY THIS EXISTS
 *
 * The boot-time productivity-split recompute rebuilt every revenue row with its
 * identifier counter restarting at 1, then persisted through an upsert keyed on
 * the PRIMARY KEY `revenue_id`. A job whose revenue already existed under a
 * different id — for example 9500, created through the application path at
 * MAX(id)+1 — therefore gained a SECOND row on every restart.
 *
 * Demonstrated in an isolated environment (T-W6-1): job 9002's labour of 7777
 * persisted at BOTH revenue_id 2 and 9500 after a single restart, and
 * SUM(labour_amount) rose from 10,777 to 18,554 with no new work performed.
 *
 * `job_id` is the authoritative revenue identity. Every consumer resolves a
 * job's revenue with a singular, first-match lookup —
 * `revenues.find(r => r.job_id === ...)` in JobCardManager.tsx (:1128, :1475)
 * and `db.jobRevenues.find(r => r.job_id === jobId)` in server.ts (:1384) — so
 * the application has always ASSUMED one revenue row per job. Nothing enforced
 * it, which is precisely what let the duplicate through and made those lookups
 * order-dependent.
 *
 * WHY A CONSTRAINT RATHER THAN APPLICATION LOGIC
 *
 * Concurrent startup. With maxScale 3, three instances can run the recompute
 * simultaneously; no amount of application-side checking prevents two of them
 * inserting a row for the same job between each other's read and write. A
 * UNIQUE key is the only enforceable control: the second insert fails rather
 * than duplicating, whatever the timing.
 *
 * SAFETY
 *
 * This migration DELETES NOTHING and MERGES NOTHING. If duplicate or NULL
 * job_id rows exist it refuses to run and reports them, because choosing which
 * of two financial records survives is a business decision, not a migration's.
 * Verified read-only against production before writing this: job_revenues held
 * 0 rows, 0 duplicate job_ids and 0 NULL job_ids, so the constraint applies
 * cleanly there.
 */
const migration: Migration = {
  version: 18,
  name: "unique_revenue_per_job",
  up: async (pool: typeof db) => {
    const connection = await pool.getConnection();
    try {
      // Already applied? Nothing to do.
      const [existing]: any = await connection.query(
        `SELECT COUNT(*) AS n FROM information_schema.statistics
          WHERE table_schema = DATABASE()
            AND table_name = 'job_revenues'
            AND index_name = 'uq_job_revenues_job'`
      );
      if (Number(existing?.[0]?.n || 0) > 0) {
        console.log("[Migration v18] uq_job_revenues_job already present — skipping.");
        return;
      }

      // Refuse rather than destroy. A duplicate here is two financial records
      // for one job; deciding which survives belongs to the business.
      const [dups]: any = await connection.query(
        `SELECT job_id, COUNT(*) AS n FROM job_revenues
          WHERE job_id IS NOT NULL GROUP BY job_id HAVING n > 1`
      );
      if ((dups || []).length > 0) {
        const sample = (dups as any[]).slice(0, 10).map((d) => `job_id=${d.job_id} (${d.n} rows)`).join(", ");
        throw new Error(
          `REFUSED: job_revenues contains ${dups.length} job_id value(s) with more than one row — ${sample}. ` +
            `Resolve these records before applying UNIQUE(job_id); this migration will not delete or merge financial records.`
        );
      }

      const [nulls]: any = await connection.query(
        `SELECT COUNT(*) AS n FROM job_revenues WHERE job_id IS NULL`
      );
      if (Number(nulls?.[0]?.n || 0) > 0) {
        throw new Error(
          `REFUSED: job_revenues contains ${nulls[0].n} row(s) with a NULL job_id. ` +
            `Those rows have no job identity; resolve them before applying UNIQUE(job_id).`
        );
      }

      await connection.execute(
        "ALTER TABLE `job_revenues` ADD UNIQUE KEY `uq_job_revenues_job` (`job_id`)"
      );
      console.log("[Migration v18] UNIQUE(job_id) added to job_revenues.");
    } finally {
      connection.release();
    }
  }
};

export default migration;

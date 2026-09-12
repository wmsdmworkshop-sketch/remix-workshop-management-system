import { pool as db } from "./index.ts";

/**
 * The single coordinated write path for a job's revenue and its allocation
 * details.
 *
 * WHY THIS EXISTS
 *
 * Two defects were demonstrated in an isolated environment:
 *
 * 1. Application-computed surrogate ids could destroy another job's revenue.
 *    With PRIMARY KEY(revenue_id) and UNIQUE(job_id) both present, an upsert
 *    keyed on the primary key matches FIRST and rewrites job_id:
 *      existing (2, job 9002, 7777) + incoming (2, job 9003, 5000)
 *      -> (2, job 9003, 5000)   — job 9002's revenue silently gone.
 *
 * 2. Revenue and its details were written as two separate, non-transactional
 *    statements. A rejected revenue insert still left its detail rows to be
 *    written by the next statement, pointing at a revenue row that does not
 *    hold the values they assume.
 *
 * HOW THIS FIXES BOTH
 *
 * - Identifiers come from the DATABASE (AUTO_INCREMENT, migration 019). No id
 *   is ever computed in application memory, so two writers cannot choose the
 *   same id for different rows.
 * - Revenue and details are written in ONE transaction on ONE connection, so a
 *   rejected revenue can never leave orphaned details.
 * - The insert is `INSERT IGNORE`, so when another writer already created that
 *   job's revenue this is a no-op: the winning record and ITS allocations are
 *   preserved, and this caller's stale computed details are discarded rather
 *   than attached to a row they were not calculated for.
 * - No existing revenue row's job_id is ever modified.
 */

export interface RevenueDetailInput {
  employee_id: number;
  tech_role: string;
  split_pct: number;
  split_amount: number;
}

export interface CreateRevenueInput {
  job_id: number;
  labour_amount: number;
  parts_amount: number;
  total_amount: number;
  split_id?: number;
  calculated_at?: string | Date | null;
  details: RevenueDetailInput[];
}

export type CreateRevenueOutcome =
  | { created: true; revenue_id: number; detail_ids: number[] }
  /** Another writer already owns this job's revenue. Nothing was written. */
  | { created: false; reason: "ALREADY_EXISTS" };

/**
 * Create a job's revenue and its allocation details atomically.
 *
 * Never updates an existing revenue row — if the job already has one, this is a
 * no-op and the existing record wins.
 */
export async function createRevenueWithDetails(
  input: CreateRevenueInput
): Promise<CreateRevenueOutcome> {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // INSERT IGNORE: a UNIQUE(job_id) conflict makes this a no-op rather than
    // an overwrite. affectedRows === 0 means another writer won the race.
    const [res]: any = await connection.execute(
      `INSERT IGNORE INTO \`job_revenues\`
         (\`job_id\`, \`labour_amount\`, \`parts_amount\`, \`total_amount\`, \`split_id\`, \`calculated_at\`)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        input.job_id,
        input.labour_amount,
        input.parts_amount,
        input.total_amount,
        input.split_id ?? 1,
        input.calculated_at instanceof Date
          ? input.calculated_at.toISOString()
          : (input.calculated_at ?? new Date().toISOString())
      ]
    );

    if (!res?.affectedRows) {
      // Another writer created this job's revenue. Preserve it and ITS
      // allocations; discard the details computed here, which belong to a
      // revenue row that was never created.
      await connection.rollback();
      return { created: false, reason: "ALREADY_EXISTS" };
    }

    const revenueId = Number(res.insertId);
    if (!Number.isFinite(revenueId) || revenueId <= 0) {
      throw new Error(
        "REVENUE_ID_NOT_ASSIGNED: the database returned no insertId. " +
          "job_revenues.revenue_id must be AUTO_INCREMENT (migration 019)."
      );
    }

    const detailIds: number[] = [];
    for (const d of input.details) {
      const [dres]: any = await connection.execute(
        `INSERT INTO \`job_revenue_split_details\`
           (\`revenue_id\`, \`employee_id\`, \`tech_role\`, \`split_pct\`, \`split_amount\`)
         VALUES (?, ?, ?, ?, ?)`,
        [revenueId, d.employee_id, d.tech_role, d.split_pct, d.split_amount]
      );
      detailIds.push(Number(dres.insertId));
    }

    await connection.commit();
    return { created: true, revenue_id: revenueId, detail_ids: detailIds };
  } catch (err) {
    try { await connection.rollback(); } catch { /* connection already gone */ }
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Replace a job's revenue and allocation details, atomically.
 *
 * This is the deliberate, user-initiated recalculation path
 * (POST /api/job-cards/:id/revenue) — distinct from the startup backfill, which
 * must never overwrite. It is included here so that BOTH write paths share the
 * same protections (requirement 5: no alternate unprotected revenue write):
 *
 *  - one transaction on one connection, so a failure mid-way leaves neither a
 *    half-replaced revenue nor orphaned details;
 *  - details are removed by their parent revenue_id, never by a computed id;
 *  - the new identifiers come from the database, not from application memory.
 *
 * Unlike createRevenueWithDetails this DOES remove the job's previous revenue —
 * that is the point of a recalculation, and it is an explicit operator action
 * rather than an unattended startup task.
 */
export async function replaceRevenueWithDetails(
  input: CreateRevenueInput
): Promise<{ revenue_id: number; detail_ids: number[] }> {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Remove details via their parent revenue rows, then the revenue itself.
    await connection.execute(
      `DELETE d FROM \`job_revenue_split_details\` d
         JOIN \`job_revenues\` r ON r.\`revenue_id\` = d.\`revenue_id\`
        WHERE r.\`job_id\` = ?`,
      [input.job_id]
    );
    await connection.execute(`DELETE FROM \`job_revenues\` WHERE \`job_id\` = ?`, [input.job_id]);

    const [res]: any = await connection.execute(
      `INSERT INTO \`job_revenues\`
         (\`job_id\`, \`labour_amount\`, \`parts_amount\`, \`total_amount\`, \`split_id\`, \`calculated_at\`)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        input.job_id,
        input.labour_amount,
        input.parts_amount,
        input.total_amount,
        input.split_id ?? 1,
        input.calculated_at instanceof Date
          ? input.calculated_at.toISOString()
          : (input.calculated_at ?? new Date().toISOString())
      ]
    );

    const revenueId = Number(res.insertId);
    if (!Number.isFinite(revenueId) || revenueId <= 0) {
      throw new Error(
        "REVENUE_ID_NOT_ASSIGNED: the database returned no insertId. " +
          "job_revenues.revenue_id must be AUTO_INCREMENT (migration 019)."
      );
    }

    const detailIds: number[] = [];
    for (const d of input.details) {
      const [dres]: any = await connection.execute(
        `INSERT INTO \`job_revenue_split_details\`
           (\`revenue_id\`, \`employee_id\`, \`tech_role\`, \`split_pct\`, \`split_amount\`)
         VALUES (?, ?, ?, ?, ?)`,
        [revenueId, d.employee_id, d.tech_role, d.split_pct, d.split_amount]
      );
      detailIds.push(Number(dres.insertId));
    }

    await connection.commit();
    return { revenue_id: revenueId, detail_ids: detailIds };
  } catch (err) {
    try { await connection.rollback(); } catch { /* connection already gone */ }
    throw err;
  } finally {
    connection.release();
  }
}

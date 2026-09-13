/**
 * Keep the served in-memory job-card cache in step with a direct DB write.
 *
 * THE PROBLEM THIS SOLVES
 *
 * GET /api/job-cards does not read MySQL. It returns `cachedDB.jobCards`, an
 * in-memory snapshot built once by syncLoad() at server boot. Subsystems that
 * write job_card_master directly — the floor execution engine's allocation
 * bridge above all — therefore change the database WITHOUT changing what the
 * API serves. The write succeeds, the supervisor sees success, and the
 * technician's workspace keeps returning the pre-allocation snapshot until the
 * server happens to restart.
 *
 * Observed: JC-20254 (KA32AA5832) allocated to LOKU. job_card_master held
 * assigned_to=57, live_status=FLOOR_ALLOCATED — correct in every respect — yet
 * LOKU's workspace showed nothing, because the card the API served still
 * carried the values it had at boot.
 *
 * WHY A TARGETED PATCH AND NOT setDB()
 *
 * setDB() recalculates productivity for every employee and triggers a full
 * syncSave() back to Cloud SQL. Running that after a single allocation would be
 * both wasteful and risky: it would write the whole in-memory dataset back over
 * the database, including any rows another writer had changed in the meantime.
 * This re-reads ONE row and patches ONE cache entry.
 *
 * FAILURE IS NON-FATAL. If the refresh cannot run, the allocation itself has
 * already been committed; the cache is simply stale until the next restart,
 * which is exactly the behaviour before this existed. It must never turn a
 * successful allocation into a failed request.
 */

import { pool as db } from "../db/index.ts";

/** Registered by server.ts, which owns the cache closure. */
type CacheAccessor = {
  get: () => any;
};

let accessor: CacheAccessor | null = null;

/** server.ts calls this once at startup to expose its cache. */
export function registerJobCardCache(a: CacheAccessor): void {
  accessor = a;
}

/**
 * Re-read one job card from MySQL and patch the cached copy in place.
 *
 * `masterId` is job_card_master.job_card_id (the numeric primary key), which is
 * also the `job_id` the cached job cards carry.
 */
export async function refreshCachedJobCard(masterId: number | string): Promise<void> {
  try {
    if (!accessor) return;
    const id = Number(masterId);
    if (!Number.isFinite(id)) return;

    const cache = accessor.get();
    if (!cache || !Array.isArray(cache.jobCards)) return;

    const [rows]: any = await db.execute(
      `SELECT job_card_id, assigned_to, job_status, live_status, bay_id, service_advisor
         FROM job_card_master WHERE job_card_id = ? LIMIT 1`,
      [id]
    );
    const row = (rows || [])[0];
    if (!row) return;

    const idx = cache.jobCards.findIndex((j: any) => Number(j.job_id) === id);
    if (idx === -1) return;

    const existing = cache.jobCards[idx];
    cache.jobCards[idx] = {
      ...existing,
      // Only the fields an allocation changes. Everything else on the cached
      // card is left exactly as syncLoad() built it, so this cannot silently
      // drop enrichment (technician_assignments, photos, bay names) that the
      // narrow query above does not select.
      assigned_to: row.assigned_to != null ? Number(row.assigned_to) : null,
      status: row.job_status ?? existing.status,
      workshop_stage: row.live_status ?? existing.workshop_stage,
      service_advisor: row.service_advisor ?? existing.service_advisor,
    };
  } catch (e: any) {
    // Never fail the caller: the write is already committed.
    console.error("[JobCardCache] Could not refresh cached job card:", e?.message || e);
  }
}

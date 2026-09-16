/**
 * Migration v32 — make `login_history` able to record logins at all
 *
 * Drops the foreign key on `login_history.user_id` (which points at `users`)
 * and adds an index for per-user time-range reads.
 *
 * WHY THIS EXISTS
 * ---------------
 * `login_history` is declared with exactly the right shape for a login trail —
 * `user_id`, `login_at` (DEFAULT CURRENT_TIMESTAMP), `ip_address`,
 * `status enum('success','failed')` — and has never held a single row. Nothing in
 * the codebase writes to it; it appears only in the schema dump.
 *
 * It could not have worked as declared. `login_history.user_id` is NOT NULL and
 * carries `login_history_ibfk_1` → `users(user_id)`, but the application does not
 * authenticate against `users`. `POST /api/auth/login` resolves accounts from
 * `user_access_master` first and only falls back to `users` for the seeded
 * developer/admin rows. In production **only 19 of the 61** accounts in
 * `user_access_master` exist in `users` — so inserting a login for any of the
 * other 42 (including real technicians, the security agent and the biller) would
 * fail with `ER_NO_REFERENCED_ROW`. A login trail that silently refuses to record
 * most logins is worse than no trail, because it looks like those people never
 * signed in.
 *
 * WHY DROP THE CONSTRAINT RATHER THAN REPOINT IT
 * ---------------------------------------------
 * Repointing at `user_access_master` looks tidy but is wrong for the same reason
 * in the other direction: the login route's `users` fallback produces ids that do
 * not exist in `user_access_master`, and those would then be rejected instead.
 * Because the app has two identity tables, an FK on an append-only audit log can
 * only ever reject one legitimate half of the logins. A log records what
 * happened; it is not the place to enforce referential integrity between two
 * sources that are themselves not reconciled. Column type (int) is unchanged, so
 * every current reader is unaffected.
 *
 * SAFETY
 * ------
 *  - `login_history` had 0 rows in production when this ran, so no existing data
 *    can violate anything.
 *  - Guarded by INFORMATION_SCHEMA, matching migrations 006 and 028: the FK names
 *    differ between environments, so they are discovered by name rather than
 *    assumed.
 *  - Idempotent: a re-run finds no FK to drop and finds the index already there.
 *  - Additive index only; no column is dropped, retyped or renamed.
 *  - DDL auto-commits in MySQL, so individual statements are guarded separately
 *    and a failure in one does not prevent the next from running.
 */

import type { Migration } from "../migrate.ts";

const migration: Migration = {
  version: 32,
  name: "login_history_relax_fk",

  up: async (db) => {
    console.log("[Migration v32] Preparing login_history to record logins...");

    // ── 1. Drop every FK on login_history ──────────────────────────────────
    // Discovered, not assumed: the constraint is `login_history_ibfk_1` in
    // production but MySQL names these per-table, so a fresh environment could
    // differ.
    try {
      const [rows] = await db.execute(`
        SELECT CONSTRAINT_NAME
        FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'login_history'
          AND CONSTRAINT_TYPE = 'FOREIGN KEY'
      `) as any[];

      const fks: any[] = Array.isArray(rows) ? rows : [];
      if (fks.length === 0) {
        console.log("[Migration v32] No FK on login_history — nothing to drop.");
      }
      for (const r of fks) {
        const constraintName = r.CONSTRAINT_NAME;
        try {
          await db.execute(`ALTER TABLE \`login_history\` DROP FOREIGN KEY \`${constraintName}\``);
          console.log(`[Migration v32] Dropped FK constraint: ${constraintName}`);
        } catch (e: any) {
          console.warn(`[Migration v32] Notice dropping FK ${constraintName}:`, e.message);
        }
      }
    } catch (err: any) {
      console.warn("[Migration v32] Error inspecting FK constraints:", err.message);
    }

    // ── 2. Index for per-user, time-ordered reads ──────────────────────────
    // The report queries "this user's logins, newest first". Without this it is
    // a full scan of a table that grows with every sign-in.
    try {
      const [idx] = await db.execute(`
        SELECT INDEX_NAME
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'login_history'
          AND INDEX_NAME = 'idx_login_history_user_time'
      `) as any[];

      if (Array.isArray(idx) && idx.length > 0) {
        console.log("[Migration v32] Index idx_login_history_user_time already present.");
      } else {
        await db.execute(
          "CREATE INDEX `idx_login_history_user_time` ON `login_history` (`user_id`, `login_at`)"
        );
        console.log("[Migration v32] Created index idx_login_history_user_time.");
      }
    } catch (err: any) {
      // Index creation failing must not block boot: the column-level FK above is
      // the part the feature depends on, and the index is a performance aid.
      console.warn("[Migration v32] Notice creating index:", err.message);
    }
  }
};

export default migration;

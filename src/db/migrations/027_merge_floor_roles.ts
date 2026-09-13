import type { Migration } from "../migrate.ts";
import { pool as db } from "../index.ts";

/**
 * ONE floor role: floor_supervisor. `floor_incharge` is retired.
 *
 * WHY THIS EXISTS
 *
 * The same job existed under two spellings, and they had drifted apart in ways
 * that changed what people could actually do:
 *
 *   - `roles` held ONLY floor_supervisor (id 36). floor_incharge had no row at
 *     all, so any permission check that resolved through roles.role_id missed
 *     it entirely.
 *   - role_permissions carried 13 grants for floor_supervisor and exactly ONE
 *     for floor_incharge (the QC grant from migration 026, which had to name
 *     both spellings precisely because of this split).
 *   - users held both spellings; user_access_master held only floor_supervisor.
 *     The same person could therefore be one role in one table and another in
 *     the other — and authenticateToken reads user_access_master while other
 *     code reads users.
 *   - employees.role held the display form "Floor Incharge".
 *
 * The owner's decision: merge to floor_supervisor, the spelling that already
 * owns the roles row and every permission grant, so the merge repoints the
 * fewest live rows.
 *
 * PK (kpkulkarni02@gmail.com) — SPECIFICALLY HANDLED
 *
 * This account was the clearest evidence of the drift: role 'floor_incharge' in
 * users but carrying role_id 23, which is RECEPTION, while user_access_master
 * had them as floor_supervisor and INACTIVE. Its role and role_id are corrected
 * here. is_active is deliberately NOT touched: the owner decided reactivating a
 * login is a separate, explicit decision and must never be a side effect of a
 * rename. PK still cannot log in after this migration, exactly as before it.
 *
 * SAFETY
 *
 * Idempotent: every statement is a conditional UPDATE that matches only rows
 * still carrying the old value, so a second run changes nothing. It creates no
 * user and no employee. It grants no permission that floor_supervisor did not
 * already hold — the single floor_incharge grant (QC) is one floor_supervisor
 * already has, so the merge removes a duplicate rather than widening access.
 */

const OLD_ROLE = "floor_incharge";
const NEW_ROLE = "floor_supervisor";
/** roles.role_id for floor_supervisor, confirmed present in production. */
const FLOOR_ROLE_ID = 36;

const migration: Migration = {
  version: 27,
  name: "merge_floor_roles",
  up: async (pool: typeof db) => {
    const connection = await pool.getConnection();
    try {
      // 1. users.role — the spelling other code reads.
      const [u]: any = await connection.execute(
        "UPDATE users SET role = ? WHERE LOWER(role) = ?",
        [NEW_ROLE, OLD_ROLE]
      );

      // 2. users.role_id — PK carried 23 (reception), which would have resolved
      //    reception's permissions for a floor user. Corrected for every user
      //    now on the merged role that points at the wrong role row.
      const [uid]: any = await connection.execute(
        "UPDATE users SET role_id = ? WHERE LOWER(role) = ? AND (role_id IS NULL OR role_id <> ?)",
        [FLOOR_ROLE_ID, NEW_ROLE, FLOOR_ROLE_ID]
      );

      // 3. user_access_master.user_role — the table the auth gate reads.
      //    is_active is NOT touched here; see the note above.
      const [a]: any = await connection.execute(
        "UPDATE user_access_master SET user_role = ? WHERE LOWER(user_role) = ?",
        [NEW_ROLE, OLD_ROLE]
      );

      // 4. employees.role — stored as the human title "Floor Incharge".
      const [e]: any = await connection.execute(
        "UPDATE employees SET role = 'Floor Supervisor' WHERE REPLACE(LOWER(role), ' ', '_') = ?",
        [OLD_ROLE]
      );

      // 5. role_permissions — fold the floor_incharge grants into
      //    floor_supervisor. A grant the target already holds is DELETED rather
      //    than relabelled, so the merge cannot create a duplicate row for the
      //    same role+module.
      const [dupes]: any = await connection.query(
        `SELECT rp.permission_id
           FROM role_permissions rp
          WHERE LOWER(rp.role_name) = ?
            AND EXISTS (
              SELECT 1 FROM role_permissions t
               WHERE LOWER(COALESCE(t.role_name, '')) = ?
                 AND t.module_id <=> rp.module_id
            )`,
        [OLD_ROLE, NEW_ROLE]
      );
      let removed = 0;
      for (const row of dupes || []) {
        await connection.execute("DELETE FROM role_permissions WHERE permission_id = ?", [
          row.permission_id,
        ]);
        removed++;
      }

      const [p]: any = await connection.execute(
        "UPDATE role_permissions SET role_name = ?, role_id = ? WHERE LOWER(role_name) = ?",
        [NEW_ROLE, FLOOR_ROLE_ID, OLD_ROLE]
      );

      console.log(
        `[Migration v27] Floor roles merged into '${NEW_ROLE}': ` +
          `users.role ${u.affectedRows}, users.role_id ${uid.affectedRows}, ` +
          `user_access_master ${a.affectedRows}, employees ${e.affectedRows}, ` +
          `role_permissions ${p.affectedRows} relabelled / ${removed} duplicate(s) removed. ` +
          `No login was created, and no account's active state was changed.`
      );
    } finally {
      connection.release();
    }
  }
};

export default migration;

/**
 * Seeds ONE super user into the isolated `wms_test` schema.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────
 * `test-infra/setup_test_db.ts` builds `wms_test` from a production dump with
 * every real `INSERT` stripped (see its own docstring), so the schema ships with
 * no staff accounts at all. The sandbox logins that do exist —
 * `sbx_gm`, `sbx_sa`, `sbx_fs`, `sbx_sec` — each hold a SINGLE workshop role.
 * That makes a gate-in -> gate-out walk impossible for one account to perform:
 * it would have to log out and back in at every stage, and the suite would then
 * be testing the role switching rather than the workflow.
 *
 * `AuthorizationService.checkPermission` short-circuits `admin` and `developer`
 * before any database role lookup, and every workflow route names "admin" in its
 * allowed roles. So a single admin-role account can legitimately drive the whole
 * journey end to end. That is the one super user the workflow suites use.
 *
 * These `sbx_*` fixtures were previously created by hand and existed in no file
 * in the repository — re-running the suite on a fresh checkout could not
 * reproduce them. This script makes the account reproducible.
 *
 * ── Safety ──────────────────────────────────────────────────────────────────
 * Fail-closed: it refuses to touch anything unless the reusable
 * `verifyTestIsolation()` guard confirms NODE_ENV=test AND a live connection to a
 * schema named exactly `wms_test`. It can never write to the production schema.
 *
 * ── Run it ──────────────────────────────────────────────────────────────────
 *   npx dotenv -e .env.test -- npx tsx test-infra/seed_test_superuser.ts
 *
 * Idempotent — re-running resets the password to the known value so a stale
 * fixture can never silently break the suites.
 */
import bcrypt from "bcryptjs";
import { pool } from "../src/db/index.ts";
import { verifyTestIsolation } from "../src/tests/destructive_test_guard.ts";

/** The single account every workflow suite authenticates as. */
export const SUPERUSER_USERNAME = process.env.E2E_SUPERUSER_USERNAME || "sbx_admin";
/**
 * Sandbox-only credential for an isolated schema. Deliberately a non-secret with
 * a published default so the fixture is reproducible; override via the env var
 * if a different value is wanted.
 */
export const SUPERUSER_PASSWORD = process.env.E2E_SUPERUSER_PASSWORD || "sbx_super_pw";

async function main() {
  await verifyTestIsolation();

  const passwordHash = await bcrypt.hash(SUPERUSER_PASSWORD, 10);

  // Update-then-insert rather than ON DUPLICATE KEY UPDATE: that clause only
  // fires when `username` carries a UNIQUE index, and if it doesn't the statement
  // silently inserts a second row on every run. This is correct either way.
  const [updated]: any = await pool.execute(
    `UPDATE user_access_master
        SET full_name = 'Sandbox Superuser',
            user_role = 'admin',
            access_level = 'admin',
            is_active = 1,
            password_hash = ?,
            must_change_password = 0
      WHERE username = ?`,
    [passwordHash, SUPERUSER_USERNAME]
  );

  if (updated.affectedRows === 0) {
    await pool.execute(
      `INSERT INTO user_access_master
         (full_name, username, user_role, access_level, is_active, password_hash, must_change_password)
       VALUES ('Sandbox Superuser', ?, 'admin', 'admin', 1, ?, 0)`,
      [SUPERUSER_USERNAME, passwordHash]
    );
    console.log(`Created super user '${SUPERUSER_USERNAME}'.`);
  } else {
    console.log(`Updated existing super user '${SUPERUSER_USERNAME}' (${updated.affectedRows} row).`);
  }

  const [rows]: any = await pool.execute(
    "SELECT user_id, username, user_role, access_level, is_active FROM user_access_master WHERE username = ?",
    [SUPERUSER_USERNAME]
  );

  console.log(`Seeded super user: ${JSON.stringify(rows[0])}`);

  // Prove the account is real by re-reading the hash and verifying the password
  // — a fixture that cannot authenticate is worse than no fixture.
  const [check]: any = await pool.execute(
    "SELECT password_hash FROM user_access_master WHERE username = ?",
    [SUPERUSER_USERNAME]
  );
  const ok = await bcrypt.compare(SUPERUSER_PASSWORD, check[0].password_hash);
  console.log(`Password verification for '${SUPERUSER_USERNAME}': ${ok ? "PASS" : "FAIL"}`);
  if (!ok) throw new Error("Seeded super user cannot authenticate.");

  await pool.end();
}

main().catch((err) => {
  console.error("super user seed FAILED:", err?.message || err);
  process.exit(1);
});

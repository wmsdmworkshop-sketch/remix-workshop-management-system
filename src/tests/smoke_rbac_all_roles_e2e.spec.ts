import { test, expect } from "@playwright/test";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

// Ensure this runs against the local server to bypass rate limits
const DEPLOY_URL = process.env.RBAC_SMOKE_URL || "http://localhost:8080";

/**
 * Accounts are DISCOVERED FROM THE EMPLOYEE DIRECTORY at run time — never hardcoded.
 *
 * This suite previously listed 18 usernames by hand. By the time it was reviewed, 12 of
 * them no longer existed, 5 more had been deactivated and one carried a different role, so
 * the suite passed or failed for reasons unrelated to RBAC. Staff logins are now created by
 * the Employee Directory (`username = lowercased(employee_code)`) and linked through
 * `user_access_master.employee_id`, so that linkage is the only reliable answer to "which
 * logins are actually in use". Re-deriving the list per run cannot go stale.
 *
 * HOW TO RUN IT — deliberately, since it rewrites real password hashes and restores them after:
 *
 *   $env:ALLOW_LIVE_RBAC_SMOKE="1"; $env:RBAC_SMOKE_PASSWORD="<temporary>"
 *   npx dotenv -e .env -- npx playwright test src/tests/smoke_rbac_all_roles_e2e.spec.ts
 *
 * `npm run test:e2e` loads `.env.test`, whose database holds no staff accounts, so this suite
 * needs the live `DB_*` values supplied explicitly. Without `ALLOW_LIVE_RBAC_SMOKE=1` it registers
 * a single failing guard test rather than touching production.
 */
interface TestAccount {
  role: string;
  username: string;
}

const TEST_PASSWORD = process.env.RBAC_SMOKE_PASSWORD;

/** Roles that are administrative consoles rather than workshop roles. */
const NON_WORKSHOP_ROLES = new Set(["admin", "developer"]);

/**
 * DESTRUCTIVE: this suite rewrites `password_hash` for real staff accounts, so it stays off
 * unless deliberately enabled. Without the flag it fails closed rather than touching prod.
 */
const ALLOW_LIVE = process.env.ALLOW_LIVE_RBAC_SMOKE === "1";

const DB_CONFIG = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE || "railway",
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
};

/** One active, employee-linked account per distinct role. */
async function discoverAccounts(conn: mysql.Connection): Promise<TestAccount[]> {
  const [rows]: any = await conn.query(
    `SELECT u.username, u.user_role
       FROM user_access_master u
      WHERE u.is_active = 1
        AND u.employee_id IS NOT NULL
        AND u.username IS NOT NULL
        AND u.username <> ''
      ORDER BY u.user_role, u.username`
  );

  // Keyed case-insensitively: `requireRoles` in server.ts treats role names as
  // case-insensitive (and space/underscore equivalent), so 'Technician' and 'technician' are
  // one role, not two — otherwise the same role gets tested twice under two labels.
  const firstPerRole = new Map<string, TestAccount>();
  for (const row of rows) {
    const role = String(row.user_role || "").trim();
    const key = role.toLowerCase();
    if (!role || NON_WORKSHOP_ROLES.has(key)) continue;
    if (!firstPerRole.has(key)) firstPerRole.set(key, { role, username: String(row.username) });
  }

  return [...firstPerRole.values()];
}

let dbConn: mysql.Connection;
let originalPasswords: Record<string, string> = {};
let testPasswordHash: string;
let accountsToTest: TestAccount[] = [];

/**
 * Discovery runs HERE, at module scope — not in `beforeAll`.
 *
 * Playwright registers tests while loading this file, so an array populated inside a hook is
 * still empty at registration time and the suite would silently register zero tests. Top-level
 * await is supported for ESM spec files, so the real roster is known before the loop below.
 */
const configProblem =
  !ALLOW_LIVE
    ? "Refusing to run: this suite rewrites password_hash for real staff accounts in the LIVE database. Re-run with ALLOW_LIVE_RBAC_SMOKE=1 to enable it deliberately."
    : !TEST_PASSWORD
      ? "RBAC_SMOKE_PASSWORD is not set — the suite will not guess a credential."
      : !DB_CONFIG.host || !DB_CONFIG.password
        ? "DB_HOST / DB_PASSWORD are not set — load them from the environment before running this suite."
        : null;

let discoveryProblem: string | null = null;

if (!configProblem) {
  const discoveryConn = await mysql.createConnection(DB_CONFIG);
  try {
    accountsToTest = await discoverAccounts(discoveryConn);
  } catch (err: any) {
    discoveryProblem = `Employee Directory lookup failed: ${err?.code || err?.message}`;
  } finally {
    await discoveryConn.end();
  }
  if (!discoveryProblem && accountsToTest.length === 0) {
    discoveryProblem =
      "No active, employee-linked login accounts found — create staff logins from the Employee Directory first.";
  }
}

const notRunnable = configProblem || discoveryProblem;
if (notRunnable) {
  test("RBAC smoke test is not runnable", () => {
    throw new Error(notRunnable);
  });
} else {
  console.log(
    `RBAC smoke: ${accountsToTest.length} role(s) — ` +
      accountsToTest.map(a => `${a.role}=${a.username}`).join(", ")
  );
}

test.describe("SMOKE TEST - ATS RBAC LOGIN ALL ROLES", () => {
  test.beforeAll(async () => {
    dbConn = await mysql.createConnection(DB_CONFIG);
    testPasswordHash = await bcrypt.hash(TEST_PASSWORD!, 10);

    // Save original passwords and set them to the test password
    for (const user of accountsToTest) {
      const [rows]: any = await dbConn.execute(
        "SELECT password_hash FROM user_access_master WHERE username = ?",
        [user.username]
      );
      if (rows.length > 0) {
        originalPasswords[user.username] = rows[0].password_hash;
        await dbConn.execute(
          "UPDATE user_access_master SET password_hash = ? WHERE username = ?",
          [testPasswordHash, user.username]
        );
      }
    }
  });

  test.afterAll(async () => {
    // Restore original passwords
    for (const user of accountsToTest) {
      if (originalPasswords[user.username]) {
        await dbConn.execute(
          "UPDATE user_access_master SET password_hash = ? WHERE username = ?",
          [originalPasswords[user.username], user.username]
        );
      }
    }
    await dbConn.end();
  });

  for (const user of accountsToTest) {
    test(`Login as ${user.role} (${user.username})`, async ({ page }) => {
      // 1 minute timeout for each login
      test.setTimeout(60000);
      
      await page.goto(DEPLOY_URL);
      
      // Wait for login form
      await page.waitForSelector('input[type="text"]');
      
      // Fill credentials
      await page.fill('input[type="text"]', user.username);
      await page.fill('input[type="password"]', TEST_PASSWORD!);
      await page.click('button[type="submit"]');
      
      // Wait for network to settle, meaning login request finished
      await page.waitForLoadState("networkidle");

      // Verify successful login by checking that we are no longer seeing the exact login form heading
      // Or check if a known Dashboard element appears.
      // Easiest is to wait for the Dashboard to render by checking for "DWIP ENTERPRISE" or "Operator Mode"
      
      // The login screen itself renders "DWIP ENTERPRISE" in its own header, so the old
      // text-presence check here passed even when sign-in failed. Assert the staff token
      // instead — it is only written by a successful login (see src/lib/authToken.ts).
      const token = await page.evaluate(() => localStorage.getItem("wms_token"));
      if (!token) {
        const bodyText = await page.textContent("body");
        console.error(`Login failed for ${user.role}. Body text: ${bodyText?.substring(0, 100)}...`);
      }

      expect(token, `login as ${user.role} (${user.username}) produced no staff token`).toBeTruthy();
    });
  }
});

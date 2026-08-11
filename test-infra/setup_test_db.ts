/**
 * ============================================================================
 * Isolated Test-Database Setup — creates and schema-builds `wms_test`.
 * ----------------------------------------------------------------------------
 * Run with the test env loaded so it can NEVER touch production:
 *
 *     npx dotenv -e .env.test -- npx tsx test-infra/setup_test_db.ts
 *   (or)
 *     npm run db:setup:test
 *
 * What it does:
 *   1. Fail-closed safety check — refuses unless the target is the isolated
 *      `wms_test` schema on a non-production host.
 *   2. CREATE DATABASE IF NOT EXISTS `wms_test` (via a raw connection with no
 *      database selected).
 *   3. Builds the schema using the application's OWN authoritative builders —
 *      runMigrations(allMigrations) + ensureTablesExist() + validateSchema() —
 *      so the test schema always matches what the server actually expects (no
 *      hand-maintained SQL that can drift).
 *
 * It seeds ONLY reference data that the migrations themselves seed (roles,
 * permissions, modules_master). It never seeds operational/customer data.
 * ============================================================================
 */

import mysql from "mysql2/promise";
import { readFileSync } from "fs";

const PROD_DB_NAMES = ["railway"];
const PROD_DB_HOSTS = ["35.200.150.167"];

const dbName = process.env.DB_DATABASE;
const dbHost = process.env.DB_HOST || "127.0.0.1";
const dbPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306;
const dbUser = process.env.DB_USER || "root";
const dbPassword = process.env.DB_PASSWORD;

function fail(msg: string): never {
  console.error(`\n[setup_test_db] REFUSING TO RUN — ${msg}\n`);
  process.exit(1);
}

// ---- 1. Fail-closed safety gate -------------------------------------------
if (process.env.NODE_ENV !== "test") {
  fail(`NODE_ENV is '${process.env.NODE_ENV}', expected 'test'. Run via: npm run db:setup:test`);
}
if (!dbName || dbName !== "wms_test") {
  fail(`DB_DATABASE is '${dbName || "MISSING"}', expected the isolated 'wms_test' schema.`);
}
if (PROD_DB_NAMES.includes(dbName)) {
  fail(`DB_DATABASE '${dbName}' is a PRODUCTION schema name.`);
}
if (PROD_DB_HOSTS.includes(dbHost)) {
  fail(`DB_HOST '${dbHost}' is the PRODUCTION database host. The test DB must live on a separate, non-production server.`);
}
if (!dbPassword) {
  fail("DB_PASSWORD is missing. Provide the test MySQL credentials in .env.test.");
}

console.log("==========================================");
console.log("[setup_test_db] Isolated test-DB provisioning");
console.log(`  host     = ${dbHost}:${dbPort}`);
console.log(`  user     = ${dbUser}`);
console.log(`  database = ${dbName}`);
console.log("==========================================");

// ---- 2. Create the database (raw connection, no schema selected) ----------
{
  const admin = await mysql.createConnection({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    multipleStatements: false,
  });
  // Identifier is validated above to be exactly "wms_test"; safe to inline.
  await admin.query("CREATE DATABASE IF NOT EXISTS `wms_test` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci");
  console.log("[setup_test_db] ✓ database `wms_test` ensured");
  await admin.end();
}

// ---- 2b. Load the baseline DDL (structure only, NO operational/customer data) --
// The application migrations assume a pre-existing full schema (their baseline is a
// snapshot, and e.g. `role_permissions` is created out of dependency order for a
// fresh DB). So we first establish the complete table structure from the DDL-only
// schema file — derived from a production dump with EVERY `INSERT` (all real data)
// stripped — then let the migrations add columns and seed reference data.
{
  const schemaSql = readFileSync(new URL("./wms_test_schema.sql", import.meta.url), "utf8");
  const structConn = await mysql.createConnection({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: "wms_test",
    multipleStatements: true,
  });
  console.log("[setup_test_db] Loading baseline table structure (DDL only, no data)...");
  await structConn.query(schemaSql);
  console.log("[setup_test_db] ✓ baseline structure loaded");
  await structConn.end();
}

// ---- 3. Build the schema using the app's own authoritative builders --------
// Imported dynamically AFTER the database exists so the pool (and its health
// probe) never queries a missing schema on module load.
const { runMigrations, validateSchema } = await import("../src/db/migrate.ts");
const { allMigrations } = await import("../src/db/migrations/index.ts");
const { ensureTablesExist } = await import("../src/db/sync.ts");
const { pool } = await import("../src/db/index.ts");

try {
  console.log("[setup_test_db] Running migrations...");
  const { applied, currentVersion } = await runMigrations(allMigrations);
  console.log(`[setup_test_db] ✓ migrations applied=${applied}, schema v${currentVersion}`);

  console.log("[setup_test_db] Ensuring non-migration tables (billing / gate-out / etc.)...");
  await ensureTablesExist();
  console.log("[setup_test_db] ✓ ensureTablesExist complete");

  console.log("[setup_test_db] Validating critical tables...");
  await validateSchema();

  // NOTE: this builds an EMPTY schema (plus whatever reference data the migrations
  // seed). Many integration tests assume a fully-populated database — authoring a
  // coherent, current TEST FIXTURE (reference + workflow-permission + minimal
  // operational rows, no PII/customer data) is tracked as separate follow-up work.

  console.log("\n[setup_test_db] ✅ DONE — `wms_test` schema is ready. Run: npm test\n");
} catch (err: any) {
  console.error(`\n[setup_test_db] ✗ FAILED: ${err.message}\n`);
  process.exitCode = 1;
} finally {
  try {
    await pool.end();
  } catch {
    /* ignore */
  }
  // The DB health-probe interval keeps the event loop alive; exit explicitly.
  process.exit(process.exitCode ?? 0);
}

/**
 * DWIP Enterprise – Schema Migration Framework
 * 
 * Provides deterministic, versioned database migrations with:
 * - Migration history tracking via `schema_migrations` table
 * - Startup validation (server won't accept traffic if migrations fail)
 * - Idempotent execution (each migration runs exactly once)
 * 
 * Migration files are stored in src/db/migrations/ as numbered .ts files.
 * Each migration exports: { version: number, name: string, up: (pool) => Promise<void> }
 */

import { pool as db } from "./index.ts";

export interface Migration {
  version: number;
  name: string;
  up: (pool: typeof db) => Promise<void>;
}

/**
 * Ensure the schema_migrations tracking table exists.
 * This is the only "bootstrap" DDL that runs outside the migration framework.
 */
async function ensureMigrationsTable(): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS \`schema_migrations\` (
      \`version\` INT NOT NULL,
      \`name\` VARCHAR(255) NOT NULL,
      \`applied_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`checksum\` VARCHAR(64) DEFAULT NULL,
      \`execution_time_ms\` INT DEFAULT NULL,
      PRIMARY KEY (\`version\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `);
}

/**
 * Get the set of already-applied migration versions.
 */
async function getAppliedVersions(): Promise<Set<number>> {
  const [rows] = await db.query("SELECT version FROM schema_migrations ORDER BY version ASC") as any[];
  return new Set(rows.map((r: any) => r.version));
}

/**
 * Record a migration as applied.
 */
async function recordMigration(version: number, name: string, executionTimeMs: number): Promise<void> {
  await db.execute(
    "INSERT INTO schema_migrations (version, name, execution_time_ms) VALUES (?, ?, ?)",
    [version, name, executionTimeMs]
  );
}

/**
 * Get full migration history for the version endpoint.
 */
export async function getMigrationHistory(): Promise<any[]> {
  try {
    const [rows] = await db.query(
      "SELECT version, name, applied_at, execution_time_ms FROM schema_migrations ORDER BY version ASC"
    ) as any[];
    return rows;
  } catch {
    return [];
  }
}

/**
 * Get the current schema version (highest applied migration).
 */
export async function getCurrentSchemaVersion(): Promise<number> {
  try {
    const [rows] = await db.query(
      "SELECT MAX(version) as current_version FROM schema_migrations"
    ) as any[];
    return rows[0]?.current_version || 0;
  } catch {
    return 0;
  }
}

/**
 * Run all pending migrations in order.
 * Returns the count of migrations applied.
 * Throws on failure — caller should abort startup.
 */
export async function runMigrations(migrations: Migration[]): Promise<{ applied: number; currentVersion: number }> {
  console.log("[Migration] Starting schema migration check...");
  
  await ensureMigrationsTable();
  const applied = await getAppliedVersions();
  
  // Sort migrations by version
  const sorted = [...migrations].sort((a, b) => a.version - b.version);
  
  // Validate no duplicate versions
  const versions = sorted.map(m => m.version);
  const uniqueVersions = new Set(versions);
  if (versions.length !== uniqueVersions.size) {
    throw new Error("[Migration] FATAL: Duplicate migration versions detected!");
  }
  
  let appliedCount = 0;
  
  for (const migration of sorted) {
    if (applied.has(migration.version)) {
      continue; // Already applied
    }
    
    console.log(`[Migration] Applying v${migration.version}: ${migration.name}...`);
    const startTime = Date.now();
    
    try {
      await migration.up(db);
      const executionTime = Date.now() - startTime;
      await recordMigration(migration.version, migration.name, executionTime);
      console.log(`[Migration] ✓ v${migration.version} applied in ${executionTime}ms`);
      appliedCount++;
    } catch (err: any) {
      console.error(`[Migration] ✗ v${migration.version} FAILED: ${err.message}`);
      throw new Error(`Migration v${migration.version} (${migration.name}) failed: ${err.message}`);
    }
  }
  
  const currentVersion = await getCurrentSchemaVersion();
  
  if (appliedCount === 0) {
    console.log(`[Migration] Schema is up to date at v${currentVersion}`);
  } else {
    console.log(`[Migration] Applied ${appliedCount} migration(s). Schema now at v${currentVersion}`);
  }
  
  return { applied: appliedCount, currentVersion };
}

/**
 * Validate that critical tables exist in the database.
 * Called after migrations to ensure the schema is consistent.
 * Throws on failure — caller should abort startup.
 */
export async function validateSchema(): Promise<void> {
  console.log("[Schema] Validating critical tables...");
  
  const criticalTables = [
    "employees",
    "bays",
    "bay_master",
    "job_cards",
    "job_card_master",
    "user_access_master",
    "roles",
    "role_permissions",
    "schema_migrations"
  ];
  
  const [rows] = await db.query(
    "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()"
  ) as any[];
  
  const existingTables = new Set(rows.map((r: any) => r.TABLE_NAME));
  const missing: string[] = [];
  
  for (const table of criticalTables) {
    if (!existingTables.has(table)) {
      missing.push(table);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(`[Schema] FATAL: Critical tables missing: ${missing.join(", ")}`);
  }
  
  console.log(`[Schema] ✓ All ${criticalTables.length} critical tables verified`);
}

import { envConfig } from '../config/env.ts';
import { db } from '../db/index.ts';

/**
 * MANDATORY FAIL-CLOSED DESTRUCTIVE TEST GUARD
 * Ensures that destructive tests NEVER run against the application database.
 */
export async function verifyTestIsolation(): Promise<void> {
  const nodeEnv = process.env.NODE_ENV;
  const configuredDb = process.env.DB_DATABASE; // Check strict explicit env

  let failReason = null;

  if (nodeEnv !== "test") {
    failReason = `NODE_ENV is '${nodeEnv}', expected 'test'`;
  } else if (!configuredDb) {
    failReason = "process.env.DB_DATABASE is missing/empty";
  } else if (configuredDb === "railway") {
    failReason = "process.env.DB_DATABASE is 'railway'";
  } else if (configuredDb !== "railway_test") {
    failReason = `process.env.DB_DATABASE is '${configuredDb}', expected 'railway_test'`;
  }

  let connectedDb = "UNKNOWN";

  if (!failReason) {
    try {
      const [rows]: any = await db.execute("SELECT DATABASE() as dbName");
      connectedDb = rows[0]?.dbName;

      if (connectedDb === "railway") {
        failReason = "Actually connected to 'railway' application database";
      } else if (connectedDb !== "railway_test") {
        failReason = `Actually connected to '${connectedDb}', expected 'railway_test'`;
      }
    } catch (err: any) {
      failReason = `Failed to execute SELECT DATABASE(): ${err.message}`;
    }
  }

  // Determine classification for the output
  const isTestDb = connectedDb === "railway_test";
  const isAppDb = connectedDb === "railway" || configuredDb === "railway";

  console.log("==========================================");
  console.log(`NODE_ENV=${nodeEnv}`);
  console.log(`database host classification=Remote Persistent Development Server`);
  console.log(`configured database/schema NAME=${configuredDb || "MISSING"}`);
  console.log(`connected database/schema NAME=${connectedDb}`);
  console.log(`is_test_database=${isTestDb}`);
  console.log(`is_application_database=${isAppDb}`);
  console.log(`destructive_test_guard=${failReason ? "FAIL" : "PASS"}`);
  console.log("==========================================");

  if (failReason) {
    throw new Error(`DESTRUCTIVE TEST GUARD FAILED: ${failReason}`);
  }
}

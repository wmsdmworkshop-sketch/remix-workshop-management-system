import * as dotenv from "dotenv";

// Load environment variables before doing any checks.
// When running under NODE_ENV=test, load .env.test so integration tests target
// the isolated test database (wms_test) instead of the production .env.
// NODE_ENV must be exported by the caller before this module is imported.
const envFile = process.env.NODE_ENV === "test" ? ".env.test" : ".env";
dotenv.config({ path: envFile, override: true });

export const envConfig = {
  // Required Variables
  JWT_SECRET: process.env.JWT_SECRET as string,
  CUSTOMER_JWT_SECRET: process.env.CUSTOMER_JWT_SECRET as string,
  DB_HOST: process.env.DB_HOST as string,
  DB_PASSWORD: process.env.DB_PASSWORD as string,
  DB_DATABASE: process.env.DB_DATABASE || "railway", // Fallback for railway
  NODE_ENV: process.env.NODE_ENV || "development",

  // Optional Variables
  DB_USER: process.env.DB_USER || "root",
  DB_PORT: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
  DB_SOCKET_PATH: process.env.DB_SOCKET_PATH,
  DB_SSL: process.env.DB_SSL === "true",
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3001,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,

  // Azure AI Document Intelligence
  AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT:
    process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT,
  AZURE_DOCUMENT_INTELLIGENCE_KEY:
    process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY,
  REDIS_URL: process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL,
  ADDITIONAL_CORS_ORIGINS: process.env.ADDITIONAL_CORS_ORIGINS ? process.env.ADDITIONAL_CORS_ORIGINS.split(",") : [],
  DISABLE_HMR: process.env.DISABLE_HMR === "true",

  // DB Resilience Configuration (WP-05)
  DB_HEALTH_PROBE_INTERVAL: process.env.DB_HEALTH_PROBE_INTERVAL ? parseInt(process.env.DB_HEALTH_PROBE_INTERVAL, 10) : 10000,
  DB_HEALTH_TIMEOUT: process.env.DB_HEALTH_TIMEOUT ? parseInt(process.env.DB_HEALTH_TIMEOUT, 10) : 1500,
  DB_MAX_RETRIES: process.env.DB_MAX_RETRIES ? parseInt(process.env.DB_MAX_RETRIES, 10) : 2,
  DB_RETRY_DELAY: process.env.DB_RETRY_DELAY ? parseInt(process.env.DB_RETRY_DELAY, 10) : 500,

  // Auth & RBAC Hardening Configuration (WP-02)
  AUTH_CACHE_TTL_MS: process.env.AUTH_CACHE_TTL_MS ? parseInt(process.env.AUTH_CACHE_TTL_MS, 10) : 300000,
  JWT_ISSUER: process.env.JWT_ISSUER || "dwip-enterprise",
  JWT_AUDIENCE: process.env.JWT_AUDIENCE || "dwip-api",

  // Redis Distributed Cache Infrastructure (WP-07)
  REDIS_HOST: process.env.REDIS_HOST || "localhost",
  REDIS_PORT: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || "",
  REDIS_ENABLED: process.env.REDIS_ENABLED === "true"
};

export function validateEnvironment(): void {
  const requiredVars = [
    "JWT_SECRET",
    "CUSTOMER_JWT_SECRET",
    "DB_HOST",
    "DB_PASSWORD",
    "DB_DATABASE",
    "NODE_ENV"
  ];

  const optionalVars = [
    "GEMINI_API_KEY",
    "REDIS_URL"
  ];

  let hasErrors = false;
  const report: string[] = [];
  report.push("=== Environment Check ===");

  // FAIL-CLOSED TEST-DB ISOLATION GATE.
  // Detect a test context by NODE_ENV *or* by the Vitest runner's own env vars, so
  // a test run that forgot to set NODE_ENV=test (the original P0 cause) is still
  // caught. In any test context the DB identity MUST be the isolated test schema
  // ("wms_test"); a production identity (name or host) hard-stops the process
  // before a single query can reach production.
  // NOTE: "railway" is the legacy name of the PRODUCTION schema (a fossil from the
  // app's original Railway.app hosting — the data now lives in Google Cloud SQL).
  // It is denylisted below; the isolated test schema is the separate "wms_test".
  const isTestContext =
    envConfig.NODE_ENV === "test" ||
    !!process.env.VITEST ||
    !!process.env.VITEST_WORKER_ID ||
    !!process.env.VITEST_POOL_ID;

  if (isTestContext) {
    const PROD_DB_NAMES = ["railway"];
    const PROD_DB_HOSTS = ["35.200.150.167"];
    const dbName = envConfig.DB_DATABASE;
    const dbHost = envConfig.DB_HOST;
    const isProductionIdentity =
      !dbName ||
      dbName !== "wms_test" ||
      PROD_DB_NAMES.includes(dbName) ||
      (!!dbHost && PROD_DB_HOSTS.includes(dbHost));

    if (isProductionIdentity) {
      console.error(
        `[SECURITY] CRITICAL: Test execution blocked! Test context detected but the ` +
        `database identity is not the isolated 'wms_test' schema ` +
        `(DB_DATABASE='${dbName || "MISSING"}', DB_HOST='${dbHost || "MISSING"}'). ` +
        `Refusing to connect — a production database must never be used by tests.`
      );
      process.exit(1);
    }
  }

  requiredVars.forEach((key) => {
    // We check the original process.env or our fallback config logic
    // We already applied default fallbacks for NODE_ENV and DB_DATABASE in envConfig.
    // We'll treat envConfig values as the source of truth for presence.
    // If DB_SOCKET_PATH is provided, DB_HOST is not required
    if (key === "DB_HOST" && envConfig.DB_SOCKET_PATH) {
      report.push(`${key.padEnd(20)} OK (Socket path provided)`);
    } else if (!envConfig[key as keyof typeof envConfig]) {
      report.push(`${key.padEnd(20)} MISSING (Required)`);
      hasErrors = true;
    } else {
      report.push(`${key.padEnd(20)} OK`);
    }
  });

  optionalVars.forEach((key) => {
    if (!envConfig[key as keyof typeof envConfig]) {
      report.push(`${key.padEnd(20)} OPTIONAL (Missing)`);
    } else {
      report.push(`${key.padEnd(20)} OK`);
    }
  });

  // Display the report
  console.log(report.join("\n"));

  if (hasErrors) {
    console.error("[SECURITY] CRITICAL: Missing required environment variables. Server cannot start securely.");
    process.exit(1);
  }
}

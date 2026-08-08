import * as dotenv from "dotenv";

// Load environment variables before doing any checks.
// When running under NODE_ENV=test, load .env.test so integration tests target
// the isolated test database (railway_test) instead of the production .env.
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

  if (envConfig.NODE_ENV === "test") {
    if (
      envConfig.DB_DATABASE === "railway" ||
      envConfig.DB_HOST === "35.200.150.167" ||
      envConfig.DB_DATABASE !== "railway_test"
    ) {
      console.error("[SECURITY] CRITICAL: Test execution blocked! Attempted to connect to production database or missing 'railway_test' configuration.");
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

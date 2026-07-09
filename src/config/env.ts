import * as dotenv from "dotenv";

// Load environment variables before doing any checks
dotenv.config({ override: true });

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
  DISABLE_HMR: process.env.DISABLE_HMR === "true"
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

  requiredVars.forEach((key) => {
    // We check the original process.env or our fallback config logic
    // We already applied default fallbacks for NODE_ENV and DB_DATABASE in envConfig.
    // We'll treat envConfig values as the source of truth for presence.
    if (!envConfig[key as keyof typeof envConfig]) {
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

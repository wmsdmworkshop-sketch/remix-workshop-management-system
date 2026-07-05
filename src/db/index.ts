import * as dotenv from "dotenv";
dotenv.config({ override: true });

import mysql from "mysql2/promise";

// Function to create a new MySQL connection pool.
export const createPool = () => {
  // Direct Railway MySQL credentials
  const host = process.env.DB_HOST || "thomas.proxy.rlwy.net";
  const port = process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 50733;
  const user = process.env.DB_USER || "root";
  const password = process.env.DB_PASSWORD || "mjzwCcYkEYSYRAADKjnyAiEZGGrtwAri";
  const database = process.env.DB_DATABASE || "railway";

  const config: mysql.PoolOptions = {
    host,
    port,
    user,
    password,
    database,
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,
    dateStrings: true, // Return dates as strings to avoid automatic timezone conversions
    connectTimeout: 5000, // 5s — fall back to local memory if Railway is unreachable
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  };

  return mysql.createPool(config);
};

// Create the pool instance.
export const pool = createPool();
export const db = pool; // Alias db to pool for easy migration

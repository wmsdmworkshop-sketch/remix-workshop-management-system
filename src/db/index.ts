import * as dotenv from "dotenv";
dotenv.config({ override: true });

import mysql from "mysql2/promise";

// Function to create a new MySQL connection pool.
export const createPool = () => {
  // Direct Railway MySQL credentials
  const host = "thomas.proxy.rlwy.net";
  const port = 50733;
  const user = "root";
  const password = "mjzwCcYkEYSYRAADKjnyAiEZGGrtwAri";
  const database = "railway";

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

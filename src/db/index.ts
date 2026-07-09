import mysql from "mysql2/promise";
import { envConfig } from "../config/env.ts";

// Function to create a new MySQL connection pool.
export const createPool = () => {
  const host = envConfig.DB_HOST;
  const port = envConfig.DB_PORT;
  const user = envConfig.DB_USER;
  const password = envConfig.DB_PASSWORD;
  const database = envConfig.DB_DATABASE;
  const socketPath = envConfig.DB_SOCKET_PATH;
  
  const ssl = envConfig.DB_SSL ? { rejectUnauthorized: false } : undefined;

  const config: mysql.PoolOptions = {
    host: socketPath ? undefined : host,
    port: socketPath ? undefined : port,
    socketPath,
    user,
    password,
    database,
    ssl,
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,
    dateStrings: true, // Return dates as strings to avoid automatic timezone conversions
    connectTimeout: 10000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  };

  return mysql.createPool(config);
};

// Create the pool instance.
export const pool = createPool();
export const db = pool; // Alias db to pool for easy migration

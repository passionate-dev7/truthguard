import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

export * from "./schema";

let db: ReturnType<typeof drizzle>;

/**
 * Initialize database connection
 */
export function initializeDatabase(connectionString: string) {
  const connection = mysql.createPool(connectionString);
  db = drizzle(connection, { schema, mode: "default" });
  return db;
}

/**
 * Get database instance
 */
export function getDatabase() {
  if (!db) {
    throw new Error("Database not initialized. Call initializeDatabase first.");
  }
  return db;
}

import { Pool } from "pg";
import { getDatabaseSsl } from "./db-ssl";

const globalForPg = globalThis as typeof globalThis & { pgPool?: Pool };

export function getPool(): Pool {
  if (globalForPg.pgPool) return globalForPg.pgPool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to use the game database.");
  }

  globalForPg.pgPool = new Pool({
    connectionString,
    ssl: getDatabaseSsl(connectionString),
  });
  return globalForPg.pgPool;
}

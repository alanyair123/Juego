import { readFile } from "node:fs/promises";
import { loadEnvConfig } from "@next/env";
import { getPool } from "../src/lib/db";

async function migrate(): Promise<void> {
  loadEnvConfig(process.cwd());
  const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
  await getPool().query(schema);
  console.info("Database schema is up to date.");
}

migrate().catch((error: unknown) => {
  console.error("Database migration failed:", error);
  process.exitCode = 1;
});

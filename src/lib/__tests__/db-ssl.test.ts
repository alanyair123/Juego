import { describe, expect, it } from "vitest";
import { getDatabaseSsl } from "../db-ssl";

describe("database SSL settings", () => {
  it.each([
    "postgres://user:password@localhost:5432/rogueweb",
    "postgres://user:password@127.0.0.1:5432/rogueweb",
    "postgres://user:password@[::1]:5432/rogueweb",
    "postgres://user:password@postgres:5432/rogueweb",
    "postgres://user:password@db.example.com:5432/rogueweb?sslmode=disable",
  ])("disables SSL for %s", (connectionString) => {
    expect(getDatabaseSsl(connectionString)).toBe(false);
  });

  it("allows SSL without certificate verification for hosted PostgreSQL", () => {
    expect(getDatabaseSsl("postgres://user:password@db.supabase.co:5432/postgres")).toEqual({
      rejectUnauthorized: false,
    });
  });
});

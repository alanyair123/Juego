export type DatabaseSsl = false | { rejectUnauthorized: false };

export function getDatabaseSsl(connectionString: string): DatabaseSsl {
  const url = new URL(connectionString);
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  const sslMode = url.searchParams.get("sslmode")?.toLowerCase();

  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "postgres" ||
    sslMode === "disable"
  ) {
    return false;
  }

  return { rejectUnauthorized: false };
}

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { telemetryQuerySchema } from "@/game/schemas";
import { getTelemetryPage } from "@/lib/telemetry";
import Link from "next/link";
import { connection } from "next/server";
import styles from "./page.module.css";

export const instant = false;

type TelemetryPageProps = {
  searchParams: Promise<{ page?: string; pageSize?: string }>;
};

export default async function TelemetryPage({ searchParams }: TelemetryPageProps) {
  await connection();
  const session = await auth();
  if (!session) redirect("/login");

  const query = telemetryQuerySchema.safeParse(await searchParams);
  if (!query.success) redirect("/telemetry");

  const result = await getTelemetryPage(query.data);
  const previousPage = Math.max(1, result.page - 1);
  const nextPage = Math.min(Math.max(1, result.totalPages), result.page + 1);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/">← RogueWeb</Link>
        <div>
          <p className={styles.eyebrow}>REGISTRO DEL JUEGO</p>
          <h1>Telemetría</h1>
        </div>
        <p>{result.total.toLocaleString()} partidas</p>
      </header>

      <p className={styles.queryTime}>Consulta: {result.queryMs} ms</p>
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>Jugador</th>
              <th>Nivel</th>
              <th>Enemigos</th>
              <th>Tiempo</th>
              <th>Inventario</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row) => (
              <tr key={row.id}>
                <td>{row.playerId}</td>
                <td>{row.levelReached}</td>
                <td>{row.enemiesKilled}</td>
                <td>{formatTime(row.timeSeconds)}</td>
                <td>{row.inventory.map((item) => `${item.name} ×${item.quantity}`).join(", ") || "—"}</td>
                <td>{new Date(row.createdAt).toLocaleString("es-ES")}</td>
              </tr>
            ))}
            {result.rows.length === 0 && (
              <tr>
                <td colSpan={6}>Todavía no hay partidas guardadas.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <nav className={styles.pagination} aria-label="Paginación">
        <a
          aria-disabled={result.page <= 1}
          href={`/telemetry?page=${previousPage}&pageSize=${result.pageSize}`}
        >
          Anterior
        </a>
        <span>
          Página {result.page} de {Math.max(1, result.totalPages)}
        </span>
        <a
          aria-disabled={result.page >= result.totalPages}
          href={`/telemetry?page=${nextPage}&pageSize=${result.pageSize}`}
        >
          Siguiente
        </a>
      </nav>
    </main>
  );
}

function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

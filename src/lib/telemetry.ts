import { performance } from "node:perf_hooks";
import type { QueryResultRow } from "pg";
import type { InventoryItem } from "@/game/schemas";
import { getPool } from "./db";

export type TelemetryRow = {
  id: string;
  playerId: string;
  levelReached: number;
  enemiesKilled: number;
  timeSeconds: number;
  inventory: InventoryItem[];
  createdAt: Date;
};

export type TelemetryPage = {
  rows: TelemetryRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  queryMs: number;
};

type DatabaseGameRecord = QueryResultRow & {
  id: string;
  player_id: string;
  level_reached: number;
  enemies_killed: number;
  time_seconds: number;
  inventory: InventoryItem[];
  created_at: Date;
};

type TotalRow = QueryResultRow & { total: string };

export async function getTelemetryPage({
  page,
  pageSize,
}: {
  page: number;
  pageSize: number;
}): Promise<TelemetryPage> {
  const startedAt = performance.now();
  const offset = Math.min((page - 1) * pageSize, Number.MAX_SAFE_INTEGER);
  const pool = getPool();
  const [records, count] = await Promise.all([
    pool.query<DatabaseGameRecord>(
      `SELECT id, player_id, level_reached, enemies_killed, time_seconds, inventory, created_at
       FROM game_records
       ORDER BY created_at DESC, id DESC
       LIMIT $1 OFFSET $2`,
      [pageSize, offset],
    ),
    pool.query<TotalRow>("SELECT COUNT(*) AS total FROM game_records"),
  ]);

  const total = Number(count.rows[0].total);
  return {
    rows: records.rows.map((row) => ({
      id: row.id,
      playerId: row.player_id,
      levelReached: row.level_reached,
      enemiesKilled: row.enemies_killed,
      timeSeconds: row.time_seconds,
      inventory: row.inventory,
      createdAt: row.created_at,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    queryMs: Math.round(performance.now() - startedAt),
  };
}

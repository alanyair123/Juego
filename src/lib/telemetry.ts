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

const TOTAL_CACHE_MS = 30_000;
let cachedTotal: { total: number; expiresAt: number } | undefined;
let totalQuery: Promise<number> | undefined;

async function getTotal(pool: ReturnType<typeof getPool>): Promise<number> {
  if (cachedTotal && cachedTotal.expiresAt > Date.now()) {
    return cachedTotal.total;
  }

  if (!totalQuery) {
    totalQuery = pool
      .query<TotalRow>("SELECT COUNT(*) AS total FROM game_records")
      .then((result) => {
        const total = Number(result.rows[0].total);
        cachedTotal = { total, expiresAt: Date.now() + TOTAL_CACHE_MS };
        return total;
      })
      .finally(() => {
        totalQuery = undefined;
      });
  }

  return totalQuery;
}

export async function getTelemetryPage({
  page,
  pageSize,
}: {
  page: number;
  pageSize: number;
}): Promise<TelemetryPage> {
  const offset = Math.min((page - 1) * pageSize, Number.MAX_SAFE_INTEGER);
  const pool = getPool();
  const queryStartedAt = performance.now();
  const [records, total] = await Promise.all([
    pool.query<DatabaseGameRecord>(
      `SELECT id, player_id, level_reached, enemies_killed, time_seconds, inventory, created_at
       FROM game_records
       ORDER BY created_at DESC, id DESC
       LIMIT $1 OFFSET $2`,
      [pageSize, offset],
    ),
    getTotal(pool),
  ]);
  const queryMs = Math.round(performance.now() - queryStartedAt);

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
    queryMs,
  };
}

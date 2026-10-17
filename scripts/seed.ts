import { loadEnvConfig } from "@next/env";
import type { PoolClient } from "pg";
import { createRng } from "../src/game/rng";
import { inventoryItemSchema, type InventoryItem } from "../src/game/schemas";
import { getPool } from "../src/lib/db";

const TARGET_RECORDS = 10_000;
const BATCH_SIZE = 1_000;
const SEED = 20261017;
const ITEMS = [
  { id: "health-potion", name: "Poción de salud" },
  { id: "iron-key", name: "Llave de hierro" },
  { id: "ember-shard", name: "Fragmento de brasa" },
  { id: "moon-herb", name: "Hierba lunar" },
  { id: "old-coin", name: "Moneda antigua" },
];

type SeedRecord = {
  playerId: string;
  levelReached: number;
  enemiesKilled: number;
  timeSeconds: number;
  inventory: InventoryItem[];
};

async function seed(): Promise<void> {
  loadEnvConfig(process.cwd());
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(518064221)");
    const countResult = await client.query<{ total: string }>(
      "SELECT COUNT(*) AS total FROM game_records",
    );
    const currentTotal = Number(countResult.rows[0].total);

    if (currentTotal >= TARGET_RECORDS) {
      await client.query("COMMIT");
      console.info(`Seed skipped: ${currentTotal} records already exist (target ${TARGET_RECORDS}).`);
      return;
    }

    const rng = createRng(SEED);
    const records = createRecords(rng, currentTotal, TARGET_RECORDS);
    for (let offset = 0; offset < records.length; offset += BATCH_SIZE) {
      await insertBatch(
        client,
        records.slice(offset, offset + BATCH_SIZE),
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  const total = await getPool().query<{ total: string }>(
    "SELECT COUNT(*) AS total FROM game_records",
  );
  console.info(`Seed complete: ${total.rows[0].total} total records.`);
}

function createRecords(
  rng: () => number,
  currentTotal: number,
  targetTotal: number,
): SeedRecord[] {
  const records: SeedRecord[] = [];
  for (let index = currentTotal; index < targetTotal; index += 1) {
    const inventory: InventoryItem[] = [];
    const itemCount = 1 + Math.floor(rng() * 4);
    for (let itemIndex = 0; itemIndex < itemCount; itemIndex += 1) {
      const item = ITEMS[Math.floor(rng() * ITEMS.length)];
      inventory.push(
        inventoryItemSchema.parse({
          ...item,
          quantity: 1 + Math.floor(rng() * 4),
        }),
      );
    }

    const levelReached = 1 + Math.floor(rng() * 25);
    records.push({
      playerId: `explorer-${String(Math.floor(rng() * 500) + 1).padStart(3, "0")}`,
      levelReached,
      enemiesKilled: Math.floor(rng() * (levelReached * 7 + 1)),
      timeSeconds: 60 + Math.floor(rng() * 14_340),
      inventory,
    });
  }
  return records;
}

async function insertBatch(
  client: PoolClient,
  records: SeedRecord[],
): Promise<void> {
  const values: unknown[] = [];
  const tuples = records.map((record, index) => {
    const firstParameter = index * 5 + 1;
    values.push(
      record.playerId,
      record.levelReached,
      record.enemiesKilled,
      record.timeSeconds,
      JSON.stringify(record.inventory),
    );
    return `($${firstParameter}, $${firstParameter + 1}, $${firstParameter + 2}, $${firstParameter + 3}, $${firstParameter + 4}::jsonb)`;
  });

  await client.query(
    `INSERT INTO game_records
       (player_id, level_reached, enemies_killed, time_seconds, inventory)
     VALUES ${tuples.join(", ")}`,
    values,
  );
}

seed().catch((error: unknown) => {
  console.error("Database seed failed:", error);
  process.exitCode = 1;
});

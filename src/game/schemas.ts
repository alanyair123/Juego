import { z } from "zod";

export const inventoryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  quantity: z.number().int().positive(),
});

export const gameRecordSchema = z.object({
  playerId: z.string().min(1),
  levelReached: z.number().int().min(1),
  enemiesKilled: z.number().int().min(0),
  timeSeconds: z.number().int().min(0),
  inventory: z.array(inventoryItemSchema),
});

export const telemetryQuerySchema = z.object({
  page: z.coerce.number().int().safe().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const directionSchema = z.union([z.literal(-1), z.literal(0), z.literal(1)]);

export const moveInputSchema = z
  .object({
    dx: directionSchema,
    dy: directionSchema,
  })
  .refine(({ dx, dy }) => Math.abs(dx) + Math.abs(dy) <= 1, {
    message: "Diagonal movement is not allowed.",
  });

export type InventoryItem = z.infer<typeof inventoryItemSchema>;
export type GameRecord = z.infer<typeof gameRecordSchema>;
export type MoveInput = z.infer<typeof moveInputSchema>;

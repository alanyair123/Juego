import { describe, expect, it } from "vitest";
import { gameRecordSchema, moveInputSchema } from "../schemas";

describe("game schemas", () => {
  it("accepts a valid game record", () => {
    expect(
      gameRecordSchema.safeParse({
        playerId: "player-1",
        levelReached: 3,
        enemiesKilled: 8,
        timeSeconds: 240,
        inventory: [{ id: "potion", name: "Potion", quantity: 2 }],
      }).success,
    ).toBe(true);
  });

  it("rejects a negative enemy count", () => {
    expect(
      gameRecordSchema.safeParse({
        playerId: "player-1",
        levelReached: 1,
        enemiesKilled: -1,
        timeSeconds: 0,
        inventory: [],
      }).success,
    ).toBe(false);
  });

  it("rejects a record without a player ID", () => {
    expect(
      gameRecordSchema.safeParse({
      levelReached: 1,
      enemiesKilled: 0,
      timeSeconds: 0,
      inventory: [],
      }).success,
    ).toBe(false);
  });

  it("accepts orthogonal movement", () => {
    expect(moveInputSchema.safeParse({ dx: 0, dy: -1 }).success).toBe(true);
  });

  it("rejects diagonal or multi-tile moves", () => {
    expect(moveInputSchema.safeParse({ dx: 1, dy: -1 }).success).toBe(false);
    expect(moveInputSchema.safeParse({ dx: 2, dy: 0 }).success).toBe(false);
  });
});

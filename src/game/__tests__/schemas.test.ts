import { describe, expect, it } from "vitest";
import {
  createRoomInputSchema,
  gameRecordSchema,
  joinRoomInputSchema,
  moveInputSchema,
  nicknameSchema,
  setReadyInputSchema,
} from "../schemas";

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

  it("trims valid nicknames and rejects empty or oversized nicknames", () => {
    expect(nicknameSchema.parse("  Rogue  ")).toBe("Rogue");
    expect(nicknameSchema.safeParse("   ").success).toBe(false);
    expect(nicknameSchema.safeParse("12345678901234567").success).toBe(false);
  });

  it("rejects extra properties in multiplayer payloads", () => {
    expect(createRoomInputSchema.safeParse({ nickname: "Rogue", admin: true }).success).toBe(false);
    expect(
      joinRoomInputSchema.safeParse({ roomId: "room-1", nickname: "Rogue", hp: 30 }).success,
    ).toBe(false);
    expect(setReadyInputSchema.safeParse({ ready: true, state: {} }).success).toBe(false);
    expect(moveInputSchema.safeParse({ dx: 1, dy: 0, x: 100 }).success).toBe(false);
  });

  it("accepts only boolean ready values", () => {
    expect(setReadyInputSchema.safeParse({ ready: true }).success).toBe(true);
    expect(setReadyInputSchema.safeParse({ ready: "true" }).success).toBe(false);
    expect(setReadyInputSchema.safeParse({}).success).toBe(false);
  });
});

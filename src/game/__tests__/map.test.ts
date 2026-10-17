import { describe, expect, it } from "vitest";
import {
  countFloor,
  generateMap,
  isFullyConnected,
  reachableCount,
} from "../map";

describe("map generation", () => {
  it("is deterministic for the same seed", () => {
    expect(generateMap(12345)).toEqual(generateMap(12345));
  });

  it("produces different maps for different seeds", () => {
    expect(generateMap(1)).not.toEqual(generateMap(2));
  });

  it("connects every floor tile across 50 seeds without overlapping rooms", () => {
    for (let seed = 0; seed < 50; seed += 1) {
      const map = generateMap(seed);
      expect(isFullyConnected(map)).toBe(true);

      for (let first = 0; first < map.rooms.length; first += 1) {
        for (let second = first + 1; second < map.rooms.length; second += 1) {
          const a = map.rooms[first];
          const b = map.rooms[second];
          const overlaps =
            a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y;
          expect(overlaps).toBe(false);
        }
      }
    }
  });

  it("keeps the map border as walls", () => {
    const map = generateMap(9876);
    expect(map.tiles[0].every((tile) => tile === 0)).toBe(true);
    expect(map.tiles[map.height - 1].every((tile) => tile === 0)).toBe(true);
    for (const row of map.tiles) {
      expect(row[0]).toBe(0);
      expect(row[map.width - 1]).toBe(0);
    }
  });

  it("places an accessible floor exit", () => {
    const map = generateMap(42);
    expect(map.tiles[map.exit.y][map.exit.x]).toBe(1);
    expect(reachableCount(map, map.start)).toBe(countFloor(map));
    expect(isFullyConnected(map)).toBe(true);
  });
});

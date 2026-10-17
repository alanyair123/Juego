import { describe, expect, it } from "vitest";
import { createGame, movePlayer, type GameState } from "../engine";
import { xpForLevel } from "../stats";

describe("game engine", () => {
  it("creates the same game from the same seed", () => {
    expect(createGame(812)).toEqual(createGame(812));
  });

  it("moves the player onto floor", () => {
    const state = createGame(15);
    const direction = findFloorDirection(state);
    const next = movePlayer(state, direction.dx, direction.dy);

    expect(next.player).toMatchObject({
      x: state.player.x + direction.dx,
      y: state.player.y + direction.dy,
    });
  });

  it("does not move into a wall", () => {
    const state = createGame(15);
    const { point, direction } = findWallDirection(state);
    const setup: GameState = {
      ...state,
      player: { ...state.player, x: point.x, y: point.y },
      enemies: [],
    };

    expect(movePlayer(setup, direction.dx, direction.dy)).toBe(setup);
  });

  it("damages an enemy when moving into it", () => {
    const { state, direction } = withAdjacentEnemy(createGame(21), 100);
    const next = movePlayer(state, direction.dx, direction.dy);

    expect(next.enemies[0].hp).toBeLessThan(100);
    expect(next.player.x).toBe(state.player.x);
    expect(next.player.y).toBe(state.player.y);
  });

  it("awards experience and counts a defeated enemy", () => {
    const { state, direction } = withAdjacentEnemy(createGame(22), 1);
    const next = movePlayer(state, direction.dx, direction.dy);

    expect(next.enemies).toHaveLength(0);
    expect(next.player.xp).toBeGreaterThan(0);
    expect(next.enemiesKilled).toBe(1);
  });

  it("increases maximum health and attack after leveling up", () => {
    const state = createGame(23);
    const enemy = {
      ...state.enemies[0],
      hp: 1,
      level: 20,
      attack: 0,
    };
    const adjacent = findAdjacentFloor(state, enemy.x, enemy.y);
    const setup: GameState = {
      ...state,
      player: { ...state.player, x: adjacent.x, y: adjacent.y },
      enemies: [enemy],
    };
    const direction = { dx: enemy.x - adjacent.x, dy: enemy.y - adjacent.y };
    const next = movePlayer(setup, direction.dx, direction.dy);

    expect(next.player.level).toBeGreaterThan(1);
    expect(next.player.maxHp).toBeGreaterThan(setup.player.maxHp);
    expect(next.player.attack).toBeGreaterThan(setup.player.attack);
    expect(next.player.xp).toBeGreaterThanOrEqual(xpForLevel(1));
  });

  it("marks the player dead and rejects later moves", () => {
    const { state, direction } = withAdjacentEnemy(createGame(24), 100);
    const doomed: GameState = {
      ...state,
      player: { ...state.player, hp: 1 },
      enemies: [{ ...state.enemies[0], attack: 100 }],
    };
    const dead = movePlayer(doomed, direction.dx, direction.dy);

    expect(dead.status).toBe("dead");
    expect(movePlayer(dead, 1, 0)).toBe(dead);
  });

  it("creates the next floor after reaching the exit", () => {
    const state = { ...createGame(25), enemies: [] };
    const path = findPath(state, state.map.exit.x, state.map.exit.y);
    const next = path.reduce(
      (current, point) => {
        const dx = point.x - current.player.x;
        const dy = point.y - current.player.y;
        return movePlayer(current, dx, dy);
      },
      state as GameState,
    );

    expect(next.floor).toBe(2);
    expect(next.player.x).toBe(next.map.start.x);
    expect(next.player.y).toBe(next.map.start.y);
    expect(next.enemies.length).toBeGreaterThan(0);
  });

  it("spawns enemies only on floor and at least five steps from the start", () => {
    for (const enemy of createGame(26).enemies) {
      expect(createGame(26).map.tiles[enemy.y][enemy.x]).toBe(1);
      expect(enemy.x === createGame(26).player.x && enemy.y === createGame(26).player.y).toBe(
        false,
      );
      expect(
        Math.abs(enemy.x - createGame(26).map.start.x) +
          Math.abs(enemy.y - createGame(26).map.start.y),
      ).toBeGreaterThanOrEqual(5);
    }
  });
});

function findFloorDirection(state: GameState): { dx: number; dy: number } {
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    if (state.map.tiles[state.player.y + dy]?.[state.player.x + dx] === 1) {
      return { dx, dy };
    }
  }
  throw new Error("The starting room has no adjacent floor tile.");
}

function findWallDirection(
  state: GameState,
): { point: { x: number; y: number }; direction: { dx: number; dy: number } } {
  for (let y = 0; y < state.map.height; y += 1) {
    for (let x = 0; x < state.map.width; x += 1) {
      if (state.map.tiles[y][x] !== 1) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (state.map.tiles[y + dy]?.[x + dx] !== 1) {
          return { point: { x, y }, direction: { dx, dy } };
        }
      }
    }
  }
  throw new Error("The map has no floor tile next to a wall.");
}

function findAdjacentFloor(
  state: GameState,
  x: number,
  y: number,
): { x: number; y: number } {
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    if (state.map.tiles[y + dy]?.[x + dx] === 1) {
      return { x: x + dx, y: y + dy };
    }
  }
  throw new Error("The enemy has no adjacent floor tile.");
}

function withAdjacentEnemy(
  original: GameState,
  hp: number,
): { state: GameState; direction: { dx: number; dy: number } } {
  for (const enemy of original.enemies) {
    const adjacent = findAdjacentFloor(original, enemy.x, enemy.y);
    return {
      state: {
        ...original,
        player: { ...original.player, x: adjacent.x, y: adjacent.y },
        enemies: [{ ...enemy, hp }],
      },
      direction: {
        dx: enemy.x - adjacent.x,
        dy: enemy.y - adjacent.y,
      },
    };
  }
  throw new Error("Could not place an enemy next to the player.");
}

function findPath(
  state: GameState,
  targetX: number,
  targetY: number,
): Array<{ x: number; y: number }> {
  const start = { x: state.player.x, y: state.player.y };
  const queue = [start];
  const previous = new Map<string, { x: number; y: number } | null>([
    [`${start.x},${start.y}`, null],
  ]);

  for (let index = 0; index < queue.length; index += 1) {
    const point = queue[index];
    if (point.x === targetX && point.y === targetY) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = { x: point.x + dx, y: point.y + dy };
      const key = `${next.x},${next.y}`;
      if (
        state.map.tiles[next.y]?.[next.x] === 1 &&
        !previous.has(key)
      ) {
        previous.set(key, point);
        queue.push(next);
      }
    }
  }

  const path: Array<{ x: number; y: number }> = [];
  let point: { x: number; y: number } | null = { x: targetX, y: targetY };
  while (point && (point.x !== start.x || point.y !== start.y)) {
    path.unshift(point);
    point = previous.get(`${point.x},${point.y}`) ?? null;
  }
  if (path.length === 0) throw new Error("The map exit is unreachable.");
  return path;
}

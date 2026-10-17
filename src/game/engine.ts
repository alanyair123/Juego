import { generateMap, type GameMap, type Point } from "./map";
import { createRng } from "./rng";
import {
  calculateDamage,
  enemyAttack,
  enemyHp,
  levelFromXp,
  xpReward,
} from "./stats";
import type { InventoryItem } from "./schemas";

export type Player = {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  xp: number;
  level: number;
};

export type Enemy = {
  id: string;
  x: number;
  y: number;
  hp: number;
  attack: number;
  level: number;
};

export type GameState = {
  seed: number;
  map: GameMap;
  player: Player;
  enemies: Enemy[];
  inventory: InventoryItem[];
  floor: number;
  enemiesKilled: number;
  turns: number;
  status: "playing" | "dead";
};

const DIRECTIONS: Point[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

export function createGame(seed: number): GameState {
  if (!Number.isFinite(seed)) {
    throw new RangeError("The game seed must be a finite number.");
  }

  const map = generateMap(seed);
  const player: Player = {
    ...map.start,
    hp: 30,
    maxHp: 30,
    attack: 8,
    defense: 2,
    xp: 0,
    level: 1,
  };

  return {
    seed,
    map,
    player,
    enemies: spawnEnemies(map, seed, 1, 4),
    inventory: [],
    floor: 1,
    enemiesKilled: 0,
    turns: 0,
    status: "playing",
  };
}

export function movePlayer(state: GameState, dx: number, dy: number): GameState {
  if (state.status === "dead") return state;
  if (
    !Number.isInteger(dx) ||
    !Number.isInteger(dy) ||
    Math.abs(dx) + Math.abs(dy) !== 1
  ) {
    return state;
  }

  const x = state.player.x + dx;
  const y = state.player.y + dy;
  if (!isFloor(state.map, x, y)) return state;

  const target = state.enemies.find((enemy) => enemy.x === x && enemy.y === y);
  let player = state.player;
  let enemies = state.enemies;
  let enemiesKilled = state.enemiesKilled;

  if (target) {
    const rng = createRng((state.seed ^ Math.imul(state.turns + 1, 0x9e3779b1)) >>> 0);
    const damage = calculateDamage({
      attack: player.attack,
      defense: 0,
      isCrit: rng() < 0.1,
    });
    const remainingHp = target.hp - damage;

    if (remainingHp <= 0) {
      enemies = enemies.filter((enemy) => enemy.id !== target.id);
      enemiesKilled += 1;
      const xp = player.xp + xpReward(target.level);
      const level = levelFromXp(xp);
      const levelsGained = level - player.level;
      player = {
        ...player,
        xp,
        level,
        maxHp: player.maxHp + levelsGained * 10,
        hp: Math.min(player.maxHp + levelsGained * 10, player.hp + levelsGained * 10),
        attack: player.attack + levelsGained * 2,
      };
    } else {
      enemies = enemies.map((enemy) =>
        enemy.id === target.id ? { ...enemy, hp: remainingHp } : enemy,
      );
    }
  } else {
    player = { ...player, x, y };
  }

  let next: GameState = {
    ...state,
    player,
    enemies,
    enemiesKilled,
    turns: state.turns + 1,
  };

  if (target) {
    next = moveEnemies(next);
  }
  if (next.status === "dead") return next;

  if (!target) {
    next = moveEnemies(next);
  }
  if (next.status === "dead") return next;

  if (next.player.x === next.map.exit.x && next.player.y === next.map.exit.y) {
    next = nextFloor(next);
  }

  return next;
}

function moveEnemies(state: GameState): GameState {
  const distances = distanceMap(state.map, state.player);
  const occupied = new Set(state.enemies.map(({ x, y }) => positionKey(x, y)));
  const moved: Enemy[] = [];
  let hp = state.player.hp;
  const rng = createRng(
    (state.seed ^ Math.imul(state.floor, 0x85ebca6b) ^ Math.imul(state.turns, 0xc2b2ae35)) >>> 0,
  );

  for (const enemy of state.enemies) {
    if (Math.abs(enemy.x - state.player.x) + Math.abs(enemy.y - state.player.y) === 1) {
      hp -= calculateDamage({
        attack: enemy.attack,
        defense: state.player.defense,
        isCrit: rng() < 0.05,
      });
      moved.push(enemy);
      continue;
    }

    const choices = DIRECTIONS.map((direction) => ({
      x: enemy.x + direction.x,
      y: enemy.y + direction.y,
    }))
      .filter(
        (point) =>
          isFloor(state.map, point.x, point.y) &&
          !occupied.has(positionKey(point.x, point.y)) &&
          !(point.x === state.player.x && point.y === state.player.y),
      )
      .sort(
        (first, second) =>
          (distances[first.y]?.[first.x] ?? Infinity) -
          (distances[second.y]?.[second.x] ?? Infinity),
      );

    const best = choices[0];
    const currentDistance = distances[enemy.y]?.[enemy.x] ?? Infinity;
    if (best && (distances[best.y]?.[best.x] ?? Infinity) < currentDistance) {
      occupied.delete(positionKey(enemy.x, enemy.y));
      occupied.add(positionKey(best.x, best.y));
      moved.push({ ...enemy, x: best.x, y: best.y });
    } else {
      moved.push(enemy);
    }
  }

  return {
    ...state,
    enemies: moved,
    player: { ...state.player, hp },
    status: hp <= 0 ? "dead" : "playing",
  };
}

function nextFloor(state: GameState): GameState {
  const floor = state.floor + 1;
  const floorSeed = (state.seed + Math.imul(floor, 0x9e3779b1)) >>> 0;
  const map = generateMap(floorSeed);

  return {
    ...state,
    map,
    player: { ...state.player, x: map.start.x, y: map.start.y },
    enemies: spawnEnemies(map, state.seed, floor, 4 + floor),
    floor,
  };
}

function spawnEnemies(map: GameMap, seed: number, floor: number, count: number): Enemy[] {
  const rng = createRng((seed ^ Math.imul(floor, 0x27d4eb2d)) >>> 0);
  const candidates: Point[] = [];

  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const startDistance = Math.abs(x - map.start.x) + Math.abs(y - map.start.y);
      if (
        map.tiles[y][x] === 1 &&
        startDistance >= 5 &&
        !(x === map.exit.x && y === map.exit.y)
      ) {
        candidates.push({ x, y });
      }
    }
  }

  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const other = Math.floor(rng() * (index + 1));
    [candidates[index], candidates[other]] = [candidates[other], candidates[index]];
  }

  const playerLevel = Math.max(1, floor);
  return candidates.slice(0, count).map((point, index) => {
    const level = Math.max(1, playerLevel + Math.floor(rng() * 2) - 1);
    return {
      id: `floor-${floor}-enemy-${index}`,
      ...point,
      hp: enemyHp(level),
      attack: enemyAttack(level),
      level,
    };
  });
}

function distanceMap(map: GameMap, target: Point): number[][] {
  const distances = Array.from({ length: map.height }, () =>
    Array<number>(map.width).fill(Infinity),
  );
  const queue: Point[] = [target];
  distances[target.y][target.x] = 0;

  for (let index = 0; index < queue.length; index += 1) {
    const point = queue[index];
    for (const direction of DIRECTIONS) {
      const x = point.x + direction.x;
      const y = point.y + direction.y;
      if (isFloor(map, x, y) && distances[y][x] === Infinity) {
        distances[y][x] = distances[point.y][point.x] + 1;
        queue.push({ x, y });
      }
    }
  }

  return distances;
}

function isFloor(map: GameMap, x: number, y: number): boolean {
  return (
    x >= 0 &&
    x < map.width &&
    y >= 0 &&
    y < map.height &&
    map.tiles[y][x] === 1
  );
}

function positionKey(x: number, y: number): string {
  return `${x},${y}`;
}

import { createRng } from "./rng";

export type Point = {
  x: number;
  y: number;
};

export type Room = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type GameMap = {
  width: number;
  height: number;
  tiles: number[][];
  rooms: Room[];
  start: Point;
  exit: Point;
};

const MIN_ROOM_SIZE = 4;
const MAX_ROOM_SIZE = 9;
const MAX_ATTEMPTS_PER_ROOM = 50;

export function generateMap(
  seed: number,
  width = 40,
  height = 30,
  maxRooms = 8,
): GameMap {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 6 || height < 6) {
    throw new RangeError("Map dimensions must be integers of at least 6.");
  }
  if (!Number.isInteger(maxRooms) || maxRooms < 1) {
    throw new RangeError("maxRooms must be a positive integer.");
  }

  const rng = createRng(seed);
  const tiles = Array.from({ length: height }, () => Array<number>(width).fill(0));
  const rooms: Room[] = [];
  const attemptsLimit = maxRooms * MAX_ATTEMPTS_PER_ROOM;

  for (let attempt = 0; attempt < attemptsLimit && rooms.length < maxRooms; attempt += 1) {
    const maxWidth = Math.min(MAX_ROOM_SIZE, width - 2);
    const maxHeight = Math.min(MAX_ROOM_SIZE, height - 2);
    const roomWidth = MIN_ROOM_SIZE + Math.floor(rng() * (maxWidth - MIN_ROOM_SIZE + 1));
    const roomHeight = MIN_ROOM_SIZE + Math.floor(rng() * (maxHeight - MIN_ROOM_SIZE + 1));
    const room: Room = {
      x: 1 + Math.floor(rng() * (width - roomWidth - 1)),
      y: 1 + Math.floor(rng() * (height - roomHeight - 1)),
      width: roomWidth,
      height: roomHeight,
    };

    if (rooms.some((existing) => roomsOverlap(existing, room))) {
      continue;
    }

    rooms.push(room);
    carveRoom(tiles, room);

    if (rooms.length > 1) {
      carveCorridor(tiles, roomCenter(rooms[rooms.length - 2]), roomCenter(room));
    }
  }

  const start = roomCenter(rooms[0]);
  const exit = roomCenter(rooms[rooms.length - 1]);

  return { width, height, tiles, rooms, start, exit };
}

export function countFloor(map: Pick<GameMap, "width" | "height" | "tiles">): number {
  let count = 0;
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      if (map.tiles[y][x] === 1) {
        count += 1;
      }
    }
  }
  return count;
}

export function reachableCount(
  map: Pick<GameMap, "width" | "height" | "tiles">,
  start: Point,
): number {
  if (!isFloor(map, start.x, start.y)) {
    return 0;
  }

  const visited = Array.from({ length: map.height }, () => Array<boolean>(map.width).fill(false));
  const queue: Point[] = [start];
  visited[start.y][start.x] = true;
  let count = 0;

  for (let index = 0; index < queue.length; index += 1) {
    const point = queue[index];
    count += 1;

    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = point.x + dx;
      const y = point.y + dy;
      if (isFloor(map, x, y) && !visited[y][x]) {
        visited[y][x] = true;
        queue.push({ x, y });
      }
    }
  }

  return count;
}

export function isFullyConnected(map: GameMap): boolean {
  const floorCount = countFloor(map);
  return floorCount > 0 && reachableCount(map, map.start) === floorCount;
}

function roomsOverlap(first: Room, second: Room): boolean {
  return (
    first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
  );
}

function roomCenter(room: Room): Point {
  return {
    x: room.x + Math.floor(room.width / 2),
    y: room.y + Math.floor(room.height / 2),
  };
}

function carveRoom(tiles: number[][], room: Room): void {
  for (let y = room.y; y < room.y + room.height; y += 1) {
    for (let x = room.x; x < room.x + room.width; x += 1) {
      tiles[y][x] = 1;
    }
  }
}

function carveCorridor(tiles: number[][], from: Point, to: Point): void {
  const minX = Math.min(from.x, to.x);
  const maxX = Math.max(from.x, to.x);
  for (let x = minX; x <= maxX; x += 1) {
    tiles[from.y][x] = 1;
  }

  const minY = Math.min(from.y, to.y);
  const maxY = Math.max(from.y, to.y);
  for (let y = minY; y <= maxY; y += 1) {
    tiles[y][to.x] = 1;
  }
}

function isFloor(
  map: Pick<GameMap, "width" | "height" | "tiles">,
  x: number,
  y: number,
): boolean {
  return x >= 0 && x < map.width && y >= 0 && y < map.height && map.tiles[y][x] === 1;
}

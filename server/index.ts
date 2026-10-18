import { randomInt, randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { Server, type Socket } from "socket.io";
import type { ZodType } from "zod";
import {
  applyMove,
  canStart,
  createRoom,
  getOthers,
  getScoreboard,
  isRoomFinished,
  joinRoom,
  leaveRoom,
  setReady,
  startRoom,
  toPublicRoom,
  type LobbyRoom,
} from "../src/game/lobby";
import {
  createRoomInputSchema,
  emptyInputSchema,
  gameRecordSchema,
  joinRoomInputSchema,
  moveInputSchema,
  setReadyInputSchema,
} from "../src/game/schemas";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "../src/game/socket-types";
import { getPool } from "../src/lib/db";

const port = Number.parseInt(process.env.PORT ?? "4000", 10);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be a valid TCP port.");
}

const allowedOrigins = new Set(
  (process.env.CORS_ORIGIN ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);
if (process.env.NODE_ENV !== "production") allowedOrigins.add("http://localhost:3000");

const httpServer = createServer((request, response) => {
  const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
  if (request.method === "GET" && pathname === "/health") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ ok: true }));
    return;
  }

  response.writeHead(404, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ error: "Not found" }));
});

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Origin is not allowed by CORS."));
      }
    },
  },
});

const rooms = new Map<string, LobbyRoom>();
const playerRooms = new Map<string, string>();
const roomStartedAt = new Map<string, number>();
const moveWindows = new Map<string, { startedAt: number; count: number }>();
const announcedGameOver = new Set<string>();

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL no está configurada; las muertes multijugador no se guardarán.");
}

function roomChannel(roomId: string): string {
  return `room:${roomId}`;
}

function sendError(socket: Socket<ClientToServerEvents, ServerToClientEvents>, message: string): void {
  socket.emit("error:message", { message });
}

function parseInput<T>(
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  schema: ZodType<T>,
  payload: unknown,
): T | null {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    sendError(socket, "El mensaje no es válido.");
    return null;
  }
  return parsed.data;
}

function publishRooms(): void {
  const publicRooms = Array.from(rooms.values(), toPublicRoom);
  io.emit("lobby:rooms", publicRooms);
}

function publishRoom(room: LobbyRoom): void {
  rooms.set(room.id, room);
  io.to(roomChannel(room.id)).emit("room:update", toPublicRoom(room));
  publishRooms();
}

function emitGameStates(room: LobbyRoom): void {
  const scoreboard = getScoreboard(room);
  for (const player of room.players) {
    if (player.state) {
      io.to(player.id).emit("game:state", {
        state: player.state,
        scoreboard,
        others: getOthers(room, player.id),
      });
    }
  }
}

function startIfReady(room: LobbyRoom): LobbyRoom {
  if (!canStart(room)) return room;
  const seed = randomInt(0, 0x7fffffff);
  const startedRoom = startRoom(room, seed);
  roomStartedAt.set(room.id, Date.now());
  announcedGameOver.delete(room.id);
  publishRoom(startedRoom);
  for (const player of startedRoom.players) {
    io.to(player.id).emit("game:started", { seed });
  }
  emitGameStates(startedRoom);
  return startedRoom;
}

async function saveDeathRecord(nickname: string, state: NonNullable<LobbyRoom["players"][number]["state"]>, roomId: string): Promise<void> {
  if (!process.env.DATABASE_URL) return;

  const parsed = gameRecordSchema.safeParse({
    playerId: `mp-${nickname}`,
    levelReached: state.player.level,
    enemiesKilled: state.enemiesKilled,
    timeSeconds: Math.max(0, Math.floor((Date.now() - (roomStartedAt.get(roomId) ?? Date.now())) / 1000)),
    inventory: state.inventory,
  });
  if (!parsed.success) {
    console.error("No se pudo validar el registro multijugador:", parsed.error);
    return;
  }

  try {
    const record = parsed.data;
    await getPool().query(
      `INSERT INTO game_records
         (player_id, level_reached, enemies_killed, time_seconds, inventory)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [
        record.playerId,
        record.levelReached,
        record.enemiesKilled,
        record.timeSeconds,
        JSON.stringify(record.inventory),
      ],
    );
  } catch (error) {
    console.error("No se pudo guardar la partida multijugador:", error);
  }
}

function removePlayer(playerId: string): void {
  const roomId = playerRooms.get(playerId);
  if (!roomId) return;

  const room = rooms.get(roomId);
  playerRooms.delete(playerId);
  if (!room) return;

  const updatedRoom = leaveRoom(room, playerId);
  if (updatedRoom.players.length === 0) {
    rooms.delete(roomId);
    roomStartedAt.delete(roomId);
    announcedGameOver.delete(roomId);
    io.in(roomChannel(roomId)).socketsLeave(roomChannel(roomId));
    publishRooms();
    return;
  }

  publishRoom(updatedRoom);
  if (updatedRoom.started) emitGameStates(updatedRoom);
  if (updatedRoom.started && isRoomFinished(updatedRoom) && !announcedGameOver.has(roomId)) {
    announcedGameOver.add(roomId);
    io.to(roomChannel(roomId)).emit("game:over", { scoreboard: getScoreboard(updatedRoom) });
  }
}

function isMoveAllowed(socketId: string): boolean {
  const now = Date.now();
  const current = moveWindows.get(socketId);
  if (!current || now - current.startedAt >= 1000) {
    moveWindows.set(socketId, { startedAt: now, count: 1 });
    return true;
  }
  if (current.count >= 15) return false;
  current.count += 1;
  return true;
}

io.on("connection", (socket) => {
  socket.on("lobby:list", (payload) => {
    if (!parseInput(socket, emptyInputSchema, payload)) return;
    socket.emit("lobby:rooms", Array.from(rooms.values(), toPublicRoom));
  });

  socket.on("lobby:create", (payload) => {
    const input = parseInput(socket, createRoomInputSchema, payload);
    if (!input) return;
    if (playerRooms.has(socket.id)) {
      sendError(socket, "Sal de tu sala actual antes de crear otra.");
      return;
    }

    const id = randomUUID();
    const room = joinRoom(createRoom(id, `Sala de ${input.nickname}`), socket.id, input.nickname);
    rooms.set(id, room);
    playerRooms.set(socket.id, id);
    void socket.join(roomChannel(id));
    publishRoom(room);
  });

  socket.on("lobby:join", (payload) => {
    const input = parseInput(socket, joinRoomInputSchema, payload);
    if (!input) return;
    if (playerRooms.has(socket.id)) {
      sendError(socket, "Sal de tu sala actual antes de unirte a otra.");
      return;
    }
    const room = rooms.get(input.roomId);
    if (!room) {
      sendError(socket, "No se encontró esa sala.");
      return;
    }

    try {
      const updatedRoom = joinRoom(room, socket.id, input.nickname);
      playerRooms.set(socket.id, room.id);
      void socket.join(roomChannel(room.id));
      publishRoom(updatedRoom);
    } catch (error) {
      sendError(socket, error instanceof Error ? error.message : "No se pudo entrar a la sala.");
    }
  });

  socket.on("lobby:leave", (payload) => {
    if (!parseInput(socket, emptyInputSchema, payload)) return;
    const roomId = playerRooms.get(socket.id);
    if (roomId) void socket.leave(roomChannel(roomId));
    removePlayer(socket.id);
  });

  socket.on("lobby:ready", (payload) => {
    const input = parseInput(socket, setReadyInputSchema, payload);
    if (!input) return;
    const roomId = playerRooms.get(socket.id);
    const room = roomId ? rooms.get(roomId) : undefined;
    if (!room) {
      sendError(socket, "No estás en una sala.");
      return;
    }
    const updatedRoom = setReady(room, socket.id, input.ready);
    publishRoom(updatedRoom);
    startIfReady(updatedRoom);
  });

  socket.on("game:move", (payload) => {
    const input = parseInput(socket, moveInputSchema, payload);
    if (!input) return;
    if (!isMoveAllowed(socket.id)) {
      sendError(socket, "Puedes hacer como máximo 15 movimientos por segundo.");
      return;
    }

    const roomId = playerRooms.get(socket.id);
    const room = roomId ? rooms.get(roomId) : undefined;
    if (!room?.started) {
      sendError(socket, "No hay una partida activa.");
      return;
    }

    const previousPlayer = room.players.find((player) => player.id === socket.id);
    const updatedRoom = applyMove(room, socket.id, input.dx, input.dy);
    if (updatedRoom === room) return;
    rooms.set(room.id, updatedRoom);

    const updatedPlayer = updatedRoom.players.find((player) => player.id === socket.id);
    if (previousPlayer?.status === "playing" && updatedPlayer?.status === "dead" && updatedPlayer.state) {
      void saveDeathRecord(updatedPlayer.nickname, updatedPlayer.state, room.id);
    }

    emitGameStates(updatedRoom);
    if (isRoomFinished(updatedRoom) && !announcedGameOver.has(room.id)) {
      announcedGameOver.add(room.id);
      io.to(roomChannel(room.id)).emit("game:over", { scoreboard: getScoreboard(updatedRoom) });
    }
  });

  socket.on("game:sync", (payload) => {
    if (!parseInput(socket, emptyInputSchema, payload)) return;
    const roomId = playerRooms.get(socket.id);
    const room = roomId ? rooms.get(roomId) : undefined;
    const player = room?.players.find((entry) => entry.id === socket.id);
    if (!room?.started || !player?.state) {
      sendError(socket, "No tienes una partida activa.");
      return;
    }
    socket.emit("game:state", {
      state: player.state,
      scoreboard: getScoreboard(room),
      others: getOthers(room, player.id),
    });
    if (isRoomFinished(room)) {
      socket.emit("game:over", { scoreboard: getScoreboard(room) });
    }
  });

  socket.on("disconnect", () => {
    moveWindows.delete(socket.id);
    removePlayer(socket.id);
  });
});

httpServer.listen(port, () => {
  console.info(`Servidor multijugador escuchando en el puerto ${port}.`);
});

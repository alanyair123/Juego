import { createGame, movePlayer, type GameState } from "./engine";

export type LobbyPlayer = {
  id: string;
  nickname: string;
  ready: boolean;
  status: "waiting" | "playing" | "dead";
  state: GameState | null;
};

export type LobbyRoom = {
  id: string;
  name: string;
  players: LobbyPlayer[];
  started: boolean;
  seed: number | null;
};

export type PublicRoom = {
  id: string;
  name: string;
  started: boolean;
  players: Array<Pick<LobbyPlayer, "id" | "nickname" | "ready" | "status">>;
};

export type ScoreboardEntry = {
  playerId: string;
  nickname: string;
  status: LobbyPlayer["status"];
  floor: number;
  level: number;
  enemiesKilled: number;
};

export function createRoom(id: string, name: string): LobbyRoom {
  return {
    id,
    name,
    players: [],
    started: false,
    seed: null,
  };
}

export function joinRoom(room: LobbyRoom, playerId: string, nickname: string): LobbyRoom {
  if (room.started) throw new Error("La partida ya empezó.");
  if (room.players.length >= 4) throw new Error("La sala está llena.");
  if (room.players.some((player) => player.id === playerId)) {
    throw new Error("Ya estás en esta sala.");
  }

  return {
    ...room,
    players: [
      ...room.players,
      { id: playerId, nickname, ready: false, status: "waiting", state: null },
    ],
  };
}

export function leaveRoom(room: LobbyRoom, playerId: string): LobbyRoom {
  return {
    ...room,
    players: room.players.filter((player) => player.id !== playerId),
  };
}

export function setReady(room: LobbyRoom, playerId: string, ready: boolean): LobbyRoom {
  return {
    ...room,
    players: room.players.map((player) =>
      player.id === playerId && !room.started ? { ...player, ready } : player,
    ),
  };
}

export function canStart(room: LobbyRoom): boolean {
  return !room.started && room.players.length >= 2 && room.players.every((player) => player.ready);
}

export function startRoom(room: LobbyRoom, seed: number): LobbyRoom {
  if (!canStart(room)) throw new Error("No se puede iniciar esta sala todavía.");

  return {
    ...room,
    started: true,
    seed,
    players: room.players.map((player) => ({
      ...player,
      status: "playing",
      state: createGame(seed),
    })),
  };
}

export function applyMove(room: LobbyRoom, playerId: string, dx: number, dy: number): LobbyRoom {
  if (!room.started) return room;

  let changed = false;
  const players = room.players.map((player) => {
    if (player.id !== playerId || player.status !== "playing" || !player.state) return player;
    const state = movePlayer(player.state, dx, dy);
    if (state === player.state) return player;
    changed = true;
    return {
      ...player,
      status: state.status === "dead" ? "dead" as const : player.status,
      state,
    };
  });

  return changed ? { ...room, players } : room;
}

export function getScoreboard(room: LobbyRoom): ScoreboardEntry[] {
  return room.players
    .map((player) => ({
      playerId: player.id,
      nickname: player.nickname,
      status: player.status,
      floor: player.state?.floor ?? 0,
      level: player.state?.player.level ?? 0,
      enemiesKilled: player.state?.enemiesKilled ?? 0,
    }))
    .sort(
      (first, second) =>
        second.floor - first.floor ||
        second.level - first.level ||
        second.enemiesKilled - first.enemiesKilled ||
        first.nickname.localeCompare(second.nickname),
    );
}

export function isRoomFinished(room: LobbyRoom): boolean {
  return room.players.length > 0 && room.players.every((player) => player.status === "dead");
}

export function toPublicRoom(room: LobbyRoom): PublicRoom {
  return {
    id: room.id,
    name: room.name,
    started: room.started,
    players: room.players.map(({ id, nickname, ready, status }) => ({
      id,
      nickname,
      ready,
      status,
    })),
  };
}

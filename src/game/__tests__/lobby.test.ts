import { describe, expect, it } from "vitest";
import { createGame } from "../engine";
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
  type LobbyRoom,
} from "../lobby";

function roomWithPlayers(count = 2): LobbyRoom {
  let room = createRoom("room-1", "Test Room");
  for (let index = 1; index <= count; index += 1) {
    room = joinRoom(room, `player-${index}`, `Player ${index}`);
  }
  return room;
}

function readyRoom(room: LobbyRoom): LobbyRoom {
  return room.players.reduce((current, player) => setReady(current, player.id, true), room);
}

describe("lobby room logic", () => {
  it("creates an empty, not-started room", () => {
    expect(createRoom("room-1", "Test Room")).toEqual({
      id: "room-1",
      name: "Test Room",
      players: [],
      started: false,
      seed: null,
    });
  });

  it("joins a player without mutating the original room", () => {
    const room = createRoom("room-1", "Test Room");
    const joined = joinRoom(room, "player-1", "Rogue");

    expect(room.players).toHaveLength(0);
    expect(joined.players[0]).toMatchObject({ id: "player-1", nickname: "Rogue", ready: false });
  });

  it("limits a room to four players", () => {
    const fullRoom = roomWithPlayers(4);
    expect(() => joinRoom(fullRoom, "player-5", "Player 5")).toThrow("llena");
  });

  it("does not allow joining a started room", () => {
    const room = startRoom(readyRoom(roomWithPlayers()), 101);
    expect(() => joinRoom(room, "player-3", "Player 3")).toThrow("empezó");
  });

  it("changes readiness immutably", () => {
    const room = roomWithPlayers();
    const ready = setReady(room, "player-1", true);

    expect(room.players[0].ready).toBe(false);
    expect(ready.players[0].ready).toBe(true);
    expect(ready.players[1].ready).toBe(false);
  });

  it("requires at least two players and every player ready to start", () => {
    const onePlayer = setReady(roomWithPlayers(1), "player-1", true);
    const oneReady = setReady(roomWithPlayers(), "player-1", true);
    const everyoneReady = readyRoom(roomWithPlayers());

    expect(canStart(onePlayer)).toBe(false);
    expect(canStart(oneReady)).toBe(false);
    expect(canStart(everyoneReady)).toBe(true);
  });

  it("starts independent player games with the same seed", () => {
    const started = startRoom(readyRoom(roomWithPlayers()), 812);
    const first = started.players[0].state;
    const second = started.players[1].state;

    expect(first?.seed).toBe(812);
    expect(second?.seed).toBe(812);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first?.player).not.toBe(second?.player);
  });

  it("applies movement only to the selected player's game", () => {
    const room = startRoom(readyRoom(roomWithPlayers()), 15);
    const current = room.players[0].state;
    if (!current) throw new Error("Expected a game state for the first player.");
    const directions = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];
    const direction = directions.find(({ dx, dy }) => {
      const x = current.player.x + dx;
      const y = current.player.y + dy;
      return current.map.tiles[y]?.[x] === 1;
    });
    if (!direction) throw new Error("Expected a floor tile next to the player.");

    const updated = applyMove(room, "player-1", direction.dx, direction.dy);
    expect(updated.players[0].state).not.toBe(current);
    expect(updated.players[1].state).toBe(room.players[1].state);
  });

  it("orders the scoreboard by floor, level, then enemies killed", () => {
    const room = startRoom(readyRoom(roomWithPlayers(3)), 77);
    const scores: LobbyRoom = {
      ...room,
      players: room.players.map((player, index) => {
        const state = createGame(77);
        state.floor = index === 0 ? 2 : 1;
        state.player.level = index === 1 ? 3 : 1;
        state.enemiesKilled = index === 2 ? 7 : 1;
        return { ...player, state };
      }),
    };

    expect(getScoreboard(scores).map(({ playerId }) => playerId)).toEqual([
      "player-1",
      "player-2",
      "player-3",
    ]);
  });

  it("returns living other players without exposing private state", () => {
    const room = startRoom(readyRoom(roomWithPlayers(4)), 77);
    const currentPlayerId = "player-1";
    const preparedRoom: LobbyRoom = {
      ...room,
      players: room.players.map((player, index) => {
        const state = createGame(77);
        if (index === 1) {
          state.player.x = 12;
          state.player.y = 8;
        } else if (index >= 2) {
          state.status = "dead";
        }
        return {
          ...player,
          status: index >= 2 ? "dead" : player.status,
          state,
        };
      }),
    };

    expect(getOthers(preparedRoom, currentPlayerId)).toEqual([
      {
        nickname: "Player 2",
        x: 12,
        y: 8,
        floor: 1,
      },
    ]);
    expect(getOthers(preparedRoom, "unknown-player")).toEqual([]);
  });

  it("includes living players on other floors", () => {
    const room = startRoom(readyRoom(roomWithPlayers(3)), 77);
    const preparedRoom: LobbyRoom = {
      ...room,
      players: room.players.map((player, index) => {
        const state = createGame(77);
        if (index === 1) {
          state.floor = 2;
          state.player.x = 12;
          state.player.y = 8;
        }
        if (index === 2) {
          state.floor = 3;
          state.player.x = 4;
          state.player.y = 5;
        }
        return { ...player, state };
      }),
    };

    expect(getOthers(preparedRoom, "player-1")).toEqual([
      { nickname: "Player 2", x: 12, y: 8, floor: 2 },
      { nickname: "Player 3", x: 4, y: 5, floor: 3 },
    ]);
  });

  it("reports a room finished only when every player is dead", () => {
    const room = startRoom(readyRoom(roomWithPlayers()), 303);
    const oneDead: LobbyRoom = {
      ...room,
      players: room.players.map((player, index) =>
        index === 0 ? { ...player, status: "dead" } : player,
      ),
    };
    const allDead: LobbyRoom = {
      ...oneDead,
      players: oneDead.players.map((player) => ({ ...player, status: "dead" })),
    };

    expect(isRoomFinished(oneDead)).toBe(false);
    expect(isRoomFinished(allDead)).toBe(true);
  });

  it("removes a player without changing the original room", () => {
    const room = roomWithPlayers();
    const left = leaveRoom(room, "player-1");

    expect(room.players).toHaveLength(2);
    expect(left.players.map(({ id }) => id)).toEqual(["player-2"]);
  });
});

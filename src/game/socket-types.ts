import type { GameState } from "./engine";
import type { MoveInput, CreateRoomInput, JoinRoomInput } from "./schemas";
import type { PublicRoom, ScoreboardEntry } from "./lobby";

export type EmptyInput = Record<string, never>;

export interface ClientToServerEvents {
  "lobby:list": (payload: EmptyInput) => void;
  "lobby:create": (payload: CreateRoomInput) => void;
  "lobby:join": (payload: JoinRoomInput) => void;
  "lobby:leave": (payload: EmptyInput) => void;
  "lobby:ready": (payload: { ready: boolean }) => void;
  "game:move": (payload: MoveInput) => void;
  "game:sync": (payload: EmptyInput) => void;
}

export interface ServerToClientEvents {
  "lobby:rooms": (rooms: PublicRoom[]) => void;
  "room:update": (room: PublicRoom) => void;
  "game:started": (payload: { seed: number }) => void;
  "game:state": (payload: { state: GameState; scoreboard: ScoreboardEntry[] }) => void;
  "game:over": (payload: { scoreboard: ScoreboardEntry[] }) => void;
  "error:message": (payload: { message: string }) => void;
}

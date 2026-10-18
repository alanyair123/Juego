"use client";

import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "./socket-types";

let gameSocket: Socket<ServerToClientEvents, ClientToServerEvents> | undefined;

export function getGameSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!gameSocket) {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";
    gameSocket = io(url, { autoConnect: false });
  }
  return gameSocket;
}

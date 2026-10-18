"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getGameSocket } from "@/game/socket-client";
import { nicknameSchema } from "@/game/schemas";
import type { PublicRoom } from "@/game/lobby";
import styles from "./LobbyClient.module.css";

export default function LobbyClient() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [rooms, setRooms] = useState<PublicRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<PublicRoom | null>(null);
  const [message, setMessage] = useState("");
  const socket = getGameSocket();
  const parsedNickname = nicknameSchema.safeParse(nickname);

  useEffect(() => {
    const onRooms = (nextRooms: PublicRoom[]) => setRooms(nextRooms);
    const onRoomUpdate = (updatedRoom: PublicRoom) => {
      setRooms((current) =>
        current.map((room) => (room.id === updatedRoom.id ? updatedRoom : room)),
      );
      if (updatedRoom.players.some((player) => player.id === socket.id)) {
        setActiveRoom(updatedRoom);
      }
    };
    const onStarted = () => router.push("/play/multi");
    const onError = ({ message: errorMessage }: { message: string }) => setMessage(errorMessage);
    const onConnect = () => socket.emit("lobby:list", {});

    socket.on("lobby:rooms", onRooms);
    socket.on("room:update", onRoomUpdate);
    socket.on("game:started", onStarted);
    socket.on("error:message", onError);
    socket.on("connect", onConnect);
    socket.connect();
    if (socket.connected) socket.emit("lobby:list", {});

    return () => {
      socket.off("lobby:rooms", onRooms);
      socket.off("room:update", onRoomUpdate);
      socket.off("game:started", onStarted);
      socket.off("error:message", onError);
      socket.off("connect", onConnect);
    };
  }, [router, socket]);

  const createRoom = () => {
    if (!parsedNickname.success) {
      setMessage("El apodo debe tener entre 1 y 16 caracteres.");
      return;
    }
    setMessage("");
    socket.emit("lobby:create", { nickname: parsedNickname.data });
  };

  const joinRoom = (roomId: string) => {
    if (!parsedNickname.success) {
      setMessage("El apodo debe tener entre 1 y 16 caracteres.");
      return;
    }
    setMessage("");
    socket.emit("lobby:join", { roomId, nickname: parsedNickname.data });
  };

  const leaveRoom = () => {
    socket.emit("lobby:leave", {});
    setActiveRoom(null);
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.backLink}>← RogueWeb</Link>
        <div>
          <p className={styles.eyebrow}>DÍA 3 · CARRERA MULTIJUGADOR</p>
          <h1>Salas de exploración</h1>
        </div>
        <span className={styles.connection}>{socket.connected ? "Conectado" : "Conectando…"}</span>
      </header>

      <section className={styles.card}>
        <label className={styles.label} htmlFor="nickname">Tu apodo</label>
        <div className={styles.createRow}>
          <input
            id="nickname"
            className={styles.input}
            data-testid="nickname-input"
            value={nickname}
            maxLength={32}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="1 a 16 caracteres"
          />
          <button
            className={styles.primaryButton}
            data-testid="create-room"
            onClick={createRoom}
            disabled={!socket.connected}
          >
            Crear sala
          </button>
        </div>
        {message && <p className={styles.message} role="alert">{message}</p>}
      </section>

      {activeRoom ? (
        <section className={styles.card}>
          <div className={styles.roomHeader}>
            <div>
              <p className={styles.eyebrow}>SALA</p>
              <h2>{activeRoom.name}</h2>
            </div>
            <button className={styles.secondaryButton} onClick={leaveRoom}>Salir</button>
          </div>
          <p className={styles.capacity}>{activeRoom.players.length} / 4 jugadores</p>
          <ul className={styles.playerList}>
            {activeRoom.players.map((player) => (
              <li key={player.id}>
                <span>{player.nickname}{player.id === socket.id ? " (tú)" : ""}</span>
                <span className={styles.playerStatus} data-testid="player-status">
                  {player.status === "dead" ? "Eliminado" : player.ready ? "Listo" : "No listo"}
                </span>
              </li>
            ))}
          </ul>
          {!activeRoom.started && (
            <button
              className={styles.primaryButton}
              data-testid="ready-toggle"
              onClick={() => {
                const self = activeRoom.players.find((player) => player.id === socket.id);
                socket.emit("lobby:ready", { ready: !self?.ready });
              }}
            >
              {activeRoom.players.find((player) => player.id === socket.id)?.ready
                ? "No estoy listo"
                : "Estoy listo"}
            </button>
          )}
          <p className={styles.hint}>La partida comienza cuando haya al menos 2 jugadores listos.</p>
        </section>
      ) : (
        <section className={styles.card}>
          <h2>Salas públicas</h2>
          {rooms.length === 0 ? (
            <p className={styles.empty}>Todavía no hay salas. ¡Crea la primera!</p>
          ) : (
            <ul className={styles.roomList}>
              {rooms.map((room) => (
                <li className={styles.roomItem} data-testid="room-item" key={room.id}>
                  <div>
                    <strong>{room.name}</strong>
                    <span>{room.players.length} / 4 jugadores · {room.started ? "En partida" : "Esperando"}</span>
                  </div>
                  <button
                    className={styles.secondaryButton}
                    data-testid="join-room"
                    disabled={room.started || room.players.length >= 4 || !socket.connected}
                    onClick={() => joinRoom(room.id)}
                  >
                    Unirse
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}

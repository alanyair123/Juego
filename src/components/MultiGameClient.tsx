"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import GameCanvas from "@/components/GameCanvas";
import { getGameSocket } from "@/game/socket-client";
import type { GameState } from "@/game/engine";
import type { OtherPlayer, ScoreboardEntry } from "@/game/lobby";
import type { MoveInput } from "@/game/schemas";
import styles from "./MultiGameClient.module.css";

export default function MultiGameClient() {
  const socket = getGameSocket();
  const [state, setState] = useState<GameState | null>(null);
  const [scoreboard, setScoreboard] = useState<ScoreboardEntry[]>([]);
  const [others, setOthers] = useState<OtherPlayer[]>([]);
  const [seed, setSeed] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const onState = (update: {
      state: GameState;
      scoreboard: ScoreboardEntry[];
      others: OtherPlayer[];
    }) => {
      setState(update.state);
      setScoreboard(update.scoreboard);
      setOthers(update.others);
    };
    const onStarted = ({ seed: gameSeed }: { seed: number }) => setSeed(gameSeed);
    const onOver = ({ scoreboard: finalScores }: { scoreboard: ScoreboardEntry[] }) =>
      setScoreboard(finalScores);
    const onError = ({ message: errorMessage }: { message: string }) => setMessage(errorMessage);
    const sync = () => socket.emit("game:sync", {});

    socket.on("game:state", onState);
    socket.on("game:started", onStarted);
    socket.on("game:over", onOver);
    socket.on("error:message", onError);
    socket.on("connect", sync);
    socket.connect();
    if (socket.connected) sync();

    return () => {
      socket.off("game:state", onState);
      socket.off("game:started", onStarted);
      socket.off("game:over", onOver);
      socket.off("error:message", onError);
      socket.off("connect", sync);
    };
  }, [socket]);

  const sendMove = (direction: MoveInput) => {
    socket.emit("game:move", direction);
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/lobby" className={styles.backLink}>← Sala</Link>
        <div>
          <p className={styles.eyebrow}>DÍA 3 · MULTIJUGADOR</p>
          <h1>La misma mazmorra, una carrera</h1>
        </div>
        <span className={styles.seed}>{seed === null ? "Sincronizando" : `Semilla ${seed}`}</span>
      </header>
      {message && <p className={styles.message} role="alert">{message}</p>}
      <div className={styles.layout}>
        <GameCanvas
          loggedIn={false}
          serverMode
          serverState={state}
          others={others}
          onMove={sendMove}
        />
        <aside className={styles.scoreCard}>
          <h2>Marcador</h2>
          <ol className={styles.scoreList}>
            {scoreboard.map((player, index) => (
              <li key={player.playerId}>
                <span className={styles.rank}>{index + 1}.</span>
                <div>
                  <strong>{player.nickname}</strong>
                  <span>
                    Piso {player.floor} · Nv. {player.level} · {player.enemiesKilled} enemigos
                  </span>
                </div>
                <span className={player.status === "dead" ? styles.dead : styles.alive}>
                  {player.status === "dead" ? "Eliminado" : "Vivo"}
                </span>
              </li>
            ))}
          </ol>
          {scoreboard.length === 0 && <p className={styles.empty}>Esperando datos de la partida…</p>}
        </aside>
      </div>
    </main>
  );
}

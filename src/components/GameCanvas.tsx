"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { createGame, movePlayer, type GameState } from "@/game/engine";
import type { OtherPlayer } from "@/game/lobby";
import type { MoveInput } from "@/game/schemas";
import styles from "./GameCanvas.module.css";

type GameCanvasProps = {
  loggedIn: boolean;
  serverMode?: boolean;
  serverState?: GameState | null;
  others?: OtherPlayer[];
  onMove?: (direction: MoveInput) => void;
};

type CanvasSize = {
  width: number;
  height: number;
  ratio: number;
};

const DIRECTIONS: Record<string, MoveInput> = {
  ArrowUp: { dx: 0, dy: -1 },
  w: { dx: 0, dy: -1 },
  W: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
  s: { dx: 0, dy: 1 },
  S: { dx: 0, dy: 1 },
  ArrowLeft: { dx: -1, dy: 0 },
  a: { dx: -1, dy: 0 },
  A: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
  d: { dx: 1, dy: 0 },
  D: { dx: 1, dy: 0 },
};

export default function GameCanvas({
  loggedIn,
  serverMode = false,
  serverState,
  others = [],
  onMove,
}: GameCanvasProps) {
  const [localState, setLocalState] = useState<GameState | null>(() =>
    serverMode ? null : createGame(makeSeed()),
  );
  const state = serverMode ? serverState ?? null : localState;
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({
    width: 0,
    height: 0,
    ratio: 1,
  });
  const [showDpad, setShowDpad] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const stateStatus = state?.status;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startedAt = useRef(0);
  const saveStarted = useRef(false);

  const move = useCallback((direction: MoveInput) => {
    if (serverMode) {
      onMove?.(direction);
      return;
    }
    setLocalState((current) =>
      current ? movePlayer(current, direction.dx, direction.dy) : current,
    );
  }, [onMove, serverMode]);

  const startNewGame = useCallback(() => {
    setLocalState(createGame(makeSeed()));
    setSavedMessage("");
    startedAt.current = Date.now();
    setElapsedSeconds(0);
    saveStarted.current = false;
  }, []);

  useEffect(() => {
    const coarsePointer = window.matchMedia("(pointer: coarse)");
    const updateDevice = () => {
      setShowDpad(coarsePointer.matches || "ontouchstart" in window);
    };
    updateDevice();
    coarsePointer.addEventListener("change", updateDevice);
    return () => coarsePointer.removeEventListener("change", updateDevice);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      setCanvasSize({ width, height, ratio });
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const direction = DIRECTIONS[event.key];
      if (direction) {
        event.preventDefault();
        move(direction);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [move]);

  useEffect(() => {
    if (serverMode || stateStatus !== "playing") return;
    startedAt.current = Date.now();
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [serverMode, stateStatus]);

  useEffect(() => {
    if (serverMode || !state || state.status !== "dead") return;
    if (!loggedIn) return;
    if (saveStarted.current) return;
    saveStarted.current = true;

    const saveRecord = async () => {
      try {
        const response = await fetch("/api/games", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerId: "client-value-ignored",
            levelReached: state.player.level,
            enemiesKilled: state.enemiesKilled,
            timeSeconds: elapsedSeconds,
            inventory: state.inventory,
          }),
        });
        if (!response.ok) {
          throw new Error(`No se pudo guardar la partida (HTTP ${response.status}).`);
        }
        setSavedMessage("Partida guardada.");
      } catch (error) {
        console.error("Error al guardar la partida:", error);
        setSavedMessage("No se pudo guardar la partida. Inténtalo más tarde.");
      }
    };
    void saveRecord();
  }, [elapsedSeconds, loggedIn, serverMode, state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !state || canvasSize.width === 0 || canvasSize.height === 0) return;

    const frame = window.requestAnimationFrame(() => {
      drawGame(context, state, canvasSize, serverMode ? others : []);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [canvasSize, others, serverMode, state]);

  const handlePointer = (event: PointerEvent<HTMLButtonElement>, direction: MoveInput) => {
    event.preventDefault();
    if (event.type === "pointerdown") move(direction);
  };

  return (
    <section className={styles.game}>
      <div className={styles.canvasFrame}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          data-testid="game-canvas"
          data-player-x={state?.player.x ?? ""}
          data-player-y={state?.player.y ?? ""}
          aria-label={state
            ? `Mapa del juego, jugador en ${state.player.x}, ${state.player.y}`
            : "Mapa de la partida multijugador"}
        />
        {!state && serverMode && (
          <div className={styles.gameOver}>
            <div className={styles.gameOverCard}>
              <p className={styles.eyebrow}>PARTIDA MULTIJUGADOR</p>
              <h2>Conectando…</h2>
              <p>Esperando el estado de la sala.</p>
            </div>
          </div>
        )}
        {state?.status === "dead" && (
          <div className={styles.gameOver} role="dialog" aria-modal="true">
            <div className={styles.gameOverCard}>
              <p className={styles.eyebrow}>FIN DE LA PARTIDA</p>
              <h2>Game Over</h2>
              <p>Nivel alcanzado: {state.player.level}</p>
              <p>Enemigos eliminados: {state.enemiesKilled}</p>
              {!serverMode && <p>Tiempo: {formatTime(elapsedSeconds)}</p>}
              {!serverMode && (
                <>
                  <p aria-live="polite">
                    {savedMessage || (!loggedIn ? "Inicia sesión para guardar tus partidas." : "")}
                  </p>
                  <button className={styles.primaryButton} onClick={startNewGame}>
                    Nueva partida
                  </button>
                </>
              )}
              {serverMode && <p>Has sido eliminado. Puedes seguir viendo el marcador.</p>}
            </div>
          </div>
        )}
      </div>
      {showDpad && state?.status === "playing" && (
        <div className={styles.dpad} aria-label="Controles táctiles">
          <button
            aria-label="Mover arriba"
            onPointerDown={(event) => handlePointer(event, { dx: 0, dy: -1 })}
            onPointerUp={(event) => event.preventDefault()}
            onPointerCancel={(event) => event.preventDefault()}
          >
            ↑
          </button>
          <button
            aria-label="Mover izquierda"
            onPointerDown={(event) => handlePointer(event, { dx: -1, dy: 0 })}
            onPointerUp={(event) => event.preventDefault()}
            onPointerCancel={(event) => event.preventDefault()}
          >
            ←
          </button>
          <button
            aria-label="Mover abajo"
            onPointerDown={(event) => handlePointer(event, { dx: 0, dy: 1 })}
            onPointerUp={(event) => event.preventDefault()}
            onPointerCancel={(event) => event.preventDefault()}
          >
            ↓
          </button>
          <button
            aria-label="Mover derecha"
            onPointerDown={(event) => handlePointer(event, { dx: 1, dy: 0 })}
            onPointerUp={(event) => event.preventDefault()}
            onPointerCancel={(event) => event.preventDefault()}
          >
            →
          </button>
        </div>
      )}
      <p className={styles.helpText}>
        {showDpad ? "Usa los controles de pantalla o WASD / flechas." : "Mueve con WASD o las flechas."}
      </p>
    </section>
  );
}

function drawGame(
  context: CanvasRenderingContext2D,
  state: GameState,
  size: CanvasSize,
  others: OtherPlayer[],
): void {
  const { width, height, ratio } = size;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.fillStyle = "#09110f";
  context.fillRect(0, 0, width, height);

  const hudHeight = 58;
  const tileSize = Math.max(12, Math.min(28, Math.floor(Math.min(width / 22, (height - hudHeight) / 16))));
  const columns = Math.ceil(width / tileSize);
  const rows = Math.ceil((height - hudHeight) / tileSize);
  const startX = Math.max(0, state.player.x - Math.floor(columns / 2));
  const startY = Math.max(0, state.player.y - Math.floor(rows / 2));
  const cameraX = Math.min(startX, Math.max(0, state.map.width - columns));
  const cameraY = Math.min(startY, Math.max(0, state.map.height - rows));

  context.fillStyle = "#111e1b";
  context.fillRect(0, 0, width, hudHeight);
  context.font = "14px monospace";
  context.fillStyle = "#e8f4dd";
  context.fillText(`LV ${state.player.level}   XP ${state.player.xp}   HP ${state.player.hp}/${state.player.maxHp}   PISO ${state.floor}`, 14, 21);
  context.fillStyle = "#26372f";
  context.fillRect(14, 32, Math.min(180, width * 0.36), 10);
  context.fillStyle = state.player.hp > state.player.maxHp * 0.3 ? "#7bd88f" : "#ff6262";
  context.fillRect(
    14,
    32,
    Math.min(180, width * 0.36) * Math.max(0, state.player.hp / state.player.maxHp),
    10,
  );
  context.fillStyle = "#a5b8ad";
  context.font = "12px monospace";
  context.fillText(`ENEMIGOS ${state.enemiesKilled}`, Math.min(width - 130, 210), 40);

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const mapX = cameraX + column;
      const mapY = cameraY + row;
      if (mapY >= state.map.height || mapX >= state.map.width) continue;
      const floor = state.map.tiles[mapY][mapX] === 1;
      context.fillStyle = floor ? "#263c34" : "#101a17";
      context.fillRect(column * tileSize, hudHeight + row * tileSize, tileSize - 1, tileSize - 1);
    }
  }

  drawMarker(context, state.map.exit, cameraX, cameraY, tileSize, hudHeight, "#e7bb5e", "◆");
  for (const enemy of state.enemies) {
    drawMarker(context, enemy, cameraX, cameraY, tileSize, hudHeight, "#ef665d", "●");
  }
  for (const other of others) {
    if (other.floor === state.floor) {
      drawOtherPlayer(context, other, cameraX, cameraY, tileSize, hudHeight);
    }
  }
  drawMarker(context, state.player, cameraX, cameraY, tileSize, hudHeight, "#8de4bd", "●");
}

function drawOtherPlayer(
  context: CanvasRenderingContext2D,
  player: OtherPlayer,
  cameraX: number,
  cameraY: number,
  tileSize: number,
  hudHeight: number,
): void {
  const x = (player.x - cameraX) * tileSize;
  const y = hudHeight + (player.y - cameraY) * tileSize;

  context.fillStyle = "#f2a65a";
  context.font = "10px monospace";
  context.textAlign = "center";
  context.textBaseline = "bottom";
  context.fillText(player.nickname, x + tileSize / 2, y + tileSize * 0.48);
  const markerSize = Math.max(7, tileSize * 0.48);
  context.fillRect(
    x + (tileSize - markerSize) / 2,
    y + tileSize * 0.52,
    markerSize,
    markerSize,
  );
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
}

function drawMarker(
  context: CanvasRenderingContext2D,
  point: { x: number; y: number },
  cameraX: number,
  cameraY: number,
  tileSize: number,
  hudHeight: number,
  color: string,
  marker: string,
): void {
  const x = (point.x - cameraX) * tileSize;
  const y = hudHeight + (point.y - cameraY) * tileSize;
  context.fillStyle = color;
  context.font = `${Math.max(12, tileSize - 3)}px monospace`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(marker, x + tileSize / 2, y + tileSize / 2);
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
}

function makeSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff);
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

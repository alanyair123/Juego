import { auth } from "@/auth";
import GameCanvas from "@/components/GameCanvas";
import Link from "next/link";
import { connection } from "next/server";
import styles from "./page.module.css";

export const instant = false;

export default async function PlayPage() {
  await connection();
  const session = await auth();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.backLink}>
          ← RogueWeb
        </Link>
        <div>
          <p className={styles.eyebrow}>DÍA 2 · MODO SOLITARIO</p>
          <h1>Echoes of the Grid</h1>
        </div>
        <span className={styles.sessionLabel}>{session ? "Partidas guardadas" : "Modo invitado"}</span>
      </header>
      <GameCanvas loggedIn={Boolean(session)} />
    </main>
  );
}

import { auth, signOut } from "@/auth";
import Link from "next/link";
import { connection } from "next/server";
import styles from "./page.module.css";

export const instant = false;

export default async function Home() {
  await connection();
  const session = await auth();

  return (
    <main className={styles.page}>
      <nav className={styles.nav}>
        <Link className={styles.wordmark} href="/">
          R<span>W</span>
        </Link>
        <div className={styles.navLinks}>
          <Link href="/telemetry">Telemetría</Link>
          {session ? (
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button className={styles.loginLink} type="submit">
                Cerrar sesión
              </button>
            </form>
          ) : (
            <Link className={styles.loginLink} href="/login">
              Iniciar sesión
            </Link>
          )}
        </div>
      </nav>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>UN ROGUELIKE DE EXPLORACIÓN POR TURNOS</p>
        <h1>
          RogueWeb:
          <br />
          <span>Echoes of the Grid</span>
        </h1>
        <p className={styles.description}>
          Explora ruinas generadas por semilla, lucha contra los ecos y alcanza el
          siguiente piso. Cada movimiento cuenta.
        </p>
        {session && (
          <p className={styles.welcome}>
            Hola, {session.user.name ?? session.user.email}. Tus partidas se guardarán.
          </p>
        )}
        <div className={styles.actions}>
          <Link className={styles.primaryButton} href="/play">
            Jugar en solitario
          </Link>
          <Link className={styles.secondaryButton} href="/lobby">
            Multijugador
          </Link>
        </div>
        <div className={styles.gridDecoration} aria-hidden="true">
          <span>▦</span>
          <span>◇</span>
          <span>·</span>
          <span>·</span>
          <span>▦</span>
          <span>·</span>
          <span>·</span>
          <span>·</span>
          <span>◇</span>
        </div>
      </section>
      <footer className={styles.footer}>
        <span>GENERACIÓN PROCEDURAL · COMBATE TÁCTICO · PERMADEATH</span>
        <span>{session ? "Sesión activa" : "Las partidas se pueden guardar al iniciar sesión"}</span>
      </footer>
    </main>
  );
}

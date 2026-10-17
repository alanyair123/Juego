import { auth, signIn, signOut } from "@/auth";
import Link from "next/link";
import { connection } from "next/server";
import styles from "./page.module.css";

export const instant = false;

export default async function LoginPage() {
  await connection();
  const session = await auth();

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <Link href="/" className={styles.backLink}>
          ← RogueWeb
        </Link>
        <p className={styles.eyebrow}>ECHOES OF THE GRID</p>
        <h1>{session ? "Sesión iniciada" : "Inicia sesión"}</h1>
        {session ? (
          <>
            <p className={styles.description}>
              Conectado como {session.user.name ?? session.user.email}.
            </p>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button className={styles.secondaryButton} type="submit">
                Cerrar sesión
              </button>
            </form>
          </>
        ) : (
          <>
            <p className={styles.description}>Guarda tus partidas con tu cuenta.</p>
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/" });
              }}
            >
              <button className={styles.googleButton} type="submit">
                Continuar con Google
              </button>
            </form>
            <form
              action={async () => {
                "use server";
                await signIn("github", { redirectTo: "/" });
              }}
            >
              <button className={styles.githubButton} type="submit">
                Continuar con GitHub
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}

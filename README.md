# RogueWeb: Echoes of the Grid

# RogueWeb: Echoes of the Grid

Roguelike de exploración por turnos con generación determinista, Canvas,
telemetría PostgreSQL y acceso OAuth con Google o GitHub.

## Desarrollo y comprobaciones

```bash
npm ci
npm run dev
npm run lint
npm test
npm run build
```

Estos comandos no necesitan variables de entorno ni se conectan a la base de
datos. El motor puro y determinista está en `src/game/`; sus pruebas Vitest están
en `src/game/__tests__/`.

## Pruebas E2E

Instala Chromium una vez y ejecuta:

```bash
npx playwright install chromium
npm run e2e
```

Playwright inicia el servidor de Socket.IO y la app Next.js. Sin `DATABASE_URL`
se omite el caso autenticado que consulta telemetría; CI inicia y prepara
PostgreSQL para ejecutar también ese caso.

## Probar el modo multijugador local

Abre dos terminales en la carpeta del proyecto:

```bash
npm run server:dev
```

```bash
npm run dev
```

Visita `http://localhost:3000/lobby` en dos pestañas, usa un apodo distinto en
cada una, crea una sala, únete desde la otra pestaña y marca a ambos jugadores
como listos. Las partidas usan la misma semilla y el servidor autoriza los
movimientos. `NEXT_PUBLIC_SOCKET_URL` permite cambiar la URL del servidor
(por defecto `http://localhost:4000`); `CORS_ORIGIN` acepta varios orígenes
separados por comas. Sin `DATABASE_URL`, las partidas siguen funcionando y no
se guardan al morir.

## Configurar la base de datos y OAuth

1. Copia `.env.example` a `.env.local`.
2. Pon la URL de conexión PostgreSQL de Supabase en `DATABASE_URL`.
3. Crea aplicaciones OAuth para Google y GitHub. En ambas registra como callback
   `http://localhost:3000/api/auth/callback/google` o
   `http://localhost:3000/api/auth/callback/github`, respectivamente.
4. Copia los client ID y secret a `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`,
   `AUTH_GITHUB_ID` y `AUTH_GITHUB_SECRET`.
5. Genera un secreto con
   `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
   y copia el resultado en `AUTH_SECRET`.
6. Ejecuta `npm run db:migrate` y luego `npm run db:seed`.
7. Ejecuta `npm run dev`, visita `http://localhost:3000` y elige **Iniciar
   sesión**. Telemetría y guardado de partidas requieren sesión iniciada.

Los scripts de base de datos cargan `.env.local` al ejecutarse. El pool
PostgreSQL se crea de forma perezosa; el build y las pruebas unitarias no
conectan a la base de datos.

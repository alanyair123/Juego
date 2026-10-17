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

Los scripts de base de datos cargan `.env.local` al ejecutarse. El resto de la
aplicación crea el pool PostgreSQL de forma perezosa y no conecta durante el
build, las pruebas ni al importar los módulos.

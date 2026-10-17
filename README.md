# RogueWeb: Echoes of the Grid

Next.js, TypeScript, and pure deterministic game logic for the RogueWeb university
game jam. The initial project foundation includes seeded map generation, combat
and experience calculations, and Zod schemas.

## Development

```bash
npm ci
npm run dev
```

## Day 1 checks

```bash
npm run lint
npm test
npm run build
```

The map generator and game rules live in `src/game/`; their Vitest tests are in
`src/game/__tests__/`. GitHub Actions runs the same checks on every push and
pull request.

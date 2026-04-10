# Lapin

Lapin is a web-first match-3 scaffold built with Vite + TypeScript and plain DOM modules.

## Why this stack

- `Vite`: fast local development, simple build output, easy to wrap later with Capacitor for Android/APK work.
- `TypeScript`: keeps the board logic and screen flow readable as the project grows.
- No UI framework yet: fewer moving parts, cleaner starter code, and easier to reshape once the real content and art direction are ready.

## Commands

```bash
npm install
npm run dev
```

To create a production build:

```bash
npm run build
```

## Folder structure

```text
public/
  assets/
    characters/    future Lapin character art
    pieces/        optional public fallback images if you want URL-based assets later
    story/         future story visuals
src/
  assets/          puzzle piece asset imports and runtime manifest
  components/      shared UI pieces
  content/         text content such as intro lines and mission copy
  game/            match-3 board logic
  screens/         start, intro, message, and game screens
  state/           lightweight app state definitions
  storage/         localStorage persistence
```

## Where to edit things later

- Intro story lines: `src/content/story.ts`
- Pre-game mission text: `src/content/story.ts`
- Match-3 logic: `src/game/board.ts`
- Puzzle piece asset mapping: `src/assets/pieces.ts`
- Real puzzle piece image files now used by the game: `src/assets/pieces/`

## Notes for later APK support

This project is intentionally a standard Vite web app. That keeps the web version simple now and makes it straightforward to add a wrapper like Capacitor later without rewriting the game structure.

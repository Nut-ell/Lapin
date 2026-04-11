# Lapin

A browser-based match-3 puzzle game featuring Lapin, a rabbit born from marshmallow who needs your help collecting stars to return to Marshmallow Planet.

Match gems on a 6×6 board, chain combos, and clear each stage alongside Lapin's story.


<img width="782" height="778" alt="image" src="https://github.com/user-attachments/assets/6f52cef6-321f-4412-8b41-a6b53d8a5fa0" />


## Play

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Build

```bash
npm run build
# open dist/index.html directly, or serve the dist/ folder
```

## Stack

- **Vite + TypeScript** — no UI framework, plain DOM modules
- Designed as a standard web app so it can be wrapped with Capacitor for Android later without rewriting

## Folder structure

```text
src/
  assets/      gem pieces (SVG) and character images
  components/  shared UI elements
  content/     story lines and mission text
  game/        match-3 board logic
  screens/     game screens (intro, pre-game, board)
  storage/     localStorage save data
```

## Customization

| What | Where |
|------|-------|
| Story / intro lines | `src/content/story.ts` |
| Board size, match rules | `src/game/constants.ts` |
| Gem assets | `src/assets/pieces/` |

Lapin is a cozy match-3 puzzle game with a soft and dreamy atmosphere.  
Join Lapin, a bunny born from marshmallows, and collect stars as you progress through the stages.

## What kind of game is it?
- A match-3 puzzle game played on a 6×6 board
- Swap pieces to line up 3 or more of the same color and clear them
- Chains and combos feel satisfying
- Cute visuals with a light story element (more planned in the future)


## Screenshots
<img width="782" height="778" alt="image" src="https://github.com/user-attachments/assets/6f52cef6-321f-4412-8b41-a6b53d8a5fa0" />


## How to play
Simply swap adjacent pieces to match 3 or more of the same color.  
When combos chain together, clearing them all at once feels especially satisfying.


## Run locally
```bash
npm install
npm run dev

Open http://localhost:5173 in your browser.


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

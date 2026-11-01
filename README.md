# 3D Multiplayer Shooter

A 3D multiplayer first-person shooter built with **Three.js** (client) and **Socket.io** (server).

## Tech Stack
- **Client:** Three.js, Vite, cannon-es (physics)
- **Server:** Express + Socket.io
- **Multiplayer:** Real-time via WebSockets (up to 16 players)

## Local Development

### 1. Install dependencies
```bash
npm install
```

### 2. Run the game server
```bash
npm run dev
```
Starts the Socket.io game server on `http://localhost:3000`.

### 3. Run the client
```bash
npm run client
```
Starts the Vite dev server (usually `http://localhost:3001`).

Open the client URL in your browser and click **Join Game**.

## Production Build
```bash
npm run build
```
Builds the static client into `dist/`. The game server (`npm start`) serves from `dist/`.

## Deploy to GitHub Pages

A GitHub Actions workflow (`.github/workflows/deploy-pages.yml`) automatically builds and deploys the client to GitHub Pages on every push to `master`.

After enabling **Pages** in the repository settings, the game will be live at:
```
https://<username>.github.io/3d-multiplayer-shooter/
```

### Important: Game Server

GitHub Pages is static-only — the Socket.io game server cannot run on Pages. To play multiplayer online you must host the server somewhere else (e.g., Render, Railway, Fly.io, or a VPS) and connect the Pages client to it.

Pass the server URL when loading the game:
```
https://<username>.github.io/3d-multiplayer-shooter/?server=https://your-server.example.com
```

## Game Controls
- **WASD** — Move
- **Mouse** — Aim
- **Left Click** — Shoot
- **R** — Reload
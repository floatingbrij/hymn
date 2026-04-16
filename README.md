<div align="center">

<br/>

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="80" height="80">
  <rect width="100" height="100" rx="20" fill="#161210"/>
  <path d="M32 22 L32 62" stroke="#c08b5f" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M68 22 L68 62" stroke="#c08b5f" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M32 22 Q50 5, 68 22" stroke="#c08b5f" stroke-width="3.5" stroke-linecap="round" fill="none"/>
  <path d="M50 40 L50 80" stroke="#c08b5f" stroke-width="4" stroke-linecap="round"/>
  <circle cx="50" cy="80" r="8" stroke="#c08b5f" stroke-width="3.2" fill="none"/>
</svg>

# hymn

**a warm, intimate music streaming app — like walking into a Japanese record store**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)](https://react.dev)
[![Express](https://img.shields.io/badge/Express-5-000?logo=express&logoColor=white)](https://expressjs.com)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?logo=socketdotio&logoColor=white)](https://socket.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-c08b5f.svg)](LICENSE)

[Features](#features) · [Screenshots](#screenshots) · [Getting Started](#getting-started) · [Tech Stack](#tech-stack) · [Deployment](#deployment)

</div>

---

## Features

- **Stream anything** — Search and play music from YouTube with no API key required
- **Jam sessions** — Real-time listening together with friends via shareable codes and QR
- **Google Sign-In** — One-click auth via Firebase, plus traditional email/password
- **Library** — Save playlists, like tracks, and build your collection
- **Queue management** — Drag-and-drop reordering, shuffle, repeat modes
- **Keyboard shortcuts** — Space to play/pause, Shift+Arrow for navigation
- **Mobile-first** — Fully responsive with bottom nav, touch targets, and compact player
- **Beautiful UI** — Warm dark palette, Framer Motion animations, Japanese record store aesthetic

## Screenshots

> *Coming soon — run locally to experience the full UI*

## Getting Started

### Prerequisites

- **Node.js** 20+
- **pnpm** 9+ (`npm i -g pnpm`)
- **yt-dlp** — [install guide](https://github.com/yt-dlp/yt-dlp#installation)
- **ffmpeg** — [install guide](https://ffmpeg.org/download.html)

### Install & Run

```bash
# Clone
git clone https://github.com/floatingbrij/hymn.git
cd hymn

# Install dependencies
pnpm install

# Start dev servers (client + server)
pnpm dev
```

**Client** runs on `http://localhost:5173`, **Server** on `http://localhost:3001`.

### Production Build

```bash
# Build client
pnpm build

# Start production server (serves client + API)
pnpm start
# → http://localhost:3001
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `JWT_SECRET` | `hymn-secret-...` | JWT signing secret (change in production) |

## Tech Stack

### Client

| Tech | Purpose |
|------|---------|
| [React 19](https://react.dev) | UI framework |
| [Vite 6](https://vite.dev) | Build tool & dev server |
| [TypeScript 5.7](https://typescriptlang.org) | Type safety |
| [Tailwind CSS 3](https://tailwindcss.com) | Utility-first styling |
| [Zustand 5](https://zustand.docs.pmnd.rs) | State management |
| [Framer Motion](https://motion.dev) | Animations & transitions |
| [Howler.js](https://howlerjs.com) | Audio playback engine |
| [Socket.IO Client](https://socket.io) | Real-time jam sessions |
| [Firebase Auth](https://firebase.google.com/docs/auth) | Google Sign-In |
| [React Router 7](https://reactrouter.com) | Client-side routing |
| [@dnd-kit](https://dndkit.com) | Drag & drop queue reordering |

### Server

| Tech | Purpose |
|------|---------|
| [Express 5](https://expressjs.com) | HTTP framework |
| [Socket.IO 4](https://socket.io) | WebSocket server for jams |
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | SQLite database |
| [youtube-sr](https://github.com/DevAndromeda/youtube-sr) | YouTube search |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | Audio stream extraction |
| [bcrypt](https://github.com/kelektiv/node.bcrypt.js) | Password hashing |
| [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) | JWT auth tokens |

### Architecture

```
hymn/
├── client/                 # React SPA
│   ├── src/
│   │   ├── components/     # UI components
│   │   │   ├── auth/       # Login/register with Google
│   │   │   ├── jam/        # Real-time jam sessions
│   │   │   ├── layout/     # Sidebar, mobile nav, main layout
│   │   │   ├── player/     # Player bar, now playing
│   │   │   ├── queue/      # Queue panel with drag & drop
│   │   │   └── search/     # Track cards, search results
│   │   ├── pages/          # Home, Search, Library, Jam
│   │   ├── services/       # API client, audio engine, Firebase, socket
│   │   └── stores/         # Zustand stores (auth, player, queue, jam)
│   └── public/             # Static assets
├── server/
│   ├── src/
│   │   ├── db/             # SQLite schema & connection
│   │   ├── middleware/     # JWT auth middleware
│   │   ├── routes/         # API routes (auth, search, stream, playlists)
│   │   ├── services/       # YouTube search & stream services
│   │   └── socket/         # Jam session handler & sync engine
│   └── data/               # SQLite database file (gitignored)
├── Dockerfile              # Production Docker build
└── pnpm-workspace.yaml     # pnpm monorepo config
```

## Deployment

### Docker

```bash
docker build -t hymn .
docker run -p 3001:3001 hymn
```

### Railway / Render

1. Push to GitHub
2. Connect repo on [Railway](https://railway.app) or [Render](https://render.com)
3. Auto-detects Dockerfile and deploys
4. Add custom domain (e.g. `hum.yourdomain.com`)

## Jam Sessions

Jam is hymn's real-time listening-together feature:

1. **Create a jam** — Get a 6-character code + QR to share
2. **Friends join** — Enter code or scan QR, pick a nickname
3. **Synced playback** — Play, pause, seek, skip — all in sync
4. **Shared queue** — Everyone can add tracks
5. **Auto-reconnect** — Dropped connections rejoin automatically

Built on Socket.IO with server-authoritative state, 5-second drift correction, and jam-aware track advancement.

## License

[MIT](LICENSE)

---

<div align="center">
  <sub>Built with late nights and good music</sub>
</div>

# World War Rogue

Tactical modern-warfare strategy game. Multi-server deployment, 100-member
military alliances with an Admiral / Colonel / Lieutenant command hierarchy,
survival base-building, and ballistic combat.

**Live site:** [worldwarrogue.com](https://worldwarrogue.com) *(deployment in progress)*

## Stack

| | |
| :--- | :--- |
| UI | React 19 + TypeScript 5.8 |
| Build | Vite 6 |
| Styling | Tailwind CSS v4 (via `@tailwindcss/vite`) |
| Icons / motion | `lucide-react`, `motion` |
| Hosting | Cloudflare Pages |

## Running locally

**Prerequisites:** Node.js 20 or newer.

```bash
npm install
npm run dev      # http://localhost:3000
```

Other scripts:

```bash
npm run build    # production build into dist/
npm run preview  # serve the production build locally
npm run lint     # TypeScript check, no emit
```

## Project layout

```
src/
  App.tsx            root state machine and view routing
  types.ts           shared domain types
  components/        views and modals (combat, squad, alliance, base, comms, HUD)
  data/              static datasets (units, pilots, alliances, leaderboard, servers)
  utils/             combat renderer, after-action reports, audio, anti-cheat
docs/                game design documentation (lore, ballistics, economy, roadmap)
public/              PWA manifest, service worker, icon
```

## Current state

The application is a **complete single-player client**. Alliances, leaderboards,
comms and server browsing render from static datasets in `src/data/` — there is
no backend or persistent storage yet beyond one `localStorage` key used by the
developer-ops panel. Networked multiplayer is designed in `docs/` but not built.

## Documentation

Design documents live in [`docs/`](./docs) and are also readable in-game through
the **Intel Dossier** panel in the tactical HUD.

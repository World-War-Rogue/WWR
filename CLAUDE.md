# Notes for working on this repo

## TypeScript

This project uses the automatic JSX runtime (`"jsx": "react-jsx"`). `React` is
**not** in scope as a namespace, so `React.FormEvent`, `React.ReactNode` and
`React.RefObject` do not resolve. Import the type by name instead:

```ts
import {type FormEvent, type ReactNode, type RefObject} from 'react';
```

The client and the Worker are checked as separate projects: `npm run lint` runs
`tsc` over `src/` and then over `worker/`. The Worker is checked under `strict`;
the client is not yet.

## Deploying

`npx wrangler deploy` publishes in seconds and skips Cloudflare's build queue,
which has sat for 15 minutes at times. Pushing to `main` still triggers a
Cloudflare build; both end up at the same Worker.

Database migrations are applied with `npm run db:migrate`
(`wrangler d1 migrations apply wwr-db --remote`).

## Architecture

- The server is authoritative. Anything the browser can compute, a player can
  edit, so every number that matters is decided in `worker/`.
- Timers are stored as absolute completion instants, never as remaining
  durations, and state is settled on read. Nothing ticks in the background.
- Plot occupancy is enforced by a unique index, not by read-then-write: two
  players moving onto the same square in the same instant must be separated by
  the database, not by a check.

# Perspectra — Frontend

The web client for [Perspectra](../../README.md), a multi-agent research-ideation system. Built with
**Vite + React + TypeScript**, with Tailwind CSS + shadcn/ui for the interface, Zustand for state,
`@xyflow/react` for the discussion mind map, and Supabase for auth.

It talks to the [Perspectra backend](../../backend/README.md) over `/api/v1`.

## Routes

- **`/forum`** (default) — Perspectra: threaded, mind-map view of expert-persona deliberation.
- **`/chat`** — the baseline linear group-chat condition from the user study.

## Prerequisites

- Node.js 18+ and npm
- A running [backend](../../backend/README.md)
- A Supabase project (URL + **anon/public** key)

## Setup

```bash
npm install
cp .env.example .env     # then fill in your values
```

### Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_PROXY_TARGET` | yes | backend base URL (e.g. `http://127.0.0.1:8321`) |
| `VITE_APP_SUPABASE_URL` | yes | Supabase project URL |
| `VITE_APP_SUPABASE_KEY` | yes | Supabase **anon/public** key — never the service key |
| `VITE_PUBLIC_POSTHOG_KEY` / `VITE_PUBLIC_POSTHOG_HOST` | no | optional PostHog analytics |

> 🔐 Use the Supabase **anon/public** key only. A `service_role` key must never appear in any
> `VITE_*` variable — it would be shipped to the browser and grants full admin access.

## Scripts

```bash
npm run dev       # start the dev server on http://localhost:3000
npm run build     # type-check and build a production bundle into dist/
npm run preview   # preview the production build locally
npm run lint      # run ESLint
```

In development the Vite server proxies `/api/v1` and `/health` to `VITE_PROXY_TARGET`
(see `vite.config.ts`), so the frontend and backend share an origin.

## Project layout

```
src/
├── main.tsx                 # entry point + routing
├── App.tsx                  # forum vs. chat mode
├── components/
│   ├── forum/               # Perspectra forum UI (threads, mind map, personas)
│   ├── baselineGroupChat/   # baseline group-chat condition
│   ├── chatPanel/, personaPanel/, paperSearchPanel/, dashboard/
│   └── ui/                  # shadcn/ui components
├── stores/                  # Zustand stores + Supabase client
├── controller/API/          # axios API client
├── hooks/
└── utils/                   # incl. userStudyLogger.ts
```

## Production

The Dockerfile builds the static bundle and serves it with nginx; `env.sh` substitutes
`MY_APP_*` placeholders into the built assets at container start (see `nginx.conf`,
`start-nginx.sh`, `.env.production`).

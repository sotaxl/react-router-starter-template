# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A full-stack React Router 7 app deployed on Cloudflare Workers with SSR enabled. Uses the Cloudflare Vite plugin for local dev and bundling.

## Commands

```bash
npm run dev        # Dev server with HMR at http://localhost:5173
npm run build      # Production build (react-router build)
npm run preview    # Build + local preview
npm run deploy     # Deploy to Cloudflare Workers (wrangler deploy)
npm run typecheck  # Generate Cloudflare binding types + tsc
npm run check      # tsc + build + wrangler dry-run (full pre-deploy check)
```

For staged Cloudflare deploys:
```bash
npx wrangler versions upload   # Upload as preview version
npx wrangler versions deploy   # Promote to production
```

## Architecture

- **`app/routes.ts`** — Route config; currently only `index("routes/home.tsx")`
- **`app/root.tsx`** — App shell (HTML, global CSS, error boundary)
- **`workers/app.ts`** — Cloudflare Worker entrypoint; wraps React Router's request handler and exposes `cloudflare.env` / `cloudflare.ctx` via `AppLoadContext`
- **`react-router.config.ts`** — SSR enabled, `unstable_viteEnvironmentApi` on
- **`wrangler.json`** — Cloudflare Worker configuration and bindings
- **`worker-configuration.d.ts`** — Auto-generated types for `Env` (Cloudflare bindings); regenerate with `npm run cf-typegen`

## Cloudflare Bindings

Access Cloudflare env bindings inside loaders/actions via `context.cloudflare.env`. After adding bindings to `wrangler.json`, run `npm run cf-typegen` to regenerate `worker-configuration.d.ts` and keep `Env` in sync.

## Styling

Tailwind CSS v4 via `@tailwindcss/vite` plugin — no `tailwind.config.js` needed; configuration lives in CSS.

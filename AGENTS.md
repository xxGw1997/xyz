# AGENTS.md

This file provides guidance for AI coding agents working in this repository.

## Project Overview

A full-stack Cloudflare Workers application with a React frontend (Vite + TanStack Router) and a Hono backend. Features include real-time chat via Durable Objects/WebSockets, magic-link auth (better-auth), and a drawing canvas (Excalidraw).

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite 7, TanStack Router, TanStack Query, Tailwind CSS 4, shadcn/ui (new-york style), Zustand
- **Backend:** Cloudflare Workers, Hono, Durable Objects (ChatRoom, Veet), D1 (SQLite via Drizzle ORM)
- **Auth:** better-auth with magic link + Drizzle adapter
- **Validation:** Zod (v4) with `@hono/zod-validator`
- **Package Manager:** pnpm

## Commands

```bash
# Development
pnpm dev              # Start Vite dev server with Cloudflare bindings
pnpm build            # Production build (vite build)
pnpm preview          # Build then preview locally

# Quality
pnpm check-type       # TypeScript type checking (tsc -b, project references)
pnpm lint             # ESLint (flat config, typescript-eslint + react-hooks + react-refresh)

# Deployment
pnpm deploy           # Build + wrangler deploy to Cloudflare
pnpm cf-typegen       # Regenerate worker-configuration.d.ts via wrangler types

# Database
pnpm db:ml            # Migrate local D1 database
pnpm db:sl            # Open local database studio
pnpm db:m             # Migrate remote D1 database
pnpm db:s             # Open drizzle-kit studio (remote)
```

No test framework is configured. There are no existing test files.

## Code Style Guidelines

### TypeScript

- **Strict mode** enabled across all tsconfig files.
- `verbatimModuleSyntax: true` — always use `import type { ... }` for type-only imports.
- `erasableSyntaxOnly: true` — no enums; use `as const` objects or string union types instead.
- `noUnusedLocals: true` and `noUnusedParameters: true` — remove dead code.
- Target `ES2022` with `moduleResolution: "bundler"`.

### Imports

- Use double quotes for all import paths: `import { Hono } from "hono"`
- Path alias `@/*` maps to `src/*` (configured in tsconfig + vite.config.ts). Use it for frontend code: `import { cn } from "@/lib/utils"`
- Worker code uses relative imports: `import { auth } from "../lib/auth"`
- Type-only imports must use `import type`: `import type { AuthVar } from "../types"`
- Named exports preferred over default exports for most modules (components, routes, utilities). Default exports used for Hono app, worker entry, drizzle config.

### React / Components

- shadcn/ui components live in `src/components/ui/`. Do not modify them manually; use `npx shadcn@latest add <component>` to add new ones.
- Use `cn()` from `@/lib/utils` for conditional Tailwind class merging (clsx + tailwind-merge).
- Functional components with explicit return types are preferred.
- TanStack Router uses file-based routing in `src/routes/`. Route files export a `Route` via `createFileRoute()`.

### Worker / Backend

- Hono app entry: `worker/index.ts`. Routes in `worker/routes/`, middlewares in `worker/middlewares/`.
- Durable Objects in `worker/durable-objects/` extend `DurableObject` from `cloudflare:workers`.
- Use `createMiddleware` from `hono/factory` for custom middleware.
- Validation via `zValidator` from `@hono/zod-validator`.
- Throw `HTTPException` from `hono/http-exception` for error responses.
- Access Cloudflare bindings through `c.env` (typed as `Env` globally via `worker-configuration.d.ts`).
- Database is created per-request via `createDb()` from `worker/lib/db`.

### Naming Conventions

- **Files:** kebab-case (`chat-room.ts`, `auth.middleware.ts`, `use-common-status.ts`). Exception: `ProfileCard.tsx`, `LightRays.tsx` for visual components.
- **Components:** PascalCase (`ChatRoom`, `ThemeSwitcher`)
- **Functions/variables:** camelCase
- **Types/interfaces:** PascalCase (`AuthVar`, `MessageMeta`)
- **Database tables:** snake_case column names, camelCase variable names (`roomMember`, `createdBy`)
- **Constants:** UPPER_SNAKE_CASE for true constants

### Styling

- Tailwind CSS 4 with CSS variables for theming (zinc base color).
- `tw-animate-css` for animations.
- Dark mode via `ThemeProvider` with localStorage persistence.
- Components use `data-slot` attributes for shadcn/ui identification.

### Error Handling

- API errors: return `c.json({ error: "message" }, statusCode)` or throw `HTTPException`.
- Database operations wrapped in try/catch with `console.error` for debugging.
- WebSocket errors handled via `webSocketError` and `webSocketClose` lifecycle methods.

### Environment Variables

- Secrets configured in Cloudflare dashboard, accessed via `c.env` in workers.
- Client-side env vars prefixed with `VITE_` (e.g., `VITE_BASE_URL`).
- `.env` and `.env.development` present locally (gitignored).

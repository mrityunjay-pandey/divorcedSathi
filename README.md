# DivorcedSathi.com

A privacy-focused matrimonial platform for remarriage after divorce.

> **Status:** Architecture phase complete. No feature modules have been implemented yet.
> See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Workflow

This project is built **module by module**, per the process defined in `docs/ROADMAP.md` §"How We Work".
Nothing beyond scaffolding and documentation is implemented until a module is explicitly requested
(e.g. "Build Module 1").

## Monorepo layout

```
apps/
  web/      Next.js public + authenticated user-facing app
  admin/    Next.js admin/moderation dashboard (separate app, shared auth)
  api/      NestJS backend API
packages/
  db/       Prisma schema + migrations (shared by api and admin)
  shared/   Shared TypeScript types, validation schemas, constants
docs/       Architecture, roadmap, ADRs
```

## Getting started (once modules exist)

```bash
corepack enable
pnpm install
cp .env.example .env
pnpm --filter @divorcedsathi/db prisma migrate dev
pnpm dev
```

Nothing runs yet — there is no application code, only structure and docs.

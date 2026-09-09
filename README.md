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

## Deploying

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for a step-by-step guide to deploying
the web app to Vercel and the API + Postgres to Render, including the
one-time Prisma migration step this repo still needs (see that file for why).

## Getting started

```bash
npm install --include-workspace-root
cp .env.example .env         # then fill in DATABASE_URL, AUTH_JWT_SECRET, etc.
npm run generate --workspace=@divorcedsathi/db
npm run migrate:dev --workspace=@divorcedsathi/db
npm run dev --workspace=@divorcedsathi/api   # NestJS API on :4000
npm run dev --workspace=@divorcedsathi/web   # Next.js app on :3000
```

Run tests / typecheck for a given workspace with `--workspace=@divorcedsathi/<name>`,
e.g. `npm test --workspace=@divorcedsathi/api`.

> **Sandboxed dev-tool note:** `prisma generate` and `prisma migrate` download engine
> binaries from `binaries.prisma.sh`. If you're running this inside a network-restricted
> sandbox (as this repo was originally scaffolded in), that domain may not be reachable —
> run those two commands from an environment with normal internet access first.

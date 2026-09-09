# Deploying DivorcedSathi.com

This repo is a monorepo (`apps/web` = Next.js, `apps/api` = NestJS,
`packages/db` = Prisma). Deploying it means two separate hosts talking to
each other over HTTPS: **Vercel** for the frontend, **Render** for the API
and its Postgres database.

## Before you start

This repo has never had `prisma generate` or a real migration run against
it — the sandbox it was built in has no network access to
`binaries.prisma.sh`. That's fine for Render (its build machines have
normal internet access), but it does mean:

- There's no `packages/db/prisma/migrations/` folder yet.
- `render.yaml` uses `prisma db push` for the first deploy instead of
  `prisma migrate deploy`, since there's no migration history to replay.

**Recommended one-time step**, once you have a local Postgres (or the
Render database URL) to point at:

```bash
npm install --include-workspace-root
npx prisma migrate dev --name init --schema=packages/db/prisma/schema.prisma
git add packages/db/prisma/migrations
git commit -m "chore: initial Prisma migration"
git push
```

Then swap `render.yaml`'s `preDeployCommand` to
`npm run migrate:deploy --workspace=@divorcedsathi/db` for proper migration
history going forward. Not required to get a working deploy today —
`db push` will create the schema either way.

## 1. Backend — Render

1. Push this repo to GitHub.
2. In the Render dashboard: **New → Blueprint**, pick this repo. Render
   reads `render.yaml` at the repo root and proposes:
   - a free Postgres database (`divorcedsathi-db`)
   - a Docker web service (`divorcedsathi-api`), built from
     `apps/api/Dockerfile` with the repo root as build context
3. Click **Apply**. First deploy will take a few minutes (Prisma engine
   download + Nest build).
4. Once live, note the service URL, e.g. `https://divorcedsathi-api.onrender.com`.
5. Health check: `curl https://divorcedsathi-api.onrender.com/api/v1/health`
   should return `{"success":true,"data":{"status":"ok",...}}`.

Render's free Postgres plan expires after 90 days — fine for a demo, not
for anything long-lived.

## 2. Frontend — Vercel

1. In the Vercel dashboard: **Add New → Project**, import the same GitHub repo.
2. Vercel will try to build from the repo root — override this:
   **Settings → General → Root Directory → `apps/web`**.
3. **Settings → Environment Variables**, add:
   - `NEXT_PUBLIC_API_BASE_URL` = `https://divorcedsathi-api.onrender.com/api/v1`
     (your Render URL from step 1, with `/api/v1` appended — that's the
     global prefix set in `apps/api/src/main.ts`)
4. Deploy. Vercel auto-detects Next.js — no other config needed.
5. Note your Vercel URL, e.g. `https://divorcedsathi.vercel.app`.

## 3. Close the loop: CORS

Go back to Render → `divorcedsathi-api` → **Environment**, update:

- `APP_BASE_URL` = your real Vercel URL from step 2 (`render.yaml` ships
  this as a placeholder — the API's CORS allowlist in `main.ts` reads it)

Redeploy the API service for the new CORS origin to take effect.

## 4. Smoke test

1. Visit your Vercel URL → `/register` → create an account.
2. Check the Render service logs for the OTP code (the dev
   `ConsoleEmailProvider`/`ConsoleSmsProvider` from Module 2 just logs it —
   there's no real email/SMS provider connected, see
   `docs/ARCHITECTURE.md`).
3. Paste the code into `/verify-otp`, then log in.
4. You should land on `/discover`. If you see a network error instead,
   double check `NEXT_PUBLIC_API_BASE_URL` on Vercel and `APP_BASE_URL` on
   Render match each other's actual domains.

## Known gaps that don't block a demo deploy, but matter beyond one

- No real object storage — profile photos and verification documents are
  stored as plain text references (see Module 12/completion-2 commits),
  not actual files.
- No real payment gateway — `MockPaymentProvider` always "succeeds."
- No email/SMS provider — OTP codes only ever appear in server logs.
- Free-tier Render services spin down when idle and take ~30s to wake on
  the next request — expected on the free plan, not a bug.

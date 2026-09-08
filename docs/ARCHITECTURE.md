# DivorcedSathi.com — Technical Architecture

## 1. Module Hierarchy

```
Foundation
 ├─ 00 Monorepo & tooling
 ├─ 01 Design system
 ├─ 02 Authentication
 ├─ 03 Database core (User, Session, AuditLog)
 └─ 04 User profile (base)

Matrimonial Core
 ├─ 05 Profile creation wizard (About, Previous Marriage, Family, Lifestyle, Education/Career)
 ├─ 06 Partner preferences
 ├─ 07 Search & filters
 └─ 08 Discovery / matching feed

Interaction
 ├─ 09 Interests
 ├─ 10 Shortlist
 ├─ 11 Matches / Connections
 ├─ 12 Messaging
 └─ 13 Notifications

Trust & Safety
 ├─ 14 Verification (mobile/email/ID)
 ├─ 15 Privacy controls
 ├─ 16 Reporting
 ├─ 17 Blocking
 └─ 18 Moderation dashboard (admin)

Business
 ├─ 19 Subscriptions
 ├─ 20 Payments
 └─ 21 Admin analytics dashboard

Growth (post-MVP)
 ├─ 22 Recommendation engine v2
 ├─ 23 AI profile assistant / compatibility explanation
 ├─ 24 Product analytics
 └─ 25 SEO / mobile perf hardening
```

Each numbered module = one PR = one commit series, gated on the previous module's tests passing.

## 2. Technology Stack

| Layer | Choice | Notes |
|---|---|---|
| Web app | Next.js 14 (App Router), React 18, TypeScript | SSR for public/SEO pages, CSR for authenticated app |
| Admin app | Next.js 14, same design system | Separate app, same auth provider, role-gated |
| API | NestJS (TypeScript) | Modular, DI-friendly, plays well with Prisma + guards |
| DB | PostgreSQL 15+ | Managed (RDS/Cloud SQL) in prod |
| ORM | Prisma | Type-safe schema, migrations |
| Cache/queue | Redis | Rate limiting, session blacklist, BullMQ jobs (notifications, moderation) |
| Object storage | S3-compatible (S3/R2) | Signed URLs only, private-by-default buckets |
| Auth | Custom (email/mobile OTP + password) via NestJS + JWT/session hybrid; Google OAuth optional | See §6 |
| Styling | Tailwind CSS + design tokens package | Shared between web/admin |
| Monorepo | pnpm workspaces + Turborepo | Independent module builds/tests |
| Testing | Vitest/Jest (unit), Supertest (integration), Playwright (E2E) | Per §52 |
| CI | GitHub Actions | Lint, typecheck, test, build gates on every PR |

GraphQL and microservice extraction are deferred; the REST module boundaries in NestJS are drawn so either is possible later without a rewrite.

## 3. Database Architecture

Normalized schema, one concern per table (full list per your brief in §44). Key relations:

```
User 1—1 Profile 1—1 PrivacySetting
Profile 1—1 PreviousMarriage
Profile 1—* Child
Profile 1—1 PartnerPreference
Profile 1—* ProfilePhoto
Profile 1—1 Lifestyle
Profile 1—1 Education / Career
Profile 1—* Verification
User   1—* Interest (sent/received)
User   1—* Shortlist
Interest 1—1 Match (on mutual accept) → Conversation 1—* Message
User   1—* Report (reporter) / Report (reported)
User   1—* Block (blocker) / Block (blocked)
User   1—1 Subscription 1—* Payment
AdminUser 1—* AuditLog
User   1—* SavedSearch
User   1—* ProfileView (viewer/viewed)
```

Sensitive-data isolation:
- `PreviousMarriage` legal fields (case numbers, exact allegations) live in a restricted sub-table/columns never returned by default serializers — only via an explicit "owner or admin" query path.
- `Verification` documents store only object-storage keys + status, never raw file bytes, never exposed to other users.
- `PrivacySetting` is a per-field visibility map (`everyone | registered | matches | approved | nobody`) that every profile-read service consults before serialization.

## 4. API Architecture

REST, versioned under `/api/v1/*`, grouped exactly as in your §43 list. Standard shape:

```
Controller → Guard(s) [Auth, Roles, Ownership] → Pipe (validation, e.g. class-validator/zod)
           → Service (business logic) → Repository (Prisma) → Response DTO (field-level privacy filter)
```

Cross-cutting middleware: request logging, rate limiting (Redis-backed, per-IP + per-user), global exception filter producing the standardized `{ success, error: { code, message } }` shape, correlation IDs for tracing.

Authorization is never inferred from the request body's IDs — every mutating/reading endpoint re-derives the acting user from the verified session/JWT and checks ownership/role server-side (directly tested per §52's "User A/User B" case).

## 5. Frontend Architecture

- `apps/web`: route groups for `(public)` [SEO, SSR] and `(app)` [authenticated, CSR-heavy], plus a `(profile-wizard)` layout for the 10-step creation flow with shared step state.
- Component tiers: `ui/` (design-system primitives, no business logic) → `features/*` (profile, search, messaging, etc.) → `app/*` (route composition).
- Server state via React Query (or Next's built-in fetch caching) over the REST API; local wizard state via a typed reducer, persisted to the API per-step (no data loss on refresh).
- `apps/admin` reuses `packages/shared` types and the design-system package but is a fully separate deployable, so an admin bug can never affect the public app.

## 6. Authentication Architecture

- Credentials: email or mobile + password, both verified via OTP before profile creation is allowed.
- Passwords hashed with argon2id (never plaintext, never reversible).
- Session model: short-lived JWT access token + rotating refresh token stored as httpOnly, secure, SameSite=strict cookie; refresh tokens tracked server-side (Redis) so logout/"log out other devices" actually revokes them.
- OTP delivery abstracted behind an `SmsProvider`/`EmailProvider` interface (adapter pattern) so no vendor is hardcoded before one is chosen.
- Google OAuth is an additional strategy behind the same session issuance path, not a parallel identity system.

## 7. Security Architecture

Implements §37 as enforceable checklist items per module, not a one-time pass:
- Input validation at the DTO layer (reject, don't sanitize-and-guess) for every endpoint.
- Parameterized queries only (Prisma default) — no raw SQL string interpolation.
- File upload validation: MIME sniffing + size limits + re-encoding of images server-side before storage.
- CSRF: not needed for pure Bearer-token API calls; if cookie-based sessions are used for the web app, double-submit CSRF tokens are added.
- RBAC: `user`, `admin`, `moderator` roles enforced via a Guard, not client-side checks.
- Every admin action writes an `AuditLog` row (actor, action, target, timestamp, before/after where relevant).

## 8. Privacy Architecture

- Field-level visibility (`PrivacySetting`) enforced in the serialization layer, so a leak requires changing one shared function, not auditing every endpoint.
- Data-category separation for retention/export/deletion: account data, profile data, messages, verification documents, payment records, moderation records — each with its own deletion/anonymization rule (e.g., moderation/audit records may need to outlive account deletion for legal/safety reasons; this is configurable, not hardcoded).
- "Download my data" and "Delete my account" are first-class API endpoints from Module 1 onward, not bolted on later.

## 9. Admin Architecture

Separate Next.js app (`apps/admin`), same API, gated by `role=admin|moderator` guard. Sections map 1:1 to your §29–31: overview metrics, user management, moderation queues (new profiles / reports / suspicious activity / photos), verification review, audit log viewer.

## 10. Development Phases

Matches your §5 phases 1–6, re-sequenced slightly so Trust & Safety essentials (privacy, blocking, reporting) land inside the MVP rather than after it — because those are safety-critical, not "growth" features.

## 11. MVP Scope

Exactly your §47 list (Modules 1–12): landing, auth, profile creation, partner preferences, discovery/search, profile detail, interests, shortlist, basic messaging, block/report, basic admin, privacy/settings.

## 12. Post-MVP Scope

Verification tiers beyond mobile/email, subscriptions/payments, advanced admin analytics, AI profile assistant, AI-assisted compatibility explanations, scam-pattern detection, SEO/perf hardening, mobile app wrappers.

## 13. Folder Structure

```
divorcedsathi/
├─ apps/
│  ├─ web/                # public + user app (Next.js)
│  │  └─ src/{app,components,hooks,lib,services,types,styles}
│  ├─ admin/               # admin/moderation app (Next.js)
│  └─ api/                 # NestJS backend
│     └─ src/{modules,middleware,common,config}
├─ packages/
│  ├─ db/                  # Prisma schema + migrations
│  └─ shared/               # shared types, zod schemas, constants
├─ docs/                    # this architecture, roadmap, ADRs
└─ .github/workflows/       # CI
```

## 14. Dependency Diagram

```
              ┌────────────┐
              │  packages/  │
              │  shared     │◄──────────┐
              └─────┬──────┘            │
                    │ types/validation  │
        ┌───────────┼───────────┐       │
        ▼           ▼           ▼       │
   apps/web     apps/admin   apps/api ───┘
        │           │           │
        └─────┬─────┘           │
              │ REST calls      │
              └─────────────────┘
                                │
                          packages/db (Prisma)
                                │
                          PostgreSQL + Redis + S3
```

`shared` has zero dependency on the apps; `db` is only imported by `api` (and read-only by `admin` for report queries where a direct query is cheaper than an API round-trip — to be decided per case).

## 15. Development Order

1. Foundation: monorepo/tooling → design system → auth → DB core → base profile
2. Matrimonial core: profile wizard → preferences → search → discovery
3. Interaction: interests → shortlist → matches → messaging → notifications
4. Trust & safety: verification → privacy → reporting → blocking → moderation
5. Business: subscriptions → payments → admin analytics
6. Growth: recommendations v2 → AI features → SEO/perf

This mirrors your §5/§47, with the constraint that no module ships without its own tests (§52) and documentation (§54) before the next one starts.

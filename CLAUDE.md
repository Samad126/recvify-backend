# ReCvify Backend

AI-powered CV/resume builder API. NestJS 12 + Prisma 7 (`@prisma/adapter-pg`) + PostgreSQL 17, Redis for token blacklisting/rate-limit storage/password-reset tokens, Bun as package manager and runtime for scripts.

The product: users sign up, either upload an existing resume (parsed by AI into structured data), start from a template, build/edit a CV section-by-section, get AI-generated content suggestions, tailor a CV to a specific job description (match score + keyword gaps), and export to PDF/DOCX/shareable link. Design source of truth for screens/flows: `/home/samad/Downloads/stitch images/stitch_resumeforge_ai_cv_builder/` (Stitch mockups — `code.html` + `screen.png` per screen, plus a `DESIGN.md` with the design system/tokens).

## Repo layout

```
recvify-infra/
├── .env                      # secrets, gitignored (backend loads this from ../.env)
├── .env.example
├── docker-compose.yml        # postgres + redis
└── backend/
    ├── prisma/schema.prisma  # single source of truth for the data model
    ├── prisma/seed.ts        # seeds templates
    └── src/
        ├── main.ts           # bootstrap: ValidationPipe, Swagger, CORS, cookies
        ├── app.module.ts     # root module — wires every global provider
        ├── common/           # cross-cutting infra, imported by feature modules
        │   ├── database/     # DatabaseService = PrismaClient (Global module)
        │   ├── redis/        # RedisService (Global module)
        │   ├── mail/         # MailService (Brevo)
        │   ├── throttler/    # Redis-backed ThrottlerStorage
        │   ├── guards/       # JwtAccessGuard (global), JwtRefreshGuard, LocalAuthGuard
        │   ├── decorators/   # @Public(), @GetUser()
        │   ├── filters/      # HttpExceptionFilter, PrismaClientExceptionFilter (global)
        │   └── interceptors/ # TransformInterceptor (global) — wraps success responses
        └── modules/          # one folder per feature: auth, users, templates, cvs, ...
```

Each feature module follows the Nest convention: `<name>.module.ts`, `<name>.controller.ts`, `<name>.service.ts`, `dto/*.ts`. Cross-module reuse only through `common/`.

## Running locally

```bash
cd recvify-infra && docker compose up -d      # postgres + redis
cd backend
bun install
bun run db:migrate                            # prisma migrate dev
bun run db:seed                               # seed templates
bun run start:dev                             # http://localhost:3000
```

Swagger UI: `http://localhost:3000/api/docs` (raw OpenAPI JSON at `/api/docs-json`).

`bun run lint` (oxlint) and `bun run test` (vitest) before considering a change done.

**Dev server ownership**: it's fine to start `bun run start:dev` in the background to verify changes (curl endpoints, check Swagger). But once verification is done, stop it (`lsof -ti:3000 | xargs kill`) before ending the session — the user runs their own `bun run start:dev` and doesn't want a Claude-started instance left holding port 3000.

## Conventions

- **ESM everywhere**: `"type": "module"` in package.json — every relative import needs an explicit `.js` extension even though the source is `.ts` (NodeNext resolution). Follow the existing files' import style.
- **Auth**: JWT access token (15m, sent as `Authorization: Bearer`) + JWT refresh token (7d, httpOnly cookie `refreshToken`). `JwtAccessGuard` is registered globally — every route requires auth by default; opt out with `@Public()`. Get the current user's payload with `@GetUser()` / `@GetUser('sub')` (string uuid). Revoked access tokens are blacklisted in Redis by `jti` until natural expiry.
- **Response envelope**: `TransformInterceptor` wraps every non-null controller return in `{ success: true, data }`. Error responses (from `HttpExceptionFilter` / `PrismaClientExceptionFilter`) are `{ success: false, error: { code, message } }`. Don't hand-wrap responses in controllers.
- **Validation**: global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`. Every request DTO gets `class-validator` decorators — no unvalidated `Body()`/`Query()` payloads.
- **OpenAPI is mandatory, not optional**: every endpoint gets `@ApiOperation({ summary, description })` and `@ApiResponse` for each status code it can return (success + realistic error cases — 400/401/403/404/409 as applicable). Every DTO property gets `@ApiProperty()`/`@ApiPropertyOptional()` with a `description` and, where it clarifies the contract, an `example`. This is how the frontend team and any API consumer will understand the contract — treat incomplete Swagger docs as an incomplete PR.
- **Ownership checks**: resources scoped to a user (Cv, Upload, ...) must verify `resource.userId === req.user.sub` in the service layer before reading/mutating; return 404 (not 403) on mismatch to avoid confirming a resource's existence to a non-owner.
- **Prisma**: `User.id`, and every other model's `id`, are string UUIDs/CUIDs — never `number`. `DatabaseService` (in `common/database`) extends `PrismaClient`; inject it, don't instantiate `PrismaClient` directly. Prisma client is generated to `src/generated/prisma` (gitignored) — regenerate with `bun run db:generate` after schema changes.
- **Migrations**: never hand-edit generated migration SQL. Change `schema.prisma`, then `bun run db:migrate` (dev) to generate + apply. Use `bun run db:deploy` in non-dev environments.

## Scope status

Foundation (auth wiring, validation, Swagger, Redis) + core CV flow (templates, CV/section/entry CRUD, dashboard/editor persistence) is the current build target. Upload + AI parsing, AI "Improve with AI" suggestions, JD tailoring/match-scoring, and PDF/DOCX/link export are designed at the schema level but intentionally not implemented yet — each needs its own design pass (Gemini integration, async job handling, PDF rendering approach) before being built.

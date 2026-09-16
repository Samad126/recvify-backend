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
        │   ├── interceptors/ # TransformInterceptor (global) — wraps success responses
        │   └── gemini/       # GeminiService (Global module) — shared AI client wrapper
        └── modules/          # one folder per feature: auth, users, templates, cvs, uploads, ...
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

Built and verified end-to-end: auth foundation (validation, Swagger, Redis), core CV flow (templates, CV/section/entry CRUD, dashboard/editor persistence), upload + AI parsing (`POST /uploads` — PDF sent natively to Gemini as multimodal input, DOCX text-extracted via `mammoth` first; `POST /cvs/from-upload` atomically creates the CV from the reviewed result), "Improve with AI" suggestions (`POST /cvs/:cvId/ai-suggestions/generate` scoped to WHOLE_CV/SUMMARY/EXPERIENCE, `PATCH .../ai-suggestions/:id` for accept/reject/edit/undo, `POST .../ai-suggestions/apply` to atomically write ACCEPTED/EDITED text into the target entries), and JD tailoring/match-scoring (`POST /cvs/:cvId/job-descriptions/analyze` — pastes a job description, Gemini returns a 0-100 match score + matched/missing keywords + targeted rewrite suggestions stored as `JD_TAILOR` AiSuggestions; `GET /cvs/:cvId/job-descriptions` lists past analyses, `GET .../:jdId` returns one with its suggestions. Accept/reject/edit/apply reuse the existing generic `/cvs/:cvId/ai-suggestions/:id` and `/apply` endpoints — they operate on any suggestion regardless of source). `AiSuggestion.entryId`/`fieldKey`/`label`/`jobDescriptionId` were added to the schema across these two features. The rewritable-text-collection logic (`SUMMARY`/`EXPERIENCE`/`CUSTOM` entries) is shared between Improve-with-AI and JD tailoring via `common/cv/cv-targets.util.ts`. Parsing/generation/analysis are synchronous (no job queue yet) — acceptable for now, revisit if latency becomes a problem.

JD tailoring currently only accepts pasted text (`sourceType: PASTE`) — the "Job URL" and "Upload File" tabs shown in the mockup aren't implemented yet (URL fetching needs SSRF mitigation, file upload needs its own text-extraction path); both are reserved in the `JdSourceType` enum for when they're built.

Not built yet: PDF/DOCX/link export (no PDF rendering approach chosen yet), and JD tailoring's URL/file ingestion.

**Gemini cost caution**: `GEMINI_API_KEY` is a real, billed key. Don't call an endpoint that hits Gemini (`POST /uploads`, `POST /cvs/:cvId/ai-suggestions/generate`, `POST /cvs/:cvId/job-descriptions/analyze`) without the user's awareness — check with them before firing real requests during a session, even for verification.

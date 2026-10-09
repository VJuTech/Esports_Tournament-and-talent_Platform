# Esports Tournament & Talent Platform

Initial production foundation for Champion Lounge, built with Node.js, Express, EJS, Prisma, PostgreSQL, and pnpm.

## Requirements

- Node.js LTS (20 or newer)
- pnpm 9 or newer
- PostgreSQL

## Setup

```bash
pnpm install
copy .env.example .env
pnpm db:generate
pnpm db:migrate:dev
pnpm dev
```

Set a long random `SESSION_SECRET` and a PostgreSQL `DATABASE_URL` in `.env`. Secrets and environment-specific configuration are excluded from source control.

Set `APP_URL` to the public application URL and configure `EMAIL_PROVIDER_URL` and
`EMAIL_PROVIDER_SECRET` for account verification and password-reset delivery.
New accounts remain restricted until their email address has been verified.

## Architecture

HTTP routes delegate to controllers. Controllers call services and models; services contain business rules; models own controlled Prisma access; views contain presentation only. Authentication, authorization, validation, rate limiting, security headers, and error handling are middleware concerns.

The Prisma schema is in `database/schema.prisma`, and the shared Prisma connection is in `database/connect.js`. Database operational scripts and migration history are kept under `database/`. Use Prisma migrations rather than editing production schema manually.

## Testing

```bash
pnpm test
```

Tests use an independent test database URL and never depend on production data.

# WebSpamming

WebSpamming is a web application for managing mailing lists and sending bulk email campaigns.

## What the project does

- User login with roles (`user` and `admin`)
- Create mailing lists and manage recipients
- Send email campaigns (plain text and optional HTML)
- Admin panel for SMTP settings and user management
- PostgreSQL-based storage and send logs

## Tech stack

- Backend: FastAPI + SQLAlchemy + PostgreSQL
- Frontend: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Infrastructure: Docker Compose (recommended and default run mode)

## Quick start (Docker Desktop)

1. Clone repository and open project root.
2. Create local secret files from examples:

   - `secrets/postgres.env` from `secrets/postgres.env.example`
   - `secrets/backend.env` from `secrets/backend.env.example`

3. Fill required values in both files (database password, JWT secret, bootstrap admin, SMTP).
4. Build and run:

   - `docker compose up -d --build`

5. Open:

   - Frontend: `http://localhost:3000`
   - API docs: `http://localhost:8000/docs`

6. Stop services:

   - `docker compose down`

## Required configuration

### `secrets/postgres.env`

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`

### `secrets/backend.env`

- `DATABASE_URL` (must match DB credentials from `postgres.env`)
- `JWT_SECRET`
- `BOOTSTRAP_ADMIN_USERNAME`
- `BOOTSTRAP_ADMIN_PASSWORD`
- SMTP settings:
  - `SMTP_HOST`
  - `SMTP_PORT`
  - `SMTP_USER`
  - `SMTP_PASSWORD`
  - `SMTP_FROM_EMAIL`
  - `SMTP_FROM_NAME`
  - `SMTP_USE_TLS`
  - `SMTP_USE_SSL`

## SMTP notes (Mail.ru and similar providers)

Some providers require an application-specific password for SMTP login.
If you see an SMTP auth error like "Application password is REQUIRED", generate an app password in your mail account security settings and use it in `SMTP_PASSWORD`.

## Data safety

- Real secrets are excluded by `.gitignore` (`secrets/*.env`)
- Only `*.env.example` files should be committed
- Current repository snapshot is sanitized (no real passwords or recipient emails)

## Project structure

- `backend/` - FastAPI app
- `frontend/` - Next.js UI
- `data/default-email/` - optional default recipient source mounted into backend container
- `secrets/` - local env files (not committed)
- `docker-compose.yml` - local orchestration


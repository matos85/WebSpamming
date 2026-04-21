# WebSpamming

RU: WebSpamming - веб-приложение для управления списками рассылки и массовой отправки email.

EN: WebSpamming is a web application for mailing list management and bulk email sending.

## RU - Что делает проект

- Авторизация пользователей с ролями `user` и `admin`
- Создание списков рассылки и управление получателями
- Массовая отправка писем (text и optional HTML)
- Админка для SMTP и управления пользователями
- Хранение данных и логов отправки в PostgreSQL

## EN - What the project does

- User authentication with `user` and `admin` roles
- Mailing list and recipient management
- Bulk email sending (plain text and optional HTML)
- Admin panel for SMTP settings and user management
- PostgreSQL-based storage and send logs

## Stack

- Backend: FastAPI + SQLAlchemy + PostgreSQL
- Frontend: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Infrastructure: Docker Compose (default and recommended run mode)

## Quick Start (Docker Desktop)

1. Clone repository and open project root.
2. Create local files from examples:
   - `secrets/postgres.env` from `secrets/postgres.env.example`
   - `secrets/backend.env` from `secrets/backend.env.example`
3. Fill required values (DB password, JWT secret, admin bootstrap, SMTP).
4. Run:
   - `docker compose up -d --build`
5. Open:
   - Frontend: `http://localhost:3000`
   - API docs: `http://localhost:8000/docs`
6. Stop:
   - `docker compose down`

## Required Configuration

### `secrets/postgres.env`

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`

### `secrets/backend.env`

- `DATABASE_URL` (must match credentials from `postgres.env`)
- `JWT_SECRET`
- `BOOTSTRAP_ADMIN_USERNAME`
- `BOOTSTRAP_ADMIN_PASSWORD`
- SMTP:
  - `SMTP_HOST`
  - `SMTP_PORT`
  - `SMTP_USER`
  - `SMTP_PASSWORD`
  - `SMTP_FROM_EMAIL`
  - `SMTP_FROM_NAME`
  - `SMTP_USE_TLS`
  - `SMTP_USE_SSL`

## Troubleshooting

### 1) SMTP 535 / "Application password is REQUIRED"

Symptom:
- SMTP test fails with `535` and message like `Application password is REQUIRED`.

Cause:
- Provider (for example Mail.ru) requires app-specific password for SMTP auth.

Fix:
- Generate app password in mailbox security settings.
- Put it into `SMTP_PASSWORD`.
- For Mail.ru recommended setup:
  - `SMTP_HOST=smtp.mail.ru`
  - `SMTP_PORT=465`
  - `SMTP_USE_SSL=true`
  - `SMTP_USE_TLS=false`

### 2) CORS errors in browser

Symptom:
- Browser shows CORS error and frontend cannot call backend.

Cause:
- Origin is not allowed by backend CORS settings.

Fix:
- For local/LAN development set `CORS_ALLOW_ALL=true` in `secrets/backend.env`.
- Restart stack: `docker compose up -d --build`.
- For production use explicit allowed origins instead of open CORS.

### 3) DB credentials mismatch / backend cannot connect to PostgreSQL

Symptom:
- Backend startup fails with authentication or DB connection errors.

Cause:
- Credentials in `DATABASE_URL` do not match `POSTGRES_*` in `secrets/postgres.env`.

Fix:
- Ensure username/password/database name are identical in both files.
- In Docker Compose use host `db` inside `DATABASE_URL`.
- Restart stack after fixes:
  - `docker compose down`
  - `docker compose up -d --build`

## Data Safety

- Real secrets are ignored by `.gitignore` (`secrets/*.env`, local `.env*`)
- Commit only template files like `*.env.example`
- Current public snapshot is sanitized (no real recipient emails/passwords)

## Project Structure

- `backend/` - FastAPI app
- `frontend/` - Next.js UI
- `data/default-email/` - optional default recipient source
- `secrets/` - local env files (not committed)
- `docker-compose.yml` - local orchestration


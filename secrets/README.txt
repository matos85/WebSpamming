1. Copy postgres.env.example to postgres.env and set POSTGRES_PASSWORD.
2. Copy backend.env.example to backend.env. Set DATABASE_URL user/password to match postgres.env.
   For containers use host "db"; for backend on host + DB in Docker use "localhost".
3. Never commit *.env files (only *.env.example).

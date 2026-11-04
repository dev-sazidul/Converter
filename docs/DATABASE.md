# Database

Next.js owns the database through Prisma 7. The Python converter has no database. It keeps finished files on disk until they expire.

## Where it lives

| Where | `DATABASE_URL` | File |
| --- | --- | --- |
| Local development | not set | `frontend/data/app.db` |
| Docker | `file:/data/db/app.db`, set in `docker-compose.yml` | the `database` volume, created by Docker and owned by the container's `node` user |

`frontend/src/lib/database-url.ts` turns a relative `file:` path into an absolute one. The Prisma CLI and the app both use it, so they always open the same file. Prisma 7 does not read `.env` files, so set `DATABASE_URL` in the shell if you need a different file.

## Tables

`Job` has one row per tool run: the tool, status (`processing`, `ready`, `failed`, `expired`), sizes, error code, and when the download expires. The converter's own job id is stored in `converterJobId` and never sent to the browser.

## Changing the schema

1. Edit `frontend/prisma/schema.prisma`.
2. In `frontend/`, run `npm run db:migrate -- --name what_changed`. That writes a migration under `prisma/migrations/` and applies it to your local file.
3. Commit the schema and the migration together.

`npm run dev` and the Docker container both run `prisma migrate deploy`, which applies any migration that is not in the database yet. `npm install` regenerates the client in `src/generated/prisma` (ignored by git).

## Backups

SQLite runs in WAL mode, so copy the database with SQLite's backup command, not `cp`, while the site is running:

```bash
docker compose exec frontend node -e "require('better-sqlite3')('/data/db/app.db').backup('/data/db/backup.db').then(()=>console.log('ok'))"
docker compose cp frontend:/data/db/backup.db ./app-backup.db
```

`docker compose down -v` deletes the volume and the database with it. Plain `docker compose down` and rebuilds keep it.

## Moving to Postgres later

Move when you run more than one Next.js container, or when many people write at the same time. Until then SQLite is simpler and fast enough.

1. Start the `postgres` service. It is already in `docker-compose.yml` under the `full` profile. Change `POSTGRES_PASSWORD` first.
2. Install the adapter: `npm install @prisma/adapter-pg pg`.
3. In `schema.prisma`, set `provider = "postgresql"`.
4. In `src/lib/db.ts`, create the client with `new PrismaPg({ connectionString: url })` instead of `PrismaBetterSqlite3`, and remove the `PRAGMA journal_mode` line, which is SQLite only.
5. Move `prisma/migrations` aside and run `npm run db:migrate -- --name init` against Postgres. Migrations are written for one database, so Postgres starts a fresh history.
6. Set `DATABASE_URL=postgresql://...` for the frontend service in `docker-compose.yml`.
7. Copy the rows across with a small script that reads from SQLite and writes with Prisma, or start empty. `Job` rows are history, and their downloads expire within an hour anyway.

The app code uses only Prisma queries, plus `SELECT 1` in the health check, which Postgres also accepts. That is why steps 3 to 6 are the whole code change.

import fs from "node:fs";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";
import { databaseUrl, sqliteFile } from "@/lib/database-url";

// Server code only. One client per process; `next dev` reloads modules, so it lives on globalThis.
const holder = globalThis as unknown as { convarterDb?: Promise<PrismaClient> };

async function connect(): Promise<PrismaClient> {
  const url = databaseUrl();
  const file = sqliteFile(url);
  if (file === null) {
    throw new Error("DATABASE_URL must be a file: URL until the Postgres adapter is added. See docs/DATABASE.md.");
  }
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  // Wait up to 5 seconds for a write lock instead of failing at once.
  const client = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url, timeout: 5000 }) });
  // SQLite only: readers keep working while a write is in progress. Remove with the move to Postgres.
  await client.$queryRawUnsafe("PRAGMA journal_mode = WAL");
  return client;
}

export function getDb(): Promise<PrismaClient> {
  holder.convarterDb ??= connect().catch((error: unknown) => {
    holder.convarterDb = undefined;
    throw error;
  });
  return holder.convarterDb;
}

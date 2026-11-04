import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "prisma/config";
import { databaseUrl, sqliteFile } from "./src/lib/database-url";

// Prisma 7 does not read .env files. DATABASE_URL comes from the environment and
// defaults to frontend/data/app.db for local development.
const url = databaseUrl();
const file = sqliteFile(url);
if (file && file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url,
  },
});

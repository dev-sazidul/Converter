import path from "node:path";

/** Used when DATABASE_URL is not set. The root .gitignore already ignores data/. */
export const DEFAULT_DATABASE_URL = "file:./data/app.db";

/**
 * Return the database URL with SQLite paths made absolute.
 *
 * The Prisma CLI and the app can resolve a relative `file:` path from different folders and
 * end up with two databases. Both call this, so they always open the same file. Other URLs,
 * such as `postgresql://...` later, are returned unchanged.
 */
export function databaseUrl(value: string | undefined = process.env.DATABASE_URL, base: string = process.cwd()): string {
  const url = (value ?? "").trim() || DEFAULT_DATABASE_URL;
  const file = sqliteFile(url);
  if (file === null) return url;
  if (file === ":memory:") return url;
  const absolute = path.isAbsolute(file) ? file : path.resolve(base, file);
  return `file:${absolute.split(path.sep).join("/")}`;
}

/** The file path inside a `file:` URL, or null when the URL is not SQLite. */
export function sqliteFile(url: string): string | null {
  if (!url.startsWith("file:")) return null;
  return url.slice("file:".length);
}

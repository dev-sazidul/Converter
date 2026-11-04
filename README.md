# Convarter

Convarter is a PDF tools site you can run on your own domain. It merges, splits, compresses, and rotates PDFs, converts between PDF and JPG, and converts Word, Excel, PowerPoint, HTML, and PDF/A.

The interface is original. It is not a copy of another product's brand.

## What works

| Tool | URL |
| --- | --- |
| Merge PDF | `/merge-pdf` |
| Split PDF | `/split-pdf` |
| Compress PDF | `/compress-pdf` |
| Rotate PDF | `/rotate-pdf` |
| PDF to JPG | `/pdf-to-jpg` |
| JPG to PDF | `/jpg-to-pdf` |
| PDF to Word | `/pdf-to-word` |
| Word to PDF | `/word-to-pdf` |
| PDF to Excel | `/pdf-to-excel` |
| Excel to PDF | `/excel-to-pdf` |
| PDF to PowerPoint | `/pdf-to-powerpoint` |
| PowerPoint to PDF | `/powerpoint-to-pdf` |
| HTML to PDF | `/html-to-pdf` |
| PDF to PDF/A | `/pdf-to-pdfa` |

Coming soon cards are visible in the catalog. They do not upload files.

## Requirements

- Python 3.12 or newer (3.14 is fine for local development)
- Node.js 22 or newer
- LibreOffice, for Word, Excel, and PowerPoint conversion (`soffice` on your PATH, or LibreOffice.app on macOS)
- Ghostscript (`gs`), for PDF/A
- Chromium for Playwright, for HTML to PDF: `backend/.venv/bin/python -m playwright install chromium`
- Docker, only if you want the container setup. The backend image installs LibreOffice, Ghostscript, and Chromium.

## Install

```bash
make install
```

That creates `backend/.venv`, installs Python packages, and installs the frontend packages.

## Run locally

Use two terminals.

```bash
make backend
```

```bash
make frontend
```

Open http://127.0.0.1:3000. Next.js renders each page and serves `/api`. Its route handlers record each job in SQLite and call the Python converter at http://127.0.0.1:8000 (`CONVERTER_URL`). The converter's own docs are at http://127.0.0.1:8000/api/docs.

`npm run dev` applies database migrations first. The local database is `frontend/data/app.db`. After changing `frontend/prisma/schema.prisma`, run `npm run db:migrate` in `frontend/` to create a migration. See [docs/DATABASE.md](docs/DATABASE.md).

You do not need a `.env` file for local development. Copy `.env.example` to `.env` when you want to change limits.

## Tests

```bash
make test
```

See [docs/TESTING.md](docs/TESTING.md).

## Production

```bash
docker compose up -d --build
```

Next.js is published on `HTTP_PORT` (8080). The Python converter has no published port; only Next.js can reach it. Uploads and the SQLite database are kept in Docker volumes, so they survive restarts and rebuilds. `docker compose down -v` deletes them.

Before you open it to the internet:

- Set `CONVERTER_TOKEN` in `.env` to a long random value, for example from `openssl rand -hex 32`, and `SITE_URL` to your public address.
- Put HTTPS in front, such as Caddy, your hosting platform, or a CDN. Compose serves plain HTTP.
- Add rate limiting there too. Nothing in this stack limits how often one address can run tools. Each conversion is time-limited, and at most `MAX_CONCURRENT_JOBS` run at once.
- HTML to PDF in web-address mode loads public pages in Chromium. Its address check can be fooled by DNS rebinding, so block traffic from the containers to private and link-local ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`) in the server firewall.

The API is described in [docs/API.md](docs/API.md), and the database in [docs/DATABASE.md](docs/DATABASE.md).

## Layout

```text
frontend/     Next.js site and public API: pages, /api route handlers, Prisma + SQLite
backend/app   Internal Python converter: FastAPI routes, validation, and PDF services
backend/tests API and processing tests
docs/         API, database, and testing notes
```

## Adding a tool

1. Add a function under `backend/app/services/pdf/` or `backend/app/services/convert/`.
2. Add a route in `backend/app/api/routes/tools.py` and a catalog entry. Pass the function and its keyword arguments to `_finish`. It runs in a child process, so it must be a module-level function.
3. Add a `status: "available"` entry with an `endpoint` in `frontend/src/lib/tools.ts`. The Next.js route at `/api/v1/tools/[tool]` only forwards tools listed there. The homepage reads the same registry, so it needs no new layout.
4. Add options in `ToolOptionsForm` and `appendOptions` if the tool needs them.
5. Add an API test that uses a real file and checks the download bytes.

## Processing and privacy

- File types are detected from the contents, not only the extension.
- Each job uses its own temporary directory. Downloads are served only for that job id.
- Uploaded originals are deleted after a successful result. Finished downloads are kept until they expire, including across an API restart.
- Limits for size, file count, and pages come from environment variables. Each conversion runs in its own process and is stopped after `CONVERSION_TIMEOUT_SECONDS` (120 by default). At most `MAX_CONCURRENT_JOBS` (2) run at once.
- Rendering a page to an image stays within `MAX_IMAGE_PIXELS`. A very large page is rendered at a lower resolution, and the result says so.
- Repeated pages in a page list are processed once.
- Password-protected PDFs are rejected.
- Word, Excel, and PowerPoint files are converted with LibreOffice. Macros are not run.
- HTML files are rendered without scripts or network access. A web address must be public http or https. Private and local addresses are blocked.
- PDF/A is produced with Ghostscript and checked for a PDF/A marker, an output intent, the original page count, and a readable file. That is not a full ISO veraPDF certification.
- OCR, editing, signatures, accounts, and payments are not in this release.

## Default limits

- 25 MB per file
- 100 MB per task
- 20 files
- 150 pages
- JPG and JPEG for JPG to PDF. PNG is not accepted there.
- Resolutions of 96, 150, and 200 DPI

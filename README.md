# Convarter

Convarter is a PDF tools site you can run on your own domain. The first release merges, splits, compresses, and rotates PDFs, and converts between PDF and JPG or PNG.

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

Coming soon cards are visible in the catalog. They do not upload files.

## Requirements

- Python 3.12 or newer (3.14 is fine for local development)
- Node.js 22 or newer
- Docker, only if you want the container setup

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

Open http://localhost:5173. The Vite server proxies `/api` to http://127.0.0.1:8000. API docs are at http://127.0.0.1:8000/api/docs.

You do not need a `.env` file for local development. Copy `.env.example` to `.env` when you want to change limits or CORS.

## Tests

```bash
make test
```

See [docs/TESTING.md](docs/TESTING.md).

## Production

```bash
docker compose up -d --build
```

The site is published on port 8080 and the API on `127.0.0.1:8000`. Put Caddy or Nginx in front for HTTPS. Details are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). The API is described in [docs/API.md](docs/API.md).

## Layout

```text
frontend/     React, TypeScript, Vite, Tailwind
backend/app   FastAPI routes, validation, and PDF services
backend/tests API and processing tests
docs/         API, testing, and deployment notes
```

New tools are added in `frontend/src/lib/tools.ts` and `backend/app/api/routes/tools.py`. The homepage reads the registry, so it does not need a new layout for each tool.

## Processing and privacy

- File types are detected from the contents, not only the extension.
- Each job uses its own temporary directory. Downloads are served only for that job id.
- Uploaded originals are deleted after a successful result. Results expire after one hour by default, and anything left on disk is removed when the API starts.
- Limits for size, file count, and pages come from environment variables.
- Password-protected PDFs are rejected.
- Office conversion, OCR, editing, signatures, accounts, and payments are not in this release.

## Default limits

- 25 MB per file
- 100 MB per task
- 20 files
- 150 pages
- JPG and PNG for the image tool
- Resolutions of 96, 150, and 200 DPI

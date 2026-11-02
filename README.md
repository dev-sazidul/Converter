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

Open http://127.0.0.1:3000. Next.js renders each page on the server and proxies `/api` to http://127.0.0.1:8000. API docs are at http://127.0.0.1:8000/api/docs.

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
frontend/     Next.js interface. The Python API stays in backend/
backend/app   FastAPI routes, validation, and PDF services
backend/tests API and processing tests
docs/         API, testing, and deployment notes
```

New tools are added in `frontend/src/lib/tools.ts` and `backend/app/api/routes/tools.py`. The homepage reads the registry, so it does not need a new layout for each tool.

## Processing and privacy

- File types are detected from the contents, not only the extension.
- Each job uses its own temporary directory. Downloads are served only for that job id.
- Uploaded originals are deleted after a successful result. Finished downloads are kept until they expire, including across an API restart.
- Limits for size, file count, and pages come from environment variables. Conversions also stop after `CONVERSION_TIMEOUT_SECONDS` (120 by default).
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

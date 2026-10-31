# Testing

## Backend

From the repository root, with the virtualenv created by `make install`:

```bash
cd backend
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/pytest
```

Word, Excel, and PowerPoint tests need LibreOffice. PDF/A tests need Ghostscript. HTML tests need Chromium:

```bash
backend/.venv/bin/python -m playwright install chromium
```

The suite builds PDFs and documents in memory. It covers:

- Merging two PDFs and checking page order
- Split by ranges, every page, and interval, including ZIP downloads
- Invalid ranges, empty uploads, unsupported types, and damaged PDFs
- Compression of an image-heavy PDF, including a smaller result
- High-quality compression that keeps text readable
- Rotation of selected pages
- PDF to JPG for one page and for a ZIP of several pages
- JPG to PDF, including A4 page size and image order. PNG is rejected.
- PDF to Word for text, an image, and a multi-page file
- Word, Excel, and PowerPoint to PDF, including text from each source
- PDF to Excel tables, a text fallback, and a page with nothing to extract
- PDF to PowerPoint in editable and picture modes
- HTML to PDF, including a script and a local file reference that must not appear
- Public and blocked web addresses for HTML to PDF
- PDF/A-2b, including the PDF/A marker and a failed check that does not return a file
- Rejected office uploads, damaged files, and empty uploads
- Password-protected PDFs
- File size, total size, page count, and file count limits
- Download authorization, including ids that are not UUIDs
- Hidden internal errors
- Temporary input cleanup
- Expired downloads and removal of leftover files on startup

## Frontend

```bash
cd frontend
npm test
npm run typecheck
```

Frontend tests cover the tool registry, client-side file checks, page-list validation, byte formatting, and API error parsing. They do not launch a browser.

## What is not automated

The full click-path in a browser is checked manually: open a tool, add a file, submit, and download. Browser file inputs are not driven by the API tests. Use the commands in the README to run both servers, then try Merge and JPG to PDF with your own files.

Docker Compose is configuration. Build it on the deployment machine before relying on it:

```bash
docker compose build
docker compose up -d
curl -f http://127.0.0.1:8000/api/health
curl -f http://127.0.0.1:8080/healthz
```

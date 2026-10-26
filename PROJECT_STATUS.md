# Project status

Last updated: 2026-10-26

## Verified

- Backend: 16 pytest tests passed.
- Frontend: 6 vitest tests passed, TypeScript check passed, production build passed.
- Live API: merge returned a two-page PDF in the uploaded order. JPG to PDF through the Vite proxy returned a two-page A4 PDF.
- Browser: homepage, split upload screen, coming-soon state, and mobile menu were opened at http://127.0.0.1:5173. The Convert PDF page and its menu were checked after that: Home is the landing label, JPG to PDF opens an upload, and HTML to PDF stays coming soon with no file input.

## Done

- Original Convarter interface: navigation, search, categories, tool pages, upload, options, progress, success, and error states.
- Six working tools wired to the API: merge, split, compress, rotate, PDF to JPG, JPG to PDF.
- FastAPI backend with content checks, size and page limits, per-job temporary folders, expiring downloads, and startup cleanup.
- Automated backend tests for valid files, invalid files, ranges, limits, downloads, and cleanup.
- Frontend tests for the tool registry, file checks, page lists, and API errors.
- Dockerfiles, Compose, Nginx reverse proxy, health checks, `.env.example`, and deployment notes.
- Coming soon entries for office conversion, HTML to PDF, PDF to PDF/A, editing, OCR, repair, and security tools. They do not process files.
- Convert PDF page at `/convert-pdf` with Convert to PDF and Convert from PDF. The header labels the landing page Home.
- Reserved ad spaces under the header, on the home page, on content and tool pages, and above the footer. They show demo creatives until AdSense ids are set in the environment. A closable popup returns 20 seconds after it is dismissed and is not an AdSense unit.

## Not built

- Word, Excel, PowerPoint, HTML, and PDF/A conversion
- OCR, editing, watermarks, page numbers, signatures, passwords, and repair
- User accounts, history, quotas, payments, and an admin dashboard
- Background workers. Processing is synchronous inside the request.
- Postgres and Redis. They are reserved in the `full` Compose profile and are not connected.
- Object storage. Files stay on local disk, with the job store isolated so a later S3 path can replace it.

## Limitations

- A text PDF that is already small may not shrink. The compress tool returns a valid PDF and reports that nothing was saved.
- Low compression can downsample pages that contain images. High quality does not rasterize the page.
- Encrypted PDFs are rejected.
- GIF and WebP are not accepted. JPG and PNG are.
- Restarting the API deletes temporary files, including downloads that have not expired yet.
- Very large or malicious PDFs are limited by size and page count, not by a hard CPU timeout.
- PyMuPDF 2 is the installed rendering library. Its package also installs the dependencies it declares, including image and layout libraries. That makes the backend environment larger than a minimal PyMuPDF 1.x install.
- Docker is not installed in the environment where this was built, so `docker compose up` has not been executed here. The Compose files are in place for the server.

## Next step

Add Word to PDF only after choosing a converter that is actually installed, such as LibreOffice, and cover it with a test that checks the output file. Do not mark it Ready before that test passes.

## How to continue

1. Run `make test`.
2. Run `make backend` and `make frontend`.
3. Read `docs/DEPLOYMENT.md` before pointing a domain at the server.
